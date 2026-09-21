from decimal import Decimal
from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.portfolio import HoldingResponse, PortfolioSummaryResponse
from app.services.paper_trading.portfolio_service import portfolio_service

router = APIRouter(tags=["Portfolio, Holdings & Positions"])


@router.get("/portfolio", response_model=PortfolioSummaryResponse, summary="Get user portfolio summary and holdings")
async def get_portfolio(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve user paper trading portfolio holdings, invested value, and real-time P&L.
    Uses Python Decimal throughout for authoritative calculations.
    """
    summary = await portfolio_service.get_portfolio_summary(current_user.id, db)

    holdings_resp = [
        HoldingResponse(
            id=h["id"],
            stock_id=h["stock_id"],
            symbol=h["symbol"],
            name=h["name"],
            quantity=h["quantity"],
            average_buy_price=h["average_buy_price"],
            invested_value=h["invested_value"],
            current_price=h["current_price"],
            current_value=h["current_value"],
            unrealized_pnl=h["unrealized_pnl"],
            pnl_percent=h["pnl_percent"],
            day_change=h["day_change"],
            day_change_percent=h["day_change_percent"],
            market_data_status=h["status"],
            market_data_message=None if h["status"] == "LIVE" else "Market price unavailable or stale",
        )
        for h in summary["holdings"]
    ]

    return PortfolioSummaryResponse(
        total_invested_value=summary["invested_value"],
        current_portfolio_value=summary["portfolio_value"],
        total_unrealized_pnl=summary["unrealized_pnl"],
        realized_pnl=summary["realized_pnl"],
        total_pnl=summary["total_pnl"],
        cash_balance=summary["available_cash"],
        available_cash=summary["available_cash"],
        provider_status=summary["provider_status"],
        provider_message=None if summary["provider_status"] == "healthy" else "Connect Upstox to view live market valuations",
        holdings=holdings_resp,
    )


@router.get("/holdings", response_model=List[HoldingResponse], summary="List virtual holdings with live market metrics")
async def get_holdings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List long-term paper stock holdings with live prices and unrealized P&L."""
    summary = await portfolio_service.get_portfolio_summary(current_user.id, db)
    return [
        HoldingResponse(
            id=h["id"],
            stock_id=h["stock_id"],
            symbol=h["symbol"],
            name=h["name"],
            quantity=h["quantity"],
            average_buy_price=h["average_buy_price"],
            invested_value=h["invested_value"],
            current_price=h["current_price"],
            current_value=h["current_value"],
            unrealized_pnl=h["unrealized_pnl"],
            pnl_percent=h["pnl_percent"],
            day_change=h["day_change"],
            day_change_percent=h["day_change_percent"],
            market_data_status=h["status"],
            market_data_message=None if h["status"] == "LIVE" else "Market price unavailable or stale",
        )
        for h in summary["holdings"]
    ]


@router.get("/positions", response_model=List[HoldingResponse], summary="List active paper positions")
async def get_positions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List active intraday/delivery paper positions.
    Fields: Symbol, Quantity, Average price, LTP, Invested, Current, P&L, P&L %.
    """
    return await get_holdings(current_user, db)
