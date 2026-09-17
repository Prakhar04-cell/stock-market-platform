from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import UUIDPrimaryKeyMixin, TimestampMixin


class Wallet(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Paper-trading virtual wallet. PostgreSQL NUMERIC is the strict source of truth."""
    __tablename__ = "wallets"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    balance: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("100000.00"), nullable=False)
    locked_balance: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="wallet")
    ledger_entries: Mapped[List["LedgerEntry"]] = relationship("LedgerEntry", back_populates="wallet", cascade="all, delete-orphan")


class LedgerEntry(Base, UUIDPrimaryKeyMixin):
    """Immutable audit ledger of every financial balance adjustment."""
    __tablename__ = "ledger_entries"

    wallet_id: Mapped[str] = mapped_column(String(36), ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_type: Mapped[str] = mapped_column(String(50), nullable=False) # DEPOSIT, WITHDRAWAL, ORDER_LOCK, ORDER_UNLOCK, TRADE_BUY, TRADE_SELL, CHARGES
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    balance_after: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    reference_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True) # e.g. order_id or admin action
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    wallet: Mapped["Wallet"] = relationship("Wallet", back_populates="ledger_entries")


class TradeCharge(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Itemized breakdown of brokerage, regulatory fees, and statutory taxes."""
    __tablename__ = "trade_charges"

    order_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=True, index=True)
    execution_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("order_executions.id", ondelete="CASCADE"), nullable=True, index=True)
    brokerage: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    stt: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False) # Securities Transaction Tax
    exchange_turnover: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    stamp_duty: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    sebi_turnover: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    gst: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    total_charges: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
