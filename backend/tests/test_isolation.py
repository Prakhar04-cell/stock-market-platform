import pytest
from httpx import AsyncClient
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_user_watchlist_isolation(client: AsyncClient):
    # Register Trader A
    res_a = await client.post(
        "/api/v1/auth/register",
        json={"email": "trader_a@tradex.com", "password": "Password123!"},
    )
    token_a = res_a.json()["access_token"]

    # Register Trader B
    res_b = await client.post(
        "/api/v1/auth/register",
        json={"email": "trader_b@tradex.com", "password": "Password123!"},
    )
    token_b = res_b.json()["access_token"]

    # Trader A creates a private watchlist
    create_wl = await client.post(
        "/api/v1/watchlists",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"name": "Trader A Secret Watchlist"},
    )
    assert create_wl.status_code == 201
    wl_a_id = create_wl.json()["id"]

    # Trader B tries to rename Trader A's watchlist -> should be 404 (Resource not found / isolated)
    rename_try = await client.put(
        f"/api/v1/watchlists/{wl_a_id}",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"name": "Hacked Name"},
    )
    assert rename_try.status_code == 404

    # Trader B lists watchlists -> should NOT see Trader A's watchlist
    list_b = await client.get("/api/v1/watchlists", headers={"Authorization": f"Bearer {token_b}"})
    assert list_b.status_code == 200
    b_watchlists = list_b.json()
    assert not any(w["id"] == wl_a_id for w in b_watchlists)
