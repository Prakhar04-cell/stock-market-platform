from decimal import Decimal
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.wallet import LedgerEntry, Wallet


@pytest.mark.asyncio
async def test_wallet_creation_on_registration(client: AsyncClient, db_session: AsyncSession):
    reg_payload = {
        "email": "wallet_user@tradex.com",
        "password": "Password123!",
    }
    reg_res = await client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    user_id = reg_res.json()["user"]["id"]
    token = reg_res.json()["access_token"]

    # Verify wallet via API
    wallet_res = await client.get("/api/v1/wallet", headers={"Authorization": f"Bearer {token}"})
    assert wallet_res.status_code == 200
    w_data = wallet_res.json()
    assert Decimal(str(w_data["balance"])) == Decimal("100000.00")
    assert Decimal(str(w_data["available_balance"])) == Decimal("100000.00")
    assert w_data["currency"] == "INR"
    assert w_data["market_data_status"] == "WAITING_FOR_PROVIDER"
    assert w_data["current_value"] is None
    assert w_data["total_pnl"] is None

    # Verify ledger entry directly in DB
    w_stmt = select(Wallet).where(Wallet.user_id == user_id)
    wallet = (await db_session.execute(w_stmt)).scalar_one()

    ledger_stmt = select(LedgerEntry).where(LedgerEntry.wallet_id == wallet.id)
    entries = (await db_session.execute(ledger_stmt)).scalars().all()
    assert len(entries) == 1
    assert entries[0].transaction_type == "DEPOSIT"
    assert entries[0].amount == Decimal("100000.00")
    assert entries[0].balance_after == Decimal("100000.00")


@pytest.mark.asyncio
async def test_financial_decimal_precision(client: AsyncClient, trader_auth_headers: dict):
    # Verify wallet ledger endpoint preserves decimal precision
    summary_res = await client.get("/api/v1/wallet/summary", headers=trader_auth_headers)
    assert summary_res.status_code == 200
    data = summary_res.json()
    balance = Decimal(str(data["wallet"]["balance"]))
    assert balance == Decimal("100000.00")
