import logging
from typing import AsyncGenerator, Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

logger = logging.getLogger("tradex.database")

# Configure SSL arguments for asyncpg if SSL is requested
connect_args = {}
if "ssl=require" in settings.ASYNC_DATABASE_URL or "sslmode=require" in settings.DATABASE_URL:
    connect_args["ssl"] = True

# Async Engine for FastAPI operations
engine = create_async_engine(
    settings.ASYNC_DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=10,
    max_overflow=20,
    connect_args=connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy declarative models."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields an async database session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            logger.error(f"Database session error: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_db_health(session: Optional[AsyncSession] = None) -> tuple[bool, float, str]:
    """Probes the database with a lightweight SELECT 1 query."""
    import time
    t0 = time.time()
    try:
        if session is not None:
            await session.execute(text("SELECT 1"))
        else:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
        latency_ms = round((time.time() - t0) * 1000, 2)
        provider = "Neon PostgreSQL" if "neon.tech" in settings.DATABASE_URL else "PostgreSQL"
        return True, latency_ms, provider
    except Exception as e:
        latency_ms = round((time.time() - t0) * 1000, 2)
        logger.warning(f"Database health check failed: {e}")
        return False, latency_ms, str(e)
