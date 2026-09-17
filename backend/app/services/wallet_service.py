from decimal import Decimal
from typing import Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.system import SystemSetting
from app.models.trading import Holding
from app.models.wallet import LedgerEntry, Wallet


async def get_initial_paper_balance(db: AsyncSession) -> Decimal:
    """Retrieve initial paper trading balance from system_settings table, falling back to core settings."""
    stmt = select(SystemSetting).where(SystemSetting.key == "INITIAL_PAPER_BALANCE")
    result = await db.execute(stmt)
    setting = result.scalar_one_or_none()
    if setting and setting.value:
        try:
            return Decimal(setting.value)
        except Exception:
            pass
    return settings.INITIAL_PAPER_BALANCE


async def create_user_wallet(
    db: AsyncSession,
    user_id: str,
    initial_balance: Optional[Decimal] = None,
    currency: str = "INR",
) -> Wallet:
    """Create a virtual paper trading wallet and record initial ledger deposit."""
    if initial_balance is None:
        initial_balance = await get_initial_paper_balance(db)

    wallet = Wallet(
        user_id=user_id,
        currency=currency,
        balance=initial_balance,
        locked_balance=Decimal("0.0000"),
    )
    db.add(wallet)
    await db.flush()

    # Initial ledger entry for financial transparency
    ledger_entry = LedgerEntry(
        wallet_id=wallet.id,
        transaction_type="DEPOSIT",
        amount=initial_balance,
        balance_after=initial_balance,
        reference_id="SYSTEM_SIGNUP_BONUS",
        description=f"Initial virtual paper trading allocation ({currency} {initial_balance:,.2f})",
    )
    db.add(ledger_entry)
    await db.flush()

    return wallet


async def get_wallet_by_user_id(db: AsyncSession, user_id: str) -> Optional[Wallet]:
    """Fetch user's wallet."""
    stmt = select(Wallet).where(Wallet.user_id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_wallet_summary(db: AsyncSession, user_id: str) -> dict:
    """Compute wallet summary with invested value and honest provider status."""
    wallet = await get_wallet_by_user_id(db, user_id)
    if not wallet:
        wallet = await create_user_wallet(db, user_id)

    # Compute invested value from user's holdings
    holdings_stmt = select(Holding).where(Holding.user_id == user_id)
    holdings_res = await db.execute(holdings_stmt)
    holdings = holdings_res.scalars().all()

    invested_value = Decimal("0.0000")
    for h in holdings:
        invested_value += (h.quantity * h.average_buy_price)

    available_balance = wallet.balance - wallet.locked_balance

    # In Phase 1, market data is not connected: do NOT fabricate current values or PnL!
    return {
        "id": wallet.id,
        "user_id": wallet.user_id,
        "currency": wallet.currency,
        "balance": wallet.balance,
        "locked_balance": wallet.locked_balance,
        "available_balance": available_balance,
        "invested_value": invested_value,
        "current_value": None,
        "total_pnl": None,
        "market_data_status": "WAITING_FOR_PROVIDER",
        "market_data_message": "Market data provider is not connected yet. Current market values and unrealized P&L will be active when Phase 2 market APIs are connected.",
    }
