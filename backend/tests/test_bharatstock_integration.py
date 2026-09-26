import json
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.core.exceptions import TradeXException
from app.services.market_data.candle_service import candle_service
from app.services.market_data.normalizer import (
    normalize_bharatstock_candle,
    normalize_bharatstock_instrument,
    normalize_bharatstock_quote,
)
from app.services.market_data.quote_service import quote_service
from app.services.market_data.upstox_provider import UpstoxAuthRequiredError
from app.services.providers.bharatstock_provider import (
    BharatStockAPIProvider,
    bharatstock_provider,
)


@pytest.fixture(autouse=True)
async def clean_memory_cache():
    """Clear in-memory and Redis quote cache between test runs."""
    quote_service._memory_cache.clear()
    try:
        from app.core.redis import get_redis
        redis = await get_redis()
        if redis:
            keys = [
                "market:quote:RELIANCE", "market:quote:TCS", "market:quote:INFY",
                "market:quote:NSE_EQ|RELIANCE", "market:quote:NSE_EQ:RELIANCE",
                "market:quote:NSE_EQ|TCS", "market:quote:NSE_EQ:TCS",
                "market:quote:NSE_EQ|INFY", "market:quote:NSE_EQ:INFY",
                "market:quote:NSE_EQ|INE002A01018", "market:quote:NSE_EQ:INE002A01018",
                "market:quote:NSE_EQ|INE467B01029", "market:quote:NSE_EQ:INE467B01029",
                "market:quote:NSE_EQ|INE009A01021", "market:quote:NSE_EQ:INE009A01021",
                "market:fundamentals:RELIANCE", "market:fundamentals:TCS", "market:fundamentals:INFY"
            ]
            await redis.delete(*keys)
    except Exception:
        pass
    yield
    quote_service._memory_cache.clear()
    try:
        from app.core.redis import get_redis
        redis = await get_redis()
        if redis:
            await redis.delete(*keys)
    except Exception:
        pass


# ==============================================================================
# 1. Configuration & Headers
# ==============================================================================

def test_bharatstock_configuration():
    """Verify provider configuration flags, base URL defaults, and naming."""
    provider = BharatStockAPIProvider()
    assert provider.provider_name == "BharatStockAPI"
    assert provider.base_url == "https://bharatstockapi.com"

    with patch.object(settings, "MARKET_DATA_API_KEY", ""):
        assert not provider.is_configured
        assert not provider.is_token_valid
        headers = provider._get_headers()
        assert "X-API-Key" not in headers
        assert headers["User-Agent"] == "TradeX-BullRun/1.0"

    with patch.object(settings, "MARKET_DATA_API_KEY", "test_bsk_live_key_123"):
        assert provider.is_configured
        assert provider.is_token_valid
        headers = provider._get_headers()
        assert headers["X-API-Key"] == "test_bsk_live_key_123"
        assert headers["User-Agent"] == "TradeX-BullRun/1.0"


# ==============================================================================
# 2. Quote Normalization (RELIANCE & Batch & Movers)
# ==============================================================================

def test_reliance_quote_normalization_single_stock():
    """Verify normalization of /v1/stocks/{ticker} single stock response."""
    raw_single_stock = {
        "symbol": "RELIANCE",
        "company_name": "Reliance Industries Limited",
        "sector": "Oil Gas & Consumable Fuels",
        "exchange": "NSE",
        "industry": "Petroleum Products",
        "face_value": 10.0,
        "market_cap_rank": 1,
        "latest_price": {
            "trade_date": "2026-08-12",
            "close": 1421.35,
            "prev_close": 1408.90,
            "volume": 8452110,
            "delivery_pct": 42.6,
        },
    }

    norm = normalize_bharatstock_quote(raw_data=raw_single_stock, symbol_override="RELIANCE")

    assert norm.symbol == "RELIANCE"
    assert norm.ltp == Decimal("1421.35")
    assert norm.previous_close == Decimal("1408.90")
    assert norm.change == Decimal("12.4500")
    assert norm.change_percent == Decimal("0.8837")
    assert norm.volume == 8452110
    assert norm.status == "FALLBACK"
    assert norm.source == "BHARATSTOCKAPI"
    assert norm.exchange == "NSE"


