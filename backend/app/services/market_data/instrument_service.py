import json
import logging
from decimal import Decimal
from typing import Dict, List, Optional
from sqlalchemy import or_, select

from app.core.database import AsyncSessionLocal
from app.core.redis import get_redis
from app.models.market import Instrument, Stock
from app.services.market_data.normalizer import InstrumentData

logger = logging.getLogger("tradex.instruments")

# Common static mappings for instant resolution
WELL_KNOWN_INSTRUMENT_KEYS: Dict[str, str] = {
    "RELIANCE": "NSE_EQ|INE002A01018",
    "TCS": "NSE_EQ|INE467B01029",
    "HDFCBANK": "NSE_EQ|INE040A01034",
    "INFY": "NSE_EQ|INE009A01021",
    "ICICIBANK": "NSE_EQ|INE090A01021",
    "TATAMOTORS": "NSE_EQ|INE155A01022",
    "ITC": "NSE_EQ|INE154A01025",
    "SBIN": "NSE_EQ|INE062A01020",
    "BHARTIARTL": "NSE_EQ|INE397D01024",
    "LT": "NSE_EQ|INE018A01030",
    "NIFTY": "NSE_INDEX|Nifty 50",
    "NIFTY 50": "NSE_INDEX|Nifty 50",
    "NIFTY50": "NSE_INDEX|Nifty 50",
    "BANKNIFTY": "NSE_INDEX|Nifty Bank",
    "NIFTY BANK": "NSE_INDEX|Nifty Bank",
    "FINNIFTY": "NSE_INDEX|Nifty Fin Service",
    "MIDCPNIFTY": "NSE_INDEX|NIFTY MID SELECT",
    "SENSEX": "BSE_INDEX|SENSEX",
}


