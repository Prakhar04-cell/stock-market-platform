"""Marketaux Financial News Service.

Fetches, validates, deduplicates, and caches financial news headlines from Marketaux
(https://api.marketaux.com/v1/news/all).

Implements strict server-side API token protection, Upstash Redis caching with
in-memory fallback, and graceful handling of rate limits and unconfigured credentials.
"""

import html
import json
import logging
import time
import urllib.parse
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.redis import get_redis_client

logger = logging.getLogger("bullrun.news")

# Secondary in-memory cache fallback in case Redis is unreachable
# Key -> (expire_timestamp, payload_dict)
_in_memory_news_cache: Dict[str, tuple[float, Dict[str, Any]]] = {}


class NewsHeadlineItem(BaseModel):
    id: str
    headline: str
    publisher: str
    published_at: str
    original_url: str
    related_symbols: List[str] = Field(default_factory=list)


class NewsFeedResponse(BaseModel):
    items: List[NewsHeadlineItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    limit: int = 10
    cached: bool = False
    provider: str = "Marketaux"
    status: str = "ok"  # "ok" | "no_token" | "rate_limited" | "invalid_token" | "provider_error" | "empty"
    message: Optional[str] = None
    retrieved_at: str


def _clean_publisher(source: Optional[str], original_url: str) -> str:
    """Returns clean publisher name or extracts domain hostname fallback."""
    if source and source.strip():
        cleaned = source.strip()
        # Clean domain prefixes if source looks like 'economictimes.indiatimes.com'
        if "." in cleaned and not (" " in cleaned):
            cleaned = cleaned.replace("www.", "")
        return cleaned

    if original_url:
        try:
            parsed = urllib.parse.urlparse(original_url)
            host = parsed.netloc.replace("www.", "").strip()
            if host:
                return host
        except Exception:
            pass

    return "Market News"


def _extract_related_symbols(entities: List[Dict[str, Any]]) -> List[str]:
    """Extracts deduplicated stock symbols from Marketaux entity list."""
    symbols: List[str] = []
    if not isinstance(entities, list):
        return symbols

    for entity in entities:
        if isinstance(entity, dict):
            raw_sym = entity.get("symbol")
            if raw_sym and isinstance(raw_sym, str):
                # Normalize 'RELIANCE.NS' -> 'RELIANCE'
                clean = raw_sym.split(".")[0].strip().upper()
                if clean and clean not in symbols:
                    symbols.append(clean)
    return symbols


class MarketauxNewsService:
    def __init__(self):
        self.base_url = settings.MARKETAUX_API_BASE_URL.rstrip("/")
        self.timeout = 8.0  # seconds

    def _build_cache_key(self, symbol: Optional[str], limit: int, page: int) -> str:
        if symbol:
            clean = symbol.strip().upper()
            return f"bullrun:news:symbol:{clean}:limit={limit}:page={page}"
        return f"bullrun:news:general:limit={limit}:page={page}"

    async def _get_from_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Attempt to read from Upstash Redis, falling back to in-memory cache."""
        now = time.time()

        # 1. Try Upstash Redis
        try:
            redis = await get_redis_client()
            if redis is not None:
                cached_json = await redis.get(cache_key)
                if cached_json:
                    data = json.loads(cached_json)
                    data["cached"] = True
                    return data
        except Exception as e:
            logger.debug(f"Redis cache lookup failed for {cache_key}: {e}")

        # 2. Try in-memory fallback
        if cache_key in _in_memory_news_cache:
            exp_time, data = _in_memory_news_cache[cache_key]
            if now < exp_time:
                data_copy = dict(data)
                data_copy["cached"] = True
                return data_copy
            else:
                _in_memory_news_cache.pop(cache_key, None)

        return None

    async def _save_to_cache(self, cache_key: str, data: Dict[str, Any]):
        """Persist response into Redis and in-memory fallback."""
        ttl = getattr(settings, "NEWS_CACHE_TTL_SECONDS", 600)
        now = time.time()

        # Update in-memory fallback
        _in_memory_news_cache[cache_key] = (now + ttl, dict(data))

        # Update Redis
        try:
            redis = await get_redis_client()
            if redis is not None:
                data_to_store = dict(data)
                data_to_store["cached"] = True
                await redis.set(cache_key, json.dumps(data_to_store), ex=ttl)
        except Exception as e:
            logger.debug(f"Redis cache save failed for {cache_key}: {e}")

    async def get_news_feed(
        self,
        symbol: Optional[str] = None,
        limit: int = 10,
        page: int = 1,
    ) -> NewsFeedResponse:
        """Fetch stock market news headlines with caching and graceful fallbacks."""
        clean_symbol = symbol.strip().upper() if symbol and symbol.strip() else None
        bounded_limit = min(max(int(limit), 1), 20)
        bounded_page = max(int(page), 1)

        cache_key = self._build_cache_key(clean_symbol, bounded_limit, bounded_page)
        retrieved_at = datetime.now(timezone.utc).isoformat()

        # 1. Check Cache
        cached_result = await self._get_from_cache(cache_key)
        if cached_result:
            return NewsFeedResponse(**cached_result)

        # 2. Check API Token
        token = settings.MARKETAUX_API_TOKEN.strip() if settings.MARKETAUX_API_TOKEN else ""
        if not token:
            logger.info("MARKETAUX_API_TOKEN is not configured; returning unconfigured response.")
            return NewsFeedResponse(
                items=[],
                total=0,
                page=bounded_page,
                limit=bounded_limit,
                cached=False,
                provider="Marketaux",
                status="no_token",
                message=(
                    "Marketaux API token is not configured on the backend server. "
                    "Configure MARKETAUX_API_TOKEN in Render environment settings to enable live financial headlines."
                ),
                retrieved_at=retrieved_at,
            )

        # 3. Build Marketaux request parameters
        params: Dict[str, Any] = {
            "api_token": token,
            "language": "en",
            "limit": bounded_limit,
            "page": bounded_page,
        }

        if clean_symbol:
            # Query the equity symbol with both raw ticker and National Stock Exchange (.NS) suffix
            params["symbols"] = f"{clean_symbol},{clean_symbol}.NS"
        else:
            # General Indian stock market news
            params["countries"] = "in"
            params["filter_entities"] = "true"

        url = f"{self.base_url}/news/all"

        # 4. Execute HTTP Request
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(url, params=params)

                if resp.status_code == 200:
                    payload = resp.json()
                    raw_articles = payload.get("data", [])
                    meta = payload.get("meta", {})

                    items: List[NewsHeadlineItem] = []
                    seen_urls = set()
                    seen_ids = set()

                    for article in raw_articles:
                        if not isinstance(article, dict):
                            continue

                        article_url = (article.get("url") or "").strip()
                        article_uuid = str(article.get("uuid") or article.get("id") or "")
                        title = html.unescape(article.get("title") or "").strip()

                        # Deduplicate by URL or UUID
                        if not title or not article_url:
                            continue
                        if article_url in seen_urls:
                            continue
                        if article_uuid and article_uuid in seen_ids:
                            continue

                        seen_urls.add(article_url)
                        if article_uuid:
                            seen_ids.add(article_uuid)

                        publisher = _clean_publisher(article.get("source"), article_url)
                        published_at = article.get("published_at") or retrieved_at
                        related_symbols = _extract_related_symbols(article.get("entities", []))

                        item_id = article_uuid if article_uuid else str(uuid.uuid5(uuid.NAMESPACE_URL, article_url))

                        items.append(
                            NewsHeadlineItem(
                                id=item_id,
                                headline=title,
                                publisher=publisher,
                                published_at=published_at,
                                original_url=article_url,
                                related_symbols=related_symbols,
                            )
                        )

                    total_count = meta.get("found", len(items))
                    status_str = "ok" if items else "empty"
                    empty_msg = None
                    if not items:
                        empty_msg = (
                            f"No recent news articles found for {clean_symbol}."
                            if clean_symbol
                            else "No Indian stock market news articles found at this time."
                        )

                    response_obj = NewsFeedResponse(
                        items=items,
                        total=total_count,
                        page=bounded_page,
                        limit=bounded_limit,
                        cached=False,
                        provider="Marketaux",
                        status=status_str,
                        message=empty_msg,
                        retrieved_at=retrieved_at,
                    )

                    # Persist valid responses into cache
                    await self._save_to_cache(cache_key, response_obj.model_dump())
                    return response_obj

                elif resp.status_code == 429:
                    logger.warning("Marketaux API quota exhausted or rate limit reached (429).")
                    return NewsFeedResponse(
                        items=[],
                        total=0,
                        page=bounded_page,
                        limit=bounded_limit,
                        cached=False,
                        provider="Marketaux",
                        status="rate_limited",
                        message=(
                            "Marketaux API daily quota reached (free plan limit is 100 requests/day). "
                            "Live news updates will resume when the daily quota resets."
                        ),
                        retrieved_at=retrieved_at,
                    )

                elif resp.status_code in (401, 403):
                    logger.error(f"Marketaux API authentication failed (HTTP {resp.status_code}).")
                    return NewsFeedResponse(
                        items=[],
                        total=0,
                        page=bounded_page,
                        limit=bounded_limit,
                        cached=False,
                        provider="Marketaux",
                        status="invalid_token",
                        message="Marketaux API token is invalid or expired. Check credentials.",
                        retrieved_at=retrieved_at,
                    )

                else:
                    logger.warning(f"Marketaux returned non-200 HTTP {resp.status_code}: {resp.text[:200]}")
                    return NewsFeedResponse(
                        items=[],
                        total=0,
                        page=bounded_page,
                        limit=bounded_limit,
                        cached=False,
                        provider="Marketaux",
                        status="provider_error",
                        message=f"Financial news provider returned HTTP {resp.status_code}.",
                        retrieved_at=retrieved_at,
                    )

        except (httpx.TimeoutException, httpx.ConnectTimeout):
            logger.warning("Marketaux request timed out.")
            return NewsFeedResponse(
                items=[],
                total=0,
                page=bounded_page,
                limit=bounded_limit,
                cached=False,
                provider="Marketaux",
                status="provider_error",
                message="Financial news service request timed out.",
                retrieved_at=retrieved_at,
            )

        except Exception as e:
            logger.error(f"Error fetching Marketaux news: {e}", exc_info=True)
            return NewsFeedResponse(
                items=[],
                total=0,
                page=bounded_page,
                limit=bounded_limit,
                cached=False,
                provider="Marketaux",
                status="provider_error",
                message="Financial news service temporarily unavailable.",
                retrieved_at=retrieved_at,
            )


news_service = MarketauxNewsService()
