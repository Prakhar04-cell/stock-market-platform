import pytest
from datetime import datetime, timezone
from decimal import Decimal
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.market import Stock
from app.models.trading import Holding, Order, OrderExecution
from app.models.user import User
from app.models.wallet import LedgerEntry, Wallet
from app.services.market_data.normalizer import normalize_upstox_quote
from app.services.market_data.quote_service import quote_service
from app.services.paper_trading.charge_engine import calculate_simulated_charges
from app.services.paper_trading.execution_service import paper_execution_service
from app.services.paper_trading.portfolio_service import portfolio_service


def test_charge_engine_calculation():
    # BUY 100 shares @ ₹2500 = ₹250,000 turnover
    charges = calculate_simulated_charges(
        side="BUY",
        quantity=Decimal("100"),
        price=Decimal("2500"),
    )

    assert charges.turnover == Decimal("250000.0000")
    # Brokerage capped at max ₹20
    assert charges.brokerage == Decimal("20.0000")
    # STT 0.1% = ₹250
    assert charges.stt == Decimal("250.0000")
    # Exchange turnover = 250,000 * 0.0000345 = ₹8.6250
    assert charges.exchange_turnover == Decimal("8.6250")
    # Stamp duty = 250,000 * 0.00015 = ₹37.5000
    assert charges.stamp_duty == Decimal("37.5000")
    # Total charges is positive
    assert charges.total_charges > Decimal("0")


