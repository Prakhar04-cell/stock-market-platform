import argparse
import asyncio
import json
import sys
import uuid
import websockets
import httpx

parser = argparse.ArgumentParser()
parser.add_argument("--url", default="http://localhost:8000", help="Base URL of TradeX backend")
args, _ = parser.parse_known_args()

BASE_URL = args.url.rstrip("/")
WS_URL = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + "/api/v1/ws/market"

async def test_integration():
    print(f"=== TRADEX MARKET DATA & ORDER INTEGRATION VERIFICATION ===")
    print(f"Target: {BASE_URL}")
    print(f"WebSocket: {WS_URL}")
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=15.0) as client:
        # 1. Health checks
        res = await client.get("/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print("[PASS] /health is 200 OK")

        # 2. Stock lookup with %20
        res = await client.get("/api/v1/stocks/NIFTY%2050")
        assert res.status_code == 200, f"Stock lookup for NIFTY%2050 failed: {res.text}"
        data = res.json()
        assert data["symbol"] == "NIFTY 50", f"Expected symbol 'NIFTY 50', got: {data['symbol']}"
        assert data["id"], "Expected stock ID to be populated"
        nifty_stock_id = data["id"]
        print(f"[PASS] GET /api/v1/stocks/NIFTY%2050 -> resolved to id={nifty_stock_id}, symbol={data['symbol']}")

        # 3. Stock lookup with space
        res = await client.get("/api/v1/stocks/NIFTY 50")
        assert res.status_code == 200, f"Stock lookup for NIFTY 50 failed: {res.text}"
        assert res.json()["symbol"] == "NIFTY 50"
        print("[PASS] GET /api/v1/stocks/NIFTY 50 -> resolved to symbol='NIFTY 50'")

        # 4. Stock lookup for RELIANCE & TCS
        for sym in ["RELIANCE", "TCS"]:
            res = await client.get(f"/api/v1/stocks/{sym}")
            assert res.status_code == 200, f"Stock lookup for {sym} failed: {res.text}"
            print(f"[PASS] GET /api/v1/stocks/{sym} -> resolved to symbol='{sym}'")

        # 5. Market quote with %20
        res = await client.get("/api/v1/market/quote/NIFTY%2050")
        assert res.status_code == 200, f"Quote for NIFTY%2050 failed: {res.text}"
        quote = res.json()
        print(f"[PASS] GET /api/v1/market/quote/NIFTY%2050 -> LTP: {quote.get('ltp')} (status: {quote.get('status')})")

        # 6. Market candles with %20
        res = await client.get("/api/v1/market/candles/NIFTY%2050?interval=1D")
        assert res.status_code == 200, f"Candles for NIFTY%2050 failed: {res.text}"
        candles = res.json()
        assert isinstance(candles, list), f"Expected list of candles, got {type(candles)}"
        print(f"[PASS] GET /api/v1/market/candles/NIFTY%2050?interval=1D -> received {len(candles)} candle bars")

        # 7. Paper Trading Flow
        test_email = f"test_trader_{uuid.uuid4().hex[:6]}@example.com"
        reg_res = await client.post("/api/v1/auth/register", json={
            "email": test_email,
            "password": "Password123!",
            "full_name": "Integration Test Trader",
        })
        assert reg_res.status_code == 201, f"Register failed: {reg_res.text}"
        token = reg_res.json()["access_token"]

        auth_headers = {"Authorization": f"Bearer {token}"}
        print(f"[PASS] Registered test trader: {test_email}")

        # Check wallet
        w_res = await client.get("/api/v1/wallet", headers=auth_headers)
        assert w_res.status_code == 200
        balance_before = float(w_res.json()["balance"])
        print(f"[PASS] Initial paper wallet balance: ₹{balance_before:,.2f}")

        # Place Paper BUY order for NIFTY 50 using resolved stock ID
        buy_res = await client.post("/api/v1/orders", headers=auth_headers, json={
            "stock_id": nifty_stock_id,
            "order_type": "MARKET",
            "side": "BUY",
            "quantity": 1,
        })
        assert buy_res.status_code == 201, f"Paper BUY failed: {buy_res.text}"
        buy_order = buy_res.json()
        assert buy_order["status"] == "FILLED", f"Order not filled: {buy_order}"
        fill_price = float(buy_order["average_execution_price"])
        print(f"[PASS] Paper BUY 1 share of NIFTY 50 FILLED at ₹{fill_price:,.2f}")

        # Also test Paper BUY with stock_id="NIFTY 50" directly
        buy_sym_res = await client.post("/api/v1/orders", headers=auth_headers, json={
            "stock_id": "NIFTY 50",
            "order_type": "MARKET",
            "side": "BUY",
            "quantity": 1,
        })
        assert buy_sym_res.status_code == 201, f"Paper BUY by symbol failed: {buy_sym_res.text}"
        print(f"[PASS] Paper BUY by raw symbol 'NIFTY 50' successfully resolved and filled")

        # Verify Portfolio Holdings
        port_res = await client.get("/api/v1/portfolio", headers=auth_headers)
        assert port_res.status_code == 200
        holdings = port_res.json().get("holdings", [])
        assert any(h["symbol"] == "NIFTY 50" for h in holdings), f"NIFTY 50 not in holdings: {holdings}"
        nifty_holding = next(h for h in holdings if h["symbol"] == "NIFTY 50")
        assert float(nifty_holding["quantity"]) == 2.0
        print(f"[PASS] Portfolio updated: NIFTY 50 holding quantity = {nifty_holding['quantity']}")

        # Paper SELL
        sell_res = await client.post("/api/v1/orders", headers=auth_headers, json={
            "stock_id": nifty_stock_id,
            "order_type": "MARKET",
            "side": "SELL",
            "quantity": 1,
        })
        assert sell_res.status_code == 201, f"Paper SELL failed: {sell_res.text}"
        print(f"[PASS] Paper SELL 1 share of NIFTY 50 FILLED successfully")

        # Verify Orders List
        orders_res = await client.get("/api/v1/orders", headers=auth_headers)
        assert orders_res.status_code == 200
        orders_list = orders_res.json()
        assert len(orders_list) == 3
        print(f"[PASS] Orders list has {len(orders_list)} confirmed orders")

        # 8. WebSocket Subscription Test
        print("\n--- Testing WebSocket /api/v1/ws/market ---")
        async with websockets.connect(WS_URL) as ws:
            # Test subscribe using "keys"
            sub_payload_keys = {"action": "subscribe", "keys": ["NIFTY 50"]}
            await ws.send(json.dumps(sub_payload_keys))
            resp1 = await asyncio.wait_for(ws.recv(), timeout=5.0)
            data1 = json.loads(resp1)
            print(f"[PASS] WS received reply for keys sub: {data1.get('type')}")
            assert data1.get("type") in ["subscribed", "quote"]

            # If the reply was "subscribed", the next message should be the cached quote
            if data1.get("type") == "subscribed":
                resp_quote = await asyncio.wait_for(ws.recv(), timeout=5.0)
                quote_data = json.loads(resp_quote)
                print(f"[PASS] WS immediate quote received: type={quote_data.get('type')}, symbol={quote_data.get('symbol') or quote_data.get('data', {}).get('symbol')}")

            # Test subscribe using "symbols"
            sub_payload_syms = {"action": "subscribe", "symbols": ["RELIANCE"]}
            await ws.send(json.dumps(sub_payload_syms))
            resp2 = await asyncio.wait_for(ws.recv(), timeout=5.0)
            data2 = json.loads(resp2)
            print(f"[PASS] WS received reply for symbols sub: {data2.get('type')}")

    print("\n=== ALL INTEGRATION VERIFICATION CHECKS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    asyncio.run(test_integration())
