# BullRun - Modern Indian Stock Market & Paper-Trading Platform

> **Phase 2 Complete:**
> **BullRun features official Upstox Real Market Data integration + Fully Working Virtual Paper Trading Engine.**
>
> ⚠️ **STRICT GUARDRAIL NOTICE:**
> **This platform uses REAL MARKET DATA from Upstox for live quotes, historical candlesticks, and order matching.**
> **This platform DOES NOT execute real-money trades. It DOES NOT send real orders to any broker.**
> **All trading is executed in a virtual paper trading sandbox with initial virtual capital (₹1,00,000) and double-entry ledger audits.**

BullRun is an institutional-grade, original fintech platform inspired by the clean usability and speed of modern trading applications (like Groww, Zerodha Kite, and Upstox) without cloning their proprietary assets, branding, or source code.

---

## 🚀 Key Highlights & Architectural Principles

1. **Real Market Data with Provider Abstraction**:
   - Integrated with official **Upstox API V2/V3** architecture (REST quotes, historical candles, Feed V3 WebSocket streaming).
   - Clean provider abstraction (`MarketDataProvider`, `UpstoxMarketDataProvider`) allowing seamless addition of other exchange providers (e.g. Zerodha Kite, NSE direct).
   - Normalized internal models (`MarketQuote`, `CandleData`, `InstrumentData`) ensuring UI and execution engine are completely decoupled from broker-specific schemas.
2. **Strict Paper Trading Engine (Zero Real-Money Risk)**:
   - **Market Orders**: Immediate simulated execution against real-time Upstox LTP.
   - **Limit Orders**: Margin locking upon placement and automated fill evaluation as live price ticks arrive.
   - **Pre-trade Risk Management**: Parameter validation, virtual margin verification, and holding sufficiency checks before execution.
   - **Simulated Regulatory Charge Engine**: Itemized calculation of Brokerage (₹20 flat or 0.05%), STT (0.1%), Exchange Turnover (0.00345%), Stamp Duty (0.015%), SEBI charges (0.0001%), and GST (18% on Brokerage + Turnover).
3. **Financial Precision Guarantee**:
   - Financial figures (wallet balance, execution price, order values, ledger debits/credits, brokerage taxes) strictly use **PostgreSQL `NUMERIC` / Python `Decimal`**. Floats are strictly prohibited for financial math.
   - **PostgreSQL is the source of truth.** Redis provides sub-millisecond caching and deduplication.
4. **Double-Entry Virtual Paper Ledger**:
   - Every user account receives a paper trading wallet upon registration configured with `INITIAL_PAPER_BALANCE` (Default: `₹100,000.00`).
   - Every trade execution, margin lock, release, or fee deduction writes an immutable `ledger_entries` audit record.
5. **Interactive TradingView Lightweight Charts**:
   - Embedded Lightweight Charts v5 with Candlestick series and Volume histogram.
   - Interactive timeframe switching (1m, 5m, 15m, 1h, 1D, 1W, 1M).
   - Real-time tick bar updates streamed directly over WebSocket.
6. **Backend-Enforced RBAC & User Isolation**:
   - Roles: `TRADER` and `ADMIN`.
   - Role checks and data isolation are enforced directly in FastAPI dependencies—never trusting frontend role assertions.
7. **Deterministic Subsystem Telemetry**:
   - 6 automated FastAPI `/health` endpoints querying database connections, cache pings, runtime uptime, Upstox provider status, and trading engine readiness.

---

