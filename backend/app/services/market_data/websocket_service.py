import asyncio
import collections
import json
import logging
import time
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Set
from fastapi import WebSocket, WebSocketDisconnect

from app.services.market_data.instrument_service import instrument_service
from app.services.market_data.normalizer import MarketQuote, normalize_upstox_quote
from app.services.market_data.quote_service import quote_service

logger = logging.getLogger("tradex.websocket")


class MarketWebSocketManager:
    """
    FastAPI TradeX WebSocket connection manager for client browser connections.
    Routes real-time quote updates to subscribed clients without full-page rerenders.
    """

    def __init__(self):
        # Maps active WebSocket connection -> Set of subscribed instrument keys / symbols
        self.active_connections: Dict[WebSocket, Set[str]] = {}
        # Reverse map: key/symbol -> Set of connected WebSockets
        self.subscriptions: Dict[str, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections[websocket] = set()
        logger.info(f"TradeX WebSocket client connected: {websocket.client}")

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            subbed = self.active_connections.pop(websocket, set())
            for item in subbed:
                if item in self.subscriptions:
                    self.subscriptions[item].discard(websocket)
                    if not self.subscriptions[item]:
                        self.subscriptions.pop(item, None)
        logger.info("TradeX WebSocket client disconnected.")

    async def subscribe(self, websocket: WebSocket, symbols: List[str]):
        """Subscribes a client to quote streams for the given symbols."""
        async with self._lock:
            if websocket not in self.active_connections:
                return

            for sym in symbols:
                clean = sym.strip().upper()
                ikey = await instrument_service.resolve_instrument_key(clean)
                self.active_connections[websocket].add(clean)
                self.active_connections[websocket].add(ikey)

                self.subscriptions.setdefault(clean, set()).add(websocket)
                self.subscriptions.setdefault(ikey, set()).add(websocket)

                # Send immediate latest cached quote if available
                quote = await quote_service.get_quote(clean)
                if quote:
                    try:
                        quote_dict = json.loads(quote.model_dump_json())
                        await websocket.send_json({
                            "type": "quote",
                            "data": quote_dict,
                            **quote_dict,
                        })
                    except Exception:
                        pass

        # Request upstream feed to track these keys
        await upstream_feed.add_subscriptions(symbols)

    async def unsubscribe(self, websocket: WebSocket, symbols: List[str]):
        async with self._lock:
            if websocket not in self.active_connections:
                return
            for sym in symbols:
                clean = sym.strip().upper()
                ikey = await instrument_service.resolve_instrument_key(clean)
                self.active_connections[websocket].discard(clean)
                self.active_connections[websocket].discard(ikey)

                if clean in self.subscriptions:
                    self.subscriptions[clean].discard(websocket)
                if ikey in self.subscriptions:
                    self.subscriptions[ikey].discard(websocket)

    async def broadcast_quote(self, quote: MarketQuote):
        """Broadcasts a normalized quote to all clients subscribed to this symbol or key."""
        target_sockets: Set[WebSocket] = set()
        async with self._lock:
            if quote.symbol in self.subscriptions:
                target_sockets.update(self.subscriptions[quote.symbol])
            if quote.symbol.upper() in self.subscriptions:
                target_sockets.update(self.subscriptions[quote.symbol.upper()])
            if quote.instrument_key in self.subscriptions:
                target_sockets.update(self.subscriptions[quote.instrument_key])

        if not target_sockets:
            return

        quote_dict = json.loads(quote.model_dump_json())
        message = {
            "type": "quote",
            "data": quote_dict,
            **quote_dict,
        }


        stale_sockets = []
        for ws in target_sockets:
            try:
                await ws.send_json(message)
            except Exception:
                stale_sockets.append(ws)

        for ws in stale_sockets:
            await self.disconnect(ws)

    def get_stats(self) -> Dict[str, Any]:
        return {
            "connected_clients": len(self.active_connections),
            "subscribed_symbols": len(self.subscriptions),
        }


market_ws_manager = MarketWebSocketManager()


DEFAULT_SUBSCRIBED_KEYS: Set[str] = {
    "NSE_INDEX|Nifty 50",
    "BSE_INDEX|SENSEX",
    "NSE_INDEX|Nifty Bank",
    "NSE_INDEX|Nifty Fin Service",
    "NSE_INDEX|NIFTY MID SELECT",
    "NSE_EQ|INE002A01018",  # RELIANCE
    "NSE_EQ|INE467B01029",  # TCS
    "NSE_EQ|INE009A01021",  # INFY
}


class UpstoxUpstreamFeed:
    """
    Manages upstream WebSocket connection to Upstox Market Data Feed V3.
    Decodes binary Protobuf feed, updates Redis quote cache, and fans out to TradeX clients.
    """

    def __init__(self):
        self._is_running = False
        self._connected = False
        self._state = "DISCONNECTED"
        self._subscribed_keys: Set[str] = set(DEFAULT_SUBSCRIBED_KEYS)
        self._last_subscription_sent_at: Optional[datetime] = None
        self._first_binary_message_at: Optional[datetime] = None
        self._first_tick_at: Optional[datetime] = None
        self._last_message_at: Optional[datetime] = None
        self._last_websocket_frame_at: Optional[datetime] = None
        self._last_binary_message_at: Optional[datetime] = None
        self._last_tick_at: Optional[datetime] = None
        self._total_binary_messages: int = 0
        self._total_text_messages: int = 0
        self._decode_errors: int = 0
        self._normalization_errors: int = 0
        self._tick_history: collections.deque = collections.deque(maxlen=120)
        self._last_feed_latency_ms: Optional[float] = None
        self._last_market_data_latency_ms: Optional[float] = None
        self._messages_received: int = 0
        self._total_ticks_decoded: int = 0
        self._reconnect_count: int = 0
        self._error_count: int = 0
        self._last_error: Optional[str] = None
        self._last_disconnect_reason: Optional[str] = None
        self._max_eval_tasks: int = 5
        self._eval_semaphore: asyncio.Semaphore = asyncio.Semaphore(5)
        self._background_tasks: Set[asyncio.Task] = set()
        self._task: Optional[asyncio.Task] = None
        self._ws = None
        self._last_logged_diagnostic_state: Optional[str] = None

    @property
    def diagnostic_state(self) -> str:
        """
        Calculates structured diagnostic state distinguishing:
        State A: no frames received at all
        State B: ping/pong activity active but no market-data frames received
        State C: binary frames received but protobuf decode fails
        State D: decoded frames received but quote normalization fails
        State E: valid ticks received and streaming normally
        """
        if not self._connected:
            return "DISCONNECTED"
        if self._decode_errors > 0 and self._total_ticks_decoded == 0:
            return "STATE_C_PROTOBUF_DECODE_FAILED"
        if self._normalization_errors > 0 and self._total_ticks_decoded == 0:
            return "STATE_D_NORMALIZATION_FAILED"
        if self._total_ticks_decoded > 0:
            return "STATE_E_TICKS_STREAMING"
        if self._total_binary_messages > 0:
            return "STATE_C_BINARY_RECEIVED_AWAITING_TICKS"
        if self.websocket_rtt_ms is not None:
            return "STATE_B_PING_PONG_ACTIVE_NO_MARKET_DATA"
        if self._last_message_at is None:
            return "STATE_A_NO_FRAMES_RECEIVED"
        return "STATE_B_AWAITING_MARKET_DATA"

    @property
    def websocket_rtt_ms(self) -> Optional[float]:
        """
        WebSocket Ping/Pong round-trip time (RTT) in milliseconds.
        Derived directly from websockets ws.latency (which is in seconds).
        """
        if self._ws and hasattr(self._ws, "latency") and self._ws.latency is not None:
            try:
                rtt_ms = float(self._ws.latency) * 1000.0
                if rtt_ms >= 0.0:
                    return round(rtt_ms, 1)
            except Exception:
                pass
        return None

    @property
    def market_data_latency_ms(self) -> Optional[float]:
        """
        Market data transit latency in milliseconds, calculated strictly
        from trustworthy decoded market tick timing (backend_receive_time - reliable_tick/exchange_timestamp).
        Returns None (N/A) if no reliable/trustworthy tick timestamp is available.
        """
        return self._last_market_data_latency_ms

    @property
    def is_connected(self) -> bool:
        return self._connected

    @property
    def state(self) -> str:
        return self._state

    def _set_state(self, new_state: str):
        """Helper to transition WebSocket feed state and synchronize connected flag."""
        self._state = new_state
        self._connected = (new_state == "CONNECTED")

    def record_tick(self, ts: Optional[float] = None):
        """Records a market tick timestamp for rolling quote rate calculation."""
        import time
        t = ts if ts is not None else time.time()
        self._tick_history.append(t)
        self._last_tick_at = datetime.fromtimestamp(t, tz=timezone.utc)

    async def add_subscriptions(self, symbols_or_keys: List[str]):
        """Adds instrument keys to upstream feed tracking and sends dynamic sub packet."""
        new_keys: List[str] = []
        for s in symbols_or_keys:
            ikey = await instrument_service.resolve_instrument_key(s)
            if ikey and ikey not in self._subscribed_keys:
                self._subscribed_keys.add(ikey)
                new_keys.append(ikey)

        if new_keys and self._connected and self._ws:
            try:
                sub_msg = {
                    "guid": f"sub_{int(datetime.now(timezone.utc).timestamp())}",
                    "method": "sub",
                    "data": {
                        "mode": "full",
                        "instrumentKeys": new_keys,
                    },
                }
                # Send in binary format (UTF-8 bytes) per Upstox V3 Market Data Feed specification
                sub_bytes = json.dumps(sub_msg).encode("utf-8")
                await self._ws.send(sub_bytes)
                self._last_subscription_sent_at = datetime.now(timezone.utc)
                logger.info(f"[DIAGNOSTIC] Dynamic Upstox V3 subscription sent (Binary Frame, {len(sub_bytes)} bytes) for {len(new_keys)} keys: {new_keys}")
            except Exception as e:
                logger.debug(f"Dynamic subscription send failed: {e}")

    async def start(self):
        """Starts the upstream listener task if configured, guaranteeing a single active task."""
        if self._is_running and self._task and not self._task.done():
            return
        self._is_running = True
        self._state = "CONNECTING"
        self._task = asyncio.create_task(self._run_loop())
        logger.info("Upstox Upstream WebSocket Feed manager started.")

    async def stop(self):
        self._is_running = False
        self._connected = False
        self._state = "DISCONNECTED"
        if self._ws:
            try:
                await self._ws.close()
            except Exception:
                pass
            self._ws = None

        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

        # Cancel and cleanup all outstanding background order evaluation tasks
        for task in list(self._background_tasks):
            task.cancel()
        if self._background_tasks:
            await asyncio.gather(*list(self._background_tasks), return_exceptions=True)
        self._background_tasks.clear()

        logger.info("Upstox Upstream WebSocket Feed manager stopped.")

    def _dispatch_order_evaluation(self, quote: MarketQuote) -> None:
        """
        Dispatches non-blocking limit order evaluation with bounded concurrency
        and task tracking to prevent event-loop blocking and task accumulation.
        """
        if len(self._background_tasks) >= self._max_eval_tasks or self._eval_semaphore.locked():
            # Bounded backpressure: skip evaluation for this tick to protect memory and event loop
            return

        task = asyncio.create_task(self._safe_evaluate_order(quote))
        self._background_tasks.add(task)
        task.add_done_callback(self._background_tasks.discard)

    async def _safe_evaluate_order(self, quote: MarketQuote) -> None:
        """Executes limit order evaluation under semaphore concurrency control and logs unexpected errors."""
        try:
            async with self._eval_semaphore:
                from app.services.paper_trading.execution_service import paper_execution_service
                await paper_execution_service.evaluate_open_limit_orders(quote)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.warning(f"Error in background limit-order evaluation for {quote.symbol}: {e}", exc_info=True)

    async def _run_loop(self):
        """Continuous background reconnect loop with exponential backoff."""
        from app.services.market_data.upstox_provider import upstox_provider

        backoff = 2.0
        max_backoff = 60.0

        while self._is_running:
            try:
                # Check provider configuration and authentication status
                if not upstox_provider.is_configured:
                    self._state = "DISCONNECTED"
                    await asyncio.sleep(10)
                    continue

                self._state = "CONNECTING" if self._reconnect_count == 0 else "RECONNECTING"
                auth_url = await upstox_provider.get_ws_feed_authorized_url()
                if not auth_url:
                    self._connected = False
                    self._state = "RECONNECTING" if self._reconnect_count > 0 else "ERROR"
                    await asyncio.sleep(15)
                    continue

                logger.info("Upstox V3 Market Data Feed authorization successful.")
                import websockets

                logger.info("Connecting to Upstox Market Data Feed V3...")
                async with websockets.connect(
                    auth_url,
                    ping_interval=20,
                    ping_timeout=20,
                    close_timeout=10,
                ) as ws:
                    self._ws = ws
                    self._connected = True
                    self._state = "CONNECTED"
                    backoff = 2.0  # Reset backoff on successful connect
                    logger.info("Successfully connected to Upstox Market Data Feed V3.")

                    # Compatibility precaution: brief settling pause before subscription dispatch
                    await asyncio.sleep(0.5)

                    # Send initial subscription message for tracked instruments
                    valid_keys = [k for k in self._subscribed_keys if k and "|" in k]
                    if valid_keys:
                        sub_msg = {
                            "guid": f"tradex_sub_{int(datetime.now(timezone.utc).timestamp())}",
                            "method": "sub",
                            "data": {
                                "mode": "full",
                                "instrumentKeys": sorted(valid_keys),
                            },
                        }
                        # Send in binary format (UTF-8 bytes) per Upstox V3 Market Data Feed specification
                        sub_bytes = json.dumps(sub_msg).encode("utf-8")
                        await ws.send(sub_bytes)
                        self._last_subscription_sent_at = datetime.now(timezone.utc)
                        logger.info(
                            f"[DIAGNOSTIC] Upstox V3 subscription sent (Binary Frame, {len(sub_bytes)} bytes) for {len(valid_keys)} instruments: "
                            f"{sorted(valid_keys)}"
                        )

                    while self._is_running:
                        current_diag = self.diagnostic_state
                        if current_diag != self._last_logged_diagnostic_state:
                            self._last_logged_diagnostic_state = current_diag
                            logger.info(
                                f"[DIAGNOSTIC STATE TRANSITION] Diagnostic state changed to: {current_diag} "
                                f"(RTT={self.websocket_rtt_ms}ms, binary_msgs={self._total_binary_messages}, ticks={self._total_ticks_decoded})"
                            )

                        try:
                            msg = await asyncio.wait_for(ws.recv(), timeout=30.0)
                        except asyncio.TimeoutError:
                            # Periodic diagnostic log during idle waiting periods (e.g. State A / State B)
                            current_diag = self.diagnostic_state
                            if current_diag != self._last_logged_diagnostic_state:
                                self._last_logged_diagnostic_state = current_diag
                                logger.info(
                                    f"[DIAGNOSTIC STATE TRANSITION] Diagnostic state changed to: {current_diag} "
                                    f"(RTT={self.websocket_rtt_ms}ms, binary_msgs={self._total_binary_messages}, ticks={self._total_ticks_decoded})"
                                )
                            logger.info(
                                f"[DIAGNOSTIC HEARTBEAT] WebSocket connected. Diagnostic state: {current_diag} "
                                f"(RTT={self.websocket_rtt_ms}ms, binary_msgs={self._total_binary_messages}, "
                                f"ticks={self._total_ticks_decoded}, reconnects={self._reconnect_count})"
                            )
                            continue

                        now_utc = datetime.now(timezone.utc)
                        self._last_websocket_frame_at = now_utc
                        self._last_message_at = now_utc
                        self._messages_received += 1

                        if isinstance(msg, bytes):
                            self._total_binary_messages += 1
                            self._last_binary_message_at = now_utc
                            if self._first_binary_message_at is None:
                                self._first_binary_message_at = now_utc
                                logger.info(
                                    f"[DIAGNOSTIC] First Upstox V3 binary message received (size: {len(msg)} bytes). "
                                    f"Current diagnostic state: {self.diagnostic_state}"
                                )
                        elif isinstance(msg, str):
                            self._total_text_messages += 1
                            logger.info(f"[DIAGNOSTIC] Upstox V3 text frame received: {msg[:200]}")

                        await self._handle_message(msg)

            except asyncio.CancelledError:
                break
            except Exception as e:
                self._connected = False
                self._ws = None
                self._last_logged_diagnostic_state = "DISCONNECTED"
                self._error_count += 1
                self._reconnect_count += 1
                self._last_error = str(e)
                self._last_disconnect_reason = str(e)
                self._state = "RECONNECTING" if self._is_running else "ERROR"
                logger.warning(
                    f"Upstox WebSocket error: {e}. Reconnecting in {backoff:.1f}s (reconnect attempt #{self._reconnect_count})..."
                )
                await asyncio.sleep(backoff)
                backoff = min(backoff * 1.5, max_backoff)

        self._connected = False
        self._state = "DISCONNECTED"
        self._ws = None
        self._is_running = False
        self._task = None

    async def _handle_message(self, raw_message: Any):
        """Decodes JSON or binary Protobuf feed payload."""
        now_ts = time.time()
        backend_receive_ms = now_ts * 1000.0
        now_utc = datetime.now(timezone.utc)
        self._last_websocket_frame_at = now_utc
        self._last_message_at = now_utc

        try:
            if isinstance(raw_message, bytes):
                from app.services.market_data.MarketDataFeedV3_pb2 import FeedResponse

                feed_resp = FeedResponse()
                try:
                    feed_resp.ParseFromString(raw_message)
                except Exception as decode_err:
                    self._decode_errors += 1
                    logger.warning(
                        f"[DIAGNOSTIC State C] Protobuf decode failed for binary frame ({len(raw_message)} bytes): {decode_err}"
                    )
                    return

                # Feed type 2 is market_info status message
                if not feed_resp.feeds:
                    logger.debug(f"[DIAGNOSTIC] FeedResponse received with 0 feeds (type={feed_resp.type})")
                    return

                # Calculate Market Data Latency strictly from trustworthy decoded market tick timing
                # (backend_receive_time - reliable_tick/exchange_timestamp).
                # Only update if the tick/feed timestamp is actually present and trustworthy (-500ms to 10000ms).
                # websockets ws.latency is NEVER used for market data latency.
                if feed_resp.currentTs and feed_resp.currentTs > 0:
                    feed_curr_ts_ms = (
                        float(feed_resp.currentTs)
                        if feed_resp.currentTs > 1e11
                        else float(feed_resp.currentTs) * 1000.0
                    )
                    diff_feed = backend_receive_ms - feed_curr_ts_ms
                    if -500.0 <= diff_feed <= 10000.0:
                        self._last_market_data_latency_ms = round(max(0.0, diff_feed), 1)

                ts_ms = feed_resp.currentTs or int(now_ts * 1000)
                quote_time = datetime.fromtimestamp(ts_ms / 1000.0, tz=timezone.utc)

                for ikey, f in feed_resp.feeds.items():
                    ltp = 0.0
                    cp = 0.0
                    open_p = 0.0
                    high_p = 0.0
                    low_p = 0.0
                    vol = 0
                    ltt = 0

                    if f.HasField("ltpc"):
                        ltp = f.ltpc.ltp
                        cp = f.ltpc.cp
                        ltt = f.ltpc.ltt
                    elif f.HasField("fullFeed"):
                        ff = f.fullFeed
                        if ff.HasField("marketFF"):
                            m = ff.marketFF
                            ltp = m.ltpc.ltp
                            cp = m.ltpc.cp
                            vol = m.vtt
                            ltt = m.ltpc.ltt if m.HasField("ltpc") else 0
                            for ohlc in m.marketOHLC.ohlc:
                                if ohlc.interval == "1d":
                                    open_p = ohlc.open
                                    high_p = ohlc.high
                                    low_p = ohlc.low
                                    break
                                elif open_p == 0.0:
                                    open_p = ohlc.open
                                    high_p = ohlc.high
                                    low_p = ohlc.low
                        elif ff.HasField("indexFF"):
                            idx = ff.indexFF
                            ltp = idx.ltpc.ltp
                            cp = idx.ltpc.cp
                            ltt = idx.ltpc.ltt if idx.HasField("ltpc") else 0
                            for ohlc in idx.marketOHLC.ohlc:
                                if ohlc.interval == "1d":
                                    open_p = ohlc.open
                                    high_p = ohlc.high
                                    low_p = ohlc.low
                                    break
                                elif open_p == 0.0:
                                    open_p = ohlc.open
                                    high_p = ohlc.high
                                    low_p = ohlc.low

                    # If this tick has an exchange trade timestamp (ltt) that is fresh and trustworthy:
                    if ltt and ltt > 0:
                        ltt_ms = float(ltt) if ltt > 1e11 else float(ltt) * 1000.0
                        diff_ltt = backend_receive_ms - ltt_ms
                        if -500.0 <= diff_ltt <= 10000.0:
                            self._last_market_data_latency_ms = round(max(0.0, diff_ltt), 1)

                    if ltp > 0:
                        symbol = await instrument_service.get_symbol_for_key(ikey)
                        change = ltp - cp if cp > 0 else 0.0
                        change_pct = (change / cp * 100.0) if cp > 0 else 0.0

                        try:
                            norm_quote = MarketQuote(
                                symbol=symbol,
                                instrument_key=ikey,
                                exchange=ikey.split("_")[0] if "_" in ikey else "NSE",
                                timestamp=quote_time,
                                ltp=Decimal(str(round(ltp, 2))),
                                open=Decimal(str(round(open_p or ltp, 2))),
                                high=Decimal(str(round(high_p or ltp, 2))),
                                low=Decimal(str(round(low_p or ltp, 2))),
                                previous_close=Decimal(str(round(cp, 2))),
                                change=Decimal(str(round(change, 2))),
                                change_percent=Decimal(str(round(change_pct, 4))),
                                volume=int(vol),
                            )
                        except Exception as norm_err:
                            self._normalization_errors += 1
                            logger.warning(
                                f"[DIAGNOSTIC State D] MarketQuote normalization failed for {ikey}: {norm_err}"
                            )
                            continue

                        self._total_ticks_decoded += 1
                        self._last_tick_at = datetime.now(timezone.utc)
                        self._tick_history.append(now_ts)
                        if self._first_tick_at is None:
                            self._first_tick_at = self._last_tick_at
                            logger.info(
                                f"[DIAGNOSTIC State E] First decoded market tick received: {norm_quote.symbol} "
                                f"({norm_quote.instrument_key}) LTP={norm_quote.ltp}"
                            )
                        await quote_service.cache_quote(norm_quote)
                        await market_ws_manager.broadcast_quote(norm_quote)

                        # Trigger limit order engine evaluation with bounded background task tracking
                        self._dispatch_order_evaluation(norm_quote)

            elif isinstance(raw_message, str):
                try:
                    data = json.loads(raw_message)
                    feeds = data.get("feeds", {})
                    for ikey, quote_dict in feeds.items():
                        try:
                            norm_quote = normalize_upstox_quote(instrument_key=ikey, raw_quote=quote_dict)
                        except Exception as norm_err:
                            self._normalization_errors += 1
                            logger.warning(
                                f"[DIAGNOSTIC State D] Fallback text quote normalization failed for {ikey}: {norm_err}"
                            )
                            continue

                        raw_ts = quote_dict.get("timestamp") or quote_dict.get("ltt") or data.get("currentTs")
                        if raw_ts:
                            try:
                                if isinstance(raw_ts, (int, float)):
                                    tick_ms = float(raw_ts) if raw_ts > 1e11 else float(raw_ts) * 1000.0
                                elif isinstance(raw_ts, str):
                                    dt = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
                                    tick_ms = dt.timestamp() * 1000.0
                                else:
                                    tick_ms = None
                                if tick_ms is not None:
                                    diff_ms = backend_receive_ms - tick_ms
                                    if -500.0 <= diff_ms <= 10000.0:
                                        self._last_market_data_latency_ms = round(max(0.0, diff_ms), 1)
                            except Exception:
                                pass

                        self._total_ticks_decoded += 1
                        self._last_tick_at = datetime.now(timezone.utc)
                        self._tick_history.append(now_ts)
                        if self._first_tick_at is None:
                            self._first_tick_at = self._last_tick_at
                            logger.info(
                                f"[DIAGNOSTIC State E] First decoded market tick received (fallback): {norm_quote.symbol} "
                                f"({norm_quote.instrument_key}) LTP={norm_quote.ltp}"
                            )
                        await quote_service.cache_quote(norm_quote)
                        await market_ws_manager.broadcast_quote(norm_quote)
                        self._dispatch_order_evaluation(norm_quote)
                except Exception as json_err:
                    logger.debug(f"[DIAGNOSTIC] JSON parsing error on text message: {json_err}")
        except Exception as e:
            logger.debug(f"Error handling Upstox WS message: {e}")

    def get_quote_rate(self) -> str:
        """Calculates rolling tick rate from actual received market ticks."""
        if self._messages_received == 0 and not self._tick_history:
            return "Waiting for first tick" if self._connected else "N/A"
        now_ts = time.time()
        recent = [t for t in self._tick_history if now_ts - t <= 5.0]
        if len(recent) >= 2:
            duration = recent[-1] - recent[0]
            if duration > 0.1:
                rate = round(len(recent) / duration, 1)
                return f"{rate} updates/sec"
        if self._last_tick_at:
            elapsed = now_ts - self._last_tick_at.timestamp()
            if elapsed <= 10.0:
                return f"{len(recent)} updates/sec" if len(recent) > 0 else "Live Feed"
            elif elapsed <= 60.0:
                return "Idle (<1/sec)"
            else:
                return "Stale (>60s)"
        return "Waiting for first tick" if self._connected else "N/A"

    def get_monitoring_metrics(self) -> Dict[str, Any]:
        return {
            # 1. websocket_connected
            "websocket_connected": self._connected,
            # 2. websocket_rtt_ms
            "websocket_rtt_ms": self.websocket_rtt_ms,
            # 3. last_websocket_frame_at
            "last_websocket_frame_at": self._last_websocket_frame_at.isoformat() if self._last_websocket_frame_at else None,
            # 4. last_binary_message_at
            "last_binary_message_at": self._last_binary_message_at.isoformat() if self._last_binary_message_at else None,
            # 5. first_tick_at
            "first_tick_at": self._first_tick_at.isoformat() if self._first_tick_at else None,
            # 6. total_binary_messages
            "total_binary_messages": self._total_binary_messages,
            # 7. total_ticks_decoded
            "total_ticks_decoded": self._total_ticks_decoded,
            # 8. last_tick_at
            "last_tick_at": self._last_tick_at.isoformat() if self._last_tick_at else None,
            # 9. reconnect_count
            "reconnect_count": self._reconnect_count,
            # 10. last_disconnect_reason
            "last_disconnect_reason": self._last_disconnect_reason,
            # 11. active_background_tasks
            "active_background_tasks": len(self._background_tasks),

            # Structured Diagnostic State (States A, B, C, D, E)
            "diagnostic_state": self.diagnostic_state,
            "decode_errors": self._decode_errors,
            "normalization_errors": self._normalization_errors,
            "total_text_messages": self._total_text_messages,

            # Preserved backwards-compatible monitoring telemetry
            "status": "connected" if self._connected else "disconnected",
            "state": self._state,
            "connected": self._connected,
            "last_message": self._last_message_at.isoformat() if self._last_message_at else None,
            "messages_received": self._messages_received,
            "error_count": self._error_count,
            "last_error": self._last_error,
            "subscribed_instruments_count": len(self._subscribed_keys),
            "subscribed_instruments": sorted(list(self._subscribed_keys)),
            "last_subscription_sent_at": self._last_subscription_sent_at.isoformat() if self._last_subscription_sent_at else None,
            "first_binary_message_at": self._first_binary_message_at.isoformat() if self._first_binary_message_at else None,
            "quote_update_rate": self.get_quote_rate(),
            "market_data_latency_ms": self.market_data_latency_ms,
            "feed_latency_ms": self.market_data_latency_ms,
            "ws_latency_seconds": round(self._ws.latency, 3) if self._ws and hasattr(self._ws, "latency") and self._ws.latency is not None else None,
        }


upstream_feed = UpstoxUpstreamFeed()
