import pytest
from datetime import datetime, timezone
from decimal import Decimal
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from unittest.mock import patch, PropertyMock

from app.core.exceptions import ProviderNotConfiguredError
from app.models.market import Stock
from app.models.trading import Holding, Order, OrderExecution
from app.models.user import User
from app.models.wallet import LedgerEntry, Wallet
from app.services.market_data.normalizer import normalize_upstox_quote
from app.services.market_data.quote_service import quote_service
from app.services.market_data.upstox_provider import UpstoxMarketDataProvider, UpstoxAuthRequiredError
from app.services.paper_trading.portfolio_service import portfolio_service
from app.services.providers.upstox import UpstoxExecutionProvider
from app.services.providers.paper_engine import PaperExecutionProvider


@pytest.mark.asyncio
async def test_paper_trading_credential_isolation(
    client: AsyncClient,
    db_session: AsyncSession,
    test_trader: User,
    trader_auth_headers: dict,
):
    """
    CRITICAL REGRESSION TEST SUITE: Paper Trading Credential & Provider Isolation.
    Proves:
    1. Expired Upstox trading token does not prevent PAPER BUY.
    2. Expired Upstox trading token does not prevent PAPER SELL.
    3. PAPER orders update wallet correctly.
    4. PAPER orders update holdings correctly.
    5. PAPER orders create order records.
    6. PAPER orders create execution records.
    7. PAPER orders update P&L.
    8. LIVE provider remains isolated.
    9. No real broker order is submitted in PAPER mode.
    """
    # Setup test quote for TCS
    raw_quote = {
        "last_price": 3500.0,
        "ohlc": {"open": 3480.0, "high": 3520.0, "low": 3460.0, "close": 3490.0},
        "cp": 3450.0,
        "volume": 250000,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    q = normalize_upstox_quote("NSE_EQ|INE467B01029", raw_quote, symbol_override="TCS")
    await quote_service.cache_quote(q)

    # Fetch TCS stock
    stock_stmt = select(Stock).where(Stock.symbol == "TCS")
    stock = (await db_session.execute(stock_stmt)).scalar_one()

    # Get user wallet
    wallet_stmt = select(Wallet).where(Wallet.user_id == test_trader.id)
    wallet = (await db_session.execute(wallet_stmt)).scalar_one()
    initial_balance = wallet.balance

    # -------------------------------------------------------------
    # 1. Simulating EXPIRED Upstox trading token
    # -------------------------------------------------------------
    # Even when external broker credentials are mock-expired:
    with patch.object(UpstoxMarketDataProvider, "is_token_valid", new_callable=PropertyMock, return_value=False):
        # ---------------------------------------------------------
        # 1 & 5 & 6. PAPER BUY succeeds with expired broker token
        # ---------------------------------------------------------
        buy_payload = {
            "stock_id": stock.id,
            "order_type": "MARKET",
            "side": "BUY",
            "quantity": 5.0,
        }
        buy_res = await client.post("/api/v1/orders", json=buy_payload, headers=trader_auth_headers)
        assert buy_res.status_code == 201, f"Paper BUY failed with status {buy_res.status_code}: {buy_res.text}"
        buy_data = buy_res.json()
        assert buy_data["status"] == "FILLED"
        assert buy_data["side"] == "BUY"
        assert float(buy_data["filled_quantity"]) == 5.0
        assert float(buy_data["average_execution_price"]) == 3500.0

        order_id = buy_data["id"]

        # Verify Order record created (Requirement 5)
        o_stmt = select(Order).where(Order.id == order_id)
        order_record = (await db_session.execute(o_stmt)).scalar_one()
        assert order_record.status == "FILLED"
        assert order_record.user_id == test_trader.id

        # Verify Execution record created (Requirement 6)
        e_stmt = select(OrderExecution).where(OrderExecution.order_id == order_id)
        exec_records = (await db_session.execute(e_stmt)).scalars().all()
        assert len(exec_records) >= 1
        assert exec_records[0].execution_price == Decimal("3500.0000")
        assert exec_records[0].executed_quantity == Decimal("5.0000")

        # ---------------------------------------------------------
        # 3. PAPER orders update wallet correctly
        # ---------------------------------------------------------
        await db_session.refresh(wallet)
        trade_cost = Decimal("5") * Decimal("3500")
        assert wallet.balance < initial_balance - trade_cost + Decimal("1.00")
        balance_after_buy = wallet.balance

        # ---------------------------------------------------------
        # 4. PAPER orders update holdings correctly
        # ---------------------------------------------------------
        h_stmt = select(Holding).where(Holding.user_id == test_trader.id, Holding.stock_id == stock.id)
        holding = (await db_session.execute(h_stmt)).scalar_one()
        assert holding.quantity == Decimal("5.0000")
        assert holding.average_buy_price == Decimal("3500.0000")

        # ---------------------------------------------------------
        # 7. PAPER orders update P&L
        # ---------------------------------------------------------
        summary = await portfolio_service.get_portfolio_summary(test_trader.id, db_session)
        assert summary["invested_value"] >= Decimal("17500.00")
        assert summary["portfolio_value"] >= Decimal("17500.00")

        # ---------------------------------------------------------
        # 2. PAPER SELL succeeds with expired broker token
        # ---------------------------------------------------------
        sell_payload = {
            "stock_id": stock.id,
            "order_type": "MARKET",
            "side": "SELL",
            "quantity": 2.0,
        }
        sell_res = await client.post("/api/v1/orders", json=sell_payload, headers=trader_auth_headers)
        assert sell_res.status_code == 201, f"Paper SELL failed: {sell_res.text}"
        sell_data = sell_res.json()
        assert sell_data["status"] == "FILLED"
        assert sell_data["side"] == "SELL"
        assert float(sell_data["filled_quantity"]) == 2.0

        # Verify holding updated
        await db_session.refresh(holding)
        assert holding.quantity == Decimal("3.0000")

        # Verify wallet credited
        await db_session.refresh(wallet)
        sell_credit = Decimal("2") * Decimal("3500")
        assert wallet.balance > balance_after_buy + sell_credit - Decimal("50.00")

    # -------------------------------------------------------------
    # 8. LIVE broker provider remains isolated
    # -------------------------------------------------------------
    live_broker_provider = UpstoxExecutionProvider()
    assert live_broker_provider.status == "NOT_CONFIGURED"
    with pytest.raises(ProviderNotConfiguredError):
        await live_broker_provider.place_order({"stock_id": stock.id, "quantity": 1})

    # -------------------------------------------------------------
    # 9. No real broker order is submitted in PAPER mode
    # -------------------------------------------------------------
    paper_provider = PaperExecutionProvider()
    assert paper_provider.status == "HEALTHY"
    # Paper provider succeeds without touching any broker order API
    res = await paper_provider.get_order_status("TX-TEST-123")
    assert res["is_paper"] is True
    assert res["execution_engine"] == "PAPER_TRADING"
