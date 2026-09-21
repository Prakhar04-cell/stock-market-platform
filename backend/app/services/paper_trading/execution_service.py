import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.core.exceptions import ResourceConflictError, ResourceNotFoundError, TradeXException
from app.models.market import Stock
from app.models.system import Notification
from app.models.trading import Holding, Order, OrderExecution
from app.models.wallet import LedgerEntry, TradeCharge, Wallet
from app.services.market_data.normalizer import MarketQuote
from app.services.market_data.quote_service import quote_service
from app.services.paper_trading.charge_engine import calculate_simulated_charges
from app.services.paper_trading.risk_service import risk_service

logger = logging.getLogger("tradex.paper_execution")


class PaperExecutionService:
    """
    Authoritative virtual paper trading execution engine.
    Strictly isolated from broker real-money routing.
    Executes fills using real market prices with full atomic database integrity.
    """

    async def submit_order(
        self,
        user_id: str,
        stock_id: str,
        side: str,
        order_type: str,
        quantity: Decimal,
        price: Optional[Decimal] = None,
        stop_price: Optional[Decimal] = None,
        db: Optional[AsyncSession] = None,
    ) -> Order:
        """
        Main order entrypoint. Validates, creates, and executes/queues paper orders.
        """
        # Validate order parameters
        risk_service.validate_order_params(
            side=side,
            order_type=order_type,
            quantity=quantity,
            price=price,
            stop_price=stop_price,
        )

        should_close_db = False
        if db is None:
            db = AsyncSessionLocal()
            should_close_db = True

        try:
            # 1. Fetch Stock
            stock_stmt = select(Stock).where(Stock.id == stock_id)
            stock = (await db.execute(stock_stmt)).scalar_one_or_none()
            if not stock:
                raise ResourceNotFoundError(resource="Stock", identifier=stock_id)

            # 2. Fetch User Virtual Wallet
            wallet_stmt = select(Wallet).where(Wallet.user_id == user_id)
            wallet = (await db.execute(wallet_stmt)).scalar_one_or_none()
            if not wallet:
                raise ResourceNotFoundError(resource="Wallet", identifier=user_id)

            # 3. Fetch User Holding (if SELL)
            holding: Optional[Holding] = None
            if side.upper() == "SELL":
                h_stmt = select(Holding).where(Holding.user_id == user_id, Holding.stock_id == stock_id)
                holding = (await db.execute(h_stmt)).scalar_one_or_none()
                risk_service.validate_sell_holdings(holding, quantity, stock.symbol)

            # 4. Fetch real-time market quote
            market_quote = await quote_service.get_quote(stock.symbol)
            current_market_price: Optional[Decimal] = market_quote.ltp if market_quote else None

            # Handle MARKET order
            if order_type.upper() == "MARKET":
                if not current_market_price or current_market_price <= Decimal("0"):
                    raise TradeXException(
                        code="MARKET_DATA_UNAVAILABLE",
                        message=f"Live market price for {stock.symbol} is currently unavailable. Market orders require a valid market price tick.",
                        status_code=400,
                    )

                # Pre-trade risk check for BUY
                if side.upper() == "BUY":
                    risk_service.validate_buy_margin(wallet, current_market_price, quantity)

                # Create Order
                order = Order(
                    user_id=user_id,
                    wallet_id=wallet.id,
                    stock_id=stock.id,
                    order_type="MARKET",
                    side=side.upper(),
                    quantity=quantity,
                    price=current_market_price,
                    status="FILLED",
                    filled_quantity=quantity,
                    average_execution_price=current_market_price,
                )
                db.add(order)
                await db.flush()

                # Execute fill immediately
                await self._process_fill(
                    db=db,
                    order=order,
                    wallet=wallet,
                    stock=stock,
                    fill_price=current_market_price,
                    fill_quantity=quantity,
                    holding=holding,
                )

            # Handle LIMIT order
            elif order_type.upper() == "LIMIT":
                limit_price = price
                assert limit_price is not None

                charges = calculate_simulated_charges("BUY", quantity, limit_price)
                required_margin = (quantity * limit_price) + charges.total_charges

                if side.upper() == "BUY":
                    risk_service.validate_buy_margin(wallet, limit_price, quantity)
                    # Lock margin for pending limit buy
                    wallet.locked_balance += required_margin
                    db.add(
                        LedgerEntry(
                            wallet_id=wallet.id,
                            transaction_type="ORDER_LOCK",
                            amount=-required_margin,
                            balance_after=wallet.balance - wallet.locked_balance,
                            reference_id=None,
                            description=f"Margin locked for BUY LIMIT {quantity} {stock.symbol} @ ₹{limit_price:,.2f}",
                        )
                    )

                # Can it be filled immediately at current price?
                can_fill_immediately = False
                if current_market_price and current_market_price > Decimal("0"):
                    if side.upper() == "BUY" and current_market_price <= limit_price:
                        can_fill_immediately = True
                    elif side.upper() == "SELL" and current_market_price >= limit_price:
                        can_fill_immediately = True

                if can_fill_immediately:
                    assert current_market_price is not None
                    # Unlock previously reserved limit margin if BUY
                    if side.upper() == "BUY":
                        wallet.locked_balance -= required_margin

                    order = Order(
                        user_id=user_id,
                        wallet_id=wallet.id,
                        stock_id=stock.id,
                        order_type="LIMIT",
                        side=side.upper(),
                        quantity=quantity,
                        price=limit_price,
                        status="FILLED",
                        filled_quantity=quantity,
                        average_execution_price=current_market_price,
                    )
                    db.add(order)
                    await db.flush()

                    await self._process_fill(
                        db=db,
                        order=order,
                        wallet=wallet,
                        stock=stock,
                        fill_price=current_market_price,
                        fill_quantity=quantity,
                        holding=holding,
                    )
                else:
                    # Order remains OPEN waiting for market price condition
                    order = Order(
                        user_id=user_id,
                        wallet_id=wallet.id,
                        stock_id=stock.id,
                        order_type="LIMIT",
                        side=side.upper(),
                        quantity=quantity,
                        price=limit_price,
                        status="OPEN",
                        filled_quantity=Decimal("0.0000"),
                    )
                    db.add(order)
                    await db.flush()

                    # Notification
                    db.add(
                        Notification(
                            user_id=user_id,
                            title=f"Limit Order Placed",
                            message=f"{side.upper()} {quantity} {stock.symbol} @ limit ₹{limit_price:,.2f} is now OPEN.",
                            notification_type="INFO",
                        )
                    )

            await db.commit()
            await db.refresh(order)
            return order

        except Exception:
            await db.rollback()
            raise
        finally:
            if should_close_db:
                await db.close()

    async def _process_fill(
        self,
        db: AsyncSession,
        order: Order,
        wallet: Wallet,
        stock: Stock,
        fill_price: Decimal,
        fill_quantity: Decimal,
        holding: Optional[Holding],
    ):
        """Processes atomic execution, balance debit/credit, ledger entries, and holding updates."""
        now = datetime.now(timezone.utc)
        charges = calculate_simulated_charges(order.side, fill_quantity, fill_price)
        trade_val = fill_quantity * fill_price

        # 1. Record Execution
        execution = OrderExecution(
            order_id=order.id,
            execution_price=fill_price,
            executed_quantity=fill_quantity,
            trade_charges=charges.total_charges,
            executed_at=now,
            exchange_trade_id=f"PAPER-FILL-{order.id[:8].upper()}",
        )
        db.add(execution)
        await db.flush()

        # 2. Record Itemized Charges
        trade_charge = TradeCharge(
            order_id=order.id,
            execution_id=execution.id,
            brokerage=charges.brokerage,
            stt=charges.stt,
            exchange_turnover=charges.exchange_turnover,
            stamp_duty=charges.stamp_duty,
            sebi_turnover=charges.sebi_turnover,
            gst=charges.gst,
            total_charges=charges.total_charges,
        )
        db.add(trade_charge)

        # 3. Handle Financial Ledger & Holdings
        if order.side == "BUY":
            total_debit = trade_val + charges.total_charges
            wallet.balance -= total_debit

            # Ledger entries
            db.add(
                LedgerEntry(
                    wallet_id=wallet.id,
                    transaction_type="TRADE_BUY",
                    amount=-trade_val,
                    balance_after=wallet.balance + charges.total_charges,
                    reference_id=order.id,
                    description=f"PAPER BUY: {fill_quantity} shares of {stock.symbol} @ ₹{fill_price:,.2f}",
                )
            )
            db.add(
                LedgerEntry(
                    wallet_id=wallet.id,
                    transaction_type="CHARGES",
                    amount=-charges.total_charges,
                    balance_after=wallet.balance,
                    reference_id=order.id,
                    description=f"Simulated trade charges on BUY order #{order.id[:8]}",
                )
            )

            # Update or create holding
            h_stmt = select(Holding).where(Holding.user_id == order.user_id, Holding.stock_id == stock.id)
            existing_holding = (await db.execute(h_stmt)).scalar_one_or_none()

            if existing_holding:
                new_qty = existing_holding.quantity + fill_quantity
                # Weighted average buy price
                existing_cost = existing_holding.quantity * existing_holding.average_buy_price
                new_cost = fill_quantity * fill_price
                existing_holding.average_buy_price = (existing_cost + new_cost) / new_qty
                existing_holding.quantity = new_qty
            else:
                new_holding = Holding(
                    user_id=order.user_id,
                    stock_id=stock.id,
                    quantity=fill_quantity,
                    average_buy_price=fill_price,
                )
                db.add(new_holding)

        elif order.side == "SELL":
            total_credit = trade_val - charges.total_charges
            wallet.balance += total_credit

            # Ledger entries
            db.add(
                LedgerEntry(
                    wallet_id=wallet.id,
                    transaction_type="TRADE_SELL",
                    amount=trade_val,
                    balance_after=wallet.balance + charges.total_charges,
                    reference_id=order.id,
                    description=f"PAPER SELL: {fill_quantity} shares of {stock.symbol} @ ₹{fill_price:,.2f}",
                )
            )
            db.add(
                LedgerEntry(
                    wallet_id=wallet.id,
                    transaction_type="CHARGES",
                    amount=-charges.total_charges,
                    balance_after=wallet.balance,
                    reference_id=order.id,
                    description=f"Simulated trade charges on SELL order #{order.id[:8]}",
                )
            )

            # Update holding
            if holding:
                holding.quantity -= fill_quantity
                if holding.quantity <= Decimal("0.0000"):
                    await db.delete(holding)

        # 4. User In-App Notification
        db.add(
            Notification(
                user_id=order.user_id,
                title="Paper Order Executed",
                message=f"Filled {order.side} {fill_quantity} {stock.symbol} @ ₹{fill_price:,.2f} (Total: ₹{trade_val:,.2f})",
                notification_type="SUCCESS",
            )
        )

    async def evaluate_open_limit_orders(self, quote: MarketQuote):
        """
        Triggered on real-time market quote updates via WebSocket.
        Evaluates OPEN limit orders against the latest valid tick.
        """
        if not quote.ltp or quote.ltp <= Decimal("0"):
            return

        async with AsyncSessionLocal() as db:
            try:
                # Find all OPEN limit orders for this symbol
                stmt = (
                    select(Order)
                    .join(Stock)
                    .where(Order.status == "OPEN", Stock.symbol == quote.symbol.upper())
                    .options(selectinload(Order.stock))
                )
                open_orders = (await db.execute(stmt)).scalars().all()

                for order in open_orders:
                    can_fill = False
                    if order.side == "BUY" and order.price and quote.ltp <= order.price:
                        can_fill = True
                    elif order.side == "SELL" and order.price and quote.ltp >= order.price:
                        can_fill = True

                    if can_fill:
                        # Fetch user wallet
                        w_stmt = select(Wallet).where(Wallet.id == order.wallet_id)
                        wallet = (await db.execute(w_stmt)).scalar_one_or_none()
                        if not wallet:
                            continue

                        # Unlock reserved margin if BUY
                        if order.side == "BUY":
                            charges = calculate_simulated_charges("BUY", order.quantity, order.price)
                            required_margin = (order.quantity * order.price) + charges.total_charges
                            wallet.locked_balance = max(Decimal("0.00"), wallet.locked_balance - required_margin)

                        # Fetch holding if SELL
                        holding = None
                        if order.side == "SELL":
                            h_stmt = select(Holding).where(Holding.user_id == order.user_id, Holding.stock_id == order.stock_id)
                            holding = (await db.execute(h_stmt)).scalar_one_or_none()

                        order.status = "FILLED"
                        order.filled_quantity = order.quantity
                        order.average_execution_price = quote.ltp

                        await self._process_fill(
                            db=db,
                            order=order,
                            wallet=wallet,
                            stock=order.stock,
                            fill_price=quote.ltp,
                            fill_quantity=order.quantity,
                            holding=holding,
                        )

                await db.commit()
            except Exception as e:
                await db.rollback()
                logger.warning(f"Error evaluating open limit orders for {quote.symbol}: {e}")

    async def cancel_order(self, order_id: str, user_id: str, db: AsyncSession) -> Order:
        """Cancels an OPEN or PENDING order and releases any reserved cash."""
        stmt = (
            select(Order)
            .where(Order.id == order_id, Order.user_id == user_id)
            .options(selectinload(Order.stock))
        )
        order = (await db.execute(stmt)).scalar_one_or_none()
        if not order:
            raise ResourceNotFoundError(resource="Order", identifier=order_id)

        if order.status not in ["OPEN", "PENDING"]:
            raise ResourceConflictError(message=f"Cannot cancel order in '{order.status}' status.")

        # Unlock virtual cash if BUY LIMIT
        if order.side == "BUY" and order.order_type == "LIMIT" and order.price:
            w_stmt = select(Wallet).where(Wallet.id == order.wallet_id)
            wallet = (await db.execute(w_stmt)).scalar_one_or_none()
            if wallet:
                charges = calculate_simulated_charges("BUY", order.quantity, order.price)
                locked_amt = (order.quantity * order.price) + charges.total_charges
                wallet.locked_balance = max(Decimal("0.0000"), wallet.locked_balance - locked_amt)

                db.add(
                    LedgerEntry(
                        wallet_id=wallet.id,
                        transaction_type="ORDER_UNLOCK",
                        amount=locked_amt,
                        balance_after=wallet.balance - wallet.locked_balance,
                        reference_id=order.id,
                        description=f"Margin unlocked: Cancelled BUY LIMIT #{order.id[:8]}",
                    )
                )

        order.status = "CANCELLED"
        db.add(
            Notification(
                user_id=user_id,
                title="Order Cancelled",
                message=f"Order {order.side} {order.quantity} {order.stock.symbol if order.stock else ''} cancelled.",
                notification_type="WARNING",
            )
        )
        await db.commit()
        await db.refresh(order)
        return order


paper_execution_service = PaperExecutionService()
