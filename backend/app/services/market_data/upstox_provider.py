import logging
import os
import sys
import time
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
import httpx
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.exceptions import TradeXException
from app.models.system import ProviderCredential
from app.services.market_data.normalizer import (
    CandleData,
    InstrumentData,
    MarketQuote,
    normalize_upstox_candle,
    normalize_upstox_quote,
)
from app.services.market_data.provider import MarketDataProvider

logger = logging.getLogger("tradex.upstox")


class UpstoxAuthRequiredError(TradeXException):
    """Raised when Upstox access token is missing, expired, or rejected."""
    def __init__(self, message: str = "Market data connection requires re-authentication."):
        super().__init__(
            code="UPSTOX_AUTH_REQUIRED",
            message=message,
            status_code=401,
            details={"provider": "upstox", "reconnect_url": "/api/v1/upstox/auth/login"},
        )


class UpstoxMarketDataProvider(MarketDataProvider):
    """
    Official Upstox V2/V3 API integration for real Indian market data.
    Strictly read-only market data: No real orders, no real money.
    """

    def __init__(self):
        self.base_url = settings.UPSTOX_API_BASE_URL.rstrip("/")
        self._cached_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None
        self._last_token_check: float = 0.0
        self._cached_trading_token: Optional[str] = None
        self._trading_token_expires_at: Optional[datetime] = None
        self._last_trading_token_check: float = 0.0
        self._last_successful_request: Optional[datetime] = None
        self._error_count: int = 0
        self._last_error_message: Optional[str] = None
        self._last_rest_latency_ms: Optional[float] = None

    def get_latency_ms(self) -> Optional[float]:
        """Returns the most recent REST API round-trip latency in ms."""
        return self._last_rest_latency_ms

    @property
    def provider_name(self) -> str:
        return "Upstox"

    @property
    def is_configured(self) -> bool:
        """Returns True if UPSTOX_ANALYTICS_TOKEN is provided or test token is cached."""
        return bool(settings.UPSTOX_ANALYTICS_TOKEN or self._cached_token)

    @property
    def is_token_valid(self) -> bool:
        """Checks whether the Analytics Token or active test token is valid."""
        if settings.UPSTOX_ANALYTICS_TOKEN:
            return True
        if not self._cached_token:
            return False
        if not self._token_expires_at:
            return True
        return datetime.now(timezone.utc) < self._token_expires_at

    async def get_market_data_token(self) -> str:
        """
        Retrieves the active Upstox Analytics Token for market data operations.
        PRIMARY: UPSTOX_ANALYTICS_TOKEN (read-only, 1-year validity).
        Does NOT fall back to a stale UPSTOX_ACCESS_TOKEN.
        """
        if settings.UPSTOX_ANALYTICS_TOKEN:
            return settings.UPSTOX_ANALYTICS_TOKEN

        if self._cached_token:
            if not self._token_expires_at or datetime.now(timezone.utc) < self._token_expires_at:
                return self._cached_token

        raise UpstoxAuthRequiredError("UPSTOX_ANALYTICS_TOKEN is not configured in backend environment variables.")

    async def get_trading_access_token(self) -> Optional[str]:
        """
        Retrieves the active Upstox OAuth access token strictly for trading operations.
        Kept completely separate from the market data Analytics Token.
        """
        now = time.time()
        is_test_env = "pytest" in sys.modules or os.environ.get("PYTEST_CURRENT_TEST") is not None
        if not is_test_env and (not self._cached_trading_token or (now - self._last_trading_token_check > 30)):
            self._last_trading_token_check = now
            try:
                async with AsyncSessionLocal() as db:
                    stmt = (
                        select(ProviderCredential)
                        .where(ProviderCredential.provider_name == "upstox", ProviderCredential.is_active.is_(True))
                        .order_by(ProviderCredential.created_at.desc())
                    )
                    cred = (await db.execute(stmt)).scalar_one_or_none()
                    if cred:
                        self._cached_trading_token = cred.access_token
                        self._trading_token_expires_at = cred.expires_at
            except Exception as e:
                logger.warning(f"Could not load trading provider credentials from DB: {e}")

        if not self._cached_trading_token:
            return None

        if self._trading_token_expires_at and datetime.now(timezone.utc) >= self._trading_token_expires_at:
            self._cached_trading_token = None
            return None

        return self._cached_trading_token

    async def get_access_token(self) -> str:
        """Delegates to get_market_data_token() for all market data provider requests."""
        return await self.get_market_data_token()

    def invalidate_token(self):
        """Marks the current access token as invalid."""
        self._cached_token = None
        self._token_expires_at = None

    async def _make_request(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        method: str = "GET",
        headers: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """Authenticated HTTP request wrapper with robust error translation."""
        token = await self.get_market_data_token()
        req_headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
        }
        if headers:
            req_headers.update(headers)

        url = f"{self.base_url}/{endpoint.lstrip('/')}"

        t0 = time.time()
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                if method == "GET":
                    resp = await client.get(url, headers=req_headers, params=params)
                else:
                    resp = await client.post(url, headers=req_headers, json=params)
                self._last_rest_latency_ms = round((time.time() - t0) * 1000, 2)

                if resp.status_code == 401:
                    self.invalidate_token()
                    self._error_count += 1
                    self._last_error_message = "Authentication rejected (401)"
                    logger.warning("Upstox API returned 401 Unauthorized. Access token expired or invalid.")
                    raise UpstoxAuthRequiredError()

                if resp.status_code == 429:
                    self._error_count += 1
                    self._last_error_message = "Rate limited (429)"
                    logger.warning("Upstox rate limit hit (429).")
                    raise TradeXException(
                        code="PROVIDER_RATE_LIMIT",
                        message="Upstox market data rate limit reached. Please wait a moment.",
                        status_code=429,
                    )

                if resp.status_code >= 500:
                    self._error_count += 1
                    self._last_error_message = f"Upstox server error ({resp.status_code})"
                    logger.error(f"Upstox server error: {resp.status_code} {resp.text}")
                    raise TradeXException(
                        code="PROVIDER_UNAVAILABLE",
                        message="Upstox market data service is temporarily unavailable.",
                        status_code=503,
                    )

                resp.raise_for_status()
                data = resp.json()
                self._last_successful_request = datetime.now(timezone.utc)
                return data

            except httpx.TimeoutException:
                self._error_count += 1
                self._last_error_message = "Request timeout"
                logger.warning(f"Timeout calling Upstox endpoint: {endpoint}")
                raise TradeXException(
                    code="PROVIDER_TIMEOUT",
                    message="Upstox market data request timed out.",
                    status_code=504,
                )
            except UpstoxAuthRequiredError:
                raise
            except TradeXException:
                raise
            except Exception as e:
                self._error_count += 1
                self._last_error_message = str(e)
                logger.error(f"Unexpected error communicating with Upstox API: {e}")
                raise TradeXException(
                    code="PROVIDER_ERROR",
                    message=f"Market data provider error: {str(e)}",
                    status_code=502,
                )

    async def get_quote(self, symbol_or_key: str) -> Optional[MarketQuote]:
        """Fetch quote for a single instrument key or symbol."""
        quotes = await self.get_quotes([symbol_or_key])
        return quotes.get(symbol_or_key)

    async def get_quotes(self, symbols_or_keys: List[str]) -> Dict[str, MarketQuote]:
        """
        Batch fetches quotes using Upstox full quote API.
        GET /market-quote/quotes?instrument_key=...
        """
        if not symbols_or_keys:
            return {}

        # Upstox expects comma-separated keys
        keys_param = ",".join(symbols_or_keys)
        try:
            resp_data = await self._make_request(
                "market-quote/quotes",
                params={"instrument_key": keys_param},
            )
            raw_data = resp_data.get("data", {})
            results: Dict[str, MarketQuote] = {}
            for key, quote_dict in raw_data.items():
                norm = normalize_upstox_quote(instrument_key=key, raw_quote=quote_dict)
                results[key] = norm
                # Also index by simple symbol for fast retrieval
                if norm.symbol:
                    results[norm.symbol.upper()] = norm
            return results
        except UpstoxAuthRequiredError:
            raise
        except Exception as e:
            logger.warning(f"Error fetching Upstox quotes for {symbols_or_keys}: {e}")
            return {}

    async def get_historical_candles(
        self,
        instrument_key: str,
        interval: str = "day",
        to_date: Optional[str] = None,
        from_date: Optional[str] = None,
    ) -> List[CandleData]:
        """
        Fetches historical candles from Upstox Historical Candle API:
        GET /historical-candle/{instrument_key}/{interval}/{to_date}/{from_date}
        """
        # Format dates if not provided (default last 90 days for daily, or today)
        now = datetime.now(timezone.utc)
        to_d = to_date or now.strftime("%Y-%m-%d")
        from_d = from_date or datetime.fromtimestamp(now.timestamp() - 90 * 86400, tz=timezone.utc).strftime("%Y-%m-%d")

        endpoint = f"historical-candle/{instrument_key}/{interval}/{to_d}/{from_d}"
        try:
            resp_data = await self._make_request(endpoint)
            candles_raw = resp_data.get("data", {}).get("candles", [])
            normalized = [normalize_upstox_candle(c) for c in candles_raw]
            # Upstox returns candles in descending order; sort ascending for charts
            normalized.sort(key=lambda c: c.timestamp)
            return normalized
        except UpstoxAuthRequiredError:
            raise
        except Exception as e:
            logger.warning(f"Error fetching Upstox historical candles for {instrument_key}: {e}")
            return []

    async def get_intraday_candles(
        self,
        instrument_key: str,
        interval: str = "1minute",
    ) -> List[CandleData]:
        """
        Fetches intraday candles for the current trading day:
        GET /historical-candle/intraday/{instrument_key}/{interval}
        """
        endpoint = f"historical-candle/intraday/{instrument_key}/{interval}"
        try:
            resp_data = await self._make_request(endpoint)
            candles_raw = resp_data.get("data", {}).get("candles", [])
            normalized = [normalize_upstox_candle(c) for c in candles_raw]
            normalized.sort(key=lambda c: c.timestamp)
            return normalized
        except UpstoxAuthRequiredError:
            raise
        except Exception as e:
            logger.warning(f"Error fetching Upstox intraday candles for {instrument_key}: {e}")
            return []

    async def get_ws_feed_authorized_url(self) -> Optional[str]:
        """Fetches the authorized WebSocket redirect URI from Upstox Market Data Feed V3."""
        try:
            from app.services.market_data.upstox_client import upstox_client
            return await upstox_client.get_feed_authorized_url()
        except Exception as e:
            logger.warning(f"Could not get Upstox WebSocket authorized URL: {e}")
            return None

    async def search_instruments(
        self,
        query: str,
        exchange: Optional[str] = None,
    ) -> List[InstrumentData]:
        """Search instruments using local database (seeded with official Upstox instruments)."""
        from app.services.market_data.instrument_service import instrument_service
        return await instrument_service.search_instruments(query=query, exchange=exchange)

    async def get_health(self) -> Dict[str, Any]:
        """Provides runtime health status of the Upstox market data provider."""
        if not self.is_configured:
            return {
                "status": "not_configured",
                "provider": "upstox",
                "message": "UPSTOX_ANALYTICS_TOKEN not configured in environment.",
            }

        try:
            token_valid = self.is_token_valid
            if not token_valid:
                await self.get_market_data_token()
                token_valid = True
        except UpstoxAuthRequiredError:
            token_valid = False
        except Exception:
            token_valid = False

        if not token_valid:
            return {
                "status": "authentication_required",
                "provider": "upstox",
                "message": "Upstox Analytics Token is missing or invalid.",
            }

        return {
            "status": "healthy",
            "provider": "upstox",
            "last_successful_request": self._last_successful_request.isoformat() if self._last_successful_request else None,
            "error_count": self._error_count,
            "last_error": self._last_error_message,
        }


# Singleton instance
upstox_provider = UpstoxMarketDataProvider()
