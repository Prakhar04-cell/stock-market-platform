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


class ConstituentMeta(TypedDict):
    symbol: str
    name: str
    sector: str
    weight: float


# Reference Constituent definitions for benchmark indices
NIFTY_50_CONSTITUENTS: List[ConstituentMeta] = [
    {"symbol": "RELIANCE", "name": "Reliance Industries Ltd", "sector": "Energy & Oil", "weight": 9.8},
    {"symbol": "HDFCBANK", "name": "HDFC Bank Ltd", "sector": "Banking & Financials", "weight": 11.2},
    {"symbol": "ICICIBANK", "name": "ICICI Bank Ltd", "sector": "Banking & Financials", "weight": 8.1},
    {"symbol": "INFY", "name": "Infosys Ltd", "sector": "Technology & IT", "weight": 6.2},
    {"symbol": "TCS", "name": "Tata Consultancy Services", "sector": "Technology & IT", "weight": 4.3},
    {"symbol": "ITC", "name": "ITC Ltd", "sector": "FMCG & Consumer", "weight": 3.8},
    {"symbol": "BHARTIARTL", "name": "Bharti Airtel Ltd", "sector": "Telecommunications", "weight": 4.1},
    {"symbol": "LT", "name": "Larsen & Toubro Ltd", "sector": "Construction & Infrastructure", "weight": 3.9},
    {"symbol": "SBIN", "name": "State Bank of India", "sector": "Banking & Financials", "weight": 3.2},
    {"symbol": "AXISBANK", "name": "Axis Bank Ltd", "sector": "Banking & Financials", "weight": 3.1},
    {"symbol": "KOTAKBANK", "name": "Kotak Mahindra Bank Ltd", "sector": "Banking & Financials", "weight": 2.8},
    {"symbol": "MARUTI", "name": "Maruti Suzuki India Ltd", "sector": "Automobile", "weight": 1.8},
    {"symbol": "TATAMOTORS", "name": "Tata Motors Ltd", "sector": "Automobile", "weight": 1.7},
    {"symbol": "SUNPHARMA", "name": "Sun Pharmaceutical Industries", "sector": "Pharma & Healthcare", "weight": 1.6},
    {"symbol": "TITAN", "name": "Titan Company Ltd", "sector": "Consumer Durables", "weight": 1.5},
    {"symbol": "BAJFINANCE", "name": "Bajaj Finance Ltd", "sector": "Banking & Financials", "weight": 2.1},
    {"symbol": "ASIANPAINT", "name": "Asian Paints Ltd", "sector": "Consumer Durables", "weight": 1.3},
    {"symbol": "HCLTECH", "name": "HCL Technologies Ltd", "sector": "Technology & IT", "weight": 1.5},
    {"symbol": "M&M", "name": "Mahindra & Mahindra Ltd", "sector": "Automobile", "weight": 2.2},
    {"symbol": "NTPC", "name": "NTPC Ltd", "sector": "Energy & Utilities", "weight": 1.6},
    {"symbol": "ONGC", "name": "Oil & Natural Gas Corporation", "sector": "Energy & Oil", "weight": 1.1},
    {"symbol": "POWERGRID", "name": "Power Grid Corporation", "sector": "Energy & Utilities", "weight": 1.2},
    {"symbol": "ULTRACEMCO", "name": "UltraTech Cement Ltd", "sector": "Materials & Cement", "weight": 1.2},
    {"symbol": "NESTLEIND", "name": "Nestle India Ltd", "sector": "FMCG & Consumer", "weight": 1.0},
    {"symbol": "TATASTEEL", "name": "Tata Steel Ltd", "sector": "Metals & Mining", "weight": 1.1},
    {"symbol": "JSWSTEEL", "name": "JSW Steel Ltd", "sector": "Metals & Mining", "weight": 0.9},
    {"symbol": "ADANIENT", "name": "Adani Enterprises Ltd", "sector": "Metals & Mining", "weight": 1.0},
    {"symbol": "ADANIPORTS", "name": "Adani Ports & SEZ Ltd", "sector": "Infrastructure & Logistics", "weight": 1.1},
    {"symbol": "COALINDIA", "name": "Coal India Ltd", "sector": "Energy & Utilities", "weight": 0.8},
    {"symbol": "BAJAJFINSV", "name": "Bajaj Finserv Ltd", "sector": "Banking & Financials", "weight": 0.9},
    {"symbol": "TECHM", "name": "Tech Mahindra Ltd", "sector": "Technology & IT", "weight": 0.8},
    {"symbol": "HINDUNILVR", "name": "Hindustan Unilever Ltd", "sector": "FMCG & Consumer", "weight": 2.4},
    {"symbol": "CIPLA", "name": "Cipla Ltd", "sector": "Pharma & Healthcare", "weight": 0.7},
    {"symbol": "DRREDDY", "name": "Dr. Reddy's Laboratories", "sector": "Pharma & Healthcare", "weight": 0.6},
    {"symbol": "DIVISLAB", "name": "Divi's Laboratories Ltd", "sector": "Pharma & Healthcare", "weight": 0.6},
    {"symbol": "WIPRO", "name": "Wipro Ltd", "sector": "Technology & IT", "weight": 0.7},
]

