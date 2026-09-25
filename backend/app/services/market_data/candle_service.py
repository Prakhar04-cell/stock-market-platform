import json
import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, List, Optional

from app.core.redis import get_redis
from app.services.market_data.instrument_service import instrument_service
from app.services.market_data.normalizer import CandleData
from app.services.market_data.upstox_provider import UpstoxAuthRequiredError, upstox_provider
from app.services.providers.bharatstock_provider import bharatstock_provider

logger = logging.getLogger("tradex.candles")

# Mapping frontend intervals to Upstox API intervals & query types
# Mapping frontend intervals to Upstox API intervals, intraday flag, and target aggregation minutes
TIMEFRAME_CONFIG = {
    # Intraday
    "1m": ("1minute", True, 1),
    "1MIN": ("1minute", True, 1),
    "1MINUTE": ("1minute", True, 1),
    "5m": ("1minute", True, 5),
    "5MIN": ("1minute", True, 5),
    "15m": ("1minute", True, 15),
    "15MIN": ("1minute", True, 15),
    "30m": ("30minute", True, 30),
    "30MIN": ("30minute", True, 30),
    "1h": ("30minute", True, 60),
    "1H": ("30minute", True, 60),
    "60m": ("30minute", True, 60),
    # Historical
    "1D": ("day", False, 1),
    "1d": ("day", False, 1),
    "D": ("day", False, 1),
    "DAY": ("day", False, 1),
    "1W": ("week", False, 1),
    "1w": ("week", False, 1),
    "W": ("week", False, 1),
    "WEEK": ("week", False, 1),
    "1M": ("month", False, 1),
    "1month": ("month", False, 1),
    "M": ("month", False, 1),
    "MONTH": ("month", False, 1),
}


class CandleService:
    """
    Historical & Intraday candle data provider for TradingView Lightweight Charts.
    Handles timeframe mapping, caching, deduplication, resampling, and provider integration.
    """

    CACHE_TTL_INTRADAY = 60  # 1 minute for intraday candles
    CACHE_TTL_HISTORICAL = 3600  # 1 hour for daily/weekly/monthly candles

    @staticmethod
    def resample_candles(candles: List[CandleData], target_minutes: int) -> List[CandleData]:
        """
        Resamples a list of chronologically sorted candles into a higher timeframe bucket.
        Calculates accurate open, high, low, close, and accumulated volume.
        """
        if not candles or target_minutes <= 1:
            return candles

        from collections import defaultdict
        grouped: Dict[int, List[CandleData]] = defaultdict(list)
        bucket_seconds = target_minutes * 60

        for c in candles:
            ts = int(c.timestamp.timestamp())
            bucket_ts = (ts // bucket_seconds) * bucket_seconds
            grouped[bucket_ts].append(c)

        resampled: List[CandleData] = []
        for bucket_ts in sorted(grouped.keys()):
            group = grouped[bucket_ts]
            group.sort(key=lambda x: x.timestamp)
            resampled.append(
                CandleData(
                    timestamp=datetime.fromtimestamp(bucket_ts, tz=timezone.utc),
                    open=group[0].open,
                    high=max(x.high for x in group),
                    low=min(x.low for x in group),
                    close=group[-1].close,
                    volume=sum(x.volume for x in group),
                    open_interest=group[-1].open_interest,
                )
            )
        return resampled

    async def get_candles(
        self,
        symbol_or_key: str,
        interval: str = "1D",
        to_date: Optional[str] = None,
        from_date: Optional[str] = None,
    ) -> List[CandleData]:
        """
        Retrieves normalized candles for the specified symbol/instrument and timeframe.
        Supports 1m, 5m, 15m, 30m, 1h, 1D, 1W, 1M with automatic Upstox resampling.
        """
        clean_symbol = symbol_or_key.strip().upper()
        clean_interval = interval.strip()
        instrument_key = await instrument_service.resolve_instrument_key(clean_symbol)

        config = TIMEFRAME_CONFIG.get(clean_interval, ("day", False, 1))
        upstox_interval, is_intraday, resample_minutes = config

        # Check Redis cache
        cache_key = f"market:candles:{instrument_key}:{clean_interval}:{from_date or 'default'}:{to_date or 'default'}"
        redis = await get_redis()
        if redis:
            try:
                cached = await redis.get(cache_key)
                if cached:
                    raw_list = json.loads(cached)
                    return [
                        CandleData(
                            timestamp=datetime.fromisoformat(c["timestamp"]),
                            open=Decimal(str(c["open"])),
                            high=Decimal(str(c["high"])),
                            low=Decimal(str(c["low"])),
                            close=Decimal(str(c["close"])),
                            volume=c.get("volume", 0),
                            open_interest=c.get("open_interest"),
                        )
                        for c in raw_list
                    ]
            except Exception as e:
                logger.debug(f"Redis get candles failed: {e}")

        # 1. Fetch from Upstox (Primary)
        candles: List[CandleData] = []
        try:
            if is_intraday and not from_date:
                candles = await upstox_provider.get_intraday_candles(
                    instrument_key=instrument_key,
                    interval=upstox_interval,
                )
            else:
                candles = await upstox_provider.get_historical_candles(
                    instrument_key=instrument_key,
                    interval=upstox_interval,
                    to_date=to_date,
                    from_date=from_date,
                )
        except UpstoxAuthRequiredError as e:
            logger.info(f"Upstox authentication required for candles, falling back to BharatStockAPI: {e}")
            candles = []
        except Exception as e:
            logger.warning(f"Failed to fetch candles from primary Upstox provider for {instrument_key}: {e}")
            candles = []

        # 2. Fallback to BharatStockAPI if Upstox returned no candles
        if not candles and bharatstock_provider.is_configured:
            try:
                candles = await bharatstock_provider.get_historical_candles(
                    instrument_key=instrument_key,
                    interval="1D",
                    to_date=to_date,
                    from_date=from_date,
                )
            except Exception as e:
                logger.warning(f"Failed to fetch fallback candles from BharatStockAPI for {instrument_key}: {e}")

        if not candles:
            return []

        # Deduplicate & sort chronologically
        seen_ts = set()
        deduped: List[CandleData] = []
        for c in candles:
            if c.timestamp not in seen_ts:
                seen_ts.add(c.timestamp)
                deduped.append(c)
        deduped.sort(key=lambda c: c.timestamp)

        # Resample if needed (e.g. 5m from 1m, 15m from 1m, 1h from 30m)
        if resample_minutes > 1 and is_intraday and upstox_interval == "1minute" and resample_minutes in (5, 15):
            deduped = self.resample_candles(deduped, resample_minutes)
        elif resample_minutes == 60 and is_intraday and upstox_interval == "30minute":
            deduped = self.resample_candles(deduped, 60)

        # Cache in Redis
        if redis and deduped:
            try:
                ttl = self.CACHE_TTL_INTRADAY if is_intraday else self.CACHE_TTL_HISTORICAL
                serialized = [
                    {
                        "timestamp": c.timestamp.isoformat(),
                        "open": str(c.open),
                        "high": str(c.high),
                        "low": str(c.low),
                        "close": str(c.close),
                        "volume": c.volume,
                        "open_interest": c.open_interest,
                    }
                    for c in deduped
                ]
                await redis.setex(cache_key, ttl, json.dumps(serialized))
            except Exception as e:
                logger.debug(f"Failed to cache candles in Redis: {e}")

        return deduped


candle_service = CandleService()
