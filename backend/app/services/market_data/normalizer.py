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
    status: str = Field(default="LIVE", description="LIVE, STALE, DELAYED, or UNAVAILABLE")

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
    Upstox quote structure:
    {
        "ohlc": {"open": 2500.0, "high": 2530.0, "low": 2490.0, "close": 2510.0},
        "depth": {...},
        "timestamp": "...",
        "last_price": 2520.5,
        "volume": 120530,
        "average_price": 2512.0,
        "cp": 2505.0, # previous close
        "lower_circuit_limit": ...,
        "upper_circuit_limit": ...
    }
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
                # Milliseconds timestamp
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