class InstrumentService:
    """
    Manages instruments, searches across stocks/indices/derivatives,
    and resolves symbols to official Upstox instrument keys.
    """

    CACHE_TTL_SECONDS = 86400  # 24 hours

    def __init__(self):
        self._reverse_cache: Dict[str, str] = {
            "NSE_INDEX|Nifty 50": "NIFTY 50",
            "BSE_INDEX|SENSEX": "SENSEX",
            "NSE_INDEX|Nifty Bank": "BANKNIFTY",
            "NSE_INDEX|Nifty Fin Service": "FINNIFTY",
            "NSE_INDEX|NIFTY MID SELECT": "MIDCPNIFTY",
            "NSE_EQ|INE002A01018": "RELIANCE",
            "NSE_EQ|INE467B01029": "TCS",
            "NSE_EQ|INE040A01034": "HDFCBANK",
            "NSE_EQ|INE009A01021": "INFY",
            "NSE_EQ|INE090A01021": "ICICIBANK",
            "NSE_EQ|INE155A01022": "TATAMOTORS",
            "NSE_EQ|INE154A01025": "ITC",
            "NSE_EQ|INE062A01020": "SBIN",
            "NSE_EQ|INE397D01024": "BHARTIARTL",
            "NSE_EQ|INE018A01030": "LT",
        }

    async def get_symbol_for_key(self, instrument_key: str) -> str:
        """Resolves an Upstox instrument key to its trading symbol with fast memory caching."""
        if not instrument_key:
            return ""
        from urllib.parse import unquote
        clean_key = unquote(instrument_key).strip()
        if clean_key in self._reverse_cache:
            return self._reverse_cache[clean_key]

        # Check DB
        inst = await self.get_instrument_by_key(clean_key)
        if inst and inst.symbol:
            self._reverse_cache[clean_key] = inst.symbol
            return inst.symbol

        # Fallback: extract last segment
        fallback = clean_key.split("|")[-1] if "|" in clean_key else clean_key
        self._reverse_cache[clean_key] = fallback
        return fallback


    async def resolve_instrument_key(self, symbol_or_key: str) -> str:
        """
        Resolves any symbol, trading symbol, or key to its Upstox instrument key.
        e.g. 'RELIANCE' -> 'NSE_EQ|INE002A01018'
             'NIFTY 50' -> 'NSE_INDEX|Nifty 50'
             'NIFTY%2050' -> 'NSE_INDEX|Nifty 50'
             'NSE_EQ|INE002A01018' -> 'NSE_EQ|INE002A01018'
        """
        if not symbol_or_key:
            return ""

        from urllib.parse import unquote
        raw_clean = unquote(symbol_or_key).strip()
        if "|" in raw_clean:
            # Already an instrument key
            return raw_clean

        clean = raw_clean.upper()

        # 1. Check well-known static dictionary
        if clean in WELL_KNOWN_INSTRUMENT_KEYS:
            return WELL_KNOWN_INSTRUMENT_KEYS[clean]


        # 2. Check Redis cache
        redis_key = f"instrument:{clean}"
        try:
            redis = await get_redis()
            if redis:
                cached = await redis.get(redis_key)
                if cached:
                    return cached.decode("utf-8") if isinstance(cached, bytes) else cached
        except Exception as e:
            logger.debug(f"Redis get failed for {redis_key}: {e}")

        # 3. Query PostgreSQL Instrument table
        async with AsyncSessionLocal() as db:
            stmt = select(Instrument).where(
                or_(
                    Instrument.symbol == clean,
                    Instrument.trading_symbol == clean,
                    Instrument.instrument_key == clean,
                )
            )
            inst = (await db.execute(stmt)).scalars().first()
            if inst and inst.instrument_key:
                await self._cache_key(clean, inst.instrument_key)
                return inst.instrument_key

            # 4. Fallback: check Stock table
            s_stmt = select(Stock).where(Stock.symbol == clean)
            stock = (await db.execute(s_stmt)).scalar_one_or_none()
            if stock and stock.instrument_key:
                await self._cache_key(clean, stock.instrument_key)
                return stock.instrument_key
            if stock and stock.isin:
                constructed = f"NSE_EQ|{stock.isin}"
                await self._cache_key(clean, constructed)
                return constructed

        # Default fallback convention: assume NSE equity
        fallback = f"NSE_EQ|{clean}"
        return fallback

    async def _cache_key(self, symbol: str, instrument_key: str):
        try:
            redis = await get_redis()
            if redis:
                await redis.setex(f"instrument:{symbol}", self.CACHE_TTL_SECONDS, instrument_key)
        except Exception as e:
            logger.debug(f"Redis cache set failed: {e}")

    async def search_instruments(
        self,
        query: str,
        exchange: Optional[str] = None,
        limit: int = 30,
    ) -> List[InstrumentData]:
        """
        Search across symbol, company name, trading symbol, instrument key.
        Supports NSE, BSE, indices, derivatives.
        """
        from urllib.parse import unquote
        q = unquote(query).strip()
        if not q:
            return []

        term = f"%{q}%"
        term_upper = f"%{q.upper()}%"


        results: List[InstrumentData] = []
        async with AsyncSessionLocal() as db:
            stmt = select(Instrument).where(
                or_(
                    Instrument.symbol.ilike(term_upper),
                    Instrument.trading_symbol.ilike(term_upper),
                    Instrument.name.ilike(term),
                    Instrument.instrument_key.ilike(term_upper),
                )
            )
            if exchange:
                stmt = stmt.where(Instrument.exchange == exchange.upper())

            stmt = stmt.limit(limit)
            rows = (await db.execute(stmt)).scalars().all()

            for r in rows:
                results.append(
                    InstrumentData(
                        instrument_key=r.instrument_key,
                        symbol=r.symbol,
                        trading_symbol=r.trading_symbol,
                        name=r.name,
                        exchange=r.exchange,
                        segment=r.segment,
                        instrument_type=r.instrument_type,
                        isin=r.isin,
                        lot_size=r.lot_size,
                        tick_size=r.tick_size,
                        expiry=r.expiry,
                        strike_price=r.strike_price,
                        underlying_key=r.underlying_key,
                    )
                )

            # Fallback to Stock table if Instrument table has fewer results
            if len(results) < limit:
                stock_stmt = (
                    select(Stock)
                    .where(
                        or_(
                            Stock.symbol.ilike(term_upper),
                            Stock.name.ilike(term),
                        )
                    )
                    .limit(limit - len(results))
                )
                stocks = (await db.execute(stock_stmt)).scalars().all()
                for s in stocks:
                    ikey = s.instrument_key or (f"NSE_EQ|{s.isin}" if s.isin else f"NSE_EQ|{s.symbol}")
                    if not any(r.instrument_key == ikey for r in results):
                        results.append(
                            InstrumentData(
                                instrument_key=ikey,
                                symbol=s.symbol,
                                trading_symbol=s.symbol,
                                name=s.name,
                                exchange="NSE",
                                segment="EQ",
                                instrument_type="EQUITY",
                                isin=s.isin,
                                lot_size=1,
                                tick_size=Decimal("0.05"),
                            )
                        )

            # Check well known index instruments
            for sym, key in WELL_KNOWN_INSTRUMENT_KEYS.items():
                if (q.upper() in sym.upper() or q.upper() in key.upper()) and not any(r.instrument_key == key for r in results):
                    results.append(
                        InstrumentData(
                            instrument_key=key,
                            symbol=sym,
                            trading_symbol=sym,
                            name=f"{sym} Benchmark Index",
                            exchange=key.split("_")[0] if "_" in key else "NSE",
                            segment="INDEX",
                            instrument_type="INDEX",
                            lot_size=1,
                            tick_size=Decimal("0.05"),
                        )
                    )

            # Fallback to BharatStockAPI if local search returned no results
            if not results:
                try:
                    from app.services.providers.bharatstock_provider import bharatstock_provider
                    if bharatstock_provider.is_configured:
                        fb_instruments = await bharatstock_provider.search_instruments(query=q, exchange=exchange)
                        for item in fb_instruments:
                            if not any(r.symbol == item.symbol for r in results):
                                results.append(item)
                except Exception as e:
                    logger.debug(f"BharatStockAPI search fallback failed: {e}")

        return results[:limit]

    async def get_instrument_by_key(self, instrument_key: str) -> Optional[InstrumentData]:
        """Retrieve instrument metadata by its exact instrument key."""
        async with AsyncSessionLocal() as db:
            stmt = select(Instrument).where(Instrument.instrument_key == instrument_key)
            r = (await db.execute(stmt)).scalar_one_or_none()
            if not r:
                return None
            return InstrumentData(
                instrument_key=r.instrument_key,
                symbol=r.symbol,
                trading_symbol=r.trading_symbol,
                name=r.name,
                exchange=r.exchange,
                segment=r.segment,
                instrument_type=r.instrument_type,
                isin=r.isin,
                lot_size=r.lot_size,
                tick_size=r.tick_size,
                expiry=r.expiry,
                strike_price=r.strike_price,
                underlying_key=r.underlying_key,
            )


instrument_service = InstrumentService()
