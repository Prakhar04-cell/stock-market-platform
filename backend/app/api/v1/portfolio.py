from decimal import Decimal
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.trading import Holding
from app.models.user import User
from app.models.wallet import Wallet
from app.schemas.portfolio import HoldingResponse, PortfolioSummaryResponse

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


@router.get("", response_model=PortfolioSummaryResponse, summary="Get user portfolio summary and holdings")
async def get_portfolio(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve user portfolio holdings and performance summary.
    In Phase 1, market data is not connected; current_portfolio_value and unrealized_pnl are None.
    """
    # Fetch user wallet
    w_stmt = select(Wallet).where(Wallet.user_id == current_user.id)
    wallet = (await db.execute(w_stmt)).scalar_one_or_none()
    cash_balance = (wallet.balance - wallet.locked_balance) if wallet else Decimal("0.0000")

    # Fetch holdings
    stmt = (
        select(Holding)
        .where(Holding.user_id == current_user.id)
        .options(selectinload(Holding.stock))
    )
    res = await db.execute(stmt)
    holdings = res.scalars().all()

    total_invested = Decimal("0.0000")
    holding_responses: List[HoldingResponse] = []

    for h in holdings:
        inv_val = h.quantity * h.average_buy_price
        total_invested += inv_val
        holding_responses.append(
            HoldingResponse(
                id=h.id,
                stock_id=h.stock_id,
                symbol=h.stock.symbol if h.stock else "UNKNOWN",
                name=h.stock.name if h.stock else "Unknown Stock",
                quantity=h.quantity,
                average_buy_price=h.average_buy_price,
                invested_value=inv_val,
                current_value=None,
                unrealized_pnl=None,
                market_data_status="NOT_CONFIGURED",
                market_data_message="Market data provider not connected",
            )
        )

    return PortfolioSummaryResponse(
        total_invested_value=total_invested,
        current_portfolio_value=None, # Never fake prices!
        total_unrealized_pnl=None,
        cash_balance=cash_balance,
        provider_status="NOT_CONFIGURED",
        provider_message="Market data provider is not connected yet. Phase 1 foundation active.",
        holdings=holding_responses,
    )
