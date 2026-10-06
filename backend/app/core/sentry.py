"""
Sentry Monitoring Diagnostics Utility.
Truthfully determines whether Sentry is actively initialized or not configured.
"""
from typing import Tuple
from app.core.config import settings


def get_sentry_status() -> Tuple[str, str]:
    """
    Returns (status, description).
    Status values:
      'ACTIVE': Sentry SDK is installed and actively initialized with valid DSN.
      'NOT_CONFIGURED': Sentry is not configured or sentry-sdk is not installed.
    """
    if not settings.SENTRY_DSN:
        return "NOT_CONFIGURED", "SENTRY_DSN is not configured."

    try:
        import importlib
        sentry_sdk = importlib.import_module("sentry_sdk")
        hub = getattr(sentry_sdk, "Hub", None)
        client = hub.current.client if hub else None
        if client and client.is_active():
            return "ACTIVE", "Sentry monitoring active with sensitive field filtering."
        return "NOT_CONFIGURED", "Sentry SDK loaded but client is inactive."
    except ImportError:
        return "NOT_CONFIGURED", "sentry-sdk not installed; monitoring is not active."
    except Exception as e:
        return "NOT_CONFIGURED", f"Sentry initialization inactive: {e}"
