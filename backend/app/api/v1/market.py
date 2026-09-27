import logging
from typing import Dict, List, Optional, TypedDict
from fastapi import APIRouter, Depends, Query, status

from urllib.parse import unquote
from app.core.exceptions import ResourceNotFoundError, TradeXException
from app.services.market_data.candle_service import candle_service
from app.services.market_data.instrument_service import instrument_service
from app.services.market_data.normalizer import CandleData, InstrumentData, MarketQuote
from app.services.market_data.quote_service import quote_service
from app.services.market_data.upstox_provider import UpstoxAuthRequiredError, upstox_provider
from app.services.providers.bharatstock_provider import bharatstock_provider

logger = logging.getLogger("tradex.api.market")

router = APIRouter(prefix="/market", tags=["Market Data (Normalized)"])


@router.get("/quote/{symbol}", response_model=MarketQuote, summary="Get normalized quote for a stock or index")
async def get_quote(symbol: str):
    """
    Retrieves real-time normalized quote for a symbol (e.g. RELIANCE, TCS, NIFTY 50).
    Normalized into standard TradeX model.
    """
    sym = unquote(symbol).strip().upper()
    quote = await quote_service.get_quote(sym)
    if not quote:
        raise ResourceNotFoundError(resource="MarketQuote", identifier=sym)
    return quote


@router.get("/quotes", response_model=Dict[str, MarketQuote], summary="Batch fetch market quotes")
async def get_batch_quotes(
    symbols: str = Query(..., description="Comma-separated list of symbols (e.g. RELIANCE,TCS,INFY)"),
):
    """Batch fetch real market quotes for multiple symbols."""
    sym_list = [unquote(s).strip().upper() for s in symbols.split(",") if s.strip()]
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
    sym = unquote(symbol).strip().upper()
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
    clean_query = unquote(query).strip()
    return await instrument_service.search_instruments(
        query=clean_query,
        exchange=exchange,
        limit=limit,
    )



@router.get("/ticker", summary="Get configured top indices ticker data")
async def get_index_ticker():
    """
    Returns real values for configured headline indices:
    NIFTY 50, SENSEX, BANKNIFTY, MIDCPNIFTY, FINNIFTY.
    """
    class IndexConfig(TypedDict):
        name: str
        aliases: List[str]

    indices_config: List[IndexConfig] = [
        {"name": "NIFTY 50", "aliases": ["NIFTY 50", "NSE_INDEX|Nifty 50", "NIFTY50", "NIFTY"]},
        {"name": "SENSEX", "aliases": ["SENSEX", "BSE_INDEX|SENSEX"]},
        {"name": "BANKNIFTY", "aliases": ["BANKNIFTY", "NIFTY BANK", "NSE_INDEX|Nifty Bank"]},
        {"name": "MIDCPNIFTY", "aliases": ["MIDCPNIFTY", "NIFTY MID SELECT", "NSE_INDEX|NIFTY MID SELECT"]},
        {"name": "FINNIFTY", "aliases": ["FINNIFTY", "NIFTY FIN SERVICE", "NSE_INDEX|Nifty Fin Service"]},
    ]
    query_symbols = [cfg["name"] for cfg in indices_config]
    quotes = await quote_service.get_quotes(query_symbols)

    results = []
    for cfg in indices_config:
        idx_name = cfg["name"]
        q = None
        for alias in cfg["aliases"]:
            q = quotes.get(alias) or quotes.get(alias.upper())
            if q:
                break

        if q and q.ltp and q.ltp > 0:
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

    # Determine effective data provider
    has_live = any(r.get("status") == "LIVE" for r in results)
    has_fallback = any(r.get("status") == "FALLBACK" for r in results)
    effective_provider = "UPSTOX" if has_live else ("BHARATSTOCKAPI" if has_fallback else "UNAVAILABLE")

    return {
        "indices": results,
        "provider": effective_provider,
        "provider_configured": upstox_provider.is_configured or bharatstock_provider.is_configured,
        "is_fallback": has_fallback and not has_live,
    }


