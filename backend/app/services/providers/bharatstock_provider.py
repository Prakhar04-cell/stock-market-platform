import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
from urllib.parse import quote as url_quote

import httpx
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.exceptions import TradeXException
from app.core.redis import get_redis
from app.models.system import ProviderCredential, SystemSetting
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
    Credentials: Dynamically loaded from environment, Redis, or PostgreSQL DB.
    """

    def __init__(self):
        self._last_successful_request: Optional[datetime] = None
        self._error_count: int = 0
        self._last_error_message: Optional[str] = None
        self._cached_api_key: Optional[str] = None
        self._cached_base_url: Optional[str] = None
        self._last_cred_check: float = 0.0

    @property
    def provider_name(self) -> str:
        return "BharatStockAPI"

    def get_api_key(self) -> Optional[str]:
        """Returns the active API key from environment override or dynamic cache."""
        if settings.MARKET_DATA_API_KEY and settings.MARKET_DATA_API_KEY.strip():
            return settings.MARKET_DATA_API_KEY.strip()
        if self._cached_api_key and self._cached_api_key.strip():
            return self._cached_api_key.strip()
        return None

    async def ensure_configured(self) -> bool:
        """
        Dynamically discovers and loads the BharatStock API key and base URL from:
        1. settings.MARKET_DATA_API_KEY
        2. In-memory cached key
        3. Upstash Redis (market:config:api_key)
        4. PostgreSQL database (system_settings / provider_credentials)
        """
        if self.get_api_key():
            return True

        now = time.time()
        # Avoid hammering DB if checked within last 10 seconds
        if (now - self._last_cred_check < 10.0) and self._last_cred_check > 0:
            return bool(self.get_api_key())
        self._last_cred_check = now

        # 1. Try Upstash Redis cache
        try:
            redis = await get_redis()
            if redis:
                key_from_redis = await redis.get("market:config:api_key")
                if key_from_redis:
                    self._cached_api_key = key_from_redis.strip()
                    url_from_redis = await redis.get("market:config:base_url")
                    if url_from_redis:
                        self._cached_base_url = url_from_redis.strip()
                    return True
        except Exception as e:
            logger.debug(f"Redis lookup for market data key failed: {e}")

        # 2. Try PostgreSQL database (shared between Render & local)
        is_test_env = "pytest" in sys.modules or os.environ.get("PYTEST_CURRENT_TEST") is not None
        if not is_test_env:
            try:
                async with AsyncSessionLocal() as db:
                    # Check provider_credentials table
                    stmt = (
                        select(ProviderCredential)
                        .where(ProviderCredential.provider_name == "bharatstock", ProviderCredential.is_active.is_(True))
                        .order_by(ProviderCredential.created_at.desc())
                    )
                    cred = (await db.execute(stmt)).scalar_one_or_none()
                    if cred and cred.access_token:
                        self._cached_api_key = cred.access_token.strip()
                        if cred.extra_data and isinstance(cred.extra_data, dict):
                            b_url = cred.extra_data.get("base_url")
                            if b_url:
                                self._cached_base_url = b_url.strip()
                        return True

                    # Check system_settings table
                    stmt2 = select(SystemSetting).where(SystemSetting.key == "MARKET_DATA_API_KEY")
                    setting = (await db.execute(stmt2)).scalar_one_or_none()
                    if setting and setting.value:
                        self._cached_api_key = setting.value.strip()
                        stmt3 = select(SystemSetting).where(SystemSetting.key == "MARKET_DATA_API_BASE_URL")
                        url_setting = (await db.execute(stmt3)).scalar_one_or_none()
                        if url_setting and url_setting.value:
                            self._cached_base_url = url_setting.value.strip()
                        return True
            except Exception as e:
                logger.debug(f"DB lookup for market data key failed: {e}")

        return bool(self.get_api_key())

    @property
    def base_url(self) -> str:
        url = settings.MARKET_DATA_API_BASE_URL or self._cached_base_url or "https://bharatstockapi.com"
        return url.rstrip("/")

    @property
    def is_configured(self) -> bool:
        """Returns True if the server-side MARKET_DATA_API_KEY is configured."""
        return bool(self.get_api_key())

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
        api_key = self.get_api_key()
        if api_key:
            headers["X-API-Key"] = api_key
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
            await self.ensure_configured()

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
        if not self.is_configured:
            await self.ensure_configured()
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
            logger.info(f"[MARKET-DATA] Provider: BharatStockAPI")
            logger.info(f"[MARKET-DATA] Symbol: {sym}")
            # 1. Try single stock endpoint
            encoded_sym = url_quote(sym, safe="")
            stock_data = await self._make_request(f"v1/stocks/{encoded_sym}")
            if stock_data and isinstance(stock_data, dict):
                logger.info(f"[MARKET-DATA] Request successful: true")
                norm = normalize_bharatstock_quote(
                    raw_data=stock_data,
                    symbol_override=sym,
                    instrument_key=symbol_or_key if "|" in symbol_or_key else None,
                )
                if norm.ltp > 0:
                    logger.info(f"[MARKET-DATA] Response mapped: true")
                    return norm

            # 2. Fallback to batch quotes endpoint for this single symbol
            batch_data = await self._make_request("v1/stocks/quotes", params={"symbols": sym})
            if batch_data and isinstance(batch_data, list):
                logger.info(f"[MARKET-DATA] Request successful: true")
                for item in batch_data:
                    if item.get("symbol", "").upper() == sym and item.get("found", True):
                        norm = normalize_bharatstock_quote(
                            raw_data=item,
                            symbol_override=sym,
                            instrument_key=symbol_or_key if "|" in symbol_or_key else None,
                        )
                        logger.info(f"[MARKET-DATA] Response mapped: true")
                        return norm
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
        if not self.is_configured:
            await self.ensure_configured()
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
                    logger.info(f"[MARKET-DATA] Provider: BharatStockAPI")
                    logger.info(f"[MARKET-DATA] Symbols: {syms_param}")
                    raw_list = await self._make_request("v1/stocks/quotes", params={"symbols": syms_param})
                    if raw_list and isinstance(raw_list, list):
                        logger.info(f"[MARKET-DATA] Request successful: true")
                        for item in raw_list:
                            if not item.get("found", True):
                                continue
                            raw_sym = (item.get("symbol") or "").upper()
                            if not raw_sym:
                                continue
                            norm_quote = normalize_bharatstock_quote(raw_data=item, symbol_override=raw_sym)
                            if norm_quote.ltp > 0:
                                logger.info(f"[MARKET-DATA] Response mapped: true")
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
        if not self.is_configured:
            await self.ensure_configured()
        if not self.is_configured:
            return None

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
            await self.ensure_configured()
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
            await self.ensure_configured()
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
        if not self.is_configured:
            await self.ensure_configured()
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

    async def get_fundamentals(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Fetches fundamental ratios and corporate metrics for a stock ticker.
        Primary source: GET /v1/stocks/{ticker}/ratios
        Secondary source: GET /v1/stocks/{ticker}
        Cached in Redis for 1 hour to optimize performance.
        """
        if not self.is_configured:
            await self.ensure_configured()
        if not self.is_configured or not symbol:
            return None

        clean_sym = self._extract_symbol(symbol).strip().upper()
        cache_key = f"market:fundamentals:{clean_sym}"

        # 1. Try Redis cache
        try:
            redis = await get_redis()
            if redis:
                cached = await redis.get(cache_key)
                if cached:
                    return json.loads(cached)
        except Exception as e:
            logger.debug(f"Redis get fundamentals cache failed for {clean_sym}: {e}")

        # 2. Query BharatStockAPI /v1/stocks/{ticker}/ratios
        fundamentals: Dict[str, Any] = {
            "symbol": clean_sym,
            "market_cap": None,
            "pe_ratio": None,
            "pb_ratio": None,
            "roe": None,
            "roce": None,
            "eps": None,
            "dividend_yield": None,
            "volume": None,
            "source": "BHARATSTOCKAPI",
        }

        try:
            encoded_sym = url_quote(clean_sym, safe="")
            ratios_data = await self._make_request(f"v1/stocks/{encoded_sym}/ratios")
            if ratios_data and isinstance(ratios_data, dict):
                for k in ["market_cap", "pe_ratio", "pb_ratio", "roe", "roce", "eps", "dividend_yield"]:
                    if ratios_data.get(k) is not None:
                        try:
                            fundamentals[k] = float(ratios_data[k])
                        except (ValueError, TypeError):
                            pass

            # If some fields or volume missing, also check detailed /v1/stocks/{ticker}
            if fundamentals["market_cap"] is None or fundamentals["volume"] is None:
                detail_data = await self._make_request(f"v1/stocks/{encoded_sym}")
                if detail_data and isinstance(detail_data, dict):
                    if fundamentals["market_cap"] is None and detail_data.get("market_cap") is not None:
                        try:
                            fundamentals["market_cap"] = float(detail_data["market_cap"])
                        except (ValueError, TypeError):
                            pass
                    
                    latest = detail_data.get("latest_price")
                    if isinstance(latest, dict) and latest.get("volume") is not None:
                        try:
                            fundamentals["volume"] = int(latest["volume"])
                        except (ValueError, TypeError):
                            pass

                    metrics = detail_data.get("metrics")
                    if isinstance(metrics, dict):
                        for k in ["pe_ratio", "pb_ratio", "roe", "roce", "eps", "dividend_yield"]:
                            if fundamentals.get(k) is None and metrics.get(k) is not None:
                                try:
                                    fundamentals[k] = float(metrics[k])
                                except (ValueError, TypeError):
                                    pass

            # 3. Store in Redis cache (1 hour)
            try:
                redis = await get_redis()
                if redis:
                    await redis.set(cache_key, json.dumps(fundamentals), ex=3600)
            except Exception as e:
                logger.debug(f"Redis set fundamentals cache failed for {clean_sym}: {e}")

            return fundamentals

        except Exception as e:
            logger.warning(f"Failed to fetch fundamentals for {clean_sym}: {e}")
            return None

    async def get_health(self) -> Dict[str, Any]:
        """Subsystem health telemetry for BharatStockAPI."""
        if not self.is_configured:
            await self.ensure_configured()
        if not self.is_configured:
            return {
                "status": "not_configured",
                "provider": self.provider_name,
                "role": "fallback",
                "message": "BharatStockAPI key not set in environment or database.",
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
