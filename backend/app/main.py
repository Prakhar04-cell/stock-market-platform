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

            # 3. Seed NSE Exchange
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

            # 4. Seed Essential Foundation Stocks (Metadata only, no fake market prices!)
            stocks_data = [
                ("RELIANCE", "Reliance Industries Limited", "INE002A01018", "Energy & Conglomerate"),
                ("TCS", "Tata Consultancy Services Limited", "INE467B01029", "Information Technology"),
                ("HDFCBANK", "HDFC Bank Limited", "INE040A01034", "Banking & Finance"),
                ("INFY", "Infosys Limited", "INE009A01021", "Information Technology"),
                ("ICICIBANK", "ICICI Bank Limited", "INE090A01021", "Banking & Finance"),
                ("TATAMOTORS", "Tata Motors Limited", "INE155A01022", "Automotive"),
                ("ITC", "ITC Limited", "INE154A01025", "FMCG"),
                ("SBIN", "State Bank of India", "INE062A01020", "Banking & Finance"),
                ("BHARTIARTL", "Bharti Airtel Limited", "INE397D01024", "Telecommunications"),
                ("LT", "Larsen & Toubro Limited", "INE018A01030", "Construction & Engineering"),
            ]
            for sym, name, isin, sector in stocks_data:
                s_stmt = select(Stock).where(Stock.symbol == sym)
                if not (await db.execute(s_stmt)).scalar_one_or_none():
                    db.add(
                        Stock(
                            exchange_id=nse.id,
                            symbol=sym,
                            name=name,
                            isin=isin,
                            sector=sector,
                            is_tradable=True,
                            lot_size=1,
                            tick_size=Decimal("0.05"),
                        )
                    )

            await db.commit()
            logger.info("TradeX initial foundation data successfully verified/seeded.")
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
    yield
    logger.info("Shutting down TradeX API Core...")
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
