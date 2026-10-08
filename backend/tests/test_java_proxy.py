import pytest
from httpx import AsyncClient, Response
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_java_proxy_success(client: AsyncClient):
    """Test successful forwarding to Java Security Service."""
    mock_payload = {"service": "Java Security Service", "status": "UP"}
    mock_resp = Response(
        status_code=200,
        json=mock_payload,
        headers={"content-type": "application/json"},
    )
    mock_client = AsyncMock()
    mock_client.request = AsyncMock(return_value=mock_resp)

    with patch("httpx.AsyncClient") as MockClientClass:
        # Make sure only calls within the server handler use the mock
        instance = MockClientClass.return_value
        instance.__aenter__.return_value = mock_client
        response = await client.get("/api/java/health")
        assert response.status_code == 200
        assert response.json() == mock_payload


@pytest.mark.asyncio
async def test_java_proxy_service_unavailable(client: AsyncClient):
    """Test handling when Java service is unreachable."""
    import httpx
    mock_client = AsyncMock()
    mock_client.request = AsyncMock(side_effect=httpx.ConnectError("Connection refused"))

    with patch("httpx.AsyncClient") as MockClientClass:
        instance = MockClientClass.return_value
        instance.__aenter__.return_value = mock_client
        response = await client.get("/api/java/health")
        assert response.status_code == 503
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "JAVA_SERVICE_UNAVAILABLE"


@pytest.mark.asyncio
async def test_infrastructure_health_includes_java(client: AsyncClient):
    """Test that /health/infrastructure includes java_security_service."""
    res = await client.get("/health/infrastructure")
    assert res.status_code == 200
    data = res.json()
    assert "java_security_service" in data
    assert "status" in data["java_security_service"]
    assert data["java_security_service"]["status"] in ["HEALTHY", "DEGRADED", "UNHEALTHY", "DISCONNECTED"]
