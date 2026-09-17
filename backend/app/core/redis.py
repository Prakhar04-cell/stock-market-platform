import logging
import time
from typing import Optional, Any
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger("tradex.redis")

redis_client: Optional[aioredis.Redis] = None


async def get_redis_client() -> Optional[aioredis.Redis]:
    """Retrieve the singleton async Redis client or initialize connection."""
    global redis_client
    if redis_client is None:
        try:
            # Build connection URL
            url = settings.REDIS_URL
            redis_client = aioredis.from_url(
                url,
                encoding="utf-8",
                decode_responses=True,
                socket_timeout=5.0,
                socket_connect_timeout=5.0,
                retry_on_timeout=True,
            )
        except Exception as e:
            logger.warning(f"Could not connect to Redis: {e}")
            return None
    return redis_client


async def close_redis():
    """Close Redis connection pool gracefully on shutdown."""
    global redis_client
    if redis_client:
        try:
            await redis_client.aclose()
        except Exception:
            pass
        redis_client = None


async def check_redis_health() -> bool:
    """Check Redis health by pinging."""
    try:
        client = await get_redis_client()
        if client is None:
            return False
        response = await client.ping()
        return response is True or response == "PONG" or response == b"PONG"
    except Exception as e:
        logger.debug(f"Redis health check failed: {e}")
        return False


async def test_redis_operations() -> tuple[bool, str]:
    """Verify ping, set, get, and delete operations."""
    try:
        client = await get_redis_client()
        if client is None:
            return False, "Redis client could not be initialized"

        # 1. Ping
        ping_res = await client.ping()
        if not ping_res:
            return False, "Ping failed"

        # 2. Set & Get
        test_key = "tradex_infra_probe"
        test_val = f"probe_val_{int(time.time())}"
        await client.set(test_key, test_val, ex=30)
        retrieved = await client.get(test_key)

        if retrieved != test_val:
            return False, f"Value mismatch: expected {test_val}, got {retrieved}"

        # 3. Clean up
        await client.delete(test_key)
        return True, "Ping, Set, Get, Delete verified successfully"
    except Exception as e:
        logger.warning(f"Redis operation test error: {e}")
        return False, str(e)
