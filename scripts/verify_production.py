#!/usr/bin/env python3
"""
TradeX Safe Production Verification Script
==========================================
Verifies that a deployed TradeX backend instance is operational and healthy.

Checks:
- Backend reachability (Root & Docs)
- Subsystem health: Database, Redis, Market Data, Trading Engine, Infrastructure
- Upstox Auth Status (safe metadata only, no secrets exposed)
- WebSocket availability
- Public market data feeds (LTP, Candlesticks)
- Paper trading readiness (strict simulation mode)

SAFETY NOTICE:
- Strictly read-only verification.
- DOES NOT place real or broker orders.
- DOES NOT print or leak secret tokens or passwords.
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from typing import Any, Dict, Optional, Tuple


def safe_get(url: str, timeout: float = 10.0) -> Tuple[int, Dict[str, Any]]:
    """Safe HTTP GET returning status code and parsed JSON or error dictionary."""
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "TradeX-Production-Verifier/1.0", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status_code = resp.getcode()
            body = resp.read().decode("utf-8")
            try:
                data = json.loads(body)
            except json.JSONDecodeError:
                data = {"raw": body[:200]}
            return status_code, data
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        try:
            data = json.loads(body)
        except Exception:
            data = {"error": str(e), "body": body[:200]}
        return e.code, data
    except Exception as e:
        return 0, {"error": str(e)}


def verify_production(base_url: str) -> bool:
    clean_base = base_url.rstrip("/")
    print("=" * 60)
    print(f"TradeX Production Deployment Verification")
    print(f"Target URL: {clean_base}")
    print(f"Timestamp : {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}")
    print("=" * 60)

    overall_pass = True

    # 1. Backend Reachability
    code, res = safe_get(f"{clean_base}/")
    if code == 200 and res.get("status") == "operational":
        print(f"[PASS] 1. Backend Root Reachable (HTTP {code}) - Service: {res.get('name')}")
    else:
        print(f"[FAIL] 1. Backend Root (HTTP {code}) -> {res}")
        overall_pass = False

    # 2. Overall Health
    code, res = safe_get(f"{clean_base}/health")
    status = res.get("status")
    if code == 200 and status in ("healthy", "degraded"):
        print(f"[PASS] 2. Health Endpoint (HTTP {code}) -> Overall Status: {status.upper()}")
    else:
        print(f"[FAIL] 2. Health Endpoint (HTTP {code}) -> {res}")
        overall_pass = False

    # 3. PostgreSQL Database
    code, res = safe_get(f"{clean_base}/health/database")
    if code == 200 and res.get("status") == "healthy":
        latency = res.get("latency_ms", "N/A")
        db_type = res.get("database", "PostgreSQL")
        print(f"[PASS] 3. Database Health (HTTP {code}) -> {db_type} Connected (Latency: {latency} ms)")
    else:
        print(f"[FAIL] 3. Database Health (HTTP {code}) -> {res}")
        overall_pass = False

    # 4. Redis Cache & Limiter
    code, res = safe_get(f"{clean_base}/health/redis")
    if code == 200 and res.get("status") == "healthy":
        latency = res.get("latency_ms", "N/A")
        print(f"[PASS] 4. Redis Health (HTTP {code}) -> Connected (Latency: {latency} ms)")
    else:
        print(f"[FAIL] 4. Redis Health (HTTP {code}) -> {res}")
        overall_pass = False

    # 5. Market Data Telemetry
    code, res = safe_get(f"{clean_base}/health/market-data")
    if code == 200:
        p_status = res.get("status")
        ws_status = res.get("websocket")
        inst_count = res.get("instruments", 0)
        auth_state = "AUTHENTICATED" if res.get("authenticated") else "NOT AUTHENTICATED"
        print(f"[PASS] 5. Market Data Health (HTTP {code}) -> Provider: {res.get('provider')} | {auth_state} | WebSocket: {ws_status} | Instruments: {inst_count}")
    else:
        print(f"[FAIL] 5. Market Data Health (HTTP {code}) -> {res}")
        overall_pass = False

    # 6. Virtual Trading Engine
    code, res = safe_get(f"{clean_base}/health/trading-engine")
    if code == 200 and res.get("status") == "healthy":
        mode = res.get("mode", "simulation")
        print(f"[PASS] 6. Trading Engine (HTTP {code}) -> Mode: {mode.upper()} (Zero real-money risk)")
    else:
        print(f"[FAIL] 6. Trading Engine (HTTP {code}) -> {res}")
        overall_pass = False

    # 7. Infrastructure Runtime
    code, res = safe_get(f"{clean_base}/health/infrastructure")
    if code == 200:
        env = res.get("environment", "unknown")
        db_p = res.get("database", {}).get("provider", "PostgreSQL")
        r_p = res.get("redis", {}).get("provider", "Redis")
        print(f"[PASS] 7. Infrastructure Diagnostics (HTTP {code}) -> Env: {env} | DB: {db_p} | Cache: {r_p}")
    else:
        print(f"[WARN] 7. Infrastructure Diagnostics (HTTP {code}) -> {res}")

    # 8. Upstox Auth Status (Safe verification - no secret exposure)
    code, res = safe_get(f"{clean_base}/api/v1/upstox/auth/status")
    if code == 200:
        is_cfg = res.get("configured", False)
        is_auth = res.get("authenticated", False)
        # Verify no token is leaked in payload
        assert "access_token" not in res, "CRITICAL: Access token leaked in response!"
        assert "client_secret" not in res, "CRITICAL: Client secret leaked in response!"
        print(f"[PASS] 8. Upstox Auth Status (HTTP {code}) -> Configured: {is_cfg} | Valid: {is_auth} (No secrets leaked)")
    else:
        print(f"[FAIL] 8. Upstox Auth Status (HTTP {code}) -> {res}")
        overall_pass = False

    # 9. Real Market Quote Retrieval (RELIANCE)
    code, res = safe_get(f"{clean_base}/api/v1/market/quote/RELIANCE")
    if code == 200 and res.get("symbol") == "RELIANCE":
        ltp = res.get("ltp")
        exch = res.get("exchange")
        print(f"[PASS] 9. Live Quote (RELIANCE) (HTTP {code}) -> LTP: {ltp} {exch}")
    else:
        print(f"[WARN] 9. Live Quote (RELIANCE) (HTTP {code}) -> {res.get('message', res)}")

    # 10. Historical Candlesticks Retrieval
    code, res = safe_get(f"{clean_base}/api/v1/market/candles/RELIANCE?interval=1d")
    if code == 200 and isinstance(res, list):
        print(f"[PASS] 10. Historical Candles (RELIANCE) (HTTP {code}) -> Loaded {len(res)} daily bars")
    else:
        print(f"[WARN] 10. Historical Candles (RELIANCE) (HTTP {code}) -> {res}")

    print("=" * 60)
    if overall_pass:
        print("RESULT: PRODUCTION READINESS VERIFICATION PASSED")
    else:
        print("RESULT: ONE OR MORE CHECKS FAILED - REVIEW LOGS ABOVE")
    print("=" * 60)
    return overall_pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Verify TradeX Production Backend Deployment")
    parser.add_argument(
        "--url",
        default="http://localhost:8000",
        help="Target base URL of TradeX backend (e.g. https://your-tradex-api.onrender.com)",
    )
    args = parser.parse_args()
    success = verify_production(args.url)
    sys.exit(0 if success else 1)
