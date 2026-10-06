import asyncio
from datetime import datetime, timezone
from decimal import Decimal
import json
import os
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, Response

from app.core.config import settings
from app.core.exceptions import TradeXException
from app.services.market_data.upstox_client import UpstoxClient, UpstoxAuthRequiredError
from app.services.market_data.normalizer import (
    normalize_upstox_quote,
    normalize_upstox_candle,
    MarketQuote,
)
from app.services.market_data.candle_service import candle_service
from app.services.market_data.instrument_service import instrument_service
from app.services.market_data.websocket_service import (
    market_ws_manager,
    upstream_feed,
    UpstoxUpstreamFeed,
)
from app.services.market_data.MarketDataFeedV3_pb2 import FeedResponse


# ==============================================================================
# 1. UPSTOX CLIENT INITIALIZATION
# ==============================================================================
def test_upstox_client_initialization():
    client = UpstoxClient()
    assert client.BASE_URL == "https://api.upstox.com/v2"
    assert client.V3_BASE_URL == "https://api.upstox.com/v3"
    assert client._is_authenticated is None
    headers = client._get_headers("sample_mock_token")
    assert headers["Authorization"] == "Bearer sample_mock_token"
    assert headers["Accept"] == "application/json"


# ==============================================================================
# 2. MISSING TOKEN HANDLING
# ==============================================================================
@pytest.mark.asyncio
async def test_missing_token_handling():
    client = UpstoxClient()
    with patch.object(settings, "UPSTOX_ACCESS_TOKEN", None), \
         patch.object(settings, "UPSTOX_CLIENT_ID", None), \
         patch.object(settings, "UPSTOX_CLIENT_SECRET", None), \
         patch.object(client, "get_access_token", AsyncMock(return_value=None)):
        
        status = await client.verify_token(force_refresh=True)
        assert status["configured"] is False
        assert status["authenticated"] is False
        assert status["provider"] == "upstox"
        assert "not configured" in status["message"].lower()

        # Calling get() without token raises UpstoxAuthRequiredError
        with pytest.raises(UpstoxAuthRequiredError) as exc_info:
            await client.get("/market-quote/quotes")
        assert exc_info.value.status_code == 401
        assert "Bearer" not in str(exc_info.value.message)


# ==============================================================================
# 3. VALID TOKEN VERIFICATION
# ==============================================================================
@pytest.mark.asyncio
async def test_valid_token_verification():
    client = UpstoxClient()
    mock_resp = Response(
        status_code=200,
        json={"status": "success", "data": {"NSE_INDEX:Nifty 50": {"last_price": 23400.0}}},
    )

    with patch.object(client, "get_access_token", AsyncMock(return_value="mock_valid_token")), \
         patch("httpx.AsyncClient.get", AsyncMock(return_value=mock_resp)):
        
        status = await client.verify_token(force_refresh=True)
        assert status["configured"] is True
        assert status["authenticated"] is True
        assert status["provider"] == "upstox"
        assert "valid" in status["message"].lower()
        # Ensure token is never included in status response
        assert "mock_valid_token" not in json.dumps(status)


# ==============================================================================
# 4. INVALID / EXPIRED TOKEN HANDLING
# ==============================================================================
@pytest.mark.asyncio
async def test_invalid_expired_token_handling():
    client = UpstoxClient()
    mock_401_resp = Response(
        status_code=401,
        json={"status": "error", "errors": [{"message": "Token expired or invalid"}]},
    )

    with patch.object(client, "get_access_token", AsyncMock(return_value="mock_expired_token")), \
         patch("httpx.AsyncClient.get", AsyncMock(return_value=mock_401_resp)):
        
        status = await client.verify_token(force_refresh=True)
        assert status["configured"] is True
        assert status["authenticated"] is False
        assert status["provider"] == "upstox"
        assert "invalid or expired" in status["message"].lower()

        # Verification result caches unauthenticated state safely
        with pytest.raises(UpstoxAuthRequiredError):
            await client.get("/market-quote/quotes")


# ==============================================================================
# 5. QUOTE NORMALIZATION
# ==============================================================================
def test_quote_normalization_complete():
    raw = {
        "last_price": 1245.50,
        "ohlc": {
            "open": 1230.00,
            "high": 1255.00,
            "low": 1225.00,
            "close": 1240.00,
        },
        "cp": 1220.00,
        "volume": 8500000,
        "yearly_high": 1500.00,
        "yearly_low": 1000.00,
        "timestamp": "2026-09-21T15:00:00+05:30",
    }

    norm = normalize_upstox_quote("NSE_EQ|INE002A01018", raw, symbol_override="RELIANCE")
    assert norm.symbol == "RELIANCE"
    assert norm.instrument_key == "NSE_EQ|INE002A01018"
    assert norm.exchange == "NSE"
    assert norm.ltp == Decimal("1245.50")
    assert norm.open == Decimal("1230.00")
    assert norm.high == Decimal("1255.00")
    assert norm.low == Decimal("1225.00")
    assert norm.previous_close == Decimal("1220.00")
    assert norm.change == Decimal("25.5000")
    assert round(float(norm.change_percent), 2) == 2.09
    assert norm.volume == 8500000


