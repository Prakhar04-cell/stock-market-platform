import json
import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
from urllib.parse import quote as url_quote

import httpx

from app.core.config import settings
from app.core.exceptions import TradeXException
from app.services.market_data.normalizer import (
    CandleData,
    InstrumentData,
    MarketQuote,
    normalize_bharatstock_candle,
    normalize_bharatstock_instrument,
    normalize_bharatstock_quote,
)
from app.services.market_data.provider import MarketDataProvider

logger = logging.getLogger("tradex.bharatstock")


class BharatStockAPIProvider(MarketDataProvider):
    """
    Official BharatStockAPI integration providing reliable fallback market data
    for Indian equities (NSE & BSE) and indices.
    
    Architecture role: FALLBACK provider when primary Upstox feed is unavailable.
    Authentication: X-API-Key header (server-side only, never exposed to frontend).
    Base URL: Configured via MARKET_DATA_API_BASE_URL (defaults to https://bharatstockapi.com).
    """

    def __init__(self):
        self._last_successful_request: Optional[datetime] = None
        self._error_count: int = 0
        self._last_error_message: Optional[str] = None

    @property
    def provider_name(self) -> str:
        return "BharatStockAPI"

    @property
    def base_url(self) -> str:
        url = settings.MARKET_DATA_API_BASE_URL or "https://bharatstockapi.com"
        return url.rstrip("/")

    @property
    def is_configured(self) -> bool:
        """Returns True if the server-side MARKET_DATA_API_KEY is configured."""
        return bool(settings.MARKET_DATA_API_KEY and settings.MARKET_DATA_API_KEY.strip())

    @property
    def is_token_valid(self) -> bool:
        """BharatStockAPI uses permanent API keys; valid if configured."""
        return self.is_configured

    def _get_headers(self) -> Dict[str, str]:
        """
        Constructs authenticated request headers.
        Includes a standard User-Agent to prevent Cloudflare/WAF 403 blocks.
        """
        headers = {
            "Accept": "application/json",
            "User-Agent": "TradeX-BullRun/1.0",
        }
        if self.is_configured:
            headers["X-API-Key"] = settings.MARKET_DATA_API_KEY.strip()
        return headers

    async def _make_request(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        method: str = "GET",
    ) -> Any:
        """
        Internal HTTP client wrapper with robust status translation, timeout handling,
        and JSON validation. Never logs or leaks the API key.
        """
        if not self.is_configured:
            raise TradeXException(
                code="PROVIDER_NOT_CONFIGURED",
                message="BharatStockAPI key is not configured in environment.",
                status_code=503,
            )

        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = self._get_headers()

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                if method.upper() == "GET":
                    resp = await client.get(url, headers=headers, params=params)
                else:
                    resp = await client.post(url, headers=headers, json=params)

                # Status Code Handling
                if resp.status_code == 401:
                    self._error_count += 1
                    self._last_error_message = "Invalid or inactive API key (401)"
                    logger.warning("BharatStockAPI returned 401 Unauthorized: Invalid API key.")
                    raise TradeXException(
                        code="PROVIDER_AUTH_ERROR",
                        message="BharatStockAPI authentication failed: Invalid or inactive API key.",
                        status_code=401,
                    )

                if resp.status_code == 403:
                    self._error_count += 1
                    self._last_error_message = "Access forbidden (403)"
                    logger.warning("BharatStockAPI returned 403 Forbidden.")
                    raise TradeXException(
                        code="PROVIDER_FORBIDDEN",
                        message="BharatStockAPI access forbidden.",
                        status_code=403,
                    )

                if resp.status_code == 404:
                    return None

                if resp.status_code == 429:
                    self._error_count += 1
                    self._last_error_message = "Daily rate limit exceeded (429)"
                    logger.warning("BharatStockAPI rate limit hit (429).")
                    raise TradeXException(
                        code="PROVIDER_RATE_LIMIT",
                        message="BharatStockAPI daily request limit reached.",
                        status_code=429,
                    )

                if resp.status_code >= 500:
                    self._error_count += 1
                    self._last_error_message = f"Server error ({resp.status_code})"
                    logger.error(f"BharatStockAPI server error: {resp.status_code}")
                    raise TradeXException(
                        code="PROVIDER_UNAVAILABLE",
                        message="BharatStockAPI service is temporarily unavailable.",
                        status_code=503,
                    )

                resp.raise_for_status()

                try:
                    data = resp.json()
                except Exception as e:
                    self._error_count += 1
                    self._last_error_message = f"Invalid JSON response: {e}"
                    logger.error("BharatStockAPI response could not be parsed as JSON.")
                    raise TradeXException(
                        code="PROVIDER_MALFORMED_RESPONSE",
                        message="BharatStockAPI returned malformed JSON.",
                        status_code=502,
                    )

                self._last_successful_request = datetime.now(timezone.utc)
                return data

            except httpx.TimeoutException:
                self._error_count += 1
                self._last_error_message = "Request timeout"
                logger.warning(f"Timeout calling BharatStockAPI endpoint: {endpoint}")
                raise TradeXException(
                    code="PROVIDER_TIMEOUT",
                    message="BharatStockAPI request timed out.",
                    status_code=504,
                )
            except TradeXException:
                raise
            except Exception as e:
                self._error_count += 1
                self._last_error_message = str(e)
                logger.error(f"Unexpected error communicating with BharatStockAPI: {e}")
                raise TradeXException(
                    code="PROVIDER_ERROR",
                    message=f"BharatStockAPI provider error: {str(e)}",
                    status_code=502,
                )

    def _extract_symbol(self, symbol_or_key: str) -> str:
        """Extracts clean stock symbol from an instrument key or raw ticker."""
        clean = symbol_or_key.strip().upper()
        if "|" in clean:
            # e.g. NSE_EQ|INE002A01018 or NSE_EQ|RELIANCE
            part = clean.split("|")[-1]
            return part
        if ":" in clean:
            part = clean.split(":")[-1]
            return part
        return clean

    async def get_quote(self, symbol_or_key: str) -> Optional[MarketQuote]:
        """
        Fetch real-time normalized quote for a single symbol or instrument key.
        Tries detailed stock endpoint /v1/stocks/{ticker}, falling back to /v1/stocks/quotes.
        """
        if not self.is_configured or not symbol_or_key:
            return None

        from app.services.market_data.instrument_service import instrument_service
        # Resolve instrument key to trading symbol if it's an ISIN key
        if "|" in symbol_or_key or ":" in symbol_or_key:
            sym = await instrument_service.get_symbol_for_key(symbol_or_key)
        else:
            sym = symbol_or_key.strip().upper()

        if not sym:
            sym = self._extract_symbol(symbol_or_key)

        # Check if it is an index like NIFTY 50
        if sym in ("NIFTY 50", "NIFTY50", "NIFTY", "SENSEX", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY"):
            idx_quotes = await self.get_index_quote(sym)
            if idx_quotes:
                return idx_quotes

        try:
            # 1. Try single stock endpoint
            encoded_sym = url_quote(sym, safe="")
            stock_data = await self._make_request(f"v1/stocks/{encoded_sym}")
            if stock_data and isinstance(stock_data, dict):
                norm = normalize_bharatstock_quote(
                    raw_data=stock_data,
                    symbol_override=sym,
                    instrument_key=symbol_or_key if "|" in symbol_or_key else None,
                )
                if norm.ltp > 0:
                    return norm

            # 2. Fallback to batch quotes endpoint for this single symbol
            batch_data = await self._make_request("v1/stocks/quotes", params={"symbols": sym})
            if batch_data and isinstance(batch_data, list):
                for item in batch_data:
                    if item.get("symbol", "").upper() == sym and item.get("found", True):
                        return normalize_bharatstock_quote(
                            raw_data=item,
                            symbol_override=sym,
                            instrument_key=symbol_or_key if "|" in symbol_or_key else None,
                        )
            return None

        except TradeXException as e:
            if e.status_code == 404:
                return None
            raise
        except Exception as e:
            logger.warning(f"BharatStockAPI get_quote error for {sym}: {e}")
            return None

    async def get_quotes(self, symbols_or_keys: List[str]) -> Dict[str, MarketQuote]:
        """
        Batch fetch quotes for multiple symbols or instrument keys via /v1/stocks/quotes.
        Maps results to both trading symbol and instrument key for instant cache lookup.
        """
        if not self.is_configured or not symbols_or_keys:
            return {}

        from app.services.market_data.instrument_service import instrument_service

        symbol_to_keys: Dict[str, List[str]] = {}
        stock_symbols: List[str] = []
        index_symbols: List[str] = []

        for item in symbols_or_keys:
            clean = item.strip().upper()
            if "|" in clean or ":" in clean:
                sym = await instrument_service.get_symbol_for_key(clean)
                if not sym:
                    sym = self._extract_symbol(clean)
            else:
                sym = clean

            if not sym:
                continue

            symbol_to_keys.setdefault(sym, []).append(item)
            symbol_to_keys[sym].append(sym)

            if sym in ("NIFTY 50", "NIFTY50", "NIFTY", "SENSEX", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY"):
                if sym not in index_symbols:
                    index_symbols.append(sym)
            else:
                if sym not in stock_symbols:
                    stock_symbols.append(sym)

        results: Dict[str, MarketQuote] = {}

        # 1. Fetch stock quotes in chunks of 50
        if stock_symbols:
            chunk_size = 50
            for i in range(0, len(stock_symbols), chunk_size):
                chunk = stock_symbols[i : i + chunk_size]
                syms_param = ",".join(chunk)
                try:
                    raw_list = await self._make_request("v1/stocks/quotes", params={"symbols": syms_param})
                    if raw_list and isinstance(raw_list, list):
                        for item in raw_list:
                            if not item.get("found", True):
                                continue
                            raw_sym = (item.get("symbol") or "").upper()
                            if not raw_sym:
                                continue
                            norm_quote = normalize_bharatstock_quote(raw_data=item, symbol_override=raw_sym)
                            if norm_quote.ltp > 0:
                                # Map to all associated keys/aliases
                                for alias in symbol_to_keys.get(raw_sym, [raw_sym]):
                                    results[alias] = norm_quote
                                    results[alias.upper()] = norm_quote
                                    results[alias.replace(":", "|")] = norm_quote
                except Exception as e:
                    logger.warning(f"BharatStockAPI get_quotes chunk failed for {chunk}: {e}")

        # 2. Fetch index quotes if requested
        if index_symbols:
            for idx_name in index_symbols:
                idx_quote = await self.get_index_quote(idx_name)
                if idx_quote:
                    for alias in symbol_to_keys.get(idx_name, [idx_name]):
                        results[alias] = idx_quote
                        results[alias.upper()] = idx_quote

        return results

    async def get_index_quote(self, index_name: str) -> Optional[MarketQuote]:
        """
        Retrieves latest quote for an index (e.g. NIFTY 50, SENSEX) using /v1/indices/{name}/prices.
        """
        clean_idx = index_name.strip().upper()
        # Canonical index names for BharatStockAPI
        canonical_map = {
            "NIFTY": "NIFTY 50",
            "NIFTY50": "NIFTY 50",
            "NIFTY 50": "NIFTY 50",
            "NSE_INDEX|NIFTY 50": "NIFTY 50",
            "SENSEX": "SENSEX",
            "BSE_INDEX|SENSEX": "SENSEX",
            "BANKNIFTY": "NIFTY BANK",
            "NIFTY BANK": "NIFTY BANK",
            "FINNIFTY": "NIFTY FIN SERVICE",
            "MIDCPNIFTY": "NIFTY MID SELECT",
        }
        api_name = canonical_map.get(clean_idx, clean_idx)

        try:
            encoded_name = url_quote(api_name, safe="")
            raw_prices = await self._make_request(f"v1/indices/{encoded_name}/prices")
            prices = raw_prices.get("data", raw_prices) if isinstance(raw_prices, dict) else raw_prices
            if prices and isinstance(prices, list) and len(prices) > 0:
                latest = prices[0]  # First row is most recent
                close_p = Decimal(str(latest.get("close") or "0"))
                prev_close = Decimal(str(latest.get("open") or close_p))
                if len(prices) > 1:
                    prev_close = Decimal(str(prices[1].get("close") or prev_close))

                chg = close_p - prev_close
                chg_pct = (chg / prev_close * Decimal("100")) if prev_close > 0 else Decimal("0")

                date_str = latest.get("trade_date")
                try:
                    ts = datetime.fromisoformat(f"{date_str}T10:00:00+00:00")
                except Exception:
                    ts = datetime.now(timezone.utc)

                exchange = "BSE" if "SENSEX" in clean_idx else "NSE"
                ikey = f"{exchange}_INDEX|{clean_idx}"

                return MarketQuote(
                    symbol=clean_idx,
                    instrument_key=ikey,
                    exchange=exchange,
                    timestamp=ts,
                    ltp=close_p,
                    open=Decimal(str(latest.get("open") or close_p)),
                    high=Decimal(str(latest.get("high") or close_p)),
                    low=Decimal(str(latest.get("low") or close_p)),
                    close=close_p,
                    previous_close=prev_close,
                    change=round(chg, 4),
                    change_percent=round(chg_pct, 4),
                    volume=0,
                    year_high=None,
                    year_low=None,
                    status="FALLBACK",
                    source="BHARATSTOCKAPI",
                )
        except Exception as e:
            logger.debug(f"Failed to fetch index quote for {clean_idx}: {e}")
        return None

    async def get_historical_candles(
        self,
        instrument_key: str,
        interval: str = "1D",
        to_date: Optional[str] = None,
        from_date: Optional[str] = None,
    ) -> List[CandleData]:
        """
        Fetch historical daily candles for a stock or index from BharatStockAPI.
        Endpoint: GET /v1/stocks/{ticker}/prices or GET /v1/indices/{name}/prices
        """
        if not self.is_configured:
            return []

        from app.services.market_data.instrument_service import instrument_service
        sym = await instrument_service.get_symbol_for_key(instrument_key)
        if not sym:
            sym = self._extract_symbol(instrument_key)

        params: Dict[str, Any] = {"page": 1, "page_size": 100}
        if from_date:
            params["from"] = from_date
        if to_date:
            params["to"] = to_date

        try:
            if "INDEX" in instrument_key or sym in ("NIFTY 50", "NIFTY50", "NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY"):
                canonical_map = {
                    "NIFTY": "NIFTY 50",
                    "NIFTY50": "NIFTY 50",
                    "NIFTY 50": "NIFTY 50",
                    "BANKNIFTY": "NIFTY BANK",
                    "FINNIFTY": "NIFTY FIN SERVICE",
                    "MIDCPNIFTY": "NIFTY MID SELECT",
                }
                api_sym = canonical_map.get(sym, sym)
                encoded = url_quote(api_sym, safe="")
                raw_data = await self._make_request(f"v1/indices/{encoded}/prices", params=params)
            else:
                encoded = url_quote(sym, safe="")
                raw_data = await self._make_request(f"v1/stocks/{encoded}/prices", params=params)

            raw_candles = raw_data.get("data", raw_data) if isinstance(raw_data, dict) else raw_data
            if raw_candles and isinstance(raw_candles, list):
                candles = [normalize_bharatstock_candle(c) for c in raw_candles if isinstance(c, dict)]
                candles.sort(key=lambda c: c.timestamp)
                return candles
        except Exception as e:
            logger.warning(f"BharatStockAPI get_historical_candles error for {sym}: {e}")

        return []

    async def get_intraday_candles(
        self,
        instrument_key: str,
        interval: str = "1m",
    ) -> List[CandleData]:
        """
        BharatStockAPI provides EOD historical data. When intraday is requested as fallback,
        returns latest daily candle sequence to preserve charting functionality.
        """
        return await self.get_historical_candles(instrument_key=instrument_key, interval="1D")

    async def get_movers(self, category: str = "gainers", limit: int = 10) -> List[Dict[str, Any]]:
        """
        Fetch market movers (gainers, losers, active) directly from BharatStockAPI /v1/movers.
        """
        if not self.is_configured:
            return []

        cat = category.lower()
        if cat not in ("gainers", "losers", "active"):
            cat = "gainers"

        try:
            raw_movers = await self._make_request("v1/movers", params={"category": cat, "limit": limit})
            if raw_movers and isinstance(raw_movers, list):
                formatted = []
                for m in raw_movers:
                    if not isinstance(m, dict):
                        continue
                    sym = (m.get("symbol") or "").upper()
                    close_p = float(m.get("close") or 0.0)
                    prev_p = float(m.get("prev_close") or close_p)
                    chg_pct = float(m.get("change_pct") or 0.0)
                    chg = close_p - prev_p

                    formatted.append({
                        "symbol": sym,
                        "name": m.get("company_name") or sym,
                        "exchange": "NSE",
                        "price": close_p,
                        "ltp": close_p,
                        "change": round(chg, 2),
                        "change_percent": round(chg_pct, 2),
                        "is_positive": chg >= 0,
                        "volume": int(m.get("volume") or 0),
                        "status": "FALLBACK",
                        "source": "BHARATSTOCKAPI",
                    })
                return formatted
        except Exception as e:
            logger.warning(f"BharatStockAPI get_movers error for category {cat}: {e}")

        return []

    async def search_instruments(
        self,
        query: str,
        exchange: Optional[str] = None,
    ) -> List[InstrumentData]:
        """
        Search stocks and companies via BharatStockAPI /v1/search.
        """
        if not self.is_configured or not query:
            return []

        try:
            raw_search = await self._make_request("v1/search", params={"q": query.strip(), "limit": 25})
            if raw_search and isinstance(raw_search, list):
                return [
                    normalize_bharatstock_instrument(item)
                    for item in raw_search
                    if isinstance(item, dict) and item.get("symbol")
                ]
        except Exception as e:
            logger.warning(f"BharatStockAPI search_instruments error for query '{query}': {e}")

        return []

    async def get_health(self) -> Dict[str, Any]:
        """Subsystem health telemetry for BharatStockAPI."""
        if not self.is_configured:
            return {
                "status": "not_configured",
                "provider": self.provider_name,
                "role": "fallback",
                "message": "BharatStockAPI key not set in environment.",
            }

        return {
            "status": "healthy" if self._error_count == 0 else "operational",
            "provider": self.provider_name,
            "role": "fallback",
            "base_url": self.base_url,
            "last_successful_request": (
                self._last_successful_request.isoformat() if self._last_successful_request else None
            ),
            "error_count": self._error_count,
            "last_error": self._last_error_message,
        }


# Singleton instance
bharatstock_provider = BharatStockAPIProvider()
