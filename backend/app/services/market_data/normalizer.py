from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class MarketQuote(BaseModel):
    """
    Normalized market quote model consumed by TradeX frontend and paper trading engine.
    Completely decoupled from broker/provider-specific payload structures.
    """
    symbol: str
    instrument_key: str
    exchange: str
    timestamp: datetime
    ltp: Decimal = Field(..., description="Last Traded Price")
    open: Optional[Decimal] = None
    high: Optional[Decimal] = None
    low: Optional[Decimal] = None
    close: Optional[Decimal] = None
    previous_close: Optional[Decimal] = None
    change: Optional[Decimal] = None
    change_percent: Optional[Decimal] = None
    volume: Optional[int] = None
    year_high: Optional[Decimal] = None
    year_low: Optional[Decimal] = None
    status: str = Field(default="LIVE", description="LIVE, STALE, DELAYED, FALLBACK, or UNAVAILABLE")
    source: Optional[str] = Field(default="UPSTOX", description="Data provider: UPSTOX or BHARATSTOCKAPI")

    model_config = ConfigDict(from_attributes=True)


class CandleData(BaseModel):
    """Normalized OHLCV candlestick bar for charts."""
    timestamp: datetime
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: int = 0
    open_interest: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)



class InstrumentData(BaseModel):
    """Normalized instrument master representation."""
    instrument_key: str
    symbol: str
    trading_symbol: str
    name: str
    exchange: str
    segment: str
    instrument_type: str
    isin: Optional[str] = None
    lot_size: int = 1
    tick_size: Decimal = Decimal("0.05")
    expiry: Optional[datetime] = None
    strike_price: Optional[Decimal] = None
    underlying_key: Optional[str] = None


def normalize_upstox_quote(
    instrument_key: str,
    raw_quote: Dict[str, Any],
    symbol_override: Optional[str] = None,
) -> MarketQuote:
    """
    Normalizes raw Upstox V2/V3 quote dictionary into a standard TradeX MarketQuote.
    """
    ltp_val = raw_quote.get("last_price") or raw_quote.get("ltp") or 0.0
    ltp = Decimal(str(ltp_val))

    ohlc = raw_quote.get("ohlc", {})
    open_p = Decimal(str(ohlc["open"])) if ohlc.get("open") is not None else None
    high_p = Decimal(str(ohlc["high"])) if ohlc.get("high") is not None else None
    low_p = Decimal(str(ohlc["low"])) if ohlc.get("low") is not None else None
    close_p = Decimal(str(ohlc["close"])) if ohlc.get("close") is not None else None

    prev_close_val = raw_quote.get("cp") or (close_p if close_p is not None else None)
    prev_close = Decimal(str(prev_close_val)) if prev_close_val is not None else None

    # Calculate change & change_percent
    change: Optional[Decimal] = None
    change_pct: Optional[Decimal] = None
    if prev_close and prev_close > 0 and ltp > 0:
        change = ltp - prev_close
        change_pct = (change / prev_close) * Decimal("100")
        change = round(change, 4)
        change_pct = round(change_pct, 4)
    elif raw_quote.get("net_change") is not None:
        change = Decimal(str(raw_quote["net_change"]))

    volume = raw_quote.get("volume")

    # 52w high / low
    year_high = None
    year_low = None
    if raw_quote.get("yearly_high"):
        year_high = Decimal(str(raw_quote["yearly_high"]))
    if raw_quote.get("yearly_low"):
        year_low = Decimal(str(raw_quote["yearly_low"]))

    # Timestamp
    ts_val = raw_quote.get("timestamp")
    if ts_val:
        try:
            if isinstance(ts_val, (int, float)):
                ts = datetime.fromtimestamp(ts_val / 1000.0, tz=timezone.utc)
            else:
                ts = datetime.fromisoformat(str(ts_val).replace("Z", "+00:00"))
        except Exception:
            ts = datetime.now(timezone.utc)
    else:
        ts = datetime.now(timezone.utc)

    # Resolve exchange and symbol
    raw_sym = raw_quote.get("symbol")
    if symbol_override:
        symbol = symbol_override
    elif raw_sym and str(raw_sym).strip() != "NA":
        symbol = str(raw_sym).strip().upper()
    elif ":" in instrument_key:
        symbol = instrument_key.split(":")[-1].strip().upper()
    elif "|" in instrument_key:
        symbol = instrument_key.split("|")[-1].strip().upper()
    else:
        symbol = instrument_key.strip().upper()

    # Resolve exchange
    if ":" in instrument_key:
        exchange = instrument_key.split(":")[0].split("_")[0].upper()
    elif "|" in instrument_key:
        exchange = instrument_key.split("|")[0].split("_")[0].upper()
    else:
        exchange = "NSE"

    return MarketQuote(
        symbol=symbol,
        instrument_key=instrument_key,
        exchange=exchange,
        timestamp=ts,
        ltp=ltp,
        open=open_p,
        high=high_p,
        low=low_p,
        close=close_p,
        previous_close=prev_close,
        change=change,
        change_percent=change_pct,
        volume=volume,
        year_high=year_high,
        year_low=year_low,
        status="LIVE",
        source="UPSTOX",
    )