# ==============================================================================
# 6. HISTORICAL CANDLE NORMALIZATION & RESAMPLING
# ==============================================================================
def test_historical_candle_normalization():
    raw_candle = [
        "2026-09-21T09:15:00+05:30",
        1230.0,
        1240.0,
        1225.0,
        1235.0,
        45000,
        0,
    ]
    c = normalize_upstox_candle(raw_candle)
    assert c.open == Decimal("1230.0")
    assert c.high == Decimal("1240.0")
    assert c.low == Decimal("1225.0")
    assert c.close == Decimal("1235.0")
    assert c.volume == 45000


def test_candle_resampling():
    from app.services.market_data.normalizer import CandleData
    base_time = datetime(2026, 9, 21, 9, 15, tzinfo=timezone.utc)
    # Generate five 1m candles to resample to a single 5m candle
    candles_1m = [
        CandleData(
            timestamp=datetime.fromtimestamp(base_time.timestamp() + i * 60, tz=timezone.utc),
            open=Decimal(str(100 + i)),
            high=Decimal(str(105 + i)),
            low=Decimal(str(95 + i)),
            close=Decimal(str(101 + i)),
            volume=1000,
        )
        for i in range(5)
    ]
    resampled_5m = candle_service.resample_candles(candles_1m, target_minutes=5)
    assert len(resampled_5m) == 1
    assert resampled_5m[0].open == Decimal("100")
    assert resampled_5m[0].high == Decimal("109")
    assert resampled_5m[0].low == Decimal("95")
    assert resampled_5m[0].close == Decimal("105")
    assert resampled_5m[0].volume == 5000


# ==============================================================================
# 7. INSTRUMENT SEARCH & REVERSE MAPPING
# ==============================================================================
@pytest.mark.asyncio
async def test_instrument_search_and_resolution():
    # Resolve known symbol
    reliance_key = await instrument_service.resolve_instrument_key("RELIANCE")
    assert reliance_key == "NSE_EQ|INE002A01018"

    # Reverse resolution
    reliance_sym = await instrument_service.get_symbol_for_key("NSE_EQ|INE002A01018")
    assert reliance_sym == "RELIANCE"

    nifty_sym = await instrument_service.get_symbol_for_key("NSE_INDEX|Nifty 50")
    assert nifty_sym == "NIFTY 50"


# ==============================================================================
# 8. WEBSOCKET CONNECTION & PROTOBUF DECODING
# ==============================================================================
@pytest.mark.asyncio
async def test_websocket_broadcast_and_protobuf_decode():
    # Test WebSocket Manager registration
    mock_ws = AsyncMock()
    mock_ws.client = "127.0.0.1:50000"
    mock_ws.send_json = AsyncMock()

    await market_ws_manager.connect(mock_ws)
    assert mock_ws in market_ws_manager.active_connections

    await market_ws_manager.subscribe(mock_ws, ["RELIANCE"])
    assert "RELIANCE" in market_ws_manager.active_connections[mock_ws]

    # Test quote broadcast
    test_quote = MarketQuote(
        symbol="RELIANCE",
        instrument_key="NSE_EQ|INE002A01018",
        exchange="NSE",
        timestamp=datetime.now(timezone.utc),
        ltp=Decimal("1248.00"),
        open=Decimal("1230.00"),
        high=Decimal("1250.00"),
        low=Decimal("1225.00"),
        previous_close=Decimal("1220.00"),
        change=Decimal("28.00"),
        change_percent=Decimal("2.29"),
        volume=1000000,
    )
    await market_ws_manager.broadcast_quote(test_quote)
    mock_ws.send_json.assert_called()

    # Disconnect
    await market_ws_manager.disconnect(mock_ws)
    assert mock_ws not in market_ws_manager.active_connections

    # Test binary Protobuf frame handling in upstream feed
    fr = FeedResponse()
    fr.type = 1
    fr.currentTs = 1726910000000
    feed = fr.feeds["NSE_EQ|INE002A01018"]
    feed.fullFeed.marketFF.ltpc.ltp = 1248.5
    feed.fullFeed.marketFF.ltpc.cp = 1220.0
    feed.fullFeed.marketFF.vtt = 2500000
    ohlc = feed.fullFeed.marketFF.marketOHLC.ohlc.add()
    ohlc.interval = "1d"
    ohlc.open = 1230.0
    ohlc.high = 1250.0
    ohlc.low = 1225.0
    ohlc.close = 1248.5

    data_bytes = fr.SerializeToString()
    await upstream_feed._handle_message(data_bytes)


