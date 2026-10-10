import pytest
from datetime import datetime, timezone
from decimal import Decimal
from httpx import AsyncClient

from app.services.market_data.candle_service import candle_service
from app.services.market_data.instrument_service import instrument_service
from app.services.market_data.normalizer import (
    normalize_upstox_candle,
    normalize_upstox_quote,
)
from app.services.market_data.quote_service import quote_service


def test_quote_normalization():
    raw_quote = {
        "last_price": 2845.50,
        "ohlc": {
            "open": 2820.00,
            "high": 2860.00,
            "low": 2810.00,
            "close": 2850.00,
        },
        "cp": 2800.00,
        "volume": 3450000,
        "yearly_high": 3020.00,
        "yearly_low": 2220.00,
        "timestamp": "2026-09-21T10:30:00Z",
    }

    norm = normalize_upstox_quote(
        instrument_key="NSE_EQ|INE002A01018",
        raw_quote=raw_quote,
        symbol_override="RELIANCE",
    )

    assert norm.symbol == "RELIANCE"
    assert norm.instrument_key == "NSE_EQ|INE002A01018"
    assert norm.exchange == "NSE"
    assert norm.ltp == Decimal("2845.50")
    assert norm.open == Decimal("2820.00")
    assert norm.high == Decimal("2860.00")
    assert norm.low == Decimal("2810.00")
    assert norm.close == Decimal("2850.00")
    assert norm.previous_close == Decimal("2800.00")
    assert norm.change == Decimal("45.5000")
    assert norm.change_percent == Decimal("1.6250")
    assert norm.volume == 3450000
    assert norm.year_high == Decimal("3020.00")
    assert norm.year_low == Decimal("2220.00")
    assert norm.status == "LIVE"


def test_candle_normalization():
    raw_candle = [
        "2026-09-21T09:15:00+05:30",
        2820.0,
        2835.0,
        2815.0,
        2830.0,
        152000,
        0,
    ]
    candle = normalize_upstox_candle(raw_candle)
    assert candle.open == Decimal("2820.0")
    assert candle.high == Decimal("2835.0")
    assert candle.low == Decimal("2815.0")
    assert candle.close == Decimal("2830.0")
    assert candle.volume == 152000


@pytest.mark.asyncio
async def test_instrument_service_resolution():
    reliance_key = await instrument_service.resolve_instrument_key("RELIANCE")
    assert reliance_key == "NSE_EQ|INE002A01018"

    nifty_key = await instrument_service.resolve_instrument_key("NIFTY 50")
    assert nifty_key == "NSE_INDEX|Nifty 50"

    tcs_key = await instrument_service.resolve_instrument_key("TCS")
    assert tcs_key == "NSE_EQ|INE467B01029"


