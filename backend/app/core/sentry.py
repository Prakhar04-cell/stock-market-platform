"""
TradeX Sentry Error Monitoring & Diagnostics Integration.
Truthfully determines whether Sentry is actively initialized or not configured,
and provides robust sanitization of credentials and sensitive fields.
"""
import logging
import os
import re
from typing import Any, Dict, Optional, Tuple

from app.core.config import settings

logger = logging.getLogger("tradex.sentry")

_sentry_initialized: bool = False

# Sensitive keywords for recursive dict/data scrubbing
SENSITIVE_KEY_SUBSTRINGS = (
    "password",
    "token",
    "secret",
    "card",
    "key",
    "credential",
    "auth",
    "cookie",
    "upstox",
    "jwt",
    "dsn",
    "private",
    "hash",
)


def _scrub_text(text: str) -> str:
    """Scrub sensitive connection strings, JWT tokens, and API keys from arbitrary text."""
    if not isinstance(text, str):
        return text
    # 1. Scrub Database & Redis connection credentials (e.g. postgresql://user:pass@host)
    text = re.sub(
        r"((?:postgresql(?:\+\w+)?|postgres|redis|rediss)://[^:@\s]+:)[^@\s]+(@)",
        r"\1[FILTERED]\2",
        text,
        flags=re.IGNORECASE,
    )
    # 2. Scrub JWT tokens (Header.Payload.Signature)
    text = re.sub(
        r"eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+",
        "[FILTERED_JWT]",
        text,
    )
    # 3. Scrub BharatStock API keys (e.g. bsk_live_...)
    text = re.sub(
        r"bsk_[a-zA-Z0-9_\-]+",
        "[FILTERED_KEY]",
        text,
    )
    return text


def _scrub_data(data: Any) -> Any:
    """Recursively scrub sensitive keys and credential patterns from nested structures."""
    if isinstance(data, dict):
        scrubbed: Dict[str, Any] = {}
        for k, v in data.items():
            k_lower = str(k).lower()
            if any(s in k_lower for s in SENSITIVE_KEY_SUBSTRINGS):
                scrubbed[k] = "[FILTERED]"
            else:
                scrubbed[k] = _scrub_data(v)
        return scrubbed
    elif isinstance(data, list):
        return [_scrub_data(item) for item in data]
    elif isinstance(data, str):
        return _scrub_text(data)
    return data


def sentry_before_send(event: Dict[str, Any], hint: Any) -> Optional[Dict[str, Any]]:
    """
    Sentry before_send hook that strips sensitive credentials, headers,
    and tokens before events leave the host.
    """
    if not isinstance(event, dict):
        return event

    # 1. Request headers and body
    req = event.get("request")
    if isinstance(req, dict):
        headers = req.get("headers")
        if isinstance(headers, dict):
            for h in list(headers.keys()):
                h_lower = str(h).lower()
                if any(s in h_lower for s in ("auth", "cookie", "token", "key", "secret")):
                    headers[h] = "[FILTERED]"
        if "data" in req:
            req["data"] = _scrub_data(req["data"])
        if "query_string" in req and isinstance(req["query_string"], str):
            req["query_string"] = _scrub_text(req["query_string"])

    # 2. Extra context
    if "extra" in event:
        event["extra"] = _scrub_data(event["extra"])

    # 3. Tags
    if "tags" in event and isinstance(event["tags"], dict):
        event["tags"] = _scrub_data(event["tags"])

    # 4. Exception values & messages
    exc = event.get("exception")
    if isinstance(exc, dict):
        for val in exc.get("values", []):
            if isinstance(val, dict) and "value" in val and isinstance(val["value"], str):
                val["value"] = _scrub_text(val["value"])

    # 5. Breadcrumbs
    breadcrumbs = event.get("breadcrumbs")
    if isinstance(breadcrumbs, dict):
        crumbs = breadcrumbs.get("values", [])
    elif isinstance(breadcrumbs, list):
        crumbs = breadcrumbs
    else:
        crumbs = []

    for b in crumbs:
        if isinstance(b, dict):
            if "data" in b:
                b["data"] = _scrub_data(b["data"])
            if "message" in b and isinstance(b["message"], str):
                b["message"] = _scrub_text(b["message"])

    return event


def init_sentry() -> bool:
    """
    Initialize Sentry SDK exactly once if SENTRY_DSN is provided in environment.
    Gracefully no-ops if SENTRY_DSN is missing or sentry-sdk is not installed.
    """
    global _sentry_initialized
    if _sentry_initialized:
        return True

    # Read configuration ONLY from environment variables
    dsn = os.getenv("SENTRY_DSN", "").strip() or settings.SENTRY_DSN.strip()
    if not dsn:
        logger.info("Sentry DSN not configured; skipping initialization (normal for local development).")
        return False

    environment = (
        os.getenv("SENTRY_ENVIRONMENT", "").strip()
        or getattr(settings, "SENTRY_ENVIRONMENT", "").strip()
        or "production"
    )

    sample_rate_env = os.getenv("SENTRY_TRACES_SAMPLE_RATE")
    if sample_rate_env is not None:
        try:
            traces_sample_rate = float(sample_rate_env)
        except ValueError:
            traces_sample_rate = 0.1
    else:
        traces_sample_rate = getattr(settings, "SENTRY_TRACES_SAMPLE_RATE", 0.1)

    # Clamp conservative sample rate
    traces_sample_rate = max(0.0, min(1.0, traces_sample_rate))

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration

        sentry_sdk.init(
            dsn=dsn,
            environment=environment,
            traces_sample_rate=traces_sample_rate,
            send_default_pii=False,
            before_send=sentry_before_send,
            integrations=[
                StarletteIntegration(transaction_style="endpoint"),
                FastApiIntegration(transaction_style="endpoint"),
            ],
        )
        _sentry_initialized = True
        logger.info(
            f"Sentry initialized successfully (environment={environment}, traces_sample_rate={traces_sample_rate})."
        )
        return True
    except ImportError:
        logger.warning("sentry-sdk not installed; skipping Sentry initialization.")
        return False
    except Exception as exc:
        logger.error(f"Failed to initialize Sentry: {exc}")
        return False


def capture_exception(exc: BaseException) -> Optional[str]:
    """Capture an exception with Sentry if initialized and active."""
    try:
        import sentry_sdk
        if sentry_sdk.is_initialized():
            client = sentry_sdk.get_client()
            if client.is_active():
                return sentry_sdk.capture_exception(exc)
    except Exception:
        pass
    return None


def get_sentry_status() -> Tuple[str, str]:
    """
    Truthfully determines whether Sentry is actively initialized or not configured.
    Returns:
      ('CONFIGURED', description) if SENTRY_DSN is set and Sentry client is active.
      ('NOT_CONFIGURED', description) otherwise.
    """
    dsn = os.getenv("SENTRY_DSN", "").strip() or settings.SENTRY_DSN.strip()
    if not dsn:
        return "NOT_CONFIGURED", "SENTRY_DSN is not configured."

    try:
        import sentry_sdk
        if sentry_sdk.is_initialized():
            client = sentry_sdk.get_client()
            if client.is_active():
                return "CONFIGURED", "Sentry monitoring configured and active with sensitive field filtering."
        return "NOT_CONFIGURED", "Sentry SDK loaded but client is inactive."
    except ImportError:
        return "NOT_CONFIGURED", "sentry-sdk not installed; monitoring is not active."
    except Exception as exc:
        return "NOT_CONFIGURED", f"Sentry initialization inactive: {exc}"
