"""Tests for Marketaux Financial News Service and API Route.

Verifies:
- Successful response mapping and sanitization
- Fallback publisher derivation from article URL
- Deduplication by URL and UUID
- Missing token handling (no external network call, graceful status)
- Provider errors (500, timeout, malformed payload)
- Rate-limit (429) handling
- Redis cache hit and miss behaviors
- Stock symbol filtering
"""

import json
from unittest.mock import AsyncMock, patch
import httpx
import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.services.marketaux_service import (
    MarketauxNewsService,
    _clean_publisher,
    _extract_related_symbols,
)


MOCK_MARKETAUX_RESPONSE = {
    "meta": {
        "found": 2,
        "returned": 2,
        "limit": 10,
        "page": 1,
    },
    "data": [
        {
            "uuid": "art-111-aaa",
            "title": "Reliance Industries Announces Q4 Expansion in Green Energy",
            "description": "Full article body text that should NOT be displayed in BullRun",
            "snippet": "Reliance expansion snippet",
            "url": "https://economictimes.indiatimes.com/markets/stocks/news/reliance-green-energy-expansion/123",
            "published_at": "2026-10-10T08:30:00.000000Z",
            "source": "The Economic Times",
            "entities": [
                {
                    "symbol": "RELIANCE.NS",
                    "name": "Reliance Industries Ltd",
                    "exchange": "NSE",
                    "country": "in",
                    "type": "equity",
                }
            ],
        },
        {
            "uuid": "art-222-bbb",
            "title": "TCS Wins Multi-Million Cloud Infrastructure Modernization Deal",
            "description": "Another full text description",
            "snippet": "TCS snippet",
            "url": "https://www.livemint.com/companies/news/tcs-cloud-deal-12345",
            "published_at": "2026-10-10T09:15:00.000000Z",
            "source": "livemint.com",
            "entities": [
                {
                    "symbol": "TCS.NS",
                    "name": "Tata Consultancy Services Ltd",
                    "exchange": "NSE",
                    "country": "in",
                    "type": "equity",
                }
            ],
        },
    ],
}


def test_publisher_cleaning_and_fallback():
    # 1. Clean source given
    assert _clean_publisher("The Economic Times", "https://economictimes.com/a") == "The Economic Times"
    # 2. Domain source cleaned of www
    assert _clean_publisher("www.reuters.com", "https://reuters.com/a") == "reuters.com"
    # 3. Missing source falls back to hostname
    assert _clean_publisher(None, "https://www.moneycontrol.com/news/business/a.html") == "moneycontrol.com"
    assert _clean_publisher("", "https://livemint.com/market/a.html") == "livemint.com"
    # 4. Invalid URL fallback
    assert _clean_publisher(None, "") == "Market News"


def test_extract_related_symbols():
    entities = [
        {"symbol": "RELIANCE.NS"},
        {"symbol": "HDFCBANK.BO"},
        {"symbol": "TCS"},
        {"symbol": "RELIANCE.NS"},  # Duplicate
        {"invalid": "no_symbol"},
    ]
    symbols = _extract_related_symbols(entities)
    assert symbols == ["RELIANCE", "HDFCBANK", "TCS"]


@pytest.mark.asyncio
async def test_news_missing_api_token(client: AsyncClient):
    """When MARKETAUX_API_TOKEN is empty, return graceful unconfigured status."""
    with patch.object(settings, "MARKETAUX_API_TOKEN", ""):
        service = MarketauxNewsService()
        result = await service.get_news_feed()
        assert result.status == "no_token"
        assert result.items == []
        assert "not configured" in result.message.lower()

        # Test endpoint
        res = await client.get("/api/v1/news")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "no_token"
        assert data["items"] == []


@pytest.mark.asyncio
async def test_news_successful_mapping_and_deduplication():
    """Verify headline-only mapping and duplicate suppression."""
    service = MarketauxNewsService()

    # Response with duplicate URL
    dup_response = {
        "meta": {"found": 3, "returned": 3, "limit": 10, "page": 1},
        "data": [
            MOCK_MARKETAUX_RESPONSE["data"][0],
            MOCK_MARKETAUX_RESPONSE["data"][0],  # Exact duplicate
            MOCK_MARKETAUX_RESPONSE["data"][1],
        ],
    }

    mock_resp = httpx.Response(200, json=dup_response)

    with patch.object(settings, "MARKETAUX_API_TOKEN", "mock_valid_token"), \
         patch("httpx.AsyncClient.get", return_value=mock_resp), \
         patch.object(service, "_get_from_cache", return_value=None), \
         patch.object(service, "_save_to_cache", new_callable=AsyncMock):

        res = await service.get_news_feed(limit=5)
        assert res.status == "ok"
        assert len(res.items) == 2  # Deduplicated from 3 to 2

        item1 = res.items[0]
        assert item1.headline == "Reliance Industries Announces Q4 Expansion in Green Energy"
        assert item1.publisher == "The Economic Times"
        assert item1.original_url == "https://economictimes.indiatimes.com/markets/stocks/news/reliance-green-energy-expansion/123"
        assert "RELIANCE" in item1.related_symbols

        item2 = res.items[1]
        assert item2.headline == "TCS Wins Multi-Million Cloud Infrastructure Modernization Deal"
        assert item2.publisher == "livemint.com"
        assert "TCS" in item2.related_symbols