def test_batch_quote_normalization():
    """Verify normalization of /v1/stocks/quotes item."""
    raw_batch_item = {
        "symbol": "TCS",
        "close": 3980.1,
        "change_pct": -0.42,
        "found": True,
    }

    norm = normalize_bharatstock_quote(raw_data=raw_batch_item, symbol_override="TCS")

    assert norm.symbol == "TCS"
    assert norm.ltp == Decimal("3980.1")
    assert norm.change_percent == Decimal("-0.42")
    assert norm.status == "FALLBACK"
    assert norm.source == "BHARATSTOCKAPI"
    assert norm.previous_close is not None
    assert norm.change is not None


# ==============================================================================
# 3. HTTP Error Handling & Status Codes
# ==============================================================================

@pytest.mark.asyncio
async def test_invalid_api_key_401():
    """Verify 401 Unauthorized raises TradeXException with PROVIDER_AUTH_ERROR."""
    provider = BharatStockAPIProvider()
    mock_resp = httpx.Response(
        status_code=401,
        json={"detail": "Invalid or inactive API key."},
        request=httpx.Request("GET", "https://bharatstockapi.com/v1/stocks/RELIANCE"),
    )

    with patch.object(settings, "MARKET_DATA_API_KEY", "invalid_key"):
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
            with pytest.raises(TradeXException) as exc_info:
                await provider._make_request("v1/stocks/RELIANCE")
            assert exc_info.value.status_code == 401
            assert exc_info.value.code == "PROVIDER_AUTH_ERROR"


@pytest.mark.asyncio
async def test_access_forbidden_403():
    """Verify 403 Forbidden raises PROVIDER_FORBIDDEN."""
    provider = BharatStockAPIProvider()
    mock_resp = httpx.Response(
        status_code=403,
        json={"detail": "Forbidden."},
        request=httpx.Request("GET", "https://bharatstockapi.com/v1/stocks/RELIANCE"),
    )

    with patch.object(settings, "MARKET_DATA_API_KEY", "key"):
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
            with pytest.raises(TradeXException) as exc_info:
                await provider._make_request("v1/stocks/RELIANCE")
            assert exc_info.value.status_code == 403
            assert exc_info.value.code == "PROVIDER_FORBIDDEN"


@pytest.mark.asyncio
async def test_rate_limit_429():
    """Verify 429 Too Many Requests raises PROVIDER_RATE_LIMIT."""
    provider = BharatStockAPIProvider()
    mock_resp = httpx.Response(
        status_code=429,
        json={"detail": "Daily rate limit of 50 requests exceeded for plan 'free'."},
        request=httpx.Request("GET", "https://bharatstockapi.com/v1/stocks/RELIANCE"),
    )

    with patch.object(settings, "MARKET_DATA_API_KEY", "key"):
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
            with pytest.raises(TradeXException) as exc_info:
                await provider._make_request("v1/stocks/RELIANCE")
            assert exc_info.value.status_code == 429
            assert exc_info.value.code == "PROVIDER_RATE_LIMIT"


@pytest.mark.asyncio
async def test_request_timeout_504():
    """Verify request timeout raises PROVIDER_TIMEOUT."""
    provider = BharatStockAPIProvider()

    with patch.object(settings, "MARKET_DATA_API_KEY", "key"):
        with patch("httpx.AsyncClient.get", side_effect=httpx.TimeoutException("Connection timed out")):
            with pytest.raises(TradeXException) as exc_info:
                await provider._make_request("v1/stocks/RELIANCE")
            assert exc_info.value.status_code == 504
            assert exc_info.value.code == "PROVIDER_TIMEOUT"


