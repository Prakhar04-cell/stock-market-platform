import time
import os
import sys
from typing import Any, Dict
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import func, select, text
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
async def get_market_data_health(db: AsyncSession = Depends(get_db)):
    """
    Market Data Provider status probe.
    Returns:
    {
      "status": "healthy",
      "provider": "upstox",
      "websocket": "connected" | "disconnected",
      "last_update": "...",
      "instruments": 15
    }
    Or if token expired:
    {
      "status": "authentication_required"
    }
    Never reports healthy incorrectly.
    """
    from sqlalchemy import func
    from app.core.redis import check_redis_health
    from app.models.market import Instrument
    from app.services.market_data.upstox_client import upstox_client
    from app.services.market_data.upstox_provider import upstox_provider
    from app.services.market_data.websocket_service import upstream_feed

    redis_ok = await check_redis_health()
    redis_status = "connected" if redis_ok else "disconnected"

    verification = await upstox_client.verify_token()
    configured = verification["configured"]
    authenticated = verification["authenticated"]

    metrics = upstream_feed.get_monitoring_metrics()
    ws_status = "connected" if upstream_feed.is_connected else "disconnected"
    last_update = metrics.get("last_message") or (
        upstox_provider._last_successful_request.isoformat()
        if upstox_provider._last_successful_request
        else None
    )

    inst_count = (await db.execute(select(func.count(Instrument.id)))).scalar() or 0

    return {
        "provider": "upstox",
        "configured": configured,
        "authenticated": authenticated,
        "websocket": ws_status,
        "last_update": last_update,
        "redis": redis_status,
        "instruments": inst_count,
        "status": "healthy" if (configured and authenticated and redis_ok) else (
            "authentication_required" if not authenticated else "degraded"
        ),
    }


@router.get("/trading-engine", summary="Trading engine provider status")
async def get_trading_engine_health():
    """Phase 2 Virtual Paper Trading Engine status."""
    return {
        "status": "healthy",
        "provider": "paper_trading_engine",
        "mode": "simulation",
        "message": "TradeX Virtual Paper Execution Engine active. Real-money orders strictly disabled.",
    }


@router.get("/infrastructure", summary="Infrastructure runtime diagnostics")
async def get_infrastructure_health(db: AsyncSession = Depends(get_db)):
    """Diagnostics for container runtime, database, redis, and hosting environment."""
    in_docker = os.path.exists("/.dockerenv")
    if not in_docker:
        try:
            with open("/proc/1/cgroup", "rt") as f:
                content = f.read()
                in_docker = "docker" in content or "containerd" in content
        except Exception:
            in_docker = False

    # Check DB
    db_ok = False
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    # Check Redis
    redis_ok = await check_redis_health()

    # Check Upstox
    from app.services.market_data.upstox_client import upstox_client
    from app.services.market_data.websocket_service import upstream_feed
    verification = await upstox_client.verify_token()

    db_url = settings.DATABASE_URL
    is_neon = "neon.tech" in db_url
    is_docker_db = "@postgres:" in db_url

    redis_url = settings.REDIS_URL
    is_upstash = "upstash.io" in redis_url
    is_docker_redis = "@redis:" in redis_url or "redis://redis:" in redis_url

    return {
        "environment": settings.ENVIRONMENT,
        "docker_runtime": {
            "is_container": in_docker,
            "status": "RUNNING_IN_DOCKER" if in_docker else "NOT AVAILABLE (HOST PROCESS)",
        },
        "backend_container": {
            "status": "HEALTHY" if in_docker else "NOT RUNNING (NATIVE HOST)",
        },
        "backend": {
            "status": "HEALTHY",
            "service": "FastAPI",
            "version": settings.VERSION,
        },
        "database": {
            "status": "CONNECTED" if db_ok else "FAILED",
            "provider": "Neon PostgreSQL" if is_neon else ("Docker PostgreSQL" if is_docker_db else "PostgreSQL"),
        },
        "redis": {
            "status": "CONNECTED" if redis_ok else "FAILED",
            "provider": "Upstash Redis" if is_upstash else ("Docker Redis" if is_docker_redis else "Redis"),
        },
        "upstox": {
            "configured": verification["configured"],
            "status": "AUTHENTICATED" if verification["authenticated"] else ("EXPIRED" if verification["configured"] else "NOT CONFIGURED"),
        },
        "websocket": {
            "status": "CONNECTED" if upstream_feed.is_connected else "DISCONNECTED",
        },
    }


