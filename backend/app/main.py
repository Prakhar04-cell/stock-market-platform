import logging
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from app.api.health import router as health_router
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import AsyncSessionLocal, engine
from app.core.exceptions import TradeXException, format_error_response
from app.core.redis import close_redis
from app.models.base import Base
from app.models.market import Exchange, Stock
from app.models.system import SystemSetting
from app.models.user import Role
from sqlalchemy import select

logger = logging.getLogger("tradex")
logging.basicConfig(level=logging.INFO)


async def seed_initial_data():
    """Seed essential roles, exchanges, initial stocks, and system configuration."""
    try:
        async with AsyncSessionLocal() as db:
            # 1. Seed Roles
            roles = [
                ("TRADER", "Standard retail paper trader role"),
                ("ADMIN", "Platform administrator with full governance access"),
            ]
            for name, desc in roles:
                stmt = select(Role).where(Role.name == name)
                if not (await db.execute(stmt)).scalar_one_or_none():
                    db.add(Role(name=name, description=desc))

            # 2. Seed System Settings
            settings_seed = [
                ("INITIAL_PAPER_BALANCE", str(settings.INITIAL_PAPER_BALANCE), "Default paper trading initial wallet credit"),
                ("PLATFORM_MAINTENANCE", "false", "Platform maintenance mode switch"),
                ("MARKET_DATA_PROVIDER", "NOT_CONFIGURED", "Active market data stream provider"),
                ("TRADING_ENGINE_PROVIDER", "NOT_CONFIGURED", "Active execution engine provider"),
            ]
            if settings.MARKET_DATA_API_KEY and settings.MARKET_DATA_API_KEY.strip():
                settings_seed.extend([
                    ("MARKET_DATA_API_KEY", settings.MARKET_DATA_API_KEY.strip(), "BharatStockAPI Server Key"),
                    ("MARKET_DATA_API_BASE_URL", settings.MARKET_DATA_API_BASE_URL or "https://bharatstockapi.com", "BharatStockAPI Base URL"),
                    ("MARKET_DATA_API_PROVIDER", "BharatStockAPI", "Configured Market Data Fallback Provider"),
                ])
            for key, val, desc in settings_seed:
                stmt = select(SystemSetting).where(SystemSetting.key == key)
                existing = (await db.execute(stmt)).scalar_one_or_none()
                if not existing:
                    db.add(SystemSetting(key=key, value=val, description=desc))
                elif key == "MARKET_DATA_API_KEY" and val and not existing.value:
                    existing.value = val

            # 3. Seed Exchanges (NSE & BSE)
            stmt = select(Exchange).where(Exchange.code == "NSE")
            nse = (await db.execute(stmt)).scalar_one_or_none()
            if not nse:
                nse = Exchange(
                    code="NSE",
                    name="National Stock Exchange of India",
                    currency="INR",
                    timezone="Asia/Kolkata",
                    is_active=True,
                )
                db.add(nse)
                await db.flush()

            stmt_bse = select(Exchange).where(Exchange.code == "BSE")
            bse = (await db.execute(stmt_bse)).scalar_one_or_none()
            if not bse:
                bse = Exchange(
                    code="BSE",
                    name="Bombay Stock Exchange",
                    currency="INR",
                    timezone="Asia/Kolkata",
                    is_active=True,
                )
                db.add(bse)
                await db.flush()

            # 4. Seed Essential Foundation Stocks & Instruments
            from app.models.market import Instrument
            stocks_data = [
                ("RELIANCE", "Reliance Industries Limited", "NSE_EQ|INE002A01018", "INE002A01018", "Energy & Conglomerate", "NSE", "NSE_EQ", "EQ"),
                ("TCS", "Tata Consultancy Services Limited", "NSE_EQ|INE467B01029", "INE467B01029", "Information Technology", "NSE", "NSE_EQ", "EQ"),
                ("HDFCBANK", "HDFC Bank Limited", "NSE_EQ|INE040A01034", "INE040A01034", "Banking & Finance", "NSE", "NSE_EQ", "EQ"),
                ("INFY", "Infosys Limited", "NSE_EQ|INE009A01021", "INE009A01021", "Information Technology", "NSE", "NSE_EQ", "EQ"),
                ("ICICIBANK", "ICICI Bank Limited", "NSE_EQ|INE090A01021", "INE090A01021", "Banking & Finance", "NSE", "NSE_EQ", "EQ"),
                ("TATAMOTORS", "Tata Motors Limited", "NSE_EQ|INE155A01022", "INE155A01022", "Automotive", "NSE", "NSE_EQ", "EQ"),
                ("ITC", "ITC Limited", "NSE_EQ|INE154A01025", "INE154A01025", "FMCG", "NSE", "NSE_EQ", "EQ"),
                ("SBIN", "State Bank of India", "NSE_EQ|INE062A01020", "INE062A01020", "Banking & Finance", "NSE", "NSE_EQ", "EQ"),
                ("BHARTIARTL", "Bharti Airtel Limited", "NSE_EQ|INE397D01024", "INE397D01024", "Telecommunications", "NSE", "NSE_EQ", "EQ"),
                ("LT", "Larsen & Toubro Limited", "NSE_EQ|INE018A01030", "INE018A01030", "Construction & Engineering", "NSE", "NSE_EQ", "EQ"),
            ]
            for sym, name, ikey, isin, sector, exch_code, seg, itype in stocks_data:
                exch = nse if exch_code == "NSE" else bse
                s_stmt = select(Stock).where(Stock.symbol == sym)
                stock_obj = (await db.execute(s_stmt)).scalar_one_or_none()
                if not stock_obj:
                    stock_obj = Stock(
                        exchange_id=exch.id,
                        symbol=sym,
                        instrument_key=ikey,
                        name=name,
                        isin=isin,
                        sector=sector,
                        is_tradable=True,
                        lot_size=1,
                        tick_size=Decimal("0.05"),
                    )
                    db.add(stock_obj)
                else:
                    if not stock_obj.instrument_key:
                        stock_obj.instrument_key = ikey

                # Ensure in Instrument master table
                inst_stmt = select(Instrument).where(Instrument.instrument_key == ikey)
                if not (await db.execute(inst_stmt)).scalar_one_or_none():
                    db.add(
                        Instrument(
                            instrument_key=ikey,
                            symbol=sym,
                            trading_symbol=sym,
                            name=name,
                            exchange=exch_code,
                            segment=seg,
                            instrument_type=itype,
                            isin=isin,
                            lot_size=1,
                            tick_size=Decimal("0.05"),
                        )
                    )

            # 5. Seed Core Market Indices in Stock and Instrument tables
            indices_data = [
                ("NIFTY 50", "NIFTY", "NSE_INDEX|Nifty 50", "NIFTY 50 Index", "NSE", "NSE_INDEX", "INDEX"),
                ("BANKNIFTY", "BANKNIFTY", "NSE_INDEX|Nifty Bank", "NIFTY Bank Index", "NSE", "NSE_INDEX", "INDEX"),
                ("FINNIFTY", "FINNIFTY", "NSE_INDEX|Nifty Fin Service", "NIFTY Financial Services Index", "NSE", "NSE_INDEX", "INDEX"),
                ("MIDCPNIFTY", "MIDCPNIFTY", "NSE_INDEX|NIFTY MID SELECT", "NIFTY Midcap Select Index", "NSE", "NSE_INDEX", "INDEX"),
                ("SENSEX", "SENSEX", "BSE_INDEX|SENSEX", "BSE SENSEX Index", "BSE", "BSE_INDEX", "INDEX"),
            ]
            for sym, tsym, ikey, name, exch_code, seg, itype in indices_data:
                exch = nse if exch_code == "NSE" else bse

                # Ensure in Stock table so it resolves as a tradable paper asset
                s_stmt = select(Stock).where(Stock.symbol == sym)
                stock_obj = (await db.execute(s_stmt)).scalar_one_or_none()
                if not stock_obj:
                    stock_obj = Stock(
                        exchange_id=exch.id,
                        symbol=sym,
                        instrument_key=ikey,
                        name=name,
                        sector="Index",
                        is_tradable=True,
                        lot_size=1,
                        tick_size=Decimal("0.05"),
                    )
                    db.add(stock_obj)
                else:
                    if not stock_obj.instrument_key:
                        stock_obj.instrument_key = ikey

                # Ensure in Instrument master table
                inst_stmt = select(Instrument).where(Instrument.instrument_key == ikey)
                if not (await db.execute(inst_stmt)).scalar_one_or_none():
                    db.add(
                        Instrument(
                            instrument_key=ikey,
                            symbol=sym,
                            trading_symbol=tsym,
                            name=name,
                            exchange=exch_code,
                            segment=seg,
                            instrument_type=itype,
                            lot_size=1,
                            tick_size=Decimal("0.05"),
                        )
                    )

            await db.commit()
            logger.info("TradeX initial foundation & Phase 2 instrument data successfully verified/seeded.")
    except Exception as e:
        logger.warning(f"Database seed skipped or failed (possibly tables not created yet): {e}")



