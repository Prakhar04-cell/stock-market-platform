"""Market News API Route.

Exposes clean, lightweight financial headlines powered by Marketaux, with
server-side caching, deduplication, and zero exposure of third-party credentials.
"""

from typing import Optional
from fastapi import APIRouter, Query

from app.services.marketaux_service import (
    NewsFeedResponse,
    news_service,
)

router = APIRouter(prefix="/news", tags=["Market News"])


@router.get("", response_model=NewsFeedResponse, summary="Get latest stock market headlines")
async def get_market_news(
    symbol: Optional[str] = Query(
        None,
        description="Filter news headlines by specific equity ticker (e.g. RELIANCE, TCS, INFY)",
    ),
    limit: int = Query(
        10,
        ge=1,
        le=50,
        description="Number of headlines to return (bounded to max 20 for free tier efficiency)",
    ),
    page: int = Query(
        1,
        ge=1,
        description="Pagination page number",
    ),
) -> NewsFeedResponse:
    """Retrieve financial news headlines.

    - Returns headline, publisher, published timestamp, original URL, and related tickers.
    - Caches responses in Upstash Redis to respect provider rate limits (100 req/day).
    - If MARKETAUX_API_TOKEN is not configured, returns a graceful unconfigured status rather than failing.
    """
    return await news_service.get_news_feed(symbol=symbol, limit=limit, page=page)
