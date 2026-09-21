import json
import logging
import time
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, List, Optional

from app.core.redis import get_redis
from app.services.market_data.instrument_service import instrument_service
from app.services.market_data.normalizer import MarketQuote
from app.services.market_data.upstox_provider import UpstoxAuthRequiredError, upstox_provider

logger = logging.getLogger("tradex.quotes")


class QuoteService:
    """
    High-performance real market quote retrieval service with dual-tier
    (In-Memory + Redis) caching and automated provider fallback.
    """

    CACHE_TTL_SECONDS = 60  # Short cache for quotes
    STALE_THRESHOLD_SECONDS = 120  # Mark stale if quote is older than 2 minutes

    def __init__(self):
        self._memory_cache: Dict[str, tuple[float, MarketQuote]] = {}

    async def get_quote(self, symbol_or_key: str) -> Optional[MarketQuote]:
        """Fetch quote for a single symbol or instrument key."""
        quotes = await self.get_quotes([symbol_or_key])
        return quotes.get(symbol_or_key.strip().upper())

    async def get_quotes(self, symbols_or_keys: List[str]) -> Dict[str, MarketQuote]:
        """
        Retrieves multiple market quotes.
        Checks in-memory cache, then Redis MGET, batch-fetching any misses from Upstox.
        """
        if not symbols_or_keys:
            return {}

        results: Dict[str, MarketQuote] = {}
        missing_keys: List[str] = []
        key_to_symbol_map: Dict[str, str] = {}
        now = time.time()

        # 1. Resolve symbols to instrument keys and check memory cache first
        for sym in symbols_or_keys:
            clean = sym.strip().upper()
            ikey = await instrument_service.resolve_instrument_key(clean)
            key_to_symbol_map[ikey] = clean

            # Check in-memory tier
            if clean in self._memory_cache:
                exp, quote = self._memory_cache[clean]
                if now < exp:
                    results[clean] = quote
                    results[ikey] = quote
                    continue
            if ikey in self._memory_cache:
                exp, quote = self._memory_cache[ikey]
                if now < exp:
                    results[clean] = quote
                    results[ikey] = quote
                    continue

            missing_keys.append(ikey)

        if not missing_keys:
            return results

        # 2. Check Redis cache for remaining misses

        redis = await get_redis()
        if redis:
            try:
                redis_keys = [f"market:quote:{k}" for k in key_to_symbol_map.keys()]
                cached_values = await redis.mget(redis_keys)
                for ikey, val in zip(key_to_symbol_map.keys(), cached_values):
                    orig_sym = key_to_symbol_map[ikey]
                    if val:
                        raw = json.loads(val)
                        quote = self._deserialize_quote(raw)
                        # Check staleness
                        age = (datetime.now(timezone.utc) - quote.timestamp).total_seconds()
                        if age > self.STALE_THRESHOLD_SECONDS:
                            quote.status = "STALE"
                        results[ikey] = quote
                        results[orig_sym] = quote
                    else:
                        missing_keys.append(ikey)
            except Exception as e:
                logger.debug(f"Redis mget quotes failed: {e}")
                missing_keys = list(key_to_symbol_map.keys())
        else:
            missing_keys = list(key_to_symbol_map.keys())

        # 3. Batch fetch missing quotes from Upstox Provider
        if missing_keys:
            try:
                fetched_quotes = await upstox_provider.get_quotes(missing_keys)
                for ikey, quote in fetched_quotes.items():
                    ikey_pipe = ikey.replace(":", "|")
                    orig_sym = key_to_symbol_map.get(ikey_pipe, key_to_symbol_map.get(ikey, quote.symbol.upper()))
                    results[ikey] = quote
                    results[ikey_pipe] = quote
                    results[orig_sym] = quote
                    results[quote.symbol.upper()] = quote
                    await self.cache_quote(quote)
            except UpstoxAuthRequiredError as e:
                logger.info(f"Upstox provider authentication required: {e}")
            except Exception as e:
                logger.warning(f"Failed to fetch quotes from provider for {missing_keys}: {e}")

        return results

    async def cache_quote(self, quote: MarketQuote) -> None:
        """Stores a normalized quote in memory and Redis."""
        # 1. Update in-memory cache
        exp = time.time() + self.CACHE_TTL_SECONDS
        self._memory_cache[quote.symbol.upper()] = (exp, quote)
        self._memory_cache[quote.instrument_key] = (exp, quote)

        # 2. Update Redis
        redis = await get_redis()
        if not redis:
            return
        try:
            payload = {
                "symbol": quote.symbol,
                "instrument_key": quote.instrument_key,
                "exchange": quote.exchange,
                "timestamp": quote.timestamp.isoformat(),
                "ltp": str(quote.ltp),
                "open": str(quote.open) if quote.open is not None else None,
                "high": str(quote.high) if quote.high is not None else None,
                "low": str(quote.low) if quote.low is not None else None,
                "close": str(quote.close) if quote.close is not None else None,
                "previous_close": str(quote.previous_close) if quote.previous_close is not None else None,
                "change": str(quote.change) if quote.change is not None else None,
                "change_percent": str(quote.change_percent) if quote.change_percent is not None else None,
                "volume": quote.volume,
                "year_high": str(quote.year_high) if quote.year_high is not None else None,
                "year_low": str(quote.year_low) if quote.year_low is not None else None,
                "status": quote.status,
            }
            dumped = json.dumps(payload)
            await redis.set(f"market:quote:{quote.instrument_key}", dumped, ex=self.CACHE_TTL_SECONDS)
            await redis.set(f"market:quote:{quote.symbol.upper()}", dumped, ex=self.CACHE_TTL_SECONDS)
        except Exception as e:
            logger.debug(f"Failed to cache quote in Redis: {e}")


    def _deserialize_quote(self, raw: dict) -> MarketQuote:
        return MarketQuote(
            symbol=raw["symbol"],
            instrument_key=raw["instrument_key"],
            exchange=raw["exchange"],
            timestamp=datetime.fromisoformat(raw["timestamp"]),
            ltp=Decimal(raw["ltp"]),
            open=Decimal(raw["open"]) if raw.get("open") is not None else None,
            high=Decimal(raw["high"]) if raw.get("high") is not None else None,
            low=Decimal(raw["low"]) if raw.get("low") is not None else None,
            close=Decimal(raw["close"]) if raw.get("close") is not None else None,
            previous_close=Decimal(raw["previous_close"]) if raw.get("previous_close") is not None else None,
            change=Decimal(raw["change"]) if raw.get("change") is not None else None,
            change_percent=Decimal(raw["change_percent"]) if raw.get("change_percent") is not None else None,
            volume=raw.get("volume"),
            year_high=Decimal(raw["year_high"]) if raw.get("year_high") is not None else None,
            year_low=Decimal(raw["year_low"]) if raw.get("year_low") is not None else None,
            status=raw.get("status", "LIVE"),
        )


quote_service = QuoteService()
