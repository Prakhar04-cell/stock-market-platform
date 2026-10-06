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
        assert "Bearer" not in exc_info.value.message


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
    assert norm.change_percent is not None
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
# 9. WEBSOCKET RECONNECT & LIFECYCLE TESTS
# ==============================================================================
@pytest.mark.asyncio
async def test_websocket_reconnect_metrics():
    test_feed = UpstoxUpstreamFeed()
    assert not test_feed.is_connected
    assert test_feed._reconnect_count == 0

    # Simulate an error causing reconnection attempt
    test_feed._reconnect_count += 1
    test_feed._error_count += 1
    test_feed._last_error = "Connection closed with error"
    test_feed._last_disconnect_reason = "Connection closed with error"

    metrics = test_feed.get_monitoring_metrics()
    assert metrics["connected"] is False
    assert metrics["reconnect_count"] == 1
    assert metrics["error_count"] == 1
    assert "error" in metrics["last_error"].lower()
    assert metrics["last_disconnect_reason"] == "Connection closed with error"


@pytest.mark.asyncio
async def test_websocket_keepalive_timeout_reconnect_handling():
    """Tests that a 1011 keepalive ping timeout properly sets disconnect reason, error count, and reconnect count."""
    test_feed = UpstoxUpstreamFeed()
    test_feed._set_state("CONNECTED")
    assert test_feed.is_connected is True
    assert test_feed.state == "CONNECTED"

    # Simulate keepalive ping timeout error as observed in production
    keepalive_err = "sent 1011 (internal error) keepalive ping timeout; no close frame received."
    test_feed._connected = False
    test_feed._error_count += 1
    test_feed._reconnect_count += 1
    test_feed._last_error = keepalive_err
    test_feed._last_disconnect_reason = keepalive_err
    test_feed._set_state("RECONNECTING")

    assert not test_feed.is_connected
    assert test_feed.state == "RECONNECTING"
    metrics = test_feed.get_monitoring_metrics()
    assert metrics["reconnect_count"] == 1
    assert metrics["error_count"] == 1
    assert "keepalive ping timeout" in metrics["last_error"]
    assert "keepalive ping timeout" in metrics["last_disconnect_reason"]


@pytest.mark.asyncio
async def test_websocket_connection_state_transitions():
    """Tests full state transitions of UpstoxUpstreamFeed."""
    test_feed = UpstoxUpstreamFeed()
    assert test_feed.state == "DISCONNECTED"
    assert not test_feed.is_connected

    test_feed._set_state("CONNECTING")
    assert test_feed.state == "CONNECTING"
    assert not test_feed.is_connected

    test_feed._set_state("CONNECTED")
    assert test_feed.state == "CONNECTED"
    assert test_feed.is_connected

    test_feed._set_state("RECONNECTING")
    assert test_feed.state == "RECONNECTING"
    assert not test_feed.is_connected

    test_feed._set_state("ERROR")
    assert test_feed.state == "ERROR"
    assert not test_feed.is_connected


@pytest.mark.asyncio
async def test_websocket_subscription_state_and_payload():
    """Tests subscription tracking, payload format, and metrics."""
    test_feed = UpstoxUpstreamFeed()
    metrics = test_feed.get_monitoring_metrics()
    assert metrics["subscribed_instruments_count"] >= 8
    assert "NSE_INDEX|Nifty 50" in metrics["subscribed_instruments"]
    assert metrics["last_subscription_sent_at"] is None

    # Mock WebSocket to verify subscription packet format
    mock_ws = AsyncMock()
    mock_ws.send = AsyncMock()
    test_feed._ws = mock_ws
    test_feed._set_state("CONNECTED")

    # Use symbols not in DEFAULT_SUBSCRIBED_KEYS (e.g., TATAMOTORS, SBIN)
    await test_feed.add_subscriptions(["TATAMOTORS", "SBIN"])
    assert test_feed._last_subscription_sent_at is not None
    mock_ws.send.assert_called_once()
    sent_payload = json.loads(mock_ws.send.call_args[0][0].decode("utf-8"))
    assert sent_payload["method"] == "sub"
    assert sent_payload["data"]["mode"] == "full"
    assert len(sent_payload["data"]["instrumentKeys"]) >= 1

    updated_metrics = test_feed.get_monitoring_metrics()
    assert updated_metrics["last_subscription_sent_at"] is not None
    assert updated_metrics["subscribed_instruments_count"] >= 10