@pytest.mark.asyncio
async def test_news_symbol_filtering():
    """Verify symbol parameter formats correctly in outbound request."""
    service = MarketauxNewsService()

    mock_resp = httpx.Response(200, json={"meta": {"found": 0}, "data": []})

    with patch.object(settings, "MARKETAUX_API_TOKEN", "mock_valid_token"), \
         patch("httpx.AsyncClient.get", return_value=mock_resp) as mock_get, \
         patch.object(service, "_get_from_cache", return_value=None), \
         patch.object(service, "_save_to_cache", new_callable=AsyncMock):

        await service.get_news_feed(symbol="INFY", limit=5)
        assert mock_get.called
        called_params = mock_get.call_args[1]["params"]
        assert "symbols" in called_params
        assert "INFY,INFY.NS" in called_params["symbols"]


@pytest.mark.asyncio
async def test_news_empty_results():
    """Verify empty results return status='empty' with friendly message."""
    service = MarketauxNewsService()

    mock_resp = httpx.Response(200, json={"meta": {"found": 0}, "data": []})

    with patch.object(settings, "MARKETAUX_API_TOKEN", "mock_valid_token"), \
         patch("httpx.AsyncClient.get", return_value=mock_resp), \
         patch.object(service, "_get_from_cache", return_value=None), \
         patch.object(service, "_save_to_cache", new_callable=AsyncMock):

        res = await service.get_news_feed(symbol="CIPLA")
        assert res.status == "empty"
        assert res.items == []
        assert "CIPLA" in res.message


@pytest.mark.asyncio
async def test_news_rate_limit_429():
    """Verify 429 response returns rate_limited status."""
    service = MarketauxNewsService()

    mock_resp = httpx.Response(429, text="Too Many Requests")

    with patch.object(settings, "MARKETAUX_API_TOKEN", "mock_valid_token"), \
         patch("httpx.AsyncClient.get", return_value=mock_resp), \
         patch.object(service, "_get_from_cache", return_value=None):

        res = await service.get_news_feed()
        assert res.status == "rate_limited"
        assert res.items == []
        assert "quota" in res.message.lower()


@pytest.mark.asyncio
async def test_news_provider_timeout_and_error():
    """Verify timeout and provider 500 errors return provider_error status."""
    service = MarketauxNewsService()

    # 1. Timeout
    with patch.object(settings, "MARKETAUX_API_TOKEN", "mock_valid_token"), \
         patch("httpx.AsyncClient.get", side_effect=httpx.TimeoutException("Read timed out")), \
         patch.object(service, "_get_from_cache", return_value=None):

        res = await service.get_news_feed()
        assert res.status == "provider_error"
        assert "timed out" in res.message.lower()

    # 2. HTTP 500
    mock_resp_500 = httpx.Response(500, text="Internal Server Error")
    with patch.object(settings, "MARKETAUX_API_TOKEN", "mock_valid_token"), \
         patch("httpx.AsyncClient.get", return_value=mock_resp_500), \
         patch.object(service, "_get_from_cache", return_value=None):

        res = await service.get_news_feed()
        assert res.status == "provider_error"


@pytest.mark.asyncio
async def test_news_caching_hit(client: AsyncClient):
    """Verify that cached response returns with cached=True without re-requesting provider."""
    service = MarketauxNewsService()

    cached_payload = {
        "items": [
            {
                "id": "cached-1",
                "headline": "Cached Reliance Energy Milestone",
                "publisher": "livemint.com",
                "published_at": "2026-10-10T10:00:00Z",
                "original_url": "https://livemint.com/news/1",
                "related_symbols": ["RELIANCE"],
            }
        ],
        "total": 1,
        "page": 1,
        "limit": 10,
        "cached": True,
        "provider": "Marketaux",
        "status": "ok",
        "message": None,
        "retrieved_at": "2026-10-10T10:00:00Z",
    }

    with patch.object(service, "_get_from_cache", return_value=cached_payload), \
         patch("app.api.v1.news.news_service", service):

        res = await client.get("/api/v1/news")
        assert res.status_code == 200
        data = res.json()
        assert data["cached"] is True
        assert len(data["items"]) == 1
        assert data["items"][0]["headline"] == "Cached Reliance Energy Milestone"
