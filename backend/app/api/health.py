import time
import os
import sys
from typing import Any, Dict
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.redis import check_redis_health

router = APIRouter(prefix="/health", tags=["Health & Monitoring"])

START_TIME = time.time()


@router.get("", summary="Overall platform health aggregator")
async def get_overall_health(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Aggregates health across all subsystems."""
    # Check Database
    db_healthy = False
    try:
        await db.execute(text("SELECT 1"))
        db_healthy = True
    except Exception:
        db_healthy = False

    # Check Redis
    redis_healthy = await check_redis_health()

    # Determine overall status
    if db_healthy and redis_healthy:
        overall_status = "healthy"
    elif db_healthy:
        overall_status = "degraded" # DB works, redis degraded
    else:
        overall_status = "down"

    return {
        "status": overall_status,
        "service": "TradeX API Core",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "uptime_seconds": int(time.time() - START_TIME),
        "components": {
            "database": "healthy" if db_healthy else "down",
            "redis": "healthy" if redis_healthy else "down",
            "market_data": "not_configured",
            "trading_engine": "not_configured",
        },
    }


@router.get("/database", summary="Database connectivity health check")
async def get_database_health(db: AsyncSession = Depends(get_db)):
    """Executes a ping query to verify primary PostgreSQL database availability."""
    t0 = time.time()
    try:
        await db.execute(text("SELECT 1"))
        latency_ms = round((time.time() - t0) * 1000, 2)
        return {
            "status": "healthy",
            "latency_ms": latency_ms,
            "database": "PostgreSQL",
        }
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "down",
                "error": str(e),
                "database": "PostgreSQL",
            },
        )


@router.get("/redis", summary="Redis cache and rate limiter connectivity check")
async def get_redis_health():
    """Pings Redis to verify connectivity for caching and rate limiting."""
    t0 = time.time()
    healthy = await check_redis_health()
    latency_ms = round((time.time() - t0) * 1000, 2)
    if healthy:
        return {
            "status": "healthy",
            "latency_ms": latency_ms,
        }
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "down",
            "message": "Redis is unreachable or not connected.",
        },
    )


@router.get("/system", summary="System runtime metrics")
async def get_system_health():
    """System runtime metrics including python version, uptime, and process info."""
    return {
        "status": "healthy",
        "python_version": sys.version.split()[0],
        "platform": sys.platform,
        "pid": os.getpid(),
        "uptime_seconds": int(time.time() - START_TIME),
        "timestamp": time.time(),
    }


@router.get("/market-data", summary="Market data provider status")
async def get_market_data_health():
    """Phase 1 Market Data Provider status. Strictly displays not_configured."""
    return {
        "status": "not_configured",
        "provider": None,
        "message": "Market data provider is not connected yet. Phase 1 foundation active.",
    }


@router.get("/trading-engine", summary="Trading engine provider status")
async def get_trading_engine_health():
    """Phase 1 Trading Engine status. Strictly displays not_configured."""
    return {
        "status": "not_configured",
        "provider": None,
        "message": "Trading engine provider is not configured yet. Phase 1 foundation active.",
    }
