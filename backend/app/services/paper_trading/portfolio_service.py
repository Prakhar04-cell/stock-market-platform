import logging
from decimal import Decimal
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.trading import Holding, Order, OrderExecution
from app.models.wallet import Wallet
from app.services.market_data.quote_service import quote_service
from app.services.market_data.upstox_provider import upstox_provider

logger = logging.getLogger("tradex.portfolio")


class PortfolioService:
    """
    Authoritative real-time portfolio, positions, and P&L calculation service.
    Uses Python Decimal throughout to guarantee financial rounding precision.
    """

    async def get_portfolio_summary(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """
        Calculates user portfolio values with live quotes:
        - Available Cash
        - Invested Value
        - Current Portfolio Value
        - Unrealized P&L
        - Realized P&L
        - Total P&L
        - Itemized Holdings / Positions
        """
        # 1. Fetch virtual wallet
        w_stmt = select(Wallet).where(Wallet.user_id == user_id)
        wallet = (await db.execute(w_stmt)).scalar_one_or_none()
        cash_balance = (wallet.balance - wallet.locked_balance) if wallet else Decimal("0.0000")
        total_balance = wallet.balance if wallet else Decimal("0.0000")

        # 2. Fetch user active holdings
        h_stmt = (
            select(Holding)
            .where(Holding.user_id == user_id, Holding.quantity > Decimal("0"))
            .options(selectinload(Holding.stock))
        )
        holdings = (await db.execute(h_stmt)).scalars().all()

        symbols = [h.stock.symbol for h in holdings if h.stock]
        quotes_map = await quote_service.get_quotes(symbols) if symbols else {}

        total_invested = Decimal("0.0000")
        total_current_value = Decimal("0.0000")
        holdings_list: List[Dict[str, Any]] = []

        for h in holdings:
            symbol = h.stock.symbol if h.stock else "UNKNOWN"
            stock_name = h.stock.name if h.stock else symbol
            qty = h.quantity
            avg_price = h.average_buy_price
            invested = qty * avg_price
            total_invested += invested

            quote = quotes_map.get(symbol) or quotes_map.get(symbol.upper())
            current_price: Optional[Decimal] = quote.ltp if quote and quote.ltp > Decimal("0") else None

            if current_price is not None:
                current_val = qty * current_price
                unrealized_pnl = current_val - invested
                pnl_pct = (unrealized_pnl / invested * Decimal("100")) if invested > 0 else Decimal("0.0000")
                total_current_value += current_val
                status = quote.status if quote else "LIVE"
            else:
                current_val = None
                unrealized_pnl = None
                pnl_pct = None
                status = "UNAVAILABLE"

            holdings_list.append({
                "id": h.id,
                "stock_id": h.stock_id,
                "symbol": symbol,
                "name": stock_name,
                "quantity": qty,
                "average_buy_price": avg_price,
                "invested_value": invested,
                "current_price": current_price,
                "current_value": current_val,
                "unrealized_pnl": unrealized_pnl,
                "pnl_percent": round(pnl_pct, 2) if pnl_pct is not None else None,
                "day_change": quote.change if quote else None,
                "day_change_percent": quote.change_percent if quote else None,
                "status": status,
            })

        # Calculate realized P&L from historical SELL order executions
        # Query filled SELL orders with executions
        sell_stmt = (
            select(OrderExecution)
            .join(Order)
            .where(Order.user_id == user_id, Order.side == "SELL", Order.status == "FILLED")
        )
        sell_executions = (await db.execute(sell_stmt)).scalars().all()
        realized_pnl = Decimal("0.0000")
        for sexec in sell_executions:
            # Approximate realized pnl after charges
            realized_pnl += (sexec.execution_price * sexec.executed_quantity) - sexec.trade_charges

        unrealized_total = (total_current_value - total_invested) if total_current_value > 0 else Decimal("0.0000")
        total_pnl = unrealized_total + realized_pnl
        portfolio_total_value = total_balance + total_current_value

        return {
            "portfolio_value": portfolio_total_value,
            "available_cash": cash_balance,
            "invested_value": total_invested,
            "current_market_value": total_current_value,
            "unrealized_pnl": unrealized_total,
            "realized_pnl": realized_pnl,
            "total_pnl": total_pnl,
            "provider_status": "healthy" if upstox_provider.is_token_valid else ("authentication_required" if upstox_provider.is_configured else "not_configured"),
            "holdings": holdings_list,
        }


portfolio_service = PortfolioService()
