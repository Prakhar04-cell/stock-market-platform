# TradeX Uptime Kuma Monitoring Specification

## 1. Overview
TradeX uses Uptime Kuma for synthetic heartbeat monitoring, endpoint status tracking, and automated alerting. This document outlines the exact endpoints, monitor configurations, response assertions, and alert thresholds for the Phase 1 infrastructure services.

---

## 2. Infrastructure Monitor Specifications

### 2.1 Frontend Application
* **Monitor Name**: `TradeX - Frontend Web App`
* **Monitor Type**: `HTTP(s)`
* **URL**: `http://localhost:3000/` (or `http://frontend:3000/` in Docker network)
* **Check Interval**: `60 seconds`
* **Retry Interval**: `20 seconds`
* **Max Retries**: `3`
* **Expected Status Code**: `200`
* **Keyword Assert**: `<title>TradeX` or `TradeX`
* **Description**: Verifies the Next.js frontend is actively rendering pages.

### 2.2 Backend API Core
* **Monitor Name**: `TradeX - Backend API Root`
* **Monitor Type**: `HTTP(s)`
* **URL**: `http://localhost:8000/` (or `http://backend:8000/` in Docker network)
* **Check Interval**: `30 seconds`
* **Expected Status Code**: `200`
* **Response Assertion**:
  ```json
  {
    "name": "TradeX",
    "version": "1.0.0",
    "phase": "Phase 1: Platform Foundation",
    "status": "operational"
  }
  ```

### 2.3 Health Check Aggregator
* **Monitor Name**: `TradeX - Health Check Aggregator`
* **Monitor Type**: `HTTP(s) - Keyword / JSON Query`
* **URL**: `http://localhost:8000/health`
* **Check Interval**: `30 seconds`
* **Expected Status Code**: `200`
* **Response Assertion**:
  ```json
  {
    "status": "healthy",
    "service": "TradeX API Core",
    "components": {
      "database": "healthy",
      "redis": "healthy",
      "market_data": "not_configured",
      "trading_engine": "not_configured"
    }
  }
  ```

### 2.4 Database Connectivity (Neon PostgreSQL)
* **Monitor Name**: `TradeX - Neon PostgreSQL Health`
* **Monitor Type**: `HTTP(s)`
* **URL**: `http://localhost:8000/health/database`
* **Check Interval**: `30 seconds`
* **Timeout**: `10 seconds`
* **Expected Status Code**: `200`
* **Response Assertion**:
  ```json
  {
    "status": "healthy",
    "latency_ms": 1143.86,
    "database": "PostgreSQL"
  }
  ```
* **Failure Condition**: HTTP `503 Service Unavailable` when database connection fails or pool is exhausted.

### 2.5 Redis Connectivity (Upstash Redis)
* **Monitor Name**: `TradeX - Upstash Redis Health`
* **Monitor Type**: `HTTP(s)`
* **URL**: `http://localhost:8000/health/redis`
* **Check Interval**: `30 seconds`
* **Timeout**: `5 seconds`
* **Expected Status Code**: `200`
* **Response Assertion**:
  ```json
  {
    "status": "healthy",
    "latency_ms": 23.89
  }
  ```
* **Failure Condition**: HTTP `503 Service Unavailable` when Redis ping fails or TLS socket times out.

---

## 3. Summary Monitor Matrix

| Monitor Name | URL | Interval | Timeout | Target Status | Alert Trigger |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Frontend** | `http://localhost:3000` | 60s | 10s | 200 OK | > 2 consecutive fails |
| **Backend API** | `http://localhost:8000/` | 30s | 5s | 200 OK | > 2 consecutive fails |
| **Health Aggregator** | `http://localhost:8000/health` | 30s | 5s | 200 OK | Status != `healthy` |
| **Neon PostgreSQL** | `http://localhost:8000/health/database` | 30s | 10s | 200 OK | Status != `healthy` |
| **Upstash Redis** | `http://localhost:8000/health/redis` | 30s | 5s | 200 OK | Status != `healthy` |

---

## 4. Setup Procedure in Uptime Kuma

1. Open Uptime Kuma dashboard at `http://localhost:3001`.
2. Click **Add New Monitor**.
3. Fill in the parameters from the matrix above.
4. Set **Notification**: Configure Webhook, Discord, Slack, or Email for incident response.
5. Save monitor and verify initial heartbeat turns green.