# ==============================================================================
# 9. WEBSOCKET RECONNECT HANDLING
# ==============================================================================
@pytest.mark.asyncio
async def test_websocket_reconnect_metrics():
    test_feed = UpstoxUpstreamFeed()
    assert test_feed.is_connected is False
    assert test_feed._reconnect_count == 0

    # Simulate an error causing reconnection attempt
    test_feed._reconnect_count += 1
    test_feed._error_count += 1
    test_feed._last_error = "Connection closed with error"

    metrics = test_feed.get_monitoring_metrics()
    assert metrics["connected"] is False
    assert metrics["reconnect_count"] == 1
    assert metrics["error_count"] == 1
    assert "error" in metrics["last_error"].lower()


# ==============================================================================
# 10. MARKET DATA HEALTH ENDPOINT
# ==============================================================================
@pytest.mark.asyncio
async def test_market_data_health_endpoint(client: AsyncClient):
    res = await client.get("/health/market-data")
    assert res.status_code == 200
    data = res.json()
    assert "provider" in data
    assert data["provider"] == "upstox"
    assert "configured" in data
    assert "authenticated" in data
    assert "websocket" in data
    assert "redis" in data
    # Verify no secret is leaked in response
    serialized = json.dumps(data).lower()
    assert "bearer" not in serialized
    assert "secret" not in serialized
    assert "access_token" not in serialized


# ==============================================================================
# 11. LIVE UPSTOX INTEGRATION TEST (GUARDED)
# ==============================================================================
@pytest.mark.asyncio
async def test_live_upstox_provider_integration():
    """
    Live Upstox integration test.
    Guarded by UPSTOX_INTEGRATION_TEST=true and valid credentials.
    Gracefully skipped when credentials or flag are missing.
    """
    integration_flag = (
        os.getenv("UPSTOX_INTEGRATION_TEST", "").lower() in ("true", "1", "yes")
        or settings.UPSTOX_INTEGRATION_TEST
    )
    has_token = bool(settings.UPSTOX_ACCESS_TOKEN)

    if not integration_flag or not has_token:
        pytest.skip("Upstox live integration test skipped: UPSTOX_INTEGRATION_TEST is not enabled or credentials not provided.")

    from app.services.market_data.upstox_client import upstox_client
    from app.services.market_data.upstox_provider import upstox_provider

    # Verify live token
    status = await upstox_client.verify_token(force_refresh=True)
    assert status["authenticated"] is True

    # Retrieve live quotes
    quotes = await upstox_provider.get_quotes(["NSE_EQ|INE002A01018", "NSE_INDEX|Nifty 50"])
    assert len(quotes) > 0
    rel_quote = quotes.get("NSE_EQ|INE002A01018") or quotes.get("RELIANCE")
    assert rel_quote is not None
    assert rel_quote.ltp > 0


# ==============================================================================
# 12. UPSTOX ANALYTICS TOKEN PRIORITY & SEPARATION TESTS
# ==============================================================================
@pytest.mark.asyncio
async def test_analytics_token_priority_and_isolation():
    """
    Verifies that get_market_data_token() exclusively uses UPSTOX_ANALYTICS_TOKEN
    and does NOT fall back to OAuth tokens.
    """
    client = UpstoxClient()
    
    with patch.object(settings, "UPSTOX_ANALYTICS_TOKEN", "mock_analytics_token_xyz"), \
         patch.object(settings, "UPSTOX_ACCESS_TOKEN", "stale_oauth_token"):
        
        token = await client.get_market_data_token()
        assert token == "mock_analytics_token_xyz"
        assert token != "stale_oauth_token"
        
        # get_access_token also delegates to market data token
        assert await client.get_access_token() == "mock_analytics_token_xyz"


@pytest.mark.asyncio
async def test_missing_analytics_token_error():
    """
    Verifies that if UPSTOX_ANALYTICS_TOKEN is missing, UpstoxAuthRequiredError is raised
    and does NOT fall back to UPSTOX_ACCESS_TOKEN.
    """
    client = UpstoxClient()
    client._cached_token = None
    
    with patch.object(settings, "UPSTOX_ANALYTICS_TOKEN", ""), \
         patch.object(settings, "UPSTOX_ACCESS_TOKEN", "stale_oauth_token"):
        
        with pytest.raises(UpstoxAuthRequiredError) as exc_info:
            await client.get_market_data_token()
        
        assert "UPSTOX_ANALYTICS_TOKEN" in str(exc_info.value)
        assert "stale_oauth_token" not in str(exc_info.value)