@pytest.mark.asyncio
async def test_malformed_json_response_502():
    """Verify invalid JSON payload raises PROVIDER_MALFORMED_RESPONSE."""
    provider = BharatStockAPIProvider()
    mock_resp = httpx.Response(
        status_code=200,
        content=b"<html>Internal Cloudflare Error</html>",
        headers={"Content-Type": "text/html"},
        request=httpx.Request("GET", "https://bharatstockapi.com/v1/stocks/RELIANCE"),
    )

    with patch.object(settings, "MARKET_DATA_API_KEY", "key"):
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
            with pytest.raises(TradeXException) as exc_info:
                await provider._make_request("v1/stocks/RELIANCE")
            assert exc_info.value.status_code == 502
            assert exc_info.value.code == "PROVIDER_MALFORMED_RESPONSE"


@pytest.mark.asyncio
async def test_symbol_not_found_returns_none():
    """Verify unknown symbol (404) returns None without crashing."""
    provider = BharatStockAPIProvider()
    mock_resp = httpx.Response(
        status_code=404,
        json={"detail": "Ticker not found."},
        request=httpx.Request("GET", "https://bharatstockapi.com/v1/stocks/NONEXISTENT"),
    )

    with patch.object(settings, "MARKET_DATA_API_KEY", "key"):
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
            quote = await provider.get_quote("NONEXISTENT")
            assert quote is None


# ==============================================================================
# 4. Provider Fallback & Redis Caching
# ==============================================================================

@pytest.mark.asyncio
async def test_quote_service_fallback_when_upstox_requires_auth():
    """
    Test architecture priority:
    1. Primary Upstox raises UpstoxAuthRequiredError
    2. Fallback BharatStockAPI is called
    3. Returned quote has status='FALLBACK' and source='BHARATSTOCKAPI'
    4. Quote is stored in cache
    """
    mock_bharat_quote = {
        "symbol": "RELIANCE",
        "close": 2950.00,
        "change_pct": 1.5,
        "found": True,
    }

    with patch.object(settings, "MARKET_DATA_API_KEY", "mock_key_live"):
        with patch(
            "app.services.market_data.upstox_provider.upstox_provider.get_quotes",
            side_effect=UpstoxAuthRequiredError("Token expired"),
        ):
            with patch.object(
                bharatstock_provider,
                "_make_request",
                new_callable=AsyncMock,
                return_value=[mock_bharat_quote],
            ):
                quote = await quote_service.get_quote("RELIANCE")

                assert quote is not None
                assert quote.symbol == "RELIANCE"
                assert quote.ltp == Decimal("2950.00")
                assert quote.status == "FALLBACK"
                assert quote.source == "BHARATSTOCKAPI"

                # Verify quote is now in cache and immediately returned without calling provider again
                cached = await quote_service.get_quote("RELIANCE")
                assert cached is not None
                assert cached.ltp == Decimal("2950.00")
                assert cached.status == "FALLBACK"


