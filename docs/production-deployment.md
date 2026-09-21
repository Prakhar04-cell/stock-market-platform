# TradeX Production Deployment Procedure

This document provides the exact 12-step deployment procedure to launch TradeX into production with containerized FastAPI backend, Neon PostgreSQL, Upstash Redis, Upstox Real Market Data Feed V3, and Vercel Next.js frontend.

---

## 12-Step Production Deployment Procedure

### Step 1: Create Production PostgreSQL (Neon)
1. Create a serverless project on [Neon](https://neon.tech/) named `tradex-production`.
2. Ensure connection pooling (PgBouncer) is enabled.
3. Retrieve your pooled connection strings:
   - **Async Engine**: `postgresql+asyncpg://[user]:[password]@[endpoint-pooler].neon.tech/tradex?ssl=require`
   - **Alembic Sync**: `postgresql://[user]:[password]@[endpoint-pooler].neon.tech/tradex?sslmode=require`
   *(TradeX automatically handles `sslmode=require` to `ssl=require` parameter translation for asyncpg)*.

### Step 2: Create Production Redis (Upstash)
1. Create a database on [Upstash Redis](https://upstash.com/) in the region closest to your backend hosting (e.g. AWS us-east-1 or ap-south-1).
2. Ensure **TLS (rediss://)** is enabled.
3. Copy the `rediss://` connection string:
   - Format: `rediss://default:[password]@[endpoint].upstash.io:6379`

### Step 3: Configure Backend Secrets
In your hosting provider dashboard (Render / Railway / AWS ECS / Cloud Run), configure the following environment variables. **Never expose these in version control or frontend code**:

```env
ENVIRONMENT=production
DEBUG=false
PROJECT_NAME="TradeX Trading Platform"
VERSION=1.0.0
PORT=8000
BACKEND_HOST=0.0.0.0

# Database
DATABASE_URL=postgresql+asyncpg://[user]:[password]@[endpoint-pooler].neon.tech/tradex?ssl=require
SYNC_DATABASE_URL=postgresql://[user]:[password]@[endpoint-pooler].neon.tech/tradex?sslmode=require

# Cache & Limiter
REDIS_URL=rediss://default:[password]@[endpoint].upstash.io:6379

# JWT Authentication (generate via: openssl rand -hex 32)
JWT_SECRET=[secure-32-byte-hex-string]
JWT_ALGORITHM=HS256

# Upstox Developer OAuth
UPSTOX_ACCESS_TOKEN=[active_daily_upstox_access_token]
UPSTOX_CLIENT_ID=[your_upstox_client_id]
UPSTOX_CLIENT_SECRET=[your_upstox_client_secret]
UPSTOX_REDIRECT_URI=https://[your-backend-domain]/api/v1/upstox/auth/callback

# Frontend & CORS
FRONTEND_URL=https://[your-tradex-app].vercel.app
CORS_ORIGINS=https://[your-tradex-app].vercel.app
```

### Step 4: Deploy Docker Backend
1. Connect your repository `https://github.com/Prakhar04-cell/stock-market-platform.git` to Render or Railway.
2. Select `backend/Dockerfile` as the build context.
3. Deploy the container. The Dockerfile binds dynamically to the platform's injected `$PORT` via:
   ```dockerfile
   CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
   ```

### Step 5: Run Migrations
Migrations run automatically on container startup (`alembic upgrade head`).
To manually verify or run migrations from CLI against production:
```bash
alembic upgrade head
```
All tables (`users`, `wallets`, `ledger_entries`, `stocks`, `instruments`, `orders`, `order_executions`, `holdings`, `audit_logs`) will be verified/created without deleting existing data.

### Step 6: Configure Upstox Real Market Data
1. Add `UPSTOX_ACCESS_TOKEN` directly into your backend hosting provider's environment variables.
2. If using the daily OAuth web flow, visit:
   `https://[your-backend-domain]/api/v1/upstox/auth/login`
3. Complete authorization. The token will be securely stored server-side in PostgreSQL `provider_credentials`.
4. Upstox Market Data Feed V3 WebSocket will connect automatically in the background.

### Step 7: Verify Health Endpoints
Execute verification against the live production backend:
```bash
curl -s https://[your-backend-domain]/health
curl -s https://[your-backend-domain]/health/database
curl -s https://[your-backend-domain]/health/redis
curl -s https://[your-backend-domain]/health/market-data
curl -s https://[your-backend-domain]/health/trading-engine
curl -s https://[your-backend-domain]/health/infrastructure
curl -s https://[your-backend-domain]/api/v1/upstox/auth/status
```
Confirm all return `status: healthy` or `connected`. No secrets will be returned in responses.

### Step 8: Configure Vercel `NEXT_PUBLIC_API_URL`
In the [Vercel Project Dashboard](https://vercel.com/):
1. Navigate to **Project Settings** → **Environment Variables**.
2. Add:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://[your-backend-domain]` *(no trailing slash)*
3. Check **Production**, **Preview**, and **Development** scopes.

### Step 9: Redeploy Frontend
Trigger a new deployment in Vercel from git or CLI:
```bash
vercel --prod
```
The client bundle embeds the production API endpoint without exposing any backend credentials.

### Step 10: Verify Frontend → Backend Connectivity
1. Open your Vercel URL `https://[your-tradex-app].vercel.app`.
2. Inspect the browser Network tab.
3. Confirm API calls hit `https://[your-backend-domain]/api/v1/...` with HTTP 200/201 and valid CORS response headers.
4. Verify user registration, login, and dashboard overview.

### Step 11: Verify WebSocket
1. Open the browser Developer Tools → Network → WS filter.
2. Confirm active connection to `wss://[your-backend-domain]/api/v1/ws/market`.
3. Confirm incoming `price_update` binary/JSON frames with live ticks (LTP, volume, timestamp).

### Step 12: Verify Paper Trading
1. In the TradeX terminal, select an active stock (e.g. `RELIANCE`).
2. Place a simulated market or limit BUY order.
3. Confirm:
   - Order executes against real Upstox LTP.
   - Virtual wallet balance decreases.
   - Double-entry ledger records the trade.
   - Holdings table reflects new shares with live P&L.
   - **ZERO broker orders are placed with Upstox.**
4. Place a simulated SELL order and verify realized P&L calculation.

---

## Automated Smoke Verification Script

You can execute the automated production verification script against your deployed backend:
```bash
python scripts/verify_production.py --url https://[your-backend-domain]
```
This runs read-only connectivity checks, validates JSON responses, confirms real market quotes, and guarantees no secrets are leaked.