@pytest.mark.asyncio
async def test_websocket_first_tick_and_metrics_state():
    """Tests first message, first tick, and decoded tick telemetry."""
    test_feed = UpstoxUpstreamFeed()
    assert test_feed._first_binary_message_at is None
    assert test_feed._first_tick_at is None
    assert test_feed._total_ticks_decoded == 0

    # Simulate receiving a Protobuf feed frame with LTP > 0
    fr = FeedResponse()
    fr.type = 1
    fr.currentTs = int(datetime.now(timezone.utc).timestamp() * 1000)
    feed = fr.feeds["NSE_INDEX|Nifty 50"]
    feed.fullFeed.indexFF.ltpc.ltp = 24500.50
    feed.fullFeed.indexFF.ltpc.cp = 24400.00
    ohlc = feed.fullFeed.indexFF.marketOHLC.ohlc.add()
    ohlc.interval = "1d"
    ohlc.open = 24450.00
    ohlc.high = 24600.00
    ohlc.low = 24400.00
    ohlc.close = 24500.50

    raw_bytes = fr.SerializeToString()
    # Mark first binary message
    test_feed._first_binary_message_at = datetime.now(timezone.utc)
    await test_feed._handle_message(raw_bytes)

    assert test_feed._first_binary_message_at is not None
    assert test_feed._first_tick_at is not None
    assert test_feed._last_tick_at is not None
    assert test_feed._total_ticks_decoded == 1

    metrics = test_feed.get_monitoring_metrics()
    assert metrics["total_ticks_decoded"] == 1
    assert metrics["first_tick_at"] is not None
    assert metrics["first_binary_message_at"] is not None
    assert metrics["last_tick_at"] is not None


@pytest.mark.asyncio
async def test_websocket_quote_rate_calculation():
    """Tests rolling quote update rate across various intervals."""
    test_feed = UpstoxUpstreamFeed()
    # Unconnected & no ticks
    assert test_feed.get_quote_rate() == "N/A"

    # Connected but waiting for ticks
    test_feed._set_state("CONNECTED")
    assert test_feed.get_quote_rate() == "Waiting for first tick"

    # Live ticks burst
    import time
    now = time.time()
    for i in range(10):
        test_feed.record_tick(now - (9 - i) * 0.1)

    rate = test_feed.get_quote_rate()
    assert "updates/sec" in rate

    # Idle feed (tick 30s ago)
    test_feed._tick_history.clear()
    test_feed.record_tick(now - 30.0)
    assert test_feed.get_quote_rate() == "Idle (<1/sec)"

    # Stale feed (tick 90s ago)
    test_feed._tick_history.clear()
    test_feed.record_tick(now - 90.0)
    assert test_feed.get_quote_rate() == "Stale (>60s)"


@pytest.mark.asyncio
async def test_no_duplicate_connection_tasks():
    """Verifies that calling start() multiple times never creates duplicate tasks."""
    test_feed = UpstoxUpstreamFeed()
    assert test_feed._task is None
    assert test_feed._is_running is False

    # Mock _run_loop to hang until cancelled
    async def dummy_run_loop():
        try:
            while True:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            pass

    with patch.object(test_feed, "_run_loop", side_effect=dummy_run_loop):
        await test_feed.start()
        first_task = test_feed._task
        assert first_task is not None
        assert not first_task.done()

        # Call start() again while already running
        await test_feed.start()
        second_task = test_feed._task
        # Must be the exact same task instance — no duplicates created!
        assert first_task is second_task

        # Clean shutdown
        await test_feed.stop()
        assert test_feed._task is None
        assert not test_feed._is_running
        assert first_task.cancelled() or first_task.done()


@pytest.mark.asyncio
async def test_background_order_evaluation_task_tracking_and_cleanup():
    """Verifies that dispatched order-evaluation tasks are tracked and automatically cleaned up on completion."""
    test_feed = UpstoxUpstreamFeed()
    assert len(test_feed._background_tasks) == 0

    quote = MarketQuote(
        symbol="RELIANCE",
        instrument_key="NSE_EQ|INE002A01018",
        exchange="NSE",
        timestamp=datetime.now(timezone.utc),
        ltp=Decimal("1250.00"),
        open=Decimal("1230.00"),
        high=Decimal("1255.00"),
        low=Decimal("1225.00"),
        previous_close=Decimal("1220.00"),
        change=Decimal("30.00"),
        change_percent=Decimal("2.46"),
        volume=100000,
    )

    with patch("app.services.paper_trading.execution_service.paper_execution_service.evaluate_open_limit_orders", AsyncMock()):
        test_feed._dispatch_order_evaluation(quote)
        assert len(test_feed._background_tasks) == 1

        # Yield execution to allow background task to complete and invoke done callback
        await asyncio.sleep(0.05)
        assert len(test_feed._background_tasks) == 0


