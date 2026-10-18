import os
import re
from decimal import Decimal
from typing import Any, List, Optional, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "BullRun Trading Platform"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    VERSION: str = "1.0.0"

    # Google OAuth Configuration
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""

    # API Configuration
    API_V1_STR: str = "/api/v1"
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:3000"
    JAVA_SERVICE_URL: str = "http://localhost:8081"

    @field_validator("ENVIRONMENT", mode="before")
    @classmethod
    def assemble_environment(cls, v: Any) -> str:
        is_render = bool(os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID"))
        env_val = os.getenv("ENVIRONMENT")
        if is_render:
            # On Render production host, default to 'production' if unset or default 'development'
            if not env_val or env_val.lower() in ("development", "dev"):
                return "production"
            return env_val
        if env_val:
            return env_val
        return str(v) if v else "development"

    # CORS
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    CORS_ORIGIN_REGEX: Optional[str] = r"^https:\/\/.*\.vercel\.app$"

    @field_validator("BACKEND_PORT", mode="before")
    @classmethod
    def assemble_backend_port(cls, v: Any) -> int:
        port_env = os.getenv("PORT")
        if port_env:
            try:
                return int(port_env)
            except ValueError:
                pass
        return int(v) if v else 8000

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        origins: List[str] = []
        if isinstance(v, str) and not v.startswith("["):
            origins = [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            origins = list(v)
        else:
            origins = ["http://localhost:3000", "http://127.0.0.1:3000"]

        frontend_url = os.getenv("FRONTEND_URL")
        if frontend_url and frontend_url.strip() not in origins:
            origins.append(frontend_url.strip())
        return origins

    # Database Configuration
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/tradex"
    _SYNC_DATABASE_URL_OVERRIDE: str = ""

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        """Construct a clean, valid asyncpg connection URL."""
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)

        # Handle SSL parameter translation for asyncpg
        if "sslmode=require" in url:
            url = url.replace("sslmode=require", "ssl=require")

        # Strip unsupported query parameters for asyncpg
        if "channel_binding=" in url:
            url = re.sub(r"[&?]channel_binding=[^&]*", "", url)
            if "?" not in url and "&" in url:
                url = url.replace("&", "?", 1)
        return url

    @property
    def SYNC_DATABASE_URL(self) -> str:
        """Construct a clean psycopg2 connection URL for migrations & sync scripts."""
        if self._SYNC_DATABASE_URL_OVERRIDE:
            return self._SYNC_DATABASE_URL_OVERRIDE
        url = self.DATABASE_URL
        if url.startswith("postgresql+asyncpg://"):
            url = url.replace("postgresql+asyncpg://", "postgresql://", 1)
        elif url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url

    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_TOKEN: str = ""

    # JWT Authentication
    JWT_SECRET: str = "tradex_super_secret_jwt_key_must_be_changed_in_production_at_least_32_chars"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Paper Trading Wallet Configuration
    INITIAL_PAPER_BALANCE: Decimal = Decimal("100000.00")
    DEFAULT_CURRENCY: str = "INR"

    # Rate Limiting (Requests / Seconds)
    RATE_LIMIT_LOGIN_MAX_REQUESTS: int = 5
    RATE_LIMIT_LOGIN_WINDOW_SECONDS: int = 60
    RATE_LIMIT_GENERAL_MAX_REQUESTS: int = 100
    RATE_LIMIT_GENERAL_WINDOW_SECONDS: int = 60

    # Sentry Error Monitoring Configuration
    SENTRY_DSN: str = ""
    SENTRY_ENVIRONMENT: str = "production"
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1

    # Upstox API Configuration (Official API)
    UPSTOX_ANALYTICS_TOKEN: str = ""  # Read-only Analytics Token (1-year validity) for market data
    UPSTOX_CLIENT_ID: str = ""
    UPSTOX_CLIENT_SECRET: str = ""
    UPSTOX_REDIRECT_URI: str = "http://localhost:8000/api/v1/upstox/auth/callback"
    UPSTOX_ACCESS_TOKEN: str = ""
    UPSTOX_INTEGRATION_TEST: bool = False
    UPSTOX_API_BASE_URL: str = "https://api.upstox.com/v2"

    # Configurable Paper Trading Charges (Regulatory & Brokerage)
    PAPER_BROKERAGE_PERCENT: Decimal = Decimal("0.0003")  # 0.03%
    PAPER_BROKERAGE_MAX_PER_ORDER: Decimal = Decimal("20.00")  # max ₹20
    PAPER_STT_PERCENT: Decimal = Decimal("0.001")  # 0.1% on delivery BUY & SELL
    PAPER_EXCHANGE_TURNOVER_PERCENT: Decimal = Decimal("0.0000345")  # 0.00345%
    PAPER_STAMP_DUTY_PERCENT: Decimal = Decimal("0.00015")  # 0.015% on BUY only
    PAPER_SEBI_PERCENT: Decimal = Decimal("0.000001")  # ₹10/crore = 0.0001%
    PAPER_GST_PERCENT: Decimal = Decimal("0.18")  # 18% on (brokerage + turnover + sebi)

    # External Market Data API (Fallback Provider)
    # Server-side only — never exposed to frontend
    MARKET_DATA_API_KEY: str = ""
    MARKET_DATA_API_BASE_URL: str = "https://bharatstockapi.com"
    MARKET_DATA_API_PROVIDER: str = "BharatStockAPI"

    # Marketaux Financial News API (Optional provider)
    # Server-side only — never exposed to frontend
    MARKETAUX_API_TOKEN: str = ""
    MARKETAUX_API_BASE_URL: str = "https://api.marketaux.com/v1"
    NEWS_CACHE_TTL_SECONDS: int = 600  # 10 minutes cache TTL

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow",
    )


settings = Settings()
