import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoints(client: AsyncClient):
    # 1. Overall health
    h_res = await client.get("/health")
    assert h_res.status_code == 200
    h_data = h_res.json()
    assert "status" in h_data
    assert "components" in h_data
    assert h_data["components"]["market_data"] == "not_configured"
    assert h_data["components"]["trading_engine"] == "not_configured"

    # 2. Database health
    db_res = await client.get("/health/database")
    assert db_res.status_code == 200
    assert db_res.json()["status"] == "healthy"

    # 3. System health
    sys_res = await client.get("/health/system")
    assert sys_res.status_code == 200
    assert sys_res.json()["status"] == "healthy"

    # 4. Market Data health - not_configured when no token is present
    mkt_res = await client.get("/health/market-data")
    assert mkt_res.status_code == 200
    mkt_data = mkt_res.json()
    assert mkt_data["status"] in ["not_configured", "authentication_required", "healthy"]

    # 5. Trading Engine health - active Virtual Paper Trading Engine in Phase 2
    eng_res = await client.get("/health/trading-engine")
    assert eng_res.status_code == 200
    eng_data = eng_res.json()
    assert eng_data["status"] == "healthy"
    assert eng_data["provider"] == "paper_trading_engine"
    assert eng_data["mode"] == "simulation"