@pytest.mark.asyncio
async def test_upstox_remains_primary_when_available():
    """Verify that when Upstox returns valid quotes, BharatStockAPI is NOT invoked."""
    from app.services.market_data.normalizer import normalize_upstox_quote

    upstox_raw = {
        "last_price": 3100.0,
        "ohlc": {"open": 3080.0, "high": 3120.0, "low": 3070.0, "close": 3100.0},
        "cp": 3050.0,
        "volume": 500000,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    upstox_norm = normalize_upstox_quote("NSE_EQ|INE467B01029", upstox_raw, symbol_override="TCS")

    with patch.object(settings, "MARKET_DATA_API_KEY", "mock_key_live"):
        with patch(
            "app.services.market_data.upstox_provider.upstox_provider.get_quotes",
            new_callable=AsyncMock,
            return_value={"NSE_EQ|INE467B01029": upstox_norm},
        ) as mock_upstox:
            with patch.object(
                bharatstock_provider,
                "get_quotes",
                new_callable=AsyncMock,
            ) as mock_bharat:
                quotes = await quote_service.get_quotes(["TCS"])

                assert "TCS" in quotes
                assert quotes["TCS"].ltp == Decimal("3100.0")
                assert quotes["TCS"].source == "UPSTOX"
                assert quotes["TCS"].status == "LIVE"

                # Upstox was called
                mock_upstox.assert_called_once()
                # BharatStockAPI was NOT called
                mock_bharat.assert_not_called()


@pytest.mark.asyncio
async def test_both_providers_unavailable_returns_honest_empty():
    """Verify that when both Upstox and BharatStockAPI fail, no fake/mock values are used."""
    with patch.object(settings, "MARKET_DATA_API_KEY", "mock_key_live"):
        with patch(
            "app.services.market_data.upstox_provider.upstox_provider.get_quotes",
            side_effect=UpstoxAuthRequiredError("Token expired"),
        ):
            with patch.object(
                bharatstock_provider,
                "_make_request",
                side_effect=TradeXException(code="PROVIDER_ERROR", message="API offline", status_code=502),
            ):
                quote = await quote_service.get_quote("INFY")
                assert quote is None


# ==============================================================================
# 5. Candlestick Normalization & Fallback
# ==============================================================================

def test_bharatstock_candle_normalization():
    """Verify normalization of BharatStock daily price row into CandleData."""
    raw_row = {
        "trade_date": "2026-08-12",
        "open": 1410.0,
        "high": 1428.5,
        "low": 1405.2,
        "close": 1421.35,
        "adjusted_close": 1421.35,
        "volume": 8452110,
    }

    candle = normalize_bharatstock_candle(raw_row)
    assert candle.open == Decimal("1410.0")
    assert candle.high == Decimal("1428.5")
    assert candle.low == Decimal("1405.2")
    assert candle.close == Decimal("1421.35")
    assert candle.volume == 8452110


@pytest.mark.asyncio
async def test_candle_service_fallback_to_bharatstock():
    """Verify candle_service falls back to BharatStockAPI when Upstox fails."""
    mock_candles_raw = [
        {"trade_date": "2026-08-11", "open": 1400.0, "high": 1415.0, "low": 1395.0, "close": 1408.0, "volume": 5000000},
        {"trade_date": "2026-08-12", "open": 1410.0, "high": 1428.5, "low": 1405.2, "close": 1421.35, "volume": 8452110},
    ]

    with patch.object(settings, "MARKET_DATA_API_KEY", "mock_key_live"):
        with patch(
            "app.services.market_data.upstox_provider.upstox_provider.get_historical_candles",
            side_effect=UpstoxAuthRequiredError("Token expired"),
        ):
            with patch.object(
                bharatstock_provider,
                "_make_request",
                new_callable=AsyncMock,
                return_value=mock_candles_raw,
            ):
                candles = await candle_service.get_candles(
                    symbol_or_key="RELIANCE",
                    interval="1D",
                    from_date="2026-08-01",
                    to_date="2026-08-12",
                )

                assert len(candles) == 2
                assert candles[0].close == Decimal("1408.0")
                assert candles[1].close == Decimal("1421.35")


# ==============================================================================
# 6. Market API Endpoints (/v1/market/status, /movers, /ticker)
# ==============================================================================

@pytest.mark.asyncio
async def test_market_status_endpoint(client: AsyncClient):
    """Verify GET /api/v1/market/status returns dual provider telemetry."""
    res = await client.get("/api/v1/market/status")
    assert res.status_code == 200
    data = res.json()
    assert "architecture" in data
    assert data["architecture"]["primary"] == "UPSTOX"
    assert data["architecture"]["fallback"] == "BHARATSTOCKAPI"
    assert "providers" in data
    assert "upstox" in data["providers"]
    assert "bharatstock" in data["providers"]


@pytest.mark.asyncio
async def test_market_movers_fallback(client: AsyncClient):
    """Verify GET /api/v1/market/movers falls back to BharatStockAPI /v1/movers."""
    mock_gainers = [
        {"symbol": "SWARAJ", "company_name": "Swaraj Engines", "close": 2840.0, "prev_close": 2607.5, "change_pct": 8.92, "volume": 312440}
    ]

    with patch.object(settings, "MARKET_DATA_API_KEY", "mock_key_live"):
        with patch("app.services.market_data.quote_service.quote_service.get_quotes", return_value={}):
            with patch.object(
                bharatstock_provider,
                "get_movers",
                new_callable=AsyncMock,
                return_value=[
                    {
                        "symbol": "SWARAJ",
                        "name": "Swaraj Engines",
                        "exchange": "NSE",
                        "price": 2840.0,
                        "ltp": 2840.0,
                        "change": 232.5,
                        "change_percent": 8.92,
                        "is_positive": True,
                        "volume": 312440,
                        "status": "FALLBACK",
                        "source": "BHARATSTOCKAPI",
                    }
                ],
            ):
                res = await client.get("/api/v1/market/movers")
                assert res.status_code == 200
                data = res.json()
                assert data["provider"] == "BHARATSTOCKAPI"
                assert data["status"] == "FALLBACK"
                assert len(data["gainers"]) > 0
                assert data["gainers"][0]["symbol"] == "SWARAJ"


@pytest.mark.asyncio
async def test_bharatstock_get_fundamentals():
    """Verify get_fundamentals fetches ratios, falls back to stock detail, and caches."""
    mock_ratios = {
        "as_of_date": "2026-09-25",
        "market_cap": 16590232000000.0,
        "pe_ratio": 22.2,
        "pb_ratio": 1.53,
        "eps": 55.22,
        "roe": 8.82,
        "roce": 9.18,
        "dividend_yield": 0.49,
    }
    mock_detail = {
        "symbol": "RELIANCE",
        "latest_price": {"volume": 13138735},
    }

    with patch.object(settings, "MARKET_DATA_API_KEY", "mock_key_123"):
        with patch.object(bharatstock_provider, "_make_request") as mock_req:
            mock_req.side_effect = [mock_ratios, mock_detail]
            fund = await bharatstock_provider.get_fundamentals("RELIANCE")
            assert fund is not None
            assert fund["symbol"] == "RELIANCE"
            assert fund["market_cap"] == 16590232000000.0
            assert fund["pe_ratio"] == 22.2
            assert fund["pb_ratio"] == 1.53
            assert fund["roe"] == 8.82
            assert fund["roce"] == 9.18
            assert fund["eps"] == 55.22
            assert fund["dividend_yield"] == 0.49
            assert fund["volume"] == 13138735
            assert fund["source"] == "BHARATSTOCKAPI"


@pytest.mark.asyncio
async def test_stock_detail_with_fundamentals(client: AsyncClient):
    """Verify GET /api/v1/stocks/{symbol} populates fundamental metrics in StockDetailResponse."""
    mock_fund = {
        "symbol": "RELIANCE",
        "market_cap": 16590232000000.0,
        "pe_ratio": 22.2,
        "pb_ratio": 1.53,
        "roe": 8.82,
        "roce": 9.18,
        "eps": 55.22,
        "dividend_yield": 0.49,
        "volume": 13138735,
        "source": "BHARATSTOCKAPI",
    }
    with patch.object(bharatstock_provider, "get_fundamentals", new_callable=AsyncMock, return_value=mock_fund):
        res = await client.get("/api/v1/stocks/RELIANCE")
        assert res.status_code == 200
        data = res.json()
        assert data["symbol"] == "RELIANCE"
        assert float(data["market_cap"]) == 16590232000000.0
        assert float(data["pe_ratio"]) == 22.2
        assert float(data["pb_ratio"]) == 1.53
        assert float(data["roe"]) == 8.82
        assert float(data["roce"]) == 9.18
        assert float(data["eps"]) == 55.22
        assert float(data["dividend_yield"]) == 0.49
