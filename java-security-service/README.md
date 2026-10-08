# BullRun Java Security & Analytics Service

An isolated Java 21 / Spring Boot 3 microservice dedicated to:
- **API Security**: JWT validation, signature verification, token lifecycle checks, claims inspection
- **RBAC**: Multi-role authorization (ADMIN, USER/TRADER) with strict data segregation
- **Rate Limiting**: Sliding-window rate limiter protecting sensitive APIs (HTTP 429)
- **Security & Audit**: Comprehensive audit log recording and active alert detection
- **Security Analytics**: Real-time risk scoring engine (0-100) based on verified event signals
- **Trading Analytics**: Portfolio valuation, P&L (realized vs. unrealized), trading statistics, and risk metrics

## Architecture & OOP Design

- **Stateless Architecture**: Validates incoming JWT tokens issued by BullRun's authentication system.
- **Multithreaded Calculations**: Utilizes `CompletableFuture` with a dedicated thread pool for parallel valuation, P&L, statistics, and risk evaluation.
- **Data Integrity**: Reuses BullRun's PostgreSQL database directly. Never creates fake numbers.

## API Endpoints

### Security & Governance (Admin Only)
- `GET /api/java/security/events` - Paginated security audit event stream
- `GET /api/java/security/alerts` - Active high/critical security alerts
- `GET /api/java/security/summary` - Platform security KPI summary & dynamic risk assessment
- `POST /api/java/security/events` - Ingest security events from auth or gateway services

### Trading Analytics (User / Admin)
- `GET /api/java/portfolio/{userId}` - Portfolio summary, valuation, asset allocation & concentration
- `GET /api/java/portfolio/{userId}/analytics` - Alias for portfolio analytics
- `GET /api/java/portfolio/{userId}/pnl` - Realized, unrealized, and position-level P&L
- `GET /api/java/orders/{userId}/statistics` - Order win rate, average profit/loss, largest trades
- `GET /api/java/portfolio/{userId}/risk` - Exposure, concentration, VaR loss estimate, risk score

### Health & Telemetry
- `GET /api/java/health` - Service health status & capability matrix
- `GET /actuator/health` - Spring Boot Actuator probe

## Running Locally

```bash
# Build & Test
mvn clean test

# Run Service on port 8081
mvn spring-boot:run
```
