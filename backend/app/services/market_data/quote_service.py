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
from app.services.providers.bharatstock_provider import bharatstock_provider

logger = logging.getLogger("tradex.quotes")


class QuoteService:
    """
    High-performance real market quote retrieval service with dual-tier
    (In-Memory + Redis) caching and automated provider fallback:
    UPSTOX (Primary) -> BHARATSTOCKAPI (Fallback) -> Redis -> FastAPI -> UI.
    """

    CACHE_TTL_SECONDS = 60  # Short cache for quotes
    REDIS_CACHE_TTL_SECONDS = 86400  # 24 hours persistent Redis cache for quotes
    STALE_THRESHOLD_SECONDS = 120  # Mark stale if quote is older than 2 minutes

    def __init__(self):
        self._memory_cache: Dict[str, tuple[float, MarketQuote]] = {}

    async def get_quote(self, symbol_or_key: str) -> Optional[MarketQuote]:
        """Fetch quote for a single symbol or instrument key."""
        quotes = await self.get_quotes([symbol_or_key])
        clean = symbol_or_key.strip().upper()
        return quotes.get(clean) or quotes.get(clean.replace(":", "|"))

    async def get_quotes(self, symbols_or_keys: List[str]) -> Dict[str, MarketQuote]:
        """
        Retrieves multiple market quotes.
        Checks in-memory cache, then Redis MGET, batch-fetching misses from Upstox (primary)
        and falling back to BharatStockAPI for any remaining unfulfilled symbols.
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
            ikey_colon = ikey.replace("|", ":")
            key_to_symbol_map[ikey_colon] = clean

            # Check in-memory tier
            found = False
            for cache_k in (clean, ikey, ikey_colon):
                if cache_k in self._memory_cache:
                    exp, quote = self._memory_cache[cache_k]
                    if now < exp:
                        results[clean] = quote
                        results[ikey] = quote
                        results[ikey_colon] = quote
                        if quote.symbol:
                            results[quote.symbol.upper()] = quote
                        found = True
                        break
            if not found:
                missing_keys.append(ikey)

        if not missing_keys:
            return results

        # 2. Check Redis cache for remaining misses
        redis_misses: List[str] = []
        redis = await get_redis()
        unique_missing = list(dict.fromkeys(missing_keys))
        if redis and unique_missing:
            try:
                redis_keys = [f"market:quote:{k}" for k in unique_missing]
                cached_values = await redis.mget(redis_keys)
                for ikey, val in zip(unique_missing, cached_values):
                    orig_sym = key_to_symbol_map.get(ikey, ikey)
                    if val:
                        raw = json.loads(val)
                        quote = self._deserialize_quote(raw)
                        # Check staleness
                        age = (datetime.now(timezone.utc) - quote.timestamp).total_seconds()
                        if age > self.STALE_THRESHOLD_SECONDS:
                            quote.status = "STALE"
                        results[ikey] = quote
                        results[orig_sym] = quote
                        if quote.symbol:
                            results[quote.symbol.upper()] = quote
                        # Populate in-memory cache as well
                        exp = time.time() + self.CACHE_TTL_SECONDS
                        self._memory_cache[ikey] = (exp, quote)
                        self._memory_cache[orig_sym] = (exp, quote)
                    else:
                        redis_misses.append(ikey)
            except Exception as e:
                logger.debug(f"Redis mget quotes failed: {e}")
                redis_misses = unique_missing
        else:
            redis_misses = unique_missing

        # 3. Batch fetch missing quotes from Upstox Provider (PRIMARY)
        remaining_misses: List[str] = list(redis_misses)
        if redis_misses:
            try:
                fetched_quotes = await upstox_provider.get_quotes(redis_misses)
                for ikey, quote in fetched_quotes.items():
                    ikey_pipe = ikey.replace(":", "|")
                    orig_sym = key_to_symbol_map.get(ikey_pipe, key_to_symbol_map.get(ikey, quote.symbol.upper()))
                    results[ikey] = quote
                    results[ikey_pipe] = quote
                    results[orig_sym] = quote
                    results[quote.symbol.upper()] = quote
                    await self.cache_quote(quote, extra_alias=orig_sym)
                    if ikey in remaining_misses:
                        remaining_misses.remove(ikey)
                    if ikey_pipe in remaining_misses:
                        remaining_misses.remove(ikey_pipe)
                    if orig_sym in remaining_misses:
                        remaining_misses.remove(orig_sym)
            except UpstoxAuthRequiredError as e:
                logger.info(f"Upstox provider authentication required, falling back to secondary: {e}")
            except Exception as e:
                logger.warning(f"Failed to fetch quotes from primary Upstox provider: {e}")

        # 4. Fallback to BharatStockAPI for any remaining misses (FALLBACK)
        if remaining_misses:
            if not bharatstock_provider.is_configured:
                await bharatstock_provider.ensure_configured()

        if remaining_misses and bharatstock_provider.is_configured:
            try:
                # Convert keys to simple trading symbols for BharatStockAPI
                fb_symbols: List[str] = []
                for k in remaining_misses:
                    sym = key_to_symbol_map.get(k)
                    if not sym:
                        sym = await instrument_service.get_symbol_for_key(k)
                    if not sym:
                        sym = k.split("|")[-1] if "|" in k else k
                    if sym and sym not in fb_symbols:
                        fb_symbols.append(sym)

                fb_quotes = await bharatstock_provider.get_quotes(fb_symbols)
                for sym_or_key, quote in fb_quotes.items():
                    sym_upper = quote.symbol.upper()
                    results[sym_upper] = quote
                    ikey = quote.instrument_key
                    ikey_pipe = ikey.replace(":", "|")
                    ikey_colon = ikey.replace("|", ":")
                    results[ikey] = quote
                    results[ikey_pipe] = quote
                    results[ikey_colon] = quote

                    # Map to all caller-requested keys/aliases that resolved to this symbol
                    for req_key, mapped_sym in key_to_symbol_map.items():
                        if mapped_sym.upper() == sym_upper or req_key.upper() == sym_upper:
                            results[req_key] = quote
                            results[req_key.replace(":", "|")] = quote
                            results[req_key.replace("|", ":")] = quote
                            await self.cache_quote(quote, extra_alias=req_key)

                    await self.cache_quote(quote, extra_alias=sym_upper)
            except Exception as e:
                logger.warning(f"Failed to fetch quotes from BharatStockAPI fallback: {e}")

        return results

    async def cache_quote(self, quote: MarketQuote, extra_alias: Optional[str] = None) -> None:
        """Stores a normalized quote in memory and Redis with symbol aliases."""
        # 1. Update in-memory cache
        exp = time.time() + self.CACHE_TTL_SECONDS
        sym_upper = quote.symbol.upper()
        ikey = quote.instrument_key
        ikey_colon = ikey.replace("|", ":")
        ikey_pipe = ikey.replace(":", "|")

        self._memory_cache[sym_upper] = (exp, quote)
        self._memory_cache[ikey] = (exp, quote)
        self._memory_cache[ikey_pipe] = (exp, quote)
        self._memory_cache[ikey_colon] = (exp, quote)
        if extra_alias:
            alias_up = extra_alias.upper()
            self._memory_cache[alias_up] = (exp, quote)
            if "|" in alias_up:
                self._memory_cache[alias_up.replace("|", ":")] = (exp, quote)
            elif ":" in alias_up:
                self._memory_cache[alias_up.replace(":", "|")] = (exp, quote)

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
                "source": quote.source or ("BHARATSTOCKAPI" if quote.status == "FALLBACK" else "UPSTOX"),
            }
            dumped = json.dumps(payload)
            redis_ttl = getattr(self, "REDIS_CACHE_TTL_SECONDS", 86400)
            await redis.set(f"market:quote:{ikey}", dumped, ex=redis_ttl)
            await redis.set(f"market:quote:{ikey_pipe}", dumped, ex=redis_ttl)
            await redis.set(f"market:quote:{ikey_colon}", dumped, ex=redis_ttl)
            await redis.set(f"market:quote:{sym_upper}", dumped, ex=redis_ttl)
            if extra_alias:
                alias_up = extra_alias.upper()
                await redis.set(f"market:quote:{alias_up}", dumped, ex=redis_ttl)
                if "|" in alias_up:
                    await redis.set(f"market:quote:{alias_up.replace('|', ':')}", dumped, ex=redis_ttl)
                elif ":" in alias_up:
                    await redis.set(f"market:quote:{alias_up.replace(':', '|')}", dumped, ex=redis_ttl)
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
            source=raw.get("source", "UPSTOX"),
        )


quote_service = QuoteService()
