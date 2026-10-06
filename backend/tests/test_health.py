import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch

from app.core.config import settings
from app.core.database import check_db_health
from app.core.redis import check_redis_ping
from app.core.sentry import get_sentry_status
from app.services.market_data.websocket_service import UpstoxUpstreamFeed, upstream_feed


@pytest.mark.asyncio
async def test_overall_health(client: AsyncClient):
    """Test the overall health aggregator endpoint."""
    res = await client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["healthy", "degraded", "down"]
    assert "environment" in data
    assert "components" in data
    assert "database" in data["components"]
    assert "redis" in data["components"]
    assert "market_data" in data["components"]
    assert "trading_engine" in data["components"]


@pytest.mark.asyncio
async def test_database_select_1_health_check(client: AsyncClient, db_session):
    """Test direct SELECT 1 database health probe and /health/database endpoint."""
    # 1. Direct function probe
    ok, latency_ms, provider = await check_db_health(db_session)
    assert ok is True
    assert isinstance(latency_ms, float)
    assert latency_ms >= 0.0
    assert provider in ["Neon PostgreSQL", "PostgreSQL"]

    # 2. Endpoint probe
    res = await client.get("/health/database")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "latency_ms" in data
    assert "database" in data


@pytest.mark.asyncio
async def test_redis_ping_health_check(client: AsyncClient):
    """Test Redis PING health probe with latency measurement."""
    # 1. Direct function probe
    ok, latency_ms, provider = await check_redis_ping()
    assert isinstance(ok, bool)
    assert isinstance(latency_ms, float)
    assert provider in ["Upstash Redis", "Redis", "NOT_CONFIGURED"] or ok is False

    # 2. Endpoint probe
    res = await client.get("/health/redis")
    assert res.status_code in [200, 503]
    data = res.json()
    assert data["status"] in ["healthy", "not_configured", "down"]
    assert "latency_ms" in data


@pytest.mark.asyncio
async def test_docker_managed_by_host_behavior(client: AsyncClient):
    """
    Test truthful Docker runtime reporting.
    When not running in a raw Docker container (e.g. Render host environment),
    it reports 'MANAGED BY HOST' rather than false failures.
    """
    res = await client.get("/health/infrastructure")
    assert res.status_code == 200
    data = res.json()
    assert "docker_runtime" in data
    docker = data["docker_runtime"]
    assert docker["status"] in ["MANAGED BY HOST", "RUNNING_IN_DOCKER"]
    if docker["status"] == "MANAGED BY HOST":
        assert "Host Docker runtime is managed by Render" in docker["description"]

    # Backend Container must report HEALTHY when process is alive
    assert "backend_container" in data
    assert data["backend_container"]["status"] == "HEALTHY"


@pytest.mark.asyncio
async def test_backend_system_health(client: AsyncClient):
    """Test backend FastAPI process alive status."""
    res = await client.get("/health/system")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "uptime_seconds" in data
    assert "platform" in data
    assert "pid" in data


def test_sentry_not_configured_status():
    """Verify Sentry reports NOT_CONFIGURED when SDK is uninitialized or uninstalled."""
    status, desc = get_sentry_status()
    # In test environment, Sentry is not initialized
    assert status in ["NOT_CONFIGURED", "ACTIVE"]
    if status == "NOT_CONFIGURED":
        assert "sentry-sdk" in desc or "DSN" in desc or "inactive" in desc


def test_websocket_states_and_quote_rate():
    """Test Upstox WebSocket state machine transitions and rolling quote rate calculation."""
    feed = UpstoxUpstreamFeed()

    # Initial state
    assert feed.state == "DISCONNECTED"
    assert not feed.is_connected

    # Transition to CONNECTING
    feed._set_state("CONNECTING")
    assert feed.state == "CONNECTING"
    assert not feed.is_connected

    # Transition to CONNECTED
    feed._set_state("CONNECTED")
    assert feed.state == "CONNECTED"
    assert feed.is_connected

    # Transition to RECONNECTING
    feed._set_state("RECONNECTING")
    assert feed.state == "RECONNECTING"
    assert not feed.is_connected

    # Transition to ERROR
    feed._set_state("ERROR")
    assert feed.state == "ERROR"
    assert not feed.is_connected

    # Transition back to DISCONNECTED
    feed._set_state("DISCONNECTED")
    assert feed.state == "DISCONNECTED"

    # Quote rate calculation
    assert feed.get_quote_rate() == "Standby"

    # Simulate ticks
    import time
    now = time.time()
    for i in range(10):
        feed.record_tick(now - (9 - i) * 0.1)

    rate = feed.get_quote_rate()
    assert "updates/sec" in rate or rate == "Standby"


@pytest.mark.asyncio
async def test_admin_monitoring_endpoint_rbac(
    client: AsyncClient, trader_auth_headers: dict, admin_auth_headers: dict
):
    """
    Test Admin Monitoring API authorization and response schema:
    - 401 for unauthenticated
    - 403 for non-admin user
    - 200 for admin user with full telemetry schema
    """
    # 1. Unauthenticated request
    unauth_res = await client.get("/api/v1/admin/monitoring")
    assert unauth_res.status_code == 401

    # 2. Non-admin trader request
    trader_res = await client.get("/api/v1/admin/monitoring", headers=trader_auth_headers)
    assert trader_res.status_code == 403

    # 3. Admin request
    admin_res = await client.get("/api/v1/admin/monitoring", headers=admin_auth_headers)
    assert admin_res.status_code == 200
    data = admin_res.json()

    assert "environment" in data
    assert "components" in data
    assert isinstance(data["components"], list)

    component_names = [c["service_name"] for c in data["components"]]
    assert "PostgreSQL Database" in component_names
    assert "Redis Cache & Rate Limiter" in component_names
    assert "Docker Runtime" in component_names
    assert "Market WebSocket" in component_names
    assert "Sentry Monitoring" in component_names

    assert "metrics" in data
    metrics = data["metrics"]
    assert "docker_runtime" in metrics
    assert "backend_container" in metrics
    assert "postgresql_status" in metrics
    assert "redis_status" in metrics
    assert "market_websocket_state" in metrics
    assert "quote_update_rate" in metrics
    assert "subscribed_instruments_count" in metrics
    assert "sentry_status" in metrics
    assert "paper_trading_engine_status" in metrics