def normalize_upstox_candle(candle: List[Any]) -> CandleData:
    """
    Normalizes Upstox candle array format:
    [timestamp_str, open, high, low, close, volume, open_interest]
    """
    ts_str = candle[0]
    try:
        ts = datetime.fromisoformat(str(ts_str).replace("Z", "+00:00"))
    except Exception:
        ts = datetime.now(timezone.utc)

    return CandleData(
        timestamp=ts,
        open=Decimal(str(candle[1])),
        high=Decimal(str(candle[2])),
        low=Decimal(str(candle[3])),
        close=Decimal(str(candle[4])),
        volume=int(candle[5]) if len(candle) > 5 and candle[5] is not None else 0,
        open_interest=int(candle[6]) if len(candle) > 6 and candle[6] is not None else None,
    )


def normalize_bharatstock_quote(
    raw_data: Dict[str, Any],
    symbol_override: Optional[str] = None,
    instrument_key: Optional[str] = None,
) -> MarketQuote:
    """
    Normalizes raw BharatStockAPI response into a standard TradeX MarketQuote.
    Supports single stock detail (/v1/stocks/{ticker}), batch quote item (/v1/stocks/quotes),
    and mover item (/v1/movers).
    """
    # 1. Resolve symbol
    sym = symbol_override or raw_data.get("symbol") or "UNKNOWN"
    clean_sym = str(sym).strip().upper()

    # 2. Extract price details
    latest_price = raw_data.get("latest_price", {})
    if isinstance(latest_price, dict) and latest_price:
        close_val = latest_price.get("close")
        prev_close_val = latest_price.get("prev_close")
        volume_val = latest_price.get("volume")
        trade_date_val = latest_price.get("trade_date")
    else:
        close_val = raw_data.get("close") or raw_data.get("ltp") or raw_data.get("price")
        prev_close_val = raw_data.get("prev_close") or raw_data.get("previous_close")
        volume_val = raw_data.get("volume")
        trade_date_val = raw_data.get("trade_date")

    ltp = Decimal(str(close_val or "0"))

    # 3. Calculate previous close & change
    change: Optional[Decimal] = None
    change_pct: Optional[Decimal] = None
    prev_close: Optional[Decimal] = None

    if prev_close_val is not None:
        prev_close = Decimal(str(prev_close_val))
        if prev_close > 0 and ltp > 0:
            change = round(ltp - prev_close, 4)
            change_pct = round((change / prev_close) * Decimal("100"), 4)
    elif raw_data.get("change_pct") is not None:
        change_pct = Decimal(str(raw_data["change_pct"]))
        if change_pct != Decimal("-100"):
            implied_prev = ltp / (Decimal("1") + (change_pct / Decimal("100")))
            prev_close = round(implied_prev, 4)
            change = round(ltp - prev_close, 4)
        else:
            prev_close = ltp
            change = Decimal("0")

    volume = int(volume_val) if volume_val is not None else None

    # 4. Resolve exchange and instrument_key
    exchange = raw_data.get("exchange") or "NSE"
    if not instrument_key:
        instrument_key = f"{exchange}_EQ|{clean_sym}"

    # 5. Timestamp
    if trade_date_val:
        try:
            # Assume EOD 15:30 IST = 10:00 UTC
            ts = datetime.fromisoformat(f"{trade_date_val}T10:00:00+00:00")
        except Exception:
            ts = datetime.now(timezone.utc)
    else:
        ts = datetime.now(timezone.utc)

    return MarketQuote(
        symbol=clean_sym,
        instrument_key=instrument_key,
        exchange=exchange,
        timestamp=ts,
        ltp=ltp,
        open=None,
        high=None,
        low=None,
        close=ltp,
        previous_close=prev_close,
        change=change,
        change_percent=change_pct,
        volume=volume,
        year_high=None,
        year_low=None,
        status="FALLBACK",
        source="BHARATSTOCKAPI",
    )


def normalize_bharatstock_candle(raw_candle: Dict[str, Any]) -> CandleData:
    """
    Normalizes a BharatStockAPI daily price row into a CandleData bar.
    Row shape: {"trade_date": "2026-08-12", "open": 1410.0, "high": 1428.5, "low": 1405.2, "close": 1421.35, "volume": 8452110}
    """
    date_str = raw_candle.get("trade_date")
    try:
        ts = datetime.fromisoformat(f"{date_str}T10:00:00+00:00")
    except Exception:
        ts = datetime.now(timezone.utc)

    return CandleData(
        timestamp=ts,
        open=Decimal(str(raw_candle.get("open") or raw_candle.get("close") or 0)),
        high=Decimal(str(raw_candle.get("high") or raw_candle.get("close") or 0)),
        low=Decimal(str(raw_candle.get("low") or raw_candle.get("close") or 0)),
        close=Decimal(str(raw_candle.get("adjusted_close") or raw_candle.get("close") or 0)),
        volume=int(raw_candle.get("volume") or 0),
        open_interest=None,
    )


def normalize_bharatstock_instrument(raw_item: Dict[str, Any]) -> InstrumentData:
    """
    Normalizes BharatStock search item or stock metadata to InstrumentData.
    """
    sym = (raw_item.get("symbol") or "").strip().upper()
    name = raw_item.get("company_name") or sym
    exch = raw_item.get("exchange") or "NSE"
    isin = raw_item.get("isin")
    ikey = f"{exch}_EQ|{isin or sym}"

    return InstrumentData(
        instrument_key=ikey,
        symbol=sym,
        trading_symbol=sym,
        name=name,
        exchange=exch,
        segment="EQUITY",
        instrument_type="EQUITY",
        isin=isin,
        lot_size=1,
        tick_size=Decimal("0.05"),
    )
