import logging
import os
import sys
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.exceptions import TradeXException
from app.models.system import ProviderCredential

logger = logging.getLogger("tradex.upstox_client")


class UpstoxAuthRequiredError(TradeXException):
    """Raised when Upstox access token is missing, expired, or rejected."""
    def __init__(self, message: str = "Market data connection requires re-authentication."):
        # Guarantee no token is ever included in exception messages
        clean_msg = message.split("Bearer")[0].strip() if "Bearer" in message else message
        super().__init__(
            code="UPSTOX_AUTH_REQUIRED",
            message=clean_msg,
            status_code=401,
            details={"provider": "upstox", "reconnect_url": "/api/v1/upstox/auth/login"},
        )


class UpstoxClient:
    """
    Centralized, secure HTTP client for official Upstox API communication.
    
    Security & Architecture Rules:
    - Reads UPSTOX_ACCESS_TOKEN server-side.
    - Never exposes or returns the token to frontend or in API responses.
    - Never logs authorization headers or token contents.
    - Centralizes token verification, quote retrieval, candle retrieval, and Feed V3 authorization.
    """

    BASE_URL = "https://api.upstox.com/v2"
    V3_BASE_URL = "https://api.upstox.com/v3"

    def __init__(self):
        self._cached_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None
        self._last_token_check: float = 0.0
        self._cached_trading_token: Optional[str] = None
        self._trading_token_expires_at: Optional[datetime] = None
        self._last_trading_token_check: float = 0.0
        self._is_authenticated: Optional[bool] = None
        self._last_verification_time: float = 0.0
        self._verification_cache_ttl: float = 60.0  # Cache verify result for 60 seconds
        self._last_rest_latency_ms: Optional[float] = None

    def get_latency_ms(self) -> Optional[float]:
        """Returns the most recent REST API round-trip latency in ms."""
        return self._last_rest_latency_ms

    @property
    def is_configured(self) -> bool:
        """Returns True if UPSTOX_ANALYTICS_TOKEN is provided in environment or test token is cached."""
        return bool(settings.UPSTOX_ANALYTICS_TOKEN or self._cached_token)

    def set_token(self, token: str, expires_at: Optional[datetime] = None):
        """Updates active in-memory token and resets verification state."""
        self._cached_token = token
        self._token_expires_at = expires_at
        self._is_authenticated = True
        self._last_verification_time = time.time()
        self._last_token_check = time.time()

    def invalidate_token(self):
        """Invalidates in-memory token and resets authentication status."""
        self._cached_token = None
        self._token_expires_at = None
        self._is_authenticated = False
        self._last_verification_time = 0.0
        self._last_token_check = 0.0

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

        raise UpstoxAuthRequiredError(
            "UPSTOX_ANALYTICS_TOKEN is not configured in backend environment variables."
        )

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
                from sqlalchemy import select
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
                logger.debug(f"Could not load trading provider credentials from DB: {e}")

        if not self._cached_trading_token:
            return None

        if self._trading_token_expires_at and datetime.now(timezone.utc) >= self._trading_token_expires_at:
            self._cached_trading_token = None
            return None

        return self._cached_trading_token

    async def get_access_token(self) -> str:
        """Delegates to get_market_data_token() for market data client requests."""
        return await self.get_market_data_token()

    def _get_headers(self, token: str) -> Dict[str, str]:
        """Constructs secure request headers with Bearer token."""
        return {
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
        }

    async def verify_token(self, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Performs real server-side verification of Upstox Analytics Token against Upstox Market Quote API.
        Never returns or exposes token or secret credentials.
        """
        try:
            token = await self.get_access_token()
            if not token:
                raise UpstoxAuthRequiredError("UPSTOX_ANALYTICS_TOKEN is not configured.")
        except UpstoxAuthRequiredError:
            self._is_authenticated = False
            return {
                "configured": False,
                "authenticated": False,
                "provider": "upstox",
                "token_type": "ANALYTICS_TOKEN",
                "message": "UPSTOX_ANALYTICS_TOKEN is not configured in backend environment variables.",
            }

        now = time.time()
        if not force_refresh and self._is_authenticated is not None and (now - self._last_verification_time < self._verification_cache_ttl):
            return {
                "configured": True,
                "authenticated": self._is_authenticated,
                "provider": "upstox",
                "token_type": "ANALYTICS_TOKEN",
                "message": "Upstox Analytics Token is configured and valid" if self._is_authenticated else "Upstox Analytics Token is invalid or expired",
            }

        headers = self._get_headers(token)
        # Probe Upstox with NIFTY 50 index quote (fast, low-bandwidth, official market quote API)
        probe_url = f"{self.BASE_URL}/market-quote/quotes"
        params = {"instrument_key": "NSE_INDEX|Nifty 50"}

        t0 = time.time()
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(probe_url, params=params, headers=headers)
            self._last_rest_latency_ms = round((time.time() - t0) * 1000, 2)

            self._last_verification_time = now
            if resp.status_code == 200:
                self._is_authenticated = True
                return {
                    "configured": True,
                    "authenticated": True,
                    "provider": "upstox",
                    "token_type": "ANALYTICS_TOKEN",
                    "message": "Upstox Analytics Token is configured and valid",
                }
            elif resp.status_code in (401, 403):
                self._is_authenticated = False
                logger.warning("Upstox Analytics Token verification failed: HTTP 401/403 returned by Upstox.")
                return {
                    "configured": True,
                    "authenticated": False,
                    "provider": "upstox",
                    "token_type": "ANALYTICS_TOKEN",
                    "message": "Upstox Analytics Token is invalid or expired",
                }
            else:
                # Other HTTP status (e.g. rate limit, 500)
                logger.warning(f"Upstox token probe returned unexpected status: {resp.status_code}")
                return {
                    "configured": True,
                    "authenticated": False,
                    "provider": "upstox",
                    "token_type": "ANALYTICS_TOKEN",
                    "message": f"Upstox token verification returned status {resp.status_code}",
                }
        except Exception as e:
            self._last_rest_latency_ms = round((time.time() - t0) * 1000, 2)
            logger.warning(f"Upstox token verification network error: {e}")
            return {
                "configured": True,
                "authenticated": False,
                "provider": "upstox",
                "token_type": "ANALYTICS_TOKEN",
                "message": f"Upstox connection error during verification: {e.__class__.__name__}",
            }

    async def get(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        use_v3: bool = False,
        timeout: float = 10.0,
    ) -> httpx.Response:
        """
        Executes a secure, authenticated GET request against Upstox API.
        Guarantees authorization headers are never logged or echoed in exceptions.
        """
        token = await self.get_market_data_token()

        headers = self._get_headers(token)
        base = self.V3_BASE_URL if use_v3 else self.BASE_URL
        clean_endpoint = endpoint.lstrip("/")
        url = f"{base}/{clean_endpoint}"

        # Safe logging without authorization header or query param values
        safe_param_keys = list(params.keys()) if params else []
        logger.debug(f"Upstox GET {clean_endpoint} (params: {safe_param_keys})")

        t0 = time.time()
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.get(url, params=params, headers=headers)
            self._last_rest_latency_ms = round((time.time() - t0) * 1000, 2)
        except Exception:
            self._last_rest_latency_ms = round((time.time() - t0) * 1000, 2)
            raise

        if resp.status_code in (401, 403):
            self._is_authenticated = False
            logger.warning(f"Upstox API returned {resp.status_code} Unauthorized for {clean_endpoint}.")
            raise UpstoxAuthRequiredError("Upstox Analytics Token is invalid or expired.")

        return resp

    async def get_quotes(self, instrument_keys: List[str]) -> Dict[str, Any]:
        """
        Fetches quotes for up to 500 instrument keys in a single batch request.
        """
        if not instrument_keys:
            return {}

        joined = ",".join(instrument_keys)
        resp = await self.get("/market-quote/quotes", params={"instrument_key": joined})
        resp.raise_for_status()
        data = resp.json()
        return data.get("data", {})

    async def get_historical_candles(
        self,
        instrument_key: str,
        interval: str,
        to_date: str,
        from_date: str,
    ) -> List[List[Any]]:
        """
        Retrieves historical candle array [timestamp, open, high, low, close, volume, oi].
        Endpoint: /historical-candle/{instrument_key}/{interval}/{to_date}/{from_date}
        """
        endpoint = f"/historical-candle/{instrument_key}/{interval}/{to_date}/{from_date}"
        resp = await self.get(endpoint)
        resp.raise_for_status()
        data = resp.json()
        return data.get("data", {}).get("candles", [])

    async def get_intraday_candles(
        self,
        instrument_key: str,
        interval: str = "1minute",
    ) -> List[List[Any]]:
        """
        Retrieves intraday candles for current trading session.
        Endpoint: /historical-candle/intraday/{instrument_key}/{interval}
        """
        endpoint = f"/historical-candle/intraday/{instrument_key}/{interval}"
        resp = await self.get(endpoint)
        resp.raise_for_status()
        data = resp.json()
        return data.get("data", {}).get("candles", [])

    async def get_feed_authorized_url(self) -> str:
        """
        Obtains authorized WebSocket streaming URL for Upstox Market Data Feed V3.
        Uses official V3 endpoint: /v3/feed/market-data-feed/authorize
        """
        resp = await self.get("/feed/market-data-feed/authorize", use_v3=True)
        resp.raise_for_status()
        data = resp.json()
        payload = data.get("data", {})
        ws_url = payload.get("authorizedRedirectUri") or payload.get("authorized_redirect_uri")
        if not ws_url:
            raise TradeXException(
                code="UPSTOX_FEED_AUTH_FAILED",
                message="Upstox Feed V3 did not return an authorized redirect URI.",
                status_code=502,
            )
        return ws_url


# Global Singleton Client
upstox_client = UpstoxClient()