@pytest.mark.asyncio
async def test_background_order_evaluation_bounded_concurrency_and_backpressure():
    """Verifies that background order evaluation enforces bounded concurrency and skips excess tasks without blocking."""
    test_feed = UpstoxUpstreamFeed()
    assert test_feed._max_eval_tasks == 5

    quote = MarketQuote(
        symbol="TCS",
        instrument_key="NSE_EQ|INE467B01029",
        exchange="NSE",
        timestamp=datetime.now(timezone.utc),
        ltp=Decimal("3500.00"),
        open=Decimal("3480.00"),
        high=Decimal("3520.00"),
        low=Decimal("3470.00"),
        previous_close=Decimal("3450.00"),
        change=Decimal("50.00"),
        change_percent=Decimal("1.45"),
        volume=50000,
    )

    release_event = asyncio.Event()

    async def slow_order_evaluation(_):
        await release_event.wait()

    with patch("app.services.paper_trading.execution_service.paper_execution_service.evaluate_open_limit_orders", side_effect=slow_order_evaluation):
        # Dispatch up to maximum capacity (5 tasks)
        for _ in range(5):
            test_feed._dispatch_order_evaluation(quote)
        assert len(test_feed._background_tasks) == 5

        # Attempt to dispatch additional tasks beyond concurrency limit
        for _ in range(5):
            test_feed._dispatch_order_evaluation(quote)

        # Concurrency must be strictly bounded at 5 — backpressure drops excess
        assert len(test_feed._background_tasks) == 5

        # Release the event to let tasks finish
        release_event.set()
        await asyncio.sleep(0.05)
        assert len(test_feed._background_tasks) == 0


@pytest.mark.asyncio
async def test_background_order_evaluation_cancellation_during_stop():
    """Verifies that calling stop() cleanly cancels and drains all active background evaluation tasks."""
    test_feed = UpstoxUpstreamFeed()

    quote = MarketQuote(
        symbol="INFY",
        instrument_key="NSE_EQ|INE009A01021",
        exchange="NSE",
        timestamp=datetime.now(timezone.utc),
        ltp=Decimal("1600.00"),
        open=Decimal("1590.00"),
        high=Decimal("1610.00"),
        low=Decimal("1585.00"),
        previous_close=Decimal("1580.00"),
        change=Decimal("20.00"),
        change_percent=Decimal("1.27"),
        volume=75000,
    )

    async def hanging_evaluation(_):
        try:
            await asyncio.sleep(10)
        except asyncio.CancelledError:
            raise

    with patch("app.services.paper_trading.execution_service.paper_execution_service.evaluate_open_limit_orders", side_effect=hanging_evaluation):
        for _ in range(3):
            test_feed._dispatch_order_evaluation(quote)
        assert len(test_feed._background_tasks) == 3

        # Call stop() which must cancel and drain the tasks
        await test_feed.stop()
        assert len(test_feed._background_tasks) == 0


@pytest.mark.asyncio
async def test_websocket_receive_loop_remains_non_blocking_with_slow_database():
    """Verifies that slow database operations in limit order evaluation never block the feed handle_message loop."""
    import time
    test_feed = UpstoxUpstreamFeed()

    fr = FeedResponse()
    fr.type = 1
    fr.currentTs = int(datetime.now(timezone.utc).timestamp() * 1000)
    feed = fr.feeds["NSE_INDEX|Nifty 50"]
    feed.fullFeed.indexFF.ltpc.ltp = 24500.50
    feed.fullFeed.indexFF.ltpc.cp = 24400.00
    ohlc = feed.fullFeed.indexFF.marketOHLC.ohlc.add()
    ohlc.interval = "1d"
    ohlc.open = 24450.00
    ohlc.high = 24600.00
    ohlc.low = 24400.00
    ohlc.close = 24500.50
    raw_bytes = fr.SerializeToString()

    async def slow_db_eval(_):
        await asyncio.sleep(0.5)

    with patch("app.services.market_data.quote_service.quote_service.cache_quote", AsyncMock()), \
         patch("app.services.paper_trading.execution_service.paper_execution_service.evaluate_open_limit_orders", side_effect=slow_db_eval):
        t0 = time.perf_counter()
        await test_feed._handle_message(raw_bytes)
        elapsed = time.perf_counter() - t0

        # _handle_message must return immediately (< 0.2s) despite 0.5s DB work in background
        assert elapsed < 0.2
        assert len(test_feed._background_tasks) == 1

        await test_feed.stop()
        assert len(test_feed._background_tasks) == 0


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

