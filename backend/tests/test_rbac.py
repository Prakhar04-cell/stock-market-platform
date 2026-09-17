import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_admin_metrics_authorized(client: AsyncClient, admin_auth_headers: dict):
    response = await client.get("/api/v1/admin/metrics", headers=admin_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_users" in data
    assert "active_users" in data
    assert "system_status" in data


@pytest.mark.asyncio
async def test_admin_metrics_forbidden_for_trader(client: AsyncClient, trader_auth_headers: dict):
    response = await client.get("/api/v1/admin/metrics", headers=trader_auth_headers)
    assert response.status_code == 403
    err = response.json()
    assert err["success"] is False
    assert err["error"]["code"] == "PERMISSION_DENIED"


@pytest.mark.asyncio
async def test_admin_metrics_unauthenticated(client: AsyncClient):
    response = await client.get("/api/v1/admin/metrics")
    assert response.status_code == 401
    err = response.json()
    assert err["success"] is False
    assert err["error"]["code"] == "AUTHENTICATION_FAILED"