@router.get("/movers", summary="Get top gainers, top losers, and most active stocks")
async def get_market_movers():
    """
    Returns real top gainers, losers, and most active stocks based on real market quotes.
    Primary: Upstox tracked quotes.
    Fallback: BharatStockAPI dedicated /v1/movers endpoint.
    Strictly uses actual real-time market data without inventing fake prices.
    """
    tracked_stocks = [
        "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN",
        "BHARTIARTL", "ITC", "KOTAKBANK", "LT", "AXISBANK", "WIPRO",
        "MARUTI", "TATAMOTORS", "TITAN"
    ]
    quotes_map = await quote_service.get_quotes(tracked_stocks)

    items = []
    has_fallback_item = False
    for sym in tracked_stocks:
        q = quotes_map.get(sym)
        if q and q.ltp and q.ltp > 0:
            if q.status == "FALLBACK" or getattr(q, "source", None) == "BHARATSTOCKAPI":
                has_fallback_item = True
            chg = float(q.change) if q.change is not None else 0.0
            chg_pct = float(q.change_percent) if q.change_percent is not None else 0.0
            items.append({
                "symbol": q.symbol,
                "name": q.symbol,
                "exchange": q.exchange or "NSE",
                "price": float(q.ltp),
                "ltp": float(q.ltp),
                "change": chg,
                "change_percent": chg_pct,
                "is_positive": chg >= 0,
                "volume": q.volume or 0,
                "status": q.status,
                "source": getattr(q, "source", "UPSTOX"),
            })

    # If quotes_map yielded valid items, compute movers from them
    if items:
        gainers = sorted([i for i in items if i["change"] > 0], key=lambda x: x["change_percent"], reverse=True)[:5]
        losers = sorted([i for i in items if i["change"] < 0], key=lambda x: x["change_percent"])[:5]
        most_active = sorted(items, key=lambda x: x["volume"] if x["volume"] > 0 else x["price"], reverse=True)[:5]
        effective_provider = "BHARATSTOCKAPI" if has_fallback_item else "UPSTOX"
        effective_status = "FALLBACK" if has_fallback_item else "LIVE"

        return {
            "gainers": gainers,
            "losers": losers,
            "most_active": most_active,
            "volume_shockers": most_active,
            "total_tracked": len(items),
            "provider": effective_provider,
            "status": effective_status,
        }

    # If primary Upstox yielded no quotes, query BharatStockAPI dedicated /v1/movers endpoint directly
    if bharatstock_provider.is_configured:
        try:
            fb_gainers = await bharatstock_provider.get_movers(category="gainers", limit=5)
            fb_losers = await bharatstock_provider.get_movers(category="losers", limit=5)
            fb_active = await bharatstock_provider.get_movers(category="active", limit=5)

            if fb_gainers or fb_losers or fb_active:
                return {
                    "gainers": fb_gainers,
                    "losers": fb_losers,
                    "most_active": fb_active,
                    "volume_shockers": fb_active,
                    "total_tracked": len(fb_gainers) + len(fb_losers) + len(fb_active),
                    "provider": "BHARATSTOCKAPI",
                    "status": "FALLBACK",
                }
        except Exception as e:
            logger.warning(f"Failed to fetch market movers from BharatStockAPI fallback: {e}")

    # Return honest unavailable state
    return {
        "gainers": [],
        "losers": [],
        "most_active": [],
        "volume_shockers": [],
        "total_tracked": 0,
        "provider": "NONE",
        "status": "UNAVAILABLE",
    }


@router.get("/status", summary="Get market data provider status and priority telemetry")
async def get_market_data_status():
    """
    Returns telemetry for primary (Upstox) and fallback (BharatStockAPI) providers.
    Decoupled from client code and safe for dashboards/admin.
    """
    upstox_health = await upstox_provider.get_health()
    bharat_health = await bharatstock_provider.get_health()

    return {
        "architecture": {
            "primary": "UPSTOX",
            "fallback": "BHARATSTOCKAPI",
            "cache": "REDIS",
        },
        "providers": {
            "upstox": upstox_health,
            "bharatstock": bharat_health,
        },
        "active_fallback": not upstox_provider.is_configured or not upstox_provider.is_token_valid,
    }

