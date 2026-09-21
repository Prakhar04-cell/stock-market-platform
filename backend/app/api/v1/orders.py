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


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED, summary="Create and execute paper trading order")
async def create_order(
    order_in: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits and processes a paper-trading BUY or SELL order.
    Market orders fill immediately using the latest normalized real market price.
    Limit orders remain OPEN until market price satisfies the limit criteria.
    Never sends orders to real brokers or exchanges.
    """
    from app.services.paper_trading.execution_service import paper_execution_service

    order = await paper_execution_service.submit_order(
        user_id=current_user.id,
        stock_id=order_in.stock_id,
        side=order_in.side,
        order_type=order_in.order_type,
        quantity=order_in.quantity,
        price=order_in.price,
        stop_price=order_in.stop_price,
        db=db,
    )

    await record_audit_log(
        db=db,
        action="PAPER_ORDER_SUBMITTED",
        entity_type="order",
        user_id=current_user.id,
        entity_id=order.id,
        new_values={
            "side": order.side,
            "type": order.order_type,
            "quantity": str(order.quantity),
            "price": str(order.price) if order.price else None,
            "status": order.status,
            "execution_engine": "PAPER_TRADING",
        },
    )

    return await get_order_by_id(order.id, current_user, db)


@router.delete("/{order_id}", summary="Cancel open paper limit order")
async def cancel_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel an open limit order and release any locked paper margin."""
    from app.services.paper_trading.execution_service import paper_execution_service

    order = await paper_execution_service.cancel_order(
        order_id=order_id,
        user_id=current_user.id,
        db=db,
    )

    await record_audit_log(
        db=db,
        action="PAPER_ORDER_CANCELLED",
        entity_type="order",
        user_id=current_user.id,
        entity_id=order.id,
    )

    return {"success": True, "message": "Paper order cancelled successfully."}

