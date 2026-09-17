# TradeX - Modern Stock Market & Paper-Trading Platform

> **Important Notice:**
> **TradeX currently provides the platform foundation and paper-trading architecture. Real market-data and broker integrations will be added in later phases.**

TradeX is an institutional-grade, original fintech platform inspired by the clean usability and speed of modern trading applications (like Groww, Zerodha Kite, and Upstox) without cloning their proprietary assets, branding, or source code.

---

## 🚀 Key Highlights & Architectural Principles

1. **Zero Real-Money & Zero Fake Prices**:
   - In **Phase 1: Foundation**, real broker execution and market data APIs (Upstox, Zerodha, Razorpay) are disconnected by design.
   - TradeX **never invents or fabricates fake prices**. All missing market states display clear, honest statuses: `WAITING FOR PROVIDER` or `NOT CONFIGURED`.
2. **Financial Precision Guarantee**:
   - Financial figures (wallet balance, execution price, order values, ledger debits/credits, brokerage taxes) strictly use **PostgreSQL `NUMERIC` / Python `Decimal`**. Floats are strictly prohibited for financial math.
   - **PostgreSQL is the source of truth.** Redis is never used as an authoritative financial store.
3. **Double-Entry Paper Ledger**:
   - Every user account receives a paper trading wallet upon registration configured with `INITIAL_PAPER_BALANCE` (Default: `₹100,000.00`).
   - Every deposit, debit, lock, or release writes an immutable `ledger_entries` audit record.
4. **Backend-Enforced RBAC & User Isolation**:
   - Roles: `TRADER` and `ADMIN`.
   - Role checks and data isolation are enforced directly in FastAPI dependencies—never trusting frontend role assertions.
5. **Deterministic Subsystem Telemetry**:
   - 6 automated FastAPI `/health` endpoints querying database connections, cache pings, runtime uptime, and provider status flags.

---