@pytest.mark.asyncio
async def test_quote_service_caching_and_retrieval():
    # Cache a quote
    raw = {
        "last_price": 3500.0,
        "ohlc": {"open": 3480.0, "high": 3510.0, "low": 3470.0, "close": 3500.0},
        "cp": 3450.0,
        "volume": 80000,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    q = normalize_upstox_quote("NSE_EQ|INE467B01029", raw, symbol_override="TCS")
    await quote_service.cache_quote(q)

    # Retrieve cached quote
    retrieved = await quote_service.get_quote("TCS")
    assert retrieved is not None
    assert retrieved.symbol == "TCS"
    assert retrieved.ltp == Decimal("3500.0")


@pytest.mark.asyncio
async def test_market_api_endpoints(client: AsyncClient):
    # Cache RELIANCE quote
    raw = {
        "last_price": 2900.0,
        "ohlc": {"open": 2880.0, "high": 2910.0, "low": 2870.0, "close": 2895.0},
        "cp": 2850.0,
        "volume": 1200000,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    q = normalize_upstox_quote("NSE_EQ|INE002A01018", raw, symbol_override="RELIANCE")
    await quote_service.cache_quote(q)

    # 1. GET /api/v1/market/quote/RELIANCE
    res = await client.get("/api/v1/market/quote/RELIANCE")
    assert res.status_code == 200
    data = res.json()
    assert data["symbol"] == "RELIANCE"
    assert float(data["ltp"]) == 2900.0

    # 2. GET /api/v1/market/quotes?symbols=RELIANCE
    batch_res = await client.get("/api/v1/market/quotes?symbols=RELIANCE")
    assert batch_res.status_code == 200
    batch_data = batch_res.json()
    assert "RELIANCE" in batch_data

    # 3. GET /api/v1/market/ticker
    ticker_res = await client.get("/api/v1/market/ticker")
    assert ticker_res.status_code == 200
    ticker_data = ticker_res.json()
    assert "indices" in ticker_data
    assert len(ticker_data["indices"]) == 5


@pytest.mark.asyncio
async def test_stocks_category_and_sector_filtering(client: AsyncClient):
    # 1. All markets
    res_all = await client.get("/api/v1/stocks")
    assert res_all.status_code == 200
    all_stocks = res_all.json()
    assert len(all_stocks) > 0
    all_symbols = [s["symbol"] for s in all_stocks]
    assert "RELIANCE" in all_symbols
    assert "TCS" in all_symbols

    # 2. Large Cap category
    res_large = await client.get("/api/v1/stocks?category=Large+Cap")
    assert res_large.status_code == 200
    large_stocks = res_large.json()
    assert len(large_stocks) > 0
    for s in large_stocks:
        assert s["symbol"] in [
            "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN",
            "BHARTIARTL", "ITC", "LT", "KOTAKBANK", "AXISBANK", "MARUTI",
            "TATAMOTORS", "SUNPHARMA", "CIPLA", "NTPC", "ONGC", "WIPRO",
            "HCLTECH", "M&M", "POWERGRID", "DRREDDY", "DIVISLAB"
        ]

    # 3. Banking & Finance category
    res_bank = await client.get("/api/v1/stocks?category=Banking+%26+Finance")
    assert res_bank.status_code == 200
    bank_stocks = res_bank.json()
    assert len(bank_stocks) > 0
    for s in bank_stocks:
        assert "bank" in s["sector"].lower() or "finance" in s["sector"].lower()

    # 4. Technology category
    res_tech = await client.get("/api/v1/stocks?category=Technology")
    assert res_tech.status_code == 200
    tech_stocks = res_tech.json()
    assert len(tech_stocks) > 0
    for s in tech_stocks:
        assert "tech" in s["sector"].lower() or "information" in s["sector"].lower()

    # 5. Search filtering
    res_search = await client.get("/api/v1/stocks?search=TCS")
    assert res_search.status_code == 200
    search_stocks = res_search.json()
    assert any(s["symbol"] == "TCS" for s in search_stocks)


@pytest.mark.asyncio
async def test_index_details_endpoint(client: AsyncClient):
    """Verify detailed index overview, quote structure, constituents, and market breadth."""
    # 1. Test NIFTY 50
    res_nifty = await client.get("/api/v1/market/indices/nifty")
    assert res_nifty.status_code == 200
    nifty_data = res_nifty.json()
    assert nifty_data["index"]["symbol"] == "NIFTY 50"
    assert nifty_data["index"]["category"] == "Benchmark Index"
    assert "breadth" in nifty_data
    assert nifty_data["breadth"]["total_constituents"] > 0
    assert "constituents" in nifty_data
    assert len(nifty_data["constituents"]) > 0
    assert any(c["symbol"] == "RELIANCE" for c in nifty_data["constituents"])

    # 2. Test BANKNIFTY
    res_bank = await client.get("/api/v1/market/indices/banknifty")
    assert res_bank.status_code == 200
    bank_data = res_bank.json()
    assert bank_data["index"]["symbol"] == "BANKNIFTY"
    assert bank_data["index"]["category"] == "Sectoral Index"
    assert any(c["symbol"] == "HDFCBANK" for c in bank_data["constituents"])

    # 3. Test Invalid Index returns 404
    res_invalid = await client.get("/api/v1/market/indices/unknown_index_123")
    assert res_invalid.status_code == 404

