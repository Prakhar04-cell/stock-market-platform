import time
from collections import defaultdict
from typing import Callable, Optional
from fastapi import Request, status
from app.core.exceptions import RateLimitExceededError
from app.core.redis import get_redis_client

# In-memory fallback if Redis is unreachable
_memory_limiter = defaultdict(list)


class RateLimiter:
    """Redis-backed rate limiter with sliding window, falling back to in-memory."""

    def __init__(self, max_requests: int, window_seconds: int, key_prefix: str = "rate"):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.key_prefix = key_prefix

    async def __call__(self, request: Request):
        # Identify caller via IP or user ID if authenticated
        client_ip = request.client.host if request.client else "unknown"
        user_id = getattr(request.state, "user_id", None)
        identifier = user_id or client_ip
        path = request.url.path
        key = f"tradex:ratelimit:{self.key_prefix}:{identifier}:{path}"

        now = time.time()
        client = await get_redis_client()

        if client:
            try:
                # Redis sliding window pipeline
                pipe = client.pipeline()
                pipe.zremrangebyscore(key, 0, now - self.window_seconds)
                pipe.zadd(key, {str(now): now})
                pipe.zcard(key)
                pipe.expire(key, self.window_seconds)
                results = await pipe.execute()
                request_count = results[2]

                if request_count > self.max_requests:
                    raise RateLimitExceededError(
                        message=f"Rate limit exceeded. Maximum {self.max_requests} requests per {self.window_seconds}s."
                    )
                return
            except RateLimitExceededError:
                raise
            except Exception:
                # Redis command failed, proceed to in-memory fallback
                pass

        # In-memory sliding window fallback
        timestamps = _memory_limiter[key]
        cutoff = now - self.window_seconds
        _memory_limiter[key] = [t for t in timestamps if t > cutoff]
        _memory_limiter[key].append(now)

        if len(_memory_limiter[key]) > self.max_requests:
            raise RateLimitExceededError(
                message=f"Rate limit exceeded. Maximum {self.max_requests} requests per {self.window_seconds}s."
            )


# Pre-configured dependencies for common endpoints
login_rate_limiter = RateLimiter(max_requests=5, window_seconds=60, key_prefix="login")
auth_rate_limiter = RateLimiter(max_requests=10, window_seconds=60, key_prefix="auth")
admin_rate_limiter = RateLimiter(max_requests=60, window_seconds=60, key_prefix="admin")
standard_rate_limiter = RateLimiter(max_requests=120, window_seconds=60, key_prefix="api")
