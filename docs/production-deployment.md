# TradeX Production Deployment Guide

This guide details the complete production deployment procedure for the TradeX platform: deploying the FastAPI backend as a containerized service and connecting the Next.js frontend on Vercel.

---

## Architecture Overview

```text
┌────────────────────────────────────────────────────────┐
│               Frontend (Vercel)                        │
│   Next.js 14 App Router                                │
│   Environment: NEXT_PUBLIC_API_URL=https://api.domain │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS / WSS
                           ▼
┌────────────────────────────────────────────────────────┐
│            Backend (Render / Railway / Cloud)          │
│   FastAPI Core (uvicorn)                               │
│   Dynamic $PORT Binding                                │
│   Production CORS Origins Filter                       │
└────────────┬─────────────┬─────────────┬───────────────┘
             │             │             │
             ▼             ▼             ▼
       Neon Postgres  Upstash Redis    Upstox API
        (AsyncPG /     (TLS Cache /   (REST Quotes &
        Psycopg2)       Rate Limit)    Feed V3 WSS)
```

---

## 1. Production Backend Deployment

### Option A: Render (Recommended for FastAPI + WebSockets)
1. In the [Render Dashboard](https://dashboard.render.com/), create a **New Web Service**.
2. Connect your Git repository: `https://github.com/Prakhar04-cell/stock-market-platform.git`.
3. Configure the service:
   - **Name**: `tradex-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Docker` (Render automatically detects `backend/Dockerfile`)
   - **Instance Type**: Starter (or higher with persistent WebSocket support)
4. Add the Environment Variables listed in Section 2.
5. Render automatically injects `PORT=10000`, which our `Dockerfile` binds to.

### Option B: Railway
1. Create a **New Project** on [Railway](https://railway.app/) from your GitHub repository.
2. Under Settings:
   - **Root Directory**: `/backend`
   - **Dockerfile Path**: `Dockerfile`
3. Add Environment Variables in the Railway Variables tab.

---

## 2. Backend Environment Variables (Server-Side ONLY)

Set these variables in your hosting provider's dashboard (Render/Railway).

| Variable | Example Value | Description |
| :--- | :--- | :--- |
| `ENVIRONMENT` | `production` | Enables production mode |
| `DEBUG` | `false` | Disables debug exceptions & leakages |
| `DATABASE_URL` | `postgresql+asyncpg://user:pass@ep-xxx-pooler.neon.tech/tradex?ssl=require` | Neon pooled connection string |
| `SYNC_DATABASE_URL` | `postgresql://user:pass@ep-xxx-pooler.neon.tech/tradex?sslmode=require` | Used for startup Alembic migrations |
| `REDIS_URL` | `rediss://default:token@xxx.upstash.io:6379` | Upstash Redis TLS connection string |
| `JWT_SECRET` | `openssl rand -hex 32` | Cryptographic secret for signing tokens |
| `UPSTOX_ACCESS_TOKEN` | `eyJ...` | Active Upstox OAuth Access Token |
| `UPSTOX_CLIENT_ID` | `your_upstox_api_key` | Upstox Developer Client ID (optional if static token is set) |
| `UPSTOX_CLIENT_SECRET` | `your_upstox_secret` | Upstox Developer Secret (optional if static token is set) |
| `UPSTOX_REDIRECT_URI` | `https://your-backend.onrender.com/api/v1/upstox/auth/callback` | OAuth redirect target |
| `FRONTEND_URL` | `https://your-tradex.vercel.app` | Production Vercel domain |
| `CORS_ORIGINS` | `https://your-tradex.vercel.app,http://localhost:3000` | Whitelisted browser origins |

> [!CAUTION]
> **Zero Secret Exposure**:
> NEVER expose `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, or `UPSTOX_ACCESS_TOKEN` in frontend environment variables.

---

## 3. Frontend Vercel Configuration

In your [Vercel Project Dashboard](https://vercel.com/):
1. Navigate to **Project Settings** → **Environment Variables**.
2. Add the following variable for **Production** and **Preview**:

| Name | Value |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://your-backend-service.onrender.com` |

3. Trigger a redeployment in Vercel to embed the production backend URL into the client bundle.

---

## 4. Production Verification Smoke Tests

After deploying both services, run the following verification checks against your production backend URL (`https://your-backend.onrender.com`):

### 1. Health Checks
```bash
# Aggregated Health
curl -s https://your-backend.onrender.com/health

# Neon Database Connectivity
curl -s https://your-backend.onrender.com/health/database

# Upstash Redis Connectivity
curl -s https://your-backend.onrender.com/health/redis

# Upstox Real Market Data Telemetry
curl -s https://your-backend.onrender.com/health/market-data

# Upstox Auth Status (never leaks token)
curl -s https://your-backend.onrender.com/api/v1/upstox/auth/status
```

### 2. Live Market Data Verification
```bash
# Real-time normalized quote
curl -s https://your-backend.onrender.com/api/v1/market/quote/RELIANCE

# Historical chart candlesticks
curl -s "https://your-backend.onrender.com/api/v1/market/candles/RELIANCE?interval=1d"
```

### 3. Real-Time Streaming
Connect to `wss://your-backend.onrender.com/api/v1/ws/market` and issue subscription frame:
```json
{"action": "subscribe", "symbols": ["RELIANCE"]}
```
Verify normalized price ticks stream continuously.
