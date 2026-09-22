import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.market_data.websocket_service import market_ws_manager

logger = logging.getLogger("tradex.api.ws")

router = APIRouter(tags=["Market Data WebSocket"])


@router.websocket("/ws/market")
async def market_websocket_endpoint(websocket: WebSocket):
    """
    TradeX real-time market data WebSocket endpoint.
    Clients can subscribe and unsubscribe to symbols or instrument keys:
    {
        "action": "subscribe",
        "symbols": ["RELIANCE", "TCS", "INFY"]
    }
    Normalized quote updates are broadcast to connected subscribers.
    """
    await market_ws_manager.connect(websocket)
    try:
        while True:
            text_data = await websocket.receive_text()
            try:
                from urllib.parse import unquote

                msg = json.loads(text_data)
                action = msg.get("action")
                raw_symbols = msg.get("symbols") or msg.get("keys") or []
                if isinstance(raw_symbols, str):
                    raw_symbols = [raw_symbols]
                symbols = [unquote(s).strip() for s in raw_symbols if s and unquote(s).strip()]

                if action == "subscribe" and symbols:
                    await market_ws_manager.subscribe(websocket, symbols)
                    await websocket.send_json({
                        "type": "subscribed",
                        "symbols": symbols,
                        "keys": symbols,
                    })
                elif action == "unsubscribe" and symbols:
                    await market_ws_manager.unsubscribe(websocket, symbols)
                    await websocket.send_json({
                        "type": "unsubscribed",
                        "symbols": symbols,
                        "keys": symbols,
                    })
                elif action == "ping":
                    await websocket.send_json({"type": "pong"})

            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON format.",
                })
    except WebSocketDisconnect:
        await market_ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket client session error: {e}")
        await market_ws_manager.disconnect(websocket)