BANKNIFTY_CONSTITUENTS: List[ConstituentMeta] = [
    {"symbol": "HDFCBANK", "name": "HDFC Bank Ltd", "sector": "Private Bank", "weight": 29.1},
    {"symbol": "ICICIBANK", "name": "ICICI Bank Ltd", "sector": "Private Bank", "weight": 24.3},
    {"symbol": "SBIN", "name": "State Bank of India", "sector": "Public Sector Bank", "weight": 11.2},
    {"symbol": "KOTAKBANK", "name": "Kotak Mahindra Bank Ltd", "sector": "Private Bank", "weight": 10.4},
    {"symbol": "AXISBANK", "name": "Axis Bank Ltd", "sector": "Private Bank", "weight": 9.8},
    {"symbol": "INDUSINDBK", "name": "IndusInd Bank Ltd", "sector": "Private Bank", "weight": 4.9},
    {"symbol": "BANKBARODA", "name": "Bank of Baroda", "sector": "Public Sector Bank", "weight": 3.1},
    {"symbol": "PNB", "name": "Punjab National Bank", "sector": "Public Sector Bank", "weight": 2.2},
    {"symbol": "AUBANK", "name": "AU Small Finance Bank", "sector": "Small Finance Bank", "weight": 1.8},
    {"symbol": "FEDERALBNK", "name": "Federal Bank Ltd", "sector": "Private Bank", "weight": 1.6},
    {"symbol": "IDFCFIRSTB", "name": "IDFC First Bank Ltd", "sector": "Private Bank", "weight": 1.1},
    {"symbol": "BANDHANBNK", "name": "Bandhan Bank Ltd", "sector": "Private Bank", "weight": 0.5},
]