## 🛠 Tech Stack

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) (App Router 14.2.15, React 18, TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with an original BullRun dark/light fintech design token system
- **Charts**: [TradingView Lightweight Charts](https://www.tradingview.com/lightweight-charts/) (v5) & Recharts
- **Icons**: [Lucide React](https://lucide.dev/)
- **Streaming**: Native WebSocket client (`WS /api/v1/ws/market`) with automatic reconnect & exponential backoff
- **Data Management**: React Hook Form, Zod, TanStack React Query

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+)
- **Validation**: [Pydantic v2](https://docs.pydantic.dev/) with `ConfigDict` and `pydantic-settings`
- **ORM & Database**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/) (AsyncIO with `asyncpg`), [Alembic](https://alembic.sqlalchemy.org/) migrations
- **Caching & Limiting**: [Redis](https://redis.io/) (via `redis.asyncio` with in-memory resilient fallback)
- **Protobuf**: Google `protobuf>=4.25.0` for Upstox Feed V3 binary frame decoding
- **Authentication**: JWT (Access Token + Refresh Token architecture), [Passlib](https://passlib.readthedocs.io/) & [Bcrypt](https://pypi.org/project/bcrypt/)
- **Testing**: [pytest](https://docs.pytest.org/) (25 tests passing), `pytest-asyncio`, `httpx`, `aiosqlite`

---

## 🔑 Upstox Integration Setup & OAuth 2.0 Flow

TradeX / BullRun integrates with Upstox through the official OAuth 2.0 developer flow.

### 1. Create Developer App
1. Log in to the [Upstox Developer Portal](https://developer.upstox.com/).
2. Create a new app:
   - **App Name**: BullRun
   - **Redirect URL**: `http://localhost:8000/api/v1/upstox/auth/callback`
3. Copy your **API Key** (`UPSTOX_API_KEY`) and **API Secret** (`UPSTOX_API_SECRET`).

### 2. Configure Environment Variables
In `.env` (and `.env.example`):
```env
UPSTOX_API_KEY="your_api_key_here"
UPSTOX_API_SECRET="your_api_secret_here"
UPSTOX_REDIRECT_URI="http://localhost:8000/api/v1/upstox/auth/callback"
# Optional: Developer static token override (bypasses OAuth flow if provided)
UPSTOX_ACCESS_TOKEN=""
```

### 3. Daily Authorization Workflow
Upstox access tokens follow Indian market regulations and expire daily (at 03:30 AM IST).
1. Visit `http://localhost:8000/api/v1/upstox/auth/login` (or click **Authorize Upstox** in the UI).
2. Complete Upstox login and 2FA in the browser.
3. Upstox redirects back to `/api/v1/upstox/auth/callback` with an authorization code.
4. BullRun exchanges the code for an access token and automatically stores it in the `provider_credentials` database table.
5. Upstream Market Feed V3 WebSocket connects automatically in the background.

### 4. Re-authentication & Graceful Degradation
- If the token expires or is unconfigured, the UI displays a clear, neutral **"Market Data Unavailable - Connect Provider"** badge with a direct link to re-authenticate.
- Endpoints gracefully return `{ "status": "UNAVAILABLE" }` without breaking layouts or crashing the application.

---

## 📈 Market Data Architecture & Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/upstox/auth/login` | `GET` | Initiates OAuth 2.0 authorization redirect |
| `/api/v1/upstox/auth/callback` | `GET` | Handles authorization code and stores token |
| `/api/v1/upstox/auth/status` | `GET` | Returns connection state and token expiry |
| `/api/v1/upstox/auth/disconnect` | `POST` | Invalidates active Upstox session |
| `/api/v1/market/quote/{symbol}` | `GET` | Normalized quote (LTP, OHLC, 52W H/L, volume) |
| `/api/v1/market/quotes` | `GET` | Batch quotes for multiple symbols |
| `/api/v1/market/candles/{symbol}` | `GET` | Historical / intraday candles for TradingView charts |
| `/api/v1/market/instruments/search` | `GET` | Debounced instrument master search |
| `/api/v1/market/ticker` | `GET` | Headline indices (NIFTY 50, SENSEX, BANKNIFTY, etc.) |
| `WS /api/v1/ws/market` | `WebSocket` | Real-time price stream with multiplexed subscriptions |

---

## 💼 Virtual Paper Trading Engine

The paper trading engine operates with strict financial guardrails:

```
[User Action: Place Order]
           │
           ▼
[Pre-Trade Risk Checks]
 ├── Valid Order Type (MARKET / LIMIT / STOP / STOP_LIMIT)
 ├── Parameter Bounds (Quantity >= 1, Price > 0)
 ├── Margin Check (Wallet Balance >= Required Capital + Taxes)
 └── Holdings Check (On SELL: Available Holdings >= Order Quantity)
           │
           ▼
[Execution Routing]
 ├── MARKET Order ──► Immediate Fill at Current Market LTP
 └── LIMIT Order  ──► Margin Locked; Pending in Order Book until Tick Match
           │
           ▼
[Regulatory Charge Engine]
 ├── Brokerage: Min(₹20, 0.05% of turnover)
 ├── STT / CTT: 0.1% for delivery trades
 ├── Exchange Turnover: 0.00345% (NSE)
 ├── Stamp Duty: 0.015% (BUY only)
 ├── SEBI Charges: 0.0001%
 └── GST: 18% on (Brokerage + Turnover)
           │
           ▼
[Post-Trade Settlement]
 ├── Atomic Wallet Balance Debit / Credit (Decimal Precision)
 ├── Immutable Ledger Entry Written (TRADE_BUY, TRADE_SELL, CHARGES)
 ├── Holdings Recalculation (Weighted Average Cost Basis)
 └── WebSocket Notification Dispatched
```

---

## ⚡ Quick Start: Local Setup

### 1. Prerequisites
- **Python 3.11+**
- **Node.js 18+ & npm**
- **Docker & Docker Compose** (for local PostgreSQL & Redis)

### 2. Configure Environment Variables
Copy `.env.example` into `.env`:
```bash
cp .env.example .env
```

### 3. Start Database & Redis
```bash
docker compose up -d postgres redis
```

### 4. Run Backend & Migrations
```bash
cd backend

# 1. Activate virtual environment
.\.venv\Scripts\activate   # Windows
# source .venv/bin/activate # Linux/macOS

# 2. Run database migrations
alembic upgrade head

# 3. Start FastAPI development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation will be available at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### 5. Run Frontend
```bash
cd frontend
npm install
npm run dev
```

The web application will be accessible at:
- **Trading Terminal**: `http://localhost:3000/dashboard`
- **Stock Detail & Live Chart**: `http://localhost:3000/stocks/RELIANCE`
- **Portfolio & Holdings**: `http://localhost:3000/portfolio`
- **Order Book**: `http://localhost:3000/orders`
- **Watchlists**: `http://localhost:3000/watchlist`
- **Subsystem Monitoring**: `http://localhost:3000/admin/monitoring`

---

## 🧪 Automated Testing

BullRun includes an automated test suite verifying Upstox integration, normalized market data, quote caching, candlestick parsing, paper trading orders (market buy/sell, limit margin locks, cancellations), wallet ledger audits, financial decimal precision, RBAC, and health check endpoints.

```bash
cd backend
.\.venv\Scripts\pytest -v
```

Test Results:
```
tests/test_auth.py::test_password_hashing PASSED                         [  3%]
tests/test_auth.py::test_user_registration PASSED                        [  7%]
tests/test_auth.py::test_duplicate_registration_fails PASSED             [ 11%]
tests/test_auth.py::test_login_success_and_failure PASSED                [ 15%]
tests/test_auth.py::test_refresh_token_flow PASSED                       [ 19%]
tests/test_auth.py::test_me_endpoint PASSED                              [ 23%]
tests/test_health.py::test_health_endpoints PASSED                       [ 26%]
tests/test_isolation.py::test_user_watchlist_isolation PASSED            [ 30%]
tests/test_market_data.py::test_quote_normalization PASSED               [ 34%]
tests/test_market_data.py::test_candle_normalization PASSED              [ 38%]
tests/test_market_data.py::test_instrument_service_resolution PASSED     [ 42%]
tests/test_market_data.py::test_quote_service_caching_and_retrieval PASSED [ 46%]
tests/test_market_data.py::test_market_api_endpoints PASSED              [ 50%]
tests/test_models.py::test_models_relationships PASSED                   [ 53%]
tests/test_paper_trading.py::test_charge_engine_calculation PASSED       [ 57%]
tests/test_paper_trading.py::test_paper_market_buy_and_sell_flow PASSED  [ 61%]
tests/test_paper_trading.py::test_insufficient_funds_rejected PASSED     [ 65%]
tests/test_paper_trading.py::test_insufficient_holdings_rejected PASSED  [ 69%]
tests/test_paper_trading.py::test_limit_order_margin_lock_and_cancellation PASSED [ 73%]
tests/test_paper_trading.py::test_portfolio_summary_endpoint PASSED      [ 76%]
tests/test_rbac.py::test_admin_metrics_authorized PASSED                 [ 80%]
tests/test_rbac.py::test_admin_metrics_forbidden_for_trader PASSED       [ 84%]
tests/test_rbac.py::test_admin_metrics_unauthenticated PASSED            [ 88%]
tests/test_upstox_integration.py::test_live_upstox_provider_integration SKIPPED [ 92%]
tests/test_wallet.py::test_wallet_creation_on_registration PASSED        [ 96%]
tests/test_wallet.py::test_financial_decimal_precision PASSED            [100%]

======================= 25 passed, 1 skipped in 13.04s ========================
```

Frontend Verification:
```bash
cd frontend
npm run build
# Result: 15/15 pages successfully compiled and optimized with 0 TypeScript/lint errors.
```

---

## 🏥 Health & Monitoring Endpoints

BullRun exposes standardized health endpoints for automated telemetry:

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/health` | `GET` | Aggregates DB, Redis, and subsystem states |
| `/health/database` | `GET` | Probes PostgreSQL connectivity (`SELECT 1`) |
| `/health/redis` | `GET` | Pings Redis cache and rate limiter |
| `/health/system` | `GET` | Runtime uptime, memory, and Python telemetry |
| `/health/market-data` | `GET` | Upstox provider configuration & token health |
| `/health/trading-engine` | `GET` | Paper execution engine readiness & risk check health |
| `/api/v1/admin/monitoring` | `GET` | Full telemetry probe for Admin dashboard |

---

## ☕ Java Microservice & Desktop GUI Terminal (Rubric Implementation)

BullRun integrates a dedicated high-performance **Java 21 Microservice** (`java-security-service`) and a standalone **JavaFX Desktop Trading Terminal** (`java-gui-client`), satisfying all requirements of the Java GUI and Java Web Evaluation Rubrics:

### 1. Architectural Highlights
- **Core OOP & Polymorphism**: Abstract base class [`AbstractPortfolioAnalyzer`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/service/analytics/AbstractPortfolioAnalyzer.java) utilizing Template Method pattern; runtime polymorphic strategies ([`RiskAnalyticsStrategy`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/service/analytics/RiskAnalyticsStrategy.java), [`PerformanceAnalyticsStrategy`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/service/analytics/PerformanceAnalyticsStrategy.java), [`DiversificationAnalyticsStrategy`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/service/analytics/DiversificationAnalyticsStrategy.java)) dispatched dynamically via [`AnalyticsExecutionService`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/service/analytics/AnalyticsExecutionService.java).
- **Collections & Generics**: Streams, `Collectors.groupingBy`, `BigDecimal` arithmetic with `RoundingMode.HALF_UP`, and generic response wrapper [`ApiResponse<T>`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/dto/ApiResponse.java).
- **Multithreading & Synchronization**: Bounded `ThreadPoolTaskExecutor` (core: 4, max: 16, queue: 100) running concurrent computations with `CompletableFuture.allOf()`; thread-safe metrics tracking via `ConcurrentHashMap` and `AtomicLong` in [`ConcurrentAnalyticsTracker`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/service/analytics/ConcurrentAnalyticsTracker.java).
- **Direct JDBC with PreparedStatement**: PostgreSQL JDBC driver, `try-with-resources`, parameterized SQL operations, and transaction integrity via [`SecurityEventJdbcDaoImpl`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/repository/jdbc/SecurityEventJdbcDaoImpl.java) and [`JdbcDemoController`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/controller/JdbcDemoController.java).
- **Jakarta HttpServlet Integration**: Dedicated servlet [`BullrunDemoServlet`](file:///a:/stock%20market%20platform/java-security-service/src/main/java/com/bullrun/security/servlet/BullrunDemoServlet.java) registered at `/demo/servlet/*` with embedded Tomcat container routing.
- **JavaFX Native Desktop Terminal**: Standalone desktop application [`BullrunGuiApp`](file:///a:/stock%20market%20platform/java-gui-client/src/main/java/com/bullrun/gui/BullrunGuiApp.java) with multi-tab dashboard, real-time analytics views, risk meters, and direct JDBC test trigger controls.

### 2. Environment Variables
Configure in `java-security-service/src/main/resources/application.properties` or environment:
```env
PORT=8081
SPRING_DATASOURCE_URL=jdbc:postgresql://ep-silent-wave-a19e2777-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
SPRING_DATASOURCE_USERNAME=neondb_owner
SPRING_DATASOURCE_PASSWORD=your_db_password
JWT_SECRET=your-256-bit-secret-key-here
```

### 3. Quick Run Commands

#### A. Run Java Security & Analytics Backend (Port 8081)
```bash
cd java-security-service
mvn spring-boot:run
```

#### B. Run Automated Java Test Suites
```bash
# Test java-security-service (41 tests: OOP, Collections, Concurrency, JDBC, Servlet)
cd java-security-service
mvn test

# Test java-gui-client (3 tests: JavaFX Client, API deserialization, error states)
cd ../java-gui-client
mvn test
```

#### C. Launch JavaFX Desktop Client
```bash
cd java-gui-client
mvn clean javafx:run
```

#### D. Verify Direct JDBC Demonstration
```bash
# Create Security Event via direct JDBC PreparedStatement
curl -X POST http://localhost:8081/api/java/demo/jdbc/events \
  -H "Content-Type: application/json" \
  -d '{"eventType":"LOGIN_SUCCESS","endpoint":"/api/v1/auth/login","status":"SUCCESS","severity":"INFO"}'

# Query all Security Events via direct JDBC
curl http://localhost:8081/api/java/demo/jdbc/events
```

#### E. Verify Jakarta HttpServlet
```bash
# Query BullrunDemoServlet health check
curl http://localhost:8081/demo/servlet/health
```

### 4. Detailed Evaluation Documentation
- **Architecture & System Design**: [`docs/JAVA_RUBRIC_SYSTEM_DESIGN.md`](file:///a:/stock%20market%20platform/docs/JAVA_RUBRIC_SYSTEM_DESIGN.md) (Contains 4 Mermaid architecture and flow diagrams, database mapping, and security model).
- **Core Java Viva Guide**: [`docs/JAVA_VIVA_GUIDE.md`](file:///a:/stock%20market%20platform/docs/JAVA_VIVA_GUIDE.md) (Contains concept-to-file mapping, code proofs, and high-frequency viva Q&A).

---

## 🛡️ License

This project is proprietary and confidential. Developed for the BullRun institutional fintech platform.
