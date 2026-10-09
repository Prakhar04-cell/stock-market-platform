"""
Focused tests for Sentry error monitoring and diagnostics.
Verifies:
- Backend starts and functions normally without SENTRY_DSN
- Sentry configuration is detected correctly
- Initialization is idempotent (happens exactly once)
- Sensitive credentials, tokens, and headers are thoroughly filtered
- Unhandled 5xx exceptions trigger capture_exception safely
"""
import os
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import MagicMock, patch

from app.core import sentry
from app.core.sentry import (
    capture_exception,
    get_sentry_status,
    init_sentry,
    sentry_before_send,
)
from app.main import app


@pytest.mark.asyncio
async def test_backend_works_without_sentry_dsn(client: AsyncClient):
    """Verify backend starts and operates normally when SENTRY_DSN is absent."""
    with patch.dict(os.environ, {"SENTRY_DSN": ""}, clear=False):
        status, desc = get_sentry_status()
        assert status == "NOT_CONFIGURED"
        assert "SENTRY_DSN is not configured" in desc

    # Verify standard endpoints respond successfully
    resp = await client.get("/")
    assert resp.status_code == 200
    assert "version" in resp.json()

    health_resp = await client.get("/health")
    assert health_resp.status_code == 200


def test_sentry_configuration_detected_correctly():
    """Verify get_sentry_status accurately reports CONFIGURED when SDK is active."""
    mock_client = MagicMock()
    mock_client.is_active.return_value = True

    with patch("sentry_sdk.is_initialized", return_value=True), \
         patch("sentry_sdk.get_client", return_value=mock_client), \
         patch.dict(os.environ, {"SENTRY_DSN": "https://mockkey@o0.ingest.sentry.io/0"}):
        status, desc = get_sentry_status()
        assert status == "CONFIGURED"
        assert "sensitive field filtering" in desc


def test_initialization_does_not_happen_multiple_times():
    """Verify init_sentry is strictly idempotent and does not re-initialize."""
    with patch("sentry_sdk.init") as mock_sdk_init, \
         patch.dict(os.environ, {"SENTRY_DSN": "https://mockkey@o0.ingest.sentry.io/0"}):
        # Reset internal module flag for test
        original_flag = sentry._sentry_initialized
        try:
            sentry._sentry_initialized = False

            # First initialization call
            res1 = init_sentry()
            assert res1 is True
            assert mock_sdk_init.call_count == 1

            # Second initialization call - must be a no-op
            res2 = init_sentry()
            assert res2 is True
            assert mock_sdk_init.call_count == 1  # Still 1
        finally:
            sentry._sentry_initialized = original_flag


def test_sensitive_data_filtering():
    """Verify sentry_before_send sanitizes headers, passwords, JWTs, DB URLs, and Redis tokens."""
    event = {
        "request": {
            "headers": {
                "authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature",
                "cookie": "session=secret_cookie_val",
                "x-token": "secret_token_123",
                "x-api-key": "secret_api_key",
                "content-type": "application/json",
            },
            "data": {
                "username": "trader_alice",
                "password": "SuperSecretPassword123!",
                "nested": {
                    "api_key": "bsk_live_super_secret_market_key_12345",
                    "upstox_token": "eyJhbGciOiJIUzI1NiJ9.test_upstox_token.abc",
                },
            },
            "query_string": "code=12345&token=eyJhbGciOiJIUzI1NiJ9.eyJ1IjoxfQ.sig",
        },
        "extra": {
            "database_url": "postgresql+asyncpg://neondb_owner:npg_SecretPass123@ep-pooler.neon.tech/neondb?sslmode=require",
            "redis_url": "rediss://default:upstashSecretToken987@immortal-elf.upstash.io:6379",
        },
        "exception": {
            "values": [
                {
                    "type": "DatabaseConnectionError",
                    "value": "Cannot connect to postgresql://user:myDbPassword@host:5432/db",
                }
            ]
        },
        "breadcrumbs": {
            "values": [
                {
                    "message": "Connecting with token eyJhbGciOiJIUzI1NiJ9.payload.sig",
                    "data": {"auth_token": "raw_secret_value"},
                }
            ]
        },
    }

    processed = sentry_before_send(event, None)
    assert processed is not None

    # Check Headers
    headers = processed["request"]["headers"]
    assert headers["authorization"] == "[FILTERED]"
    assert headers["cookie"] == "[FILTERED]"
    assert headers["x-token"] == "[FILTERED]"
    assert headers["x-api-key"] == "[FILTERED]"
    assert headers["content-type"] == "application/json"

    # Check Request Data
    data = processed["request"]["data"]
    assert data["password"] == "[FILTERED]"
    assert data["nested"]["api_key"] == "[FILTERED]"
    assert data["nested"]["upstox_token"] == "[FILTERED]"
    assert data["username"] == "trader_alice"

    # Check Query String
    assert "eyJ" not in processed["request"]["query_string"]
    assert "[FILTERED_JWT]" in processed["request"]["query_string"]

    # Check DB and Redis Credentials in Extra
    extra = processed["extra"]
    assert "npg_SecretPass123" not in extra["database_url"]
    assert "[FILTERED]" in extra["database_url"]
    assert "upstashSecretToken987" not in extra["redis_url"]
    assert "[FILTERED]" in extra["redis_url"]

    # Check Exception Value
    exc_val = processed["exception"]["values"][0]["value"]
    assert "myDbPassword" not in exc_val
    assert "[FILTERED]" in exc_val

    # Check Breadcrumbs
    crumb = processed["breadcrumbs"]["values"][0]
    assert "[FILTERED_JWT]" in crumb["message"]
    assert crumb["data"]["auth_token"] == "[FILTERED]"


def test_capture_exception_safe_when_unconfigured():
    """Verify capture_exception runs safely without raising even if Sentry is unconfigured."""
    result = capture_exception(ValueError("Test error"))
    assert result is None


@pytest.mark.asyncio
async def test_unhandled_500_exception_captured():
    """Verify unhandled exceptions trigger capture_exception and return a clean 500 JSON response."""
    test_route_called = False

    @app.get("/test-sentry-error-route")
    async def error_route():
        nonlocal test_route_called
        test_route_called = True
        raise RuntimeError("Simulated unhandled internal server error")

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.main.capture_exception") as mock_capture:
            resp = await client.get("/test-sentry-error-route")
            assert resp.status_code == 500
            data = resp.json()
            assert data["success"] is False
            assert data["error"]["code"] == "INTERNAL_SERVER_ERROR"
            # Verify Sentry captured the exception
            assert mock_capture.call_count == 1
