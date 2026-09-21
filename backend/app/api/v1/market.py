import logging
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status

from app.core.exceptions import ResourceNotFoundError, TradeXException
from app.services.market_data.candle_service import candle_service
from app.services.market_data.instrument_service import instrument_service
from app.services.market_data.normalizer import CandleData, InstrumentData, MarketQuote
from app.services.market_data.quote_service import quote_service
from app.services.market_data.upstox_provider import UpstoxAuthRequiredError, upstox_provider

logger = logging.getLogger("tradex.api.market")

router = APIRouter(prefix="/market", tags=["Market Data (Normalized)"])


@router.get("/quote/{symbol}", response_model=MarketQuote, summary="Get normalized quote for a stock or index")
async def get_quote(symbol: str):
    """
    Retrieves real-time normalized quote for a symbol (e.g. RELIANCE, TCS, NIFTY 50).
    Normalized into standard TradeX model.
    """
    sym = symbol.strip().upper()
    quote = await quote_service.get_quote(sym)
    if not quote:
        raise ResourceNotFoundError(resource="MarketQuote", identifier=sym)
    return quote


@router.get("/quotes", response_model=Dict[str, MarketQuote], summary="Batch fetch market quotes")
async def get_batch_quotes(
    symbols: str = Query(..., description="Comma-separated list of symbols (e.g. RELIANCE,TCS,INFY)"),
):
    """Batch fetch real market quotes for multiple symbols."""
    sym_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if not sym_list:
        return {}
    return await quote_service.get_quotes(sym_list)


@router.get("/candles/{symbol}", response_model=List[CandleData], summary="Get historical or intraday chart candles")
async def get_candles(
    symbol: str,
    interval: str = Query("1D", description="Timeframe: 1m, 5m, 15m, 30m, 1h, 1D, 1W, 1M"),
    from_date: Optional[str] = Query(None, alias="from", description="From date YYYY-MM-DD"),
    to_date: Optional[str] = Query(None, alias="to", description="To date YYYY-MM-DD"),
):
    """
    Retrieves normalized candlestick OHLCV data for TradingView Lightweight Charts.
    """
    sym = symbol.strip().upper()
    return await candle_service.get_candles(
        symbol_or_key=sym,
        interval=interval,
        to_date=to_date,
        from_date=from_date,
    )


@router.get("/search", response_model=List[InstrumentData], summary="Search instruments master")
@router.get("/instruments/search", response_model=List[InstrumentData], summary="Search instruments master")
async def search_instruments(
    query: str = Query(..., min_length=1, description="Search query across symbol, name, ISIN, key"),
    exchange: Optional[str] = Query(None, description="Optional exchange filter: NSE, BSE, MCX"),
    limit: int = Query(25, ge=1, le=100),
):
    """
    Global instrument search for top search bar and autocomplete.
    Supports stocks, indices, futures, options, MCX.
    """
    return await instrument_service.search_instruments(
        query=query,
        exchange=exchange,
        limit=limit,
    )


@router.get("/ticker", summary="Get configured top indices ticker data")
async def get_index_ticker():
    """
    Returns real values for configured headline indices:
    NIFTY 50, SENSEX, BANKNIFTY, MIDCPNIFTY, FINNIFTY.
    """
    indices = ["NIFTY 50", "SENSEX", "BANKNIFTY", "MIDCPNIFTY", "FINNIFTY"]
    quotes = await quote_service.get_quotes(indices)

    results = []
    for idx_name in indices:
        q = quotes.get(idx_name)
        if q:
            results.append({
                "name": idx_name,
                "symbol": q.symbol,
                "instrument_key": q.instrument_key,
                "value": float(q.ltp),
                "ltp": float(q.ltp),
                "change": float(q.change) if q.change is not None else 0.0,
                "change_percent": float(q.change_percent) if q.change_percent is not None else 0.0,
                "is_positive": (q.change or 0) >= 0,
                "status": q.status,
            })
        else:
            results.append({
                "name": idx_name,
                "symbol": idx_name,
                "instrument_key": None,
                "value": None,
                "ltp": None,
                "change": None,
                "change_percent": None,
                "is_positive": True,
                "status": "UNAVAILABLE",
            })

    return {
        "indices": results,
        "provider": "upstox",
        "provider_configured": upstox_provider.is_configured,
    }
