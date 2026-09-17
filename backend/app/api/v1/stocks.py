from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.exceptions import ResourceNotFoundError
from app.models.market import Exchange, Stock
from app.schemas.stocks import StockDetailResponse, StockResponse

router = APIRouter(prefix="/stocks", tags=["Stocks & Markets"])


def _to_stock_response(stock: Stock) -> StockResponse:
    return StockResponse(
        id=stock.id,
        exchange_code=stock.exchange.code if stock.exchange else "NSE",
        symbol=stock.symbol,
        name=stock.name,
        isin=stock.isin,
        sector=stock.sector,
        lot_size=stock.lot_size,
        tick_size=stock.tick_size,
        is_tradable=stock.is_tradable,
        market_data_status="NOT_CONFIGURED",
        market_data_message="Market data provider is not connected yet. Phase 1 foundation active.",
        ltp=None,
        day_change=None,
        day_change_percent=None,
    )


@router.get("", response_model=List[StockResponse], summary="List and search stocks")
async def list_stocks(
    search: Optional[str] = Query(None, description="Search by symbol or company name"),
    exchange: Optional[str] = Query(None, description="Filter by exchange code (e.g. NSE, BSE)"),
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List tradable stocks across exchanges."""
    stmt = select(Stock).options(selectinload(Stock.exchange))

    if search:
        term = f"%{search.strip().upper()}%"
        stmt = stmt.where(or_(Stock.symbol.ilike(term), Stock.name.ilike(term)))

    if exchange:
        stmt = stmt.join(Stock.exchange).where(Exchange.code == exchange.upper())

    stmt = stmt.offset(offset).limit(limit)
    res = await db.execute(stmt)
    stocks = res.scalars().all()
    return [_to_stock_response(s) for s in stocks]


@router.get("/{symbol}", response_model=StockDetailResponse, summary="Get stock details by symbol")
async def get_stock_by_symbol(
    symbol: str,
    exchange: str = "NSE",
    db: AsyncSession = Depends(get_db),
):
    """Retrieve stock profile, company information, and market structure."""
    sym = symbol.strip().upper()
    stmt = (
        select(Stock)
        .options(selectinload(Stock.exchange))
        .where(Stock.symbol == sym)
    )
    res = await db.execute(stmt)
    stock = res.scalar_one_or_none()

    if not stock:
        raise ResourceNotFoundError(resource="Stock", identifier=sym)

    return StockDetailResponse(
        id=stock.id,
        exchange_code=stock.exchange.code if stock.exchange else exchange,
        symbol=stock.symbol,
        name=stock.name,
        isin=stock.isin,
        sector=stock.sector,
        lot_size=stock.lot_size,
        tick_size=stock.tick_size,
        is_tradable=stock.is_tradable,
        market_data_status="NOT_CONFIGURED",
        market_data_message="Market data provider is not connected yet. Phase 1 foundation active.",
        ltp=None,
        day_change=None,
        day_change_percent=None,
        market_stats={
            "status": "NOT_CONFIGURED",
            "message": "Real-time quote engine not connected in Phase 1.",
            "open": None,
            "high": None,
            "low": None,
            "close": None,
            "volume": None,
            "52w_high": None,
            "52w_low": None,
        },
        company_info={
            "description": f"{stock.name} is a publicly traded company on {stock.exchange.code if stock.exchange else 'NSE'}.",
            "sector": stock.sector or "General",
            "isin": stock.isin or "N/A",
        },
        chart_compatible_format="TradingView_Lightweight_Charts_v4",
    )
