import time
import os
import sys
from typing import Any, Dict
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import check_db_health, get_db
from app.core.redis import check_redis_health, check_redis_ping
from app.core.sentry import get_sentry_status

router = APIRouter(prefix="/health", tags=["Health & Monitoring"])

START_TIME = time.time()


@router.get("", summary="Overall platform health aggregator")
async def get_overall_health(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Aggregates health across all subsystems."""
    # Check Database using real SELECT 1
    db_ok, db_latency, _ = await check_db_health(db)

    # Check Redis using real PING
    redis_ok, redis_latency, redis_prov = await check_redis_ping()
    redis_available = redis_ok or redis_prov == "NOT_CONFIGURED"

    # Determine overall status
    if db_ok and redis_ok:
        overall_status = "healthy"
    elif db_ok:
        overall_status = "degraded"  # DB works, redis degraded or not configured
    else:
        overall_status = "down"

    return {
        "status": overall_status,
        "service": "TradeX API Core",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "uptime_seconds": int(time.time() - START_TIME),
        "components": {
            "database": "healthy" if db_ok else "down",
            "redis": "healthy" if redis_ok else ("not_configured" if redis_prov == "NOT_CONFIGURED" else "down"),
            "market_data": "upstox",
            "trading_engine": "paper_trading_engine",
        },
    }


@router.get("/database", summary="Database connectivity health check")
async def get_database_health(db: AsyncSession = Depends(get_db)):
    """Executes a real SELECT 1 query to verify primary PostgreSQL database availability and latency."""
    ok, latency_ms, provider = await check_db_health(db)
    if ok:
        return {
            "status": "healthy",
            "latency_ms": latency_ms,
            "database": provider,
        }
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "down",
            "latency_ms": latency_ms,
            "error": provider,
            "database": "PostgreSQL",
        },
    )


@router.get("/redis", summary="Redis cache and rate limiter connectivity check")
async def get_redis_health():
    """Pings Redis to verify connectivity and measure latency."""
    ok, latency_ms, provider = await check_redis_ping()
    if ok:
        return {
            "status": "healthy",
            "latency_ms": latency_ms,
            "provider": provider,
        }
    if provider == "NOT_CONFIGURED":
        return {
            "status": "not_configured",
            "latency_ms": 0.0,
            "provider": "Redis",
            "message": "Redis is not configured in environment.",
        }
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "down",
            "latency_ms": latency_ms,
            "provider": provider,
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
    Surfaces real Upstox token authentication, WebSocket feed state, rolling tick rate, and latency.
    """
    from app.services.market_data.upstox_client import upstox_client
    from app.services.market_data.upstox_provider import upstox_provider
    from app.services.market_data.websocket_service import upstream_feed

    redis_ok, _, _ = await check_redis_ping()
    redis_status = "connected" if redis_ok else "disconnected"

    verification = await upstox_client.verify_token()
    configured = verification["configured"]
    authenticated = verification["authenticated"]

    metrics = upstream_feed.get_monitoring_metrics()
    ws_state = metrics["state"]
    last_update = metrics.get("last_message") or (
        upstox_provider._last_successful_request.isoformat()
        if upstox_provider._last_successful_request
        else None
    )

    latency = metrics.get("feed_latency_ms") or upstox_client.get_latency_ms()

    return {
        "provider": "upstox",
        "configured": configured,
        "authenticated": authenticated,
        "websocket": ws_state.lower(),
        "websocket_state": ws_state,
        "quote_update_rate": metrics.get("quote_update_rate", "Standby"),
        "last_update": last_update,
        "latency_ms": latency,
        "redis": redis_status,
        "instruments": metrics.get("subscribed_instruments_count", 0),
        "status": "healthy" if (configured and authenticated and ws_state == "CONNECTED") else (
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

    # Check DB using real SELECT 1
    db_ok, db_latency, db_provider = await check_db_health(db)

    # Check Redis using real PING
    redis_ok, redis_latency, redis_provider = await check_redis_ping()

    # Check Upstox
    from app.services.market_data.upstox_client import upstox_client
    from app.services.market_data.websocket_service import upstream_feed
    verification = await upstox_client.verify_token()
    ws_metrics = upstream_feed.get_monitoring_metrics()
    sentry_status, sentry_desc = get_sentry_status()

    docker_status = "RUNNING_IN_DOCKER" if in_docker else "MANAGED BY HOST"
    docker_desc = (
        "Running inside containerized stack."
        if in_docker
        else "Host Docker runtime is managed by Render and is not directly exposed to the application."
    )

    latency_ms = ws_metrics.get("feed_latency_ms") or upstox_client.get_latency_ms()

    return {
        "environment": settings.ENVIRONMENT,
        "docker_runtime": {
            "is_container": in_docker,
            "status": docker_status,
            "description": docker_desc,
        },
        "backend_container": {
            "status": "HEALTHY",
            "service": "FastAPI",
            "version": settings.VERSION,
            "uptime_seconds": int(time.time() - START_TIME),
        },
        "backend": {
            "status": "HEALTHY",
            "service": "FastAPI",
            "version": settings.VERSION,
        },
        "database": {
            "status": "CONNECTED" if db_ok else "FAILED",
            "provider": db_provider,
            "latency_ms": db_latency,
        },
        "redis": {
            "status": "CONNECTED" if redis_ok else ("NOT_CONFIGURED" if redis_provider == "NOT_CONFIGURED" else "FAILED"),
            "provider": redis_provider,
            "latency_ms": redis_latency,
        },
        "upstox": {
            "configured": verification["configured"],
            "status": "Analytics Token ACTIVE" if verification["authenticated"] else ("NOT CONFIGURED" if not verification["configured"] else "EXPIRED"),
            "market_data_authenticated": verification["authenticated"],
            "token_type": "ANALYTICS_TOKEN",
            "latency_ms": upstox_client.get_latency_ms(),
        },
        "websocket": {
            "status": ws_metrics["state"],
            "connected": upstream_feed.is_connected,
            "quote_update_rate": ws_metrics.get("quote_update_rate", "Standby"),
            "subscribed_instruments_count": ws_metrics.get("subscribed_instruments_count", 0),
            "latency_ms": latency_ms,
        },
        "sentry": {
            "status": sentry_status,
            "description": sentry_desc,
        },
    }


