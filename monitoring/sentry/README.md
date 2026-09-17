# TradeX Sentry Monitoring Architecture

## Overview
This document outlines the planned Sentry integration for exception tracking, performance monitoring, and tracing across the TradeX platform.

> [!NOTE]
> **Current Status: Planned for Phase 2**
> Sentry is **not connected** in Phase 1. The placeholder `SENTRY_DSN=` is provided in `.env.example`. Sentry SDK initialization will be activated once GitHub CI/CD and production environments (Vercel & Neon) are provisioned.

---

## Integration Architecture

### 1. Backend (FastAPI)
- **Package**: `sentry-sdk[fastapi]`
- **Traces Sample Rate**: 0.2 (20% in production, 1.0 in staging)
- **Profiles Sample Rate**: 0.1
- **Privacy & Security Filters**:
  - Filter out sensitive headers (`Authorization`, `Cookie`).
  - Sanitize user payload passwords, tokens, and bank details.
  - Never capture user financial passwords or PINs.

```python
# Planned initialization snippet for Phase 2 (app/core/sentry.py)
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from app.core.config import settings

def init_sentry():
    if settings.SENTRY_DSN:
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            integrations=[
                FastApiIntegration(),
                SqlalchemyIntegration(),
            ],
            traces_sample_rate=0.2,
            send_default_pii=False,
        )
```

### 2. Frontend (Next.js)
- **Package**: `@sentry/nextjs`
- Captures unhandled React runtime exceptions and hydration errors.
- Session replay enabled for error diagnosis on trading and order forms.
