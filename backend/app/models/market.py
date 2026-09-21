from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import UUIDPrimaryKeyMixin, TimestampMixin


class Exchange(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "exchanges"

    code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False) # NSE, BSE, NASDAQ
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), default="Asia/Kolkata", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    stocks: Mapped[List["Stock"]] = relationship("Stock", back_populates="exchange")


class Stock(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "stocks"

    exchange_id: Mapped[str] = mapped_column(String(36), ForeignKey("exchanges.id", ondelete="RESTRICT"), nullable=False, index=True)
    symbol: Mapped[str] = mapped_column(String(30), index=True, nullable=False) # e.g. RELIANCE, TCS, INFY
    instrument_key: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True) # Upstox key e.g. NSE_EQ|INE002A01018
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    isin: Mapped[Optional[str]] = mapped_column(String(30), unique=True, nullable=True)
    sector: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_tradable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    lot_size: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    tick_size: Mapped[Decimal] = mapped_column(Numeric(10, 4), default=Decimal("0.05"), nullable=False)

    __table_args__ = (
        UniqueConstraint("exchange_id", "symbol", name="uq_exchange_symbol"),
    )

    exchange: Mapped["Exchange"] = relationship("Exchange", back_populates="stocks")
    market_prices: Mapped[List["MarketPrice"]] = relationship("MarketPrice", back_populates="stock", cascade="all, delete-orphan")
    historical_prices: Mapped[List["HistoricalPrice"]] = relationship("HistoricalPrice", back_populates="stock", cascade="all, delete-orphan")


class Instrument(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Comprehensive instrument master model for Upstox integration.
    Supports NSE equity, BSE equity, NSE indices, BSE indices, Futures, Options, and MCX commodities.
    """
    __tablename__ = "instruments"

    instrument_key: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False) # Primary provider identifier
    symbol: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    trading_symbol: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    exchange: Mapped[str] = mapped_column(String(20), index=True, nullable=False) # NSE, BSE, MCX
    segment: Mapped[str] = mapped_column(String(30), index=True, nullable=False) # NSE_EQ, NSE_INDEX, BSE_EQ, etc.
    instrument_type: Mapped[str] = mapped_column(String(30), nullable=False) # EQ, INDEX, FUT, OPT, COM
    isin: Mapped[Optional[str]] = mapped_column(String(50), index=True, nullable=True)
    lot_size: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    tick_size: Mapped[Decimal] = mapped_column(Numeric(10, 4), default=Decimal("0.05"), nullable=False)
    expiry: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    strike_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 4), nullable=True)
    underlying_key: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)


class MarketPrice(Base, UUIDPrimaryKeyMixin):
    """Real-time market snapshot populated from normalized market feeds."""
    __tablename__ = "market_prices"

    stock_id: Mapped[str] = mapped_column(String(36), ForeignKey("stocks.id", ondelete="CASCADE"), nullable=False, index=True)
    instrument_key: Mapped[Optional[str]] = mapped_column(String(100), index=True, nullable=True)
    open: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 4), nullable=True)
    high: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 4), nullable=True)
    low: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 4), nullable=True)
    close: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 4), nullable=True)
    ltp: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 4), nullable=True) # Last Traded Price
    volume: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    change: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 4), nullable=True)
    change_percent: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    stock: Mapped["Stock"] = relationship("Stock", back_populates="market_prices")


class HistoricalPrice(Base, UUIDPrimaryKeyMixin):
    """Historical bar data for charts (TradingView Lightweight Charts)."""
    __tablename__ = "historical_prices"

    stock_id: Mapped[str] = mapped_column(String(36), ForeignKey("stocks.id", ondelete="CASCADE"), nullable=False, index=True)
    instrument_key: Mapped[Optional[str]] = mapped_column(String(100), index=True, nullable=True)
    interval: Mapped[str] = mapped_column(String(20), default="1D", nullable=False) # 1m, 5m, 15m, 1h, 1D
    open: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    high: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    low: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    close: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    volume: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    stock: Mapped["Stock"] = relationship("Stock", back_populates="historical_prices")
