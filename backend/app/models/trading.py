from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import UUIDPrimaryKeyMixin, TimestampMixin


class Order(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "orders"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    wallet_id: Mapped[str] = mapped_column(String(36), ForeignKey("wallets.id", ondelete="RESTRICT"), nullable=False, index=True)
    stock_id: Mapped[str] = mapped_column(String(36), ForeignKey("stocks.id", ondelete="RESTRICT"), nullable=False, index=True)

    # MARKET, LIMIT, STOP, STOP_LIMIT
    order_type: Mapped[str] = mapped_column(String(20), nullable=False)
    # BUY, SELL
    side: Mapped[str] = mapped_column(String(10), nullable=False)
    
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    price: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 4), nullable=True) # Limit price
    stop_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 4), nullable=True) # Trigger price

    # PENDING, OPEN, PARTIALLY_FILLED, FILLED, CANCELLED, REJECTED, EXPIRED
    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False, index=True)
    filled_quantity: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=Decimal("0.0000"), nullable=False)
    average_execution_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 4), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="orders")
    stock: Mapped["Stock"] = relationship("Stock")
    executions: Mapped[List["OrderExecution"]] = relationship("OrderExecution", back_populates="order", cascade="all, delete-orphan")


class OrderExecution(Base, UUIDPrimaryKeyMixin):
    """Separate execution model. One order can have multiple partial fills/executions."""
    __tablename__ = "order_executions"

    order_id: Mapped[str] = mapped_column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    execution_price: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    executed_quantity: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    trade_charges: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    executed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    exchange_trade_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)

    order: Mapped["Order"] = relationship("Order", back_populates="executions")


class Holding(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Current user stock holdings portfolio."""
    __tablename__ = "holdings"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    stock_id: Mapped[str] = mapped_column(String(36), ForeignKey("stocks.id", ondelete="RESTRICT"), nullable=False, index=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=Decimal("0.0000"), nullable=False)
    average_buy_price: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "stock_id", name="uq_user_holding_stock"),
    )

    user: Mapped["User"] = relationship("User", back_populates="holdings")
    stock: Mapped["Stock"] = relationship("Stock")


class PortfolioSnapshot(Base, UUIDPrimaryKeyMixin):
    """Daily or periodic portfolio value snapshot for analytics."""
    __tablename__ = "portfolio_snapshots"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    snapshot_date: Mapped[date] = mapped_column(Date, default=lambda: datetime.now(timezone.utc).date(), nullable=False, index=True)
    total_invested_value: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    total_market_value: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    unrealized_pnl: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    realized_pnl: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    cash_balance: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "snapshot_date", name="uq_user_snapshot_date"),
    )


class PriceAlert(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Trader stock price alert triggers."""
    __tablename__ = "price_alerts"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    stock_id: Mapped[str] = mapped_column(String(36), ForeignKey("stocks.id", ondelete="CASCADE"), nullable=False, index=True)
    target_price: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    condition: Mapped[str] = mapped_column(String(10), default="ABOVE", nullable=False) # ABOVE, BELOW
    is_triggered: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    stock: Mapped["Stock"] = relationship("Stock")
