from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.exceptions import (
    PermissionDeniedError,
    ProviderNotConfiguredError,
    ResourceConflictError,
    ResourceNotFoundError,
    TradeXException,
)
from app.models.market import Stock
from app.models.trading import Order, OrderExecution
from app.models.user import User
from app.models.wallet import Wallet
from app.schemas.orders import OrderCreate, OrderExecutionResponse, OrderResponse
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/orders", tags=["Orders & Trading Foundation"])


def _format_order(order: Order) -> OrderResponse:
    executions = [
        OrderExecutionResponse(
            id=e.id,
            execution_price=e.execution_price,
            executed_quantity=e.executed_quantity,
            trade_charges=e.trade_charges,
            executed_at=e.executed_at,
            exchange_trade_id=e.exchange_trade_id,
        )
        for e in order.executions
    ]
    return OrderResponse(
        id=order.id,
        user_id=order.user_id,
        stock_id=order.stock_id,
        symbol=order.stock.symbol if order.stock else None,
        stock_name=order.stock.name if order.stock else None,
        order_type=order.order_type,
        side=order.side,
        quantity=order.quantity,
        price=order.price,
        stop_price=order.stop_price,
        status=order.status,
        filled_quantity=order.filled_quantity,
        average_execution_price=order.average_execution_price,
        created_at=order.created_at,
        executions=executions,
    )


@router.get("", response_model=List[OrderResponse], summary="List authenticated user orders")
async def list_orders(
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List orders belonging strictly to the authenticated user."""
    stmt = (
        select(Order)
        .where(Order.user_id == current_user.id)
        .options(selectinload(Order.stock), selectinload(Order.executions))
        .order_by(desc(Order.created_at))
        .offset(offset)
        .limit(limit)
    )
    if status_filter:
        stmt = stmt.where(Order.status == status_filter.upper())

    res = await db.execute(stmt)
    orders = res.scalars().all()
    return [_format_order(o) for o in orders]


@router.get("/{order_id}", response_model=OrderResponse, summary="Get order details")
async def get_order_by_id(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve an order and its execution history."""
    stmt = (
        select(Order)
        .where(Order.id == order_id, Order.user_id == current_user.id)
        .options(selectinload(Order.stock), selectinload(Order.executions))
    )
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()

    if not order:
        raise ResourceNotFoundError(resource="Order", identifier=order_id)

    return _format_order(order)


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED, summary="Create order draft / submission")
async def create_order(
    order_in: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits a trading order to the platform order book.
    In Phase 1, the execution engine status is NOT_CONFIGURED.
    Orders are validated against user's wallet balance and saved as PENDING / NOT_CONFIGURED.
    """
    # 1. Verify Stock
    stock_stmt = select(Stock).where(Stock.id == order_in.stock_id)
    stock = (await db.execute(stock_stmt)).scalar_one_or_none()
    if not stock:
        raise ResourceNotFoundError(resource="Stock", identifier=order_in.stock_id)

    # 2. Verify Wallet
    wallet_stmt = select(Wallet).where(Wallet.user_id == current_user.id)
    wallet = (await db.execute(wallet_stmt)).scalar_one_or_none()
    if not wallet:
        raise ResourceNotFoundError(resource="Wallet", identifier=current_user.id)

    # Calculate required margin if limit order
    if order_in.order_type == "LIMIT" and order_in.price:
        required_funds = order_in.quantity * order_in.price
        available = wallet.balance - wallet.locked_balance
        if order_in.side == "BUY" and available < required_funds:
            raise TradeXException(
                code="INSUFFICIENT_FUNDS",
                message=f"Insufficient balance. Required: {wallet.currency} {required_funds:,.2f}, Available: {wallet.currency} {available:,.2f}",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

    # In Phase 1, Execution Engine is strictly NOT_CONFIGURED.
    # We record the order with status PENDING and inform the trader.
    order = Order(
        user_id=current_user.id,
        wallet_id=wallet.id,
        stock_id=stock.id,
        order_type=order_in.order_type,
        side=order_in.side,
        quantity=order_in.quantity,
        price=order_in.price,
        stop_price=order_in.stop_price,
        status="PENDING", # Waiting for ExecutionProvider
        filled_quantity=Decimal("0.0000"),
    )
    db.add(order)
    await db.flush()

    await record_audit_log(
        db=db,
        action="ORDER_CREATED",
        entity_type="order",
        user_id=current_user.id,
        entity_id=order.id,
        new_values={
            "symbol": stock.symbol,
            "side": order.side,
            "type": order.order_type,
            "quantity": str(order.quantity),
            "price": str(order.price) if order.price else None,
            "execution_provider": "NOT_CONFIGURED",
        },
    )
    await db.commit()

    # Reload with relations
    return await get_order_by_id(order.id, current_user, db)


@router.delete("/{order_id}", summary="Cancel pending order")
async def cancel_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel an open/pending order."""
    stmt = select(Order).where(Order.id == order_id, Order.user_id == current_user.id)
    order = (await db.execute(stmt)).scalar_one_or_none()
    if not order:
        raise ResourceNotFoundError(resource="Order", identifier=order_id)

    if order.status not in ["PENDING", "OPEN"]:
        raise ResourceConflictError(message=f"Cannot cancel order in '{order.status}' status.")

    order.status = "CANCELLED"
    await record_audit_log(
        db=db,
        action="ORDER_CANCELLED",
        entity_type="order",
        user_id=current_user.id,
        entity_id=order.id,
    )
    await db.commit()
    return {"success": True, "message": "Order cancelled successfully."}
