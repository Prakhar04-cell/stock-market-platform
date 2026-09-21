import logging
from contextlib import asynccontextmanager
from decimal import Decimal
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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
            for key, val, desc in settings_seed:
                stmt = select(SystemSetting).where(SystemSetting.key == key)
                if not (await db.execute(stmt)).scalar_one_or_none():
                    db.add(SystemSetting(key=key, value=val, description=desc))

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

            # 5. Seed Core Market Indices in Instrument table
            indices_data = [
                ("NIFTY 50", "NIFTY", "NSE_INDEX|Nifty 50", "NIFTY 50 Index", "NSE", "NSE_INDEX", "INDEX"),
                ("BANKNIFTY", "BANKNIFTY", "NSE_INDEX|Nifty Bank", "NIFTY Bank Index", "NSE", "NSE_INDEX", "INDEX"),
                ("FINNIFTY", "FINNIFTY", "NSE_INDEX|Nifty Fin Service", "NIFTY Financial Services Index", "NSE", "NSE_INDEX", "INDEX"),
                ("MIDCPNIFTY", "MIDCPNIFTY", "NSE_INDEX|NIFTY MID SELECT", "NIFTY Midcap Select Index", "NSE", "NSE_INDEX", "INDEX"),
                ("SENSEX", "SENSEX", "BSE_INDEX|SENSEX", "BSE SENSEX Index", "BSE", "BSE_INDEX", "INDEX"),
            ]
            for sym, tsym, ikey, name, exch_code, seg, itype in indices_data:
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
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
app.include_router(api_router, prefix=settings.API_V1_STR)


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