## 🛠 Tech Stack

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 18, TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with an original TradeX dark fintech design token system
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Visualizations**: [Recharts](https://recharts.org/) & TradingView Lightweight Charts (v4 compatible)
- **Data Management**: React Hook Form, Zod, TanStack React Query

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+)
- **Validation**: [Pydantic v2](https://docs.pydantic.dev/) with `ConfigDict` and `pydantic-settings`
- **ORM & Database**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/) (AsyncIO with `asyncpg`), [Alembic](https://alembic.sqlalchemy.org/) migrations
- **Caching & Limiting**: [Redis](https://redis.io/) (via `redis.asyncio` with in-memory resilient fallback)
- **Authentication**: JWT (Access Token + Refresh Token architecture), [Passlib](https://passlib.readthedocs.io/) & [Bcrypt](https://pypi.org/project/bcrypt/)
- **Testing**: [pytest](https://docs.pytest.org/), [pytest-asyncio](https://pypi.org/project/pytest-asyncio/), [httpx](https://www.python-httpx.org/), `aiosqlite`

### Infrastructure & Operations
- **Primary Database**: PostgreSQL 16 / [Neon Serverless Postgres](https://neon.tech/)
- **Cache & Rate Limiting**: Redis 7 / [Upstash Serverless Redis](https://upstash.com/)
- **Containers**: Docker & Docker Compose
- **Synthetic Monitoring**: [Uptime Kuma](https://uptime.kuma.pet/) (Port 3001)
- **Error Tracking**: [Sentry](https://sentry.io/) (Phase 2 integration blueprint documented)

---

## 📁 Repository Structure

```
tradex-platform/
├── .env.example               # Complete environment variable template
├── .gitignore                 # Monorepo gitignore (node_modules, venvs, secrets)
├── docker-compose.yml         # Local stack (PostgreSQL, Redis, Backend, Uptime Kuma)
├── README.md                  # System manual and architecture reference
├── monitoring/                # Monitoring blueprints
│   ├── sentry/README.md       # Sentry Phase 2 error tracking architecture
│   └── uptime-kuma/README.md  # Uptime Kuma synthetic monitor configurations
├── frontend/                  # Next.js Web Application
│   ├── app/                   # App Router pages ((auth), (dashboard), admin)
│   ├── components/            # UI Design System & Trading Modals
│   ├── lib/                   # API client, utilities, formatting
│   ├── types/                 # TypeScript interfaces
│   ├── tailwind.config.ts     # TradeX Design System tokens
│   └── package.json
└── backend/                   # FastAPI REST API & Database Layer
    ├── app/
    │   ├── api/               # API endpoints (/health, /api/v1/auth, wallet, orders, etc.)
    │   ├── core/              # Config, security, DB engine, Redis, rate limiter, errors
    │   ├── models/            # 24 SQLAlchemy 2.0 models with NUMERIC precision
    │   ├── schemas/           # Pydantic v2 schemas
    │   ├── services/          # Business logic & provider interfaces
    │   └── main.py            # Application lifespan, CORS, error handlers
    ├── alembic/               # Database migrations
    ├── tests/                 # Full pytest suite (14 passing tests)
    ├── requirements.txt
    └── Dockerfile
```

---

## ⚡ Quick Start: Local Setup

### 1. Prerequisites
- **Python 3.11+**
- **Node.js 18+ & npm**
- **Docker & Docker Compose** (Optional for containerized run)

### 2. Configure Environment Variables
Copy `.env.example` into `.env` at the root and inside `backend/`:
```bash
cp .env.example .env
```

Key environment configurations:
| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | Async PostgreSQL connection string | `postgresql+asyncpg://postgres:postgres@localhost:5432/tradex` |
| `SYNC_DATABASE_URL` | Sync connection string for Alembic | `postgresql://postgres:postgres@localhost:5432/tradex` |
| `REDIS_URL` | Redis instance connection | `redis://localhost:6379/0` |
| `JWT_SECRET` | 32+ character HMAC secret key | Random hexadecimal string |
| `INITIAL_PAPER_BALANCE` | Starting paper wallet balance | `100000.00` |
| `NEXT_PUBLIC_API_URL`| Backend URL for frontend calls | `http://localhost:8000` |

---

### 3. Backend Setup

```bash
cd backend

# 1. Create and activate virtual environment
python -m venv .venv
# On Windows:
.\.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run database migrations
alembic upgrade head

# 4. Start the FastAPI development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation will be available at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

### 4. Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Run the Next.js development server
npm run dev
```

The web application will be accessible at:
- **Trader Terminal**: `http://localhost:3000/dashboard`
- **Watchlists**: `http://localhost:3000/watchlist`
- **Stock Detail**: `http://localhost:3000/stocks/RELIANCE`
- **Admin Governance**: `http://localhost:3000/admin`
- **Subsystem Monitoring**: `http://localhost:3000/admin/monitoring`

---

## 🧪 Automated Testing

TradeX includes an automated test suite verifying password hashing, duplicate protection, JWT access/refresh token generation, backend RBAC enforcement, user isolation, wallet allocation, financial decimal precision, and all 6 health check endpoints.

```bash
cd backend
.\.venv\Scripts\python -m pytest -v
```

Output:
```
tests/test_auth.py::test_password_hashing PASSED
tests/test_auth.py::test_user_registration PASSED
tests/test_auth.py::test_duplicate_registration_fails PASSED
tests/test_auth.py::test_login_success_and_failure PASSED
tests/test_auth.py::test_refresh_token_flow PASSED
tests/test_auth.py::test_me_endpoint PASSED
tests/test_health.py::test_health_endpoints PASSED
tests/test_isolation.py::test_user_watchlist_isolation PASSED
tests/test_models.py::test_models_relationships PASSED
tests/test_rbac.py::test_admin_metrics_authorized PASSED
tests/test_rbac.py::test_admin_metrics_forbidden_for_trader PASSED
tests/test_rbac.py::test_admin_metrics_unauthenticated PASSED
tests/test_wallet.py::test_wallet_creation_on_registration PASSED
tests/test_wallet.py::test_financial_decimal_precision PASSED

====================== 14 passed in 30.87s ======================
```

---

## 🐳 Docker Stack

Run all core backend services with a single command:
```bash
docker compose up -d
```

Included services:
- **`postgres`**: PostgreSQL 16 Alpine on port 5432
- **`redis`**: Redis 7 Alpine on port 6379
- **`backend`**: TradeX FastAPI backend on port 8000
- **`uptime-kuma`**: Synthetic monitor dashboard on port 3001

---

## 📡 Cloud Setup: Neon & Upstash

### Connecting to Neon PostgreSQL
1. Create a serverless project on [Neon](https://neon.tech).
2. Copy the connection string from the Neon dashboard.
3. Update `.env`:
   ```env
   DATABASE_URL="postgresql+asyncpg://[user]:[password]@[endpoint].neon.tech/neondb?ssl=require"
   SYNC_DATABASE_URL="postgresql://[user]:[password]@[endpoint].neon.tech/neondb?ssl=require"
   ```
4. Run `alembic upgrade head`.

### Connecting to Upstash Redis
1. Create a Redis database on [Upstash](https://upstash.com).
2. Copy the `rediss://` URL.
3. Update `.env`:
   ```env
   REDIS_URL="rediss://default:[token]@[endpoint].upstash.io:6379"
   ```

---

## 🏥 Health Endpoints Specification

TradeX exposes 6 standardized health endpoints:

| Endpoint | Method | Expected Status | Description |
| :--- | :--- | :--- | :--- |
| `/health` | `GET` | `healthy` / `degraded` | Aggregates DB, Redis, and subsystem states |
| `/health/database` | `GET` | `healthy` | Probes PostgreSQL connectivity (`SELECT 1`) |
| `/health/redis` | `GET` | `healthy` | Pings Redis cache and rate limiter |
| `/health/system` | `GET` | `healthy` | Runtime uptime, memory, and python telemetry |
| `/health/market-data` | `GET` | `not_configured` | Phase 1 market data provider status |
| `/health/trading-engine` | `GET` | `not_configured` | Phase 1 execution engine provider status |

---

## 🗺️ Roadmap & Phase 2 Integration

When the platform moves to Phase 2, the following interfaces will be connected:
- **`UpstoxMarketDataProvider`**: Real-time websocket quotes and historical bar data.
- **`ZerodhaMarketDataProvider`**: Kite Connect tick stream integration.
- **`PaperExecutionProvider`**: Matching engine simulating simulated market fills against real-time order books.
- **`Sentry` & CI/CD**: Automated production telemetry and GitHub Actions pipeline.