@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown actions."""
    logger.info("Starting TradeX API Core...")
    # Initialize DB tables for testing or auto-migration
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await seed_initial_data()
        from app.services.providers.bharatstock_provider import bharatstock_provider
        await bharatstock_provider.ensure_configured()
    except Exception as e:
        logger.warning(f"Database initialization during lifespan: {e}")

    # Start upstream market feed background worker if provider configured
    from app.services.market_data.websocket_service import upstream_feed
    await upstream_feed.start()

    yield

    logger.info("Shutting down TradeX API Core...")
    await upstream_feed.stop()
    await close_redis()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="TradeX Stock Market & Paper-Trading Platform API (Phase 1 Foundation)",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS],
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optional Sentry initialization with strict sensitive data sanitization
if settings.SENTRY_DSN:
    try:
        import sentry_sdk  # type: ignore

        def _sentry_before_send(event, hint):
            req = event.get("request", {})
            headers = req.get("headers", {})
            for h in ["authorization", "cookie", "x-token", "proxy-authorization"]:
                if h in headers:
                    headers[h] = "[FILTERED]"
            data = req.get("data")
            if isinstance(data, dict):
                for k in list(data.keys()):
                    if any(s in k.lower() for s in ["password", "token", "secret", "card", "key"]):
                        data[k] = "[FILTERED]"
            return event

        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            traces_sample_rate=0.1,
            before_send=_sentry_before_send,
        )
        logger.info("Sentry monitoring initialized with sensitive field sanitization.")
    except ImportError:
        logger.info("sentry-sdk not installed; skipping Sentry initialization.")


# Structured HTTP Logging Middleware
@app.middleware("http")
async def structured_logging_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    t0 = time.time()

    response = await call_next(request)

    latency_ms = round((time.time() - t0) * 1000, 2)
    # Log safe operational metrics (never log authorization headers, passwords, or tokens)
    if not request.url.path.startswith("/health"):
        logger.info(
            f'{{"timestamp": "{datetime.now(timezone.utc).isoformat()}", "service": "TradeX-API", '
            f'"environment": "{settings.ENVIRONMENT}", "request_id": "{request_id}", '
            f'"route": "{request.url.path}", "method": "{request.method}", '
            f'"status_code": {response.status_code}, "latency_ms": {latency_ms}}}'
        )
    response.headers["X-Request-ID"] = request_id
    return response


# Standardized Exception Handlers
@app.exception_handler(TradeXException)
async def tradex_exception_handler(request: Request, exc: TradeXException):
    return JSONResponse(
        status_code=exc.status_code,
        content=format_error_response(
            code=exc.code,
            message=exc.message,
            details=exc.details,
        ),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    clean_errors = [{"field": ".".join(str(loc) for loc in err["loc"]), "message": err["msg"]} for err in errors]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=format_error_response(
            code="VALIDATION_ERROR",
            message="Request body or query parameter validation failed.",
            details={"errors": clean_errors},
        ),
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception during request {request.url.path}: {exc}")
    # Do NOT expose internal stack traces in production
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=format_error_response(
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected server error occurred. Please try again later.",
        ),
    )


# Attach Routers
app.include_router(health_router)
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(api_router, prefix=settings.API_V1_STR)


# Transparent Proxy to Java Security & Trading Analytics Service
@app.api_route(
    "/api/java/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    include_in_schema=False,
)
@app.api_route(
    "/api/v1/java/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    include_in_schema=False,
)
async def proxy_to_java_service(request: Request, path: str):
    """Transparently proxies /api/java/* and /api/v1/java/* to the Java Spring Boot service."""
    target_url = f"{settings.JAVA_SERVICE_URL.rstrip('/')}/api/java/{path}"
    if request.url.query:
        target_url = f"{target_url}?{request.url.query}"

    headers = dict(request.headers)
    headers.pop("host", None)

    body = await request.body()
    try:
        import httpx

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                content=body,
            )
            excluded_headers = {"content-encoding", "content-length", "transfer-encoding", "connection"}
            response_headers = {k: v for k, v in resp.headers.items() if k.lower() not in excluded_headers}
            return Response(
                content=resp.content,
                status_code=resp.status_code,
                headers=response_headers,
                media_type=resp.headers.get("content-type"),
            )
    except (httpx.ConnectError, httpx.ConnectTimeout):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=format_error_response(
                code="JAVA_SERVICE_UNAVAILABLE",
                message="Java Security & Trading Analytics Service is currently unreachable.",
            ),
        )
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=format_error_response(
                code="JAVA_SERVICE_ERROR",
                message=f"Error communicating with Java service: {str(exc)}",
            ),
        )


@app.get("/", tags=["Root"])
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "phase": "Phase 1: Platform Foundation",
        "docs": "/docs",
        "health": "/health",
        "status": "operational",
    }