@router.get("/indices/{symbol}", summary="Get detailed index overview, real-time quote, market breadth, and constituents")
async def get_index_details(symbol: str):
    """
    Returns comprehensive index overview inspired by Groww Nifty Index view:
    - Live index quote (LTP, change, OHLC, 52W range)
    - Calculated market breadth (advances, declines, unchanged) based on real constituent quotes
    - Verified constituent stocks with weights, live prices, and sector tags
    """
    clean_sym = unquote(symbol).strip().upper().replace("-", " ")
    constituents_meta: List[ConstituentMeta]
    
    # Normalize index alias
    if clean_sym in ["NIFTY", "NIFTY 50", "NIFTY50"]:
        target_name = "NIFTY 50"
        display_name = "NIFTY 50 Index"
        category = "Benchmark Index"
        exchange = "NSE"
        instrument_key = "NSE_INDEX|Nifty 50"
        description = "National Stock Exchange flagship benchmark index representing 50 premier large-cap companies across 13 diverse sectors."
        constituents_meta = NIFTY_50_CONSTITUENTS
    elif clean_sym in ["BANKNIFTY", "NIFTY BANK", "BANK NIFTY"]:
        target_name = "BANKNIFTY"
        display_name = "NIFTY Bank Index"
        category = "Sectoral Index"
        exchange = "NSE"
        instrument_key = "NSE_INDEX|Nifty Bank"
        description = "Benchmark sectoral index comprising the 12 most liquid and large-capitalized banking stocks listed on the National Stock Exchange."
        constituents_meta = BANKNIFTY_CONSTITUENTS
    elif clean_sym in ["FINNIFTY", "NIFTY FIN SERVICE", "FIN NIFTY"]:
        target_name = "FINNIFTY"
        display_name = "NIFTY Financial Services Index"
        category = "Sectoral Index"
        exchange = "NSE"
        instrument_key = "NSE_INDEX|Nifty Fin Service"
        description = "Index representing Indian financial institutions including banks, NBFCs, insurance, and housing finance companies."
        constituents_meta = [c for c in NIFTY_50_CONSTITUENTS if "Bank" in c["sector"] or "Financial" in c["sector"]]
    elif clean_sym in ["SENSEX", "BSE SENSEX"]:
        target_name = "SENSEX"
        display_name = "BSE SENSEX Index"
        category = "Benchmark Index"
        exchange = "BSE"
        instrument_key = "BSE_INDEX|SENSEX"
        description = "Bombay Stock Exchange 30-stock benchmark index tracking the largest and most actively traded companies on the BSE."
        constituents_meta = NIFTY_50_CONSTITUENTS[:30]
    elif clean_sym in ["MIDCPNIFTY", "NIFTY MID SELECT", "MIDCAP NIFTY"]:
        target_name = "MIDCPNIFTY"
        display_name = "NIFTY Midcap Select Index"
        category = "Midcap Index"
        exchange = "NSE"
        instrument_key = "NSE_INDEX|NIFTY MID SELECT"
        description = "Tracks the performance of a focused portfolio of 25 top midcap stocks from the Nifty Midcap 150 index."
        constituents_meta = NIFTY_50_CONSTITUENTS[20:]
    else:
        raise ResourceNotFoundError(resource="Index", identifier=clean_sym)

    # 1. Fetch live index quote
    idx_quote = await quote_service.get_quote(target_name)

    # 2. Batch fetch real quotes for constituents
    constituent_symbols = [c["symbol"] for c in constituents_meta]
    quotes_map = await quote_service.get_quotes(constituent_symbols)

    # 3. Build enriched constituents & calculate real market breadth
    advances = 0
    declines = 0
    unchanged = 0
    enriched_constituents = []

    for c in constituents_meta:
        q = quotes_map.get(c["symbol"])
        ltp = float(q.ltp) if q and q.ltp is not None else 0.0
        change = float(q.change) if q and q.change is not None else 0.0
        change_pct = float(q.change_percent) if q and q.change_percent is not None else 0.0
        vol = q.volume if q and q.volume else 0
        stat = q.status if q else "UNAVAILABLE"

        if change > 0:
            advances += 1
        elif change < 0:
            declines += 1
        else:
            unchanged += 1

        enriched_constituents.append({
            "symbol": c["symbol"],
            "name": c["name"],
            "sector": c["sector"],
            "weight": c["weight"],
            "ltp": ltp,
            "change": change,
            "change_percent": change_pct,
            "volume": vol,
            "is_positive": change >= 0,
            "status": stat,
        })

    ad_ratio = round(advances / declines, 2) if declines > 0 else float(advances)

    ltp_val = float(idx_quote.ltp) if idx_quote and idx_quote.ltp is not None else None
    chg_val = float(idx_quote.change) if idx_quote and idx_quote.change is not None else None
    chg_pct_val = float(idx_quote.change_percent) if idx_quote and idx_quote.change_percent is not None else None

    return {
        "index": {
            "symbol": target_name,
            "name": display_name,
            "category": category,
            "exchange": exchange,
            "instrument_key": instrument_key,
            "description": description,
        },
        "quote": {
            "ltp": ltp_val,
            "change": chg_val,
            "change_percent": chg_pct_val,
            "is_positive": (chg_val or 0) >= 0,
            "open": float(idx_quote.open) if idx_quote and idx_quote.open else None,
            "high": float(idx_quote.high) if idx_quote and idx_quote.high else None,
            "low": float(idx_quote.low) if idx_quote and idx_quote.low else None,
            "close": float(idx_quote.close) if idx_quote and idx_quote.close else None,
            "year_high": float(idx_quote.year_high) if idx_quote and idx_quote.year_high else None,
            "year_low": float(idx_quote.year_low) if idx_quote and idx_quote.year_low else None,
            "status": idx_quote.status if idx_quote else "UNAVAILABLE",
            "timestamp": idx_quote.timestamp.isoformat() if idx_quote and idx_quote.timestamp else None,
        },
        "breadth": {
            "advances": advances,
            "declines": declines,
            "unchanged": unchanged,
            "advance_decline_ratio": ad_ratio,
            "total_constituents": len(enriched_constituents),
        },
        "constituents": enriched_constituents,
        "provider": getattr(idx_quote, "source", "UPSTOX") if idx_quote else "NONE",
    }