@pytest.mark.asyncio
async def test_paper_market_buy_and_sell_flow(
    client: AsyncClient,
    db_session: AsyncSession,
    test_trader: User,
    trader_auth_headers: dict,
):
    # 1. Setup mock quote in quote service for RELIANCE
    raw_quote = {
        "last_price": 2500.0,
        "ohlc": {"open": 2480.0, "high": 2510.0, "low": 2470.0, "close": 2490.0},
        "cp": 2450.0,
        "volume": 500000,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    q = normalize_upstox_quote("NSE_EQ|INE002A01018", raw_quote, symbol_override="RELIANCE")
    await quote_service.cache_quote(q)

    # Fetch RELIANCE stock
    stock_stmt = select(Stock).where(Stock.symbol == "RELIANCE")
    stock = (await db_session.execute(stock_stmt)).scalar_one()

    # Initial wallet balance = 100,000.00
    wallet_stmt = select(Wallet).where(Wallet.user_id == test_trader.id)
    initial_wallet = (await db_session.execute(wallet_stmt)).scalar_one()
    assert initial_wallet.balance == Decimal("100000.00")

    # 2. Place Paper MARKET BUY for 10 shares @ ₹2500
    order_payload = {
        "stock_id": stock.id,
        "order_type": "MARKET",
        "side": "BUY",
        "quantity": 10.0,
    }
    buy_res = await client.post("/api/v1/orders", json=order_payload, headers=trader_auth_headers)
    assert buy_res.status_code == 201
    buy_data = buy_res.json()
    assert buy_data["status"] == "FILLED"
    assert buy_data["side"] == "BUY"
    assert float(buy_data["filled_quantity"]) == 10.0
    assert float(buy_data["average_execution_price"]) == 2500.0

    # Verify wallet decreased
    await db_session.refresh(initial_wallet)
    expected_cost = Decimal("25000.00")  # 10 * 2500
    assert initial_wallet.balance < Decimal("100000.00") - expected_cost + Decimal("1.00")

    # Verify Holding was created
    h_stmt = select(Holding).where(Holding.user_id == test_trader.id, Holding.stock_id == stock.id)
    holding = (await db_session.execute(h_stmt)).scalar_one()
    assert holding.quantity == Decimal("10.0000")
    assert holding.average_buy_price == Decimal("2500.0000")

    # Verify Ledger entries
    l_stmt = select(LedgerEntry).where(LedgerEntry.wallet_id == initial_wallet.id)
    entries = (await db_session.execute(l_stmt)).scalars().all()
    types = [e.transaction_type for e in entries]
    assert "TRADE_BUY" in types
    assert "CHARGES" in types

    # 3. Update market price to ₹2600 and place MARKET SELL for 4 shares
    raw_quote_higher = {
        "last_price": 2600.0,
        "ohlc": {"open": 2500.0, "high": 2610.0, "low": 2490.0, "close": 2600.0},
        "cp": 2500.0,
        "volume": 700000,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    q_high = normalize_upstox_quote("NSE_EQ|INE002A01018", raw_quote_higher, symbol_override="RELIANCE")
    await quote_service.cache_quote(q_high)

    sell_payload = {
        "stock_id": stock.id,
        "order_type": "MARKET",
        "side": "SELL",
        "quantity": 4.0,
    }
    sell_res = await client.post("/api/v1/orders", json=sell_payload, headers=trader_auth_headers)
    assert sell_res.status_code == 201
    sell_data = sell_res.json()
    assert sell_data["status"] == "FILLED"
    assert sell_data["side"] == "SELL"

    # Verify Holding reduced from 10 to 6
    await db_session.refresh(holding)
    assert holding.quantity == Decimal("6.0000")


@pytest.mark.asyncio
async def test_insufficient_funds_rejected(
    client: AsyncClient,
    db_session: AsyncSession,
    test_trader: User,
    trader_auth_headers: dict,
):
    stock_stmt = select(Stock).where(Stock.symbol == "RELIANCE")
    stock = (await db_session.execute(stock_stmt)).scalar_one()

    # Attempt to BUY 1000 shares @ ₹2500 = ₹2,500,000 (Trader only has ₹100,000)
    order_payload = {
        "stock_id": stock.id,
        "order_type": "LIMIT",
        "side": "BUY",
        "quantity": 1000.0,
        "price": 2500.0,
    }
    res = await client.post("/api/v1/orders", json=order_payload, headers=trader_auth_headers)
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "INSUFFICIENT_FUNDS"


@pytest.mark.asyncio
async def test_insufficient_holdings_rejected(
    client: AsyncClient,
    db_session: AsyncSession,
    test_trader: User,
    trader_auth_headers: dict,
):
    stock_stmt = select(Stock).where(Stock.symbol == "TCS")
    stock = (await db_session.execute(stock_stmt)).scalar_one()

    # Attempt to SELL shares trader does not own
    sell_payload = {
        "stock_id": stock.id,
        "order_type": "MARKET",
        "side": "SELL",
        "quantity": 10.0,
    }
    res = await client.post("/api/v1/orders", json=sell_payload, headers=trader_auth_headers)
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "INSUFFICIENT_HOLDINGS"


@pytest.mark.asyncio
async def test_limit_order_margin_lock_and_cancellation(
    client: AsyncClient,
    db_session: AsyncSession,
    test_trader: User,
    trader_auth_headers: dict,
):
    stock_stmt = select(Stock).where(Stock.symbol == "INFY")
    stock = (await db_session.execute(stock_stmt)).scalar_one()

    wallet_stmt = select(Wallet).where(Wallet.user_id == test_trader.id)
    wallet = (await db_session.execute(wallet_stmt)).scalar_one()
    assert wallet.locked_balance == Decimal("0.0000")

    # Place BUY LIMIT for 10 shares @ ₹500 (lower than real market price ~₹1037, remains OPEN)
    payload = {
        "stock_id": stock.id,
        "order_type": "LIMIT",
        "side": "BUY",
        "quantity": 10.0,
        "price": 500.0,
    }
    res = await client.post("/api/v1/orders", json=payload, headers=trader_auth_headers)
    assert res.status_code == 201
    order_data = res.json()
    assert order_data["status"] == "OPEN"

    # Verify locked margin
    await db_session.refresh(wallet)
    assert wallet.locked_balance >= Decimal("5000.00")

    # Cancel the limit order
    order_id = order_data["id"]
    cancel_res = await client.delete(f"/api/v1/orders/{order_id}", headers=trader_auth_headers)
    assert cancel_res.status_code == 200

    # Verify margin unlocked
    await db_session.refresh(wallet)
    assert wallet.locked_balance == Decimal("0.0000")


@pytest.mark.asyncio
async def test_portfolio_summary_endpoint(
    client: AsyncClient,
    db_session: AsyncSession,
    test_trader: User,
    trader_auth_headers: dict,
):
    res = await client.get("/api/v1/portfolio", headers=trader_auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_invested_value" in data
    assert "current_portfolio_value" in data
    assert "cash_balance" in data
    assert "holdings" in data
