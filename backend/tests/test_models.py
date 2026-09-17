from decimal import Decimal
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.market import Exchange, Stock
from app.models.user import Role, User
from app.models.wallet import Wallet
from app.models.trading import Order


@pytest.mark.asyncio
async def test_models_relationships(db_session: AsyncSession):
    # Test Exchange & Stock
    exchange = Exchange(
        code="BSE",
        name="Bombay Stock Exchange",
        currency="INR",
        timezone="Asia/Kolkata",
    )
    db_session.add(exchange)
    await db_session.flush()

    stock = Stock(
        exchange_id=exchange.id,
        symbol="INFY",
        name="Infosys Limited",
        isin="INE009A01021",
        lot_size=1,
        tick_size=Decimal("0.05"),
    )
    db_session.add(stock)
    await db_session.commit()

    # Query back
    stmt = select(Stock).where(Stock.symbol == "INFY")
    queried_stock = (await db_session.execute(stmt)).scalar_one()
    assert queried_stock.name == "Infosys Limited"
    assert queried_stock.tick_size == Decimal("0.05")
    assert queried_stock.exchange.code == "BSE"
