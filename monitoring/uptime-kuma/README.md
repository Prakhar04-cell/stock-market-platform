# BullRun Uptime Kuma Monitoring Guide

## Overview
BullRun uses Uptime Kuma as a self-hosted synthetic monitoring and alerting suite for platform health and availability.

> [!IMPORTANT]
> **Status: Ready for Configuration**
> Uptime Kuma is included in `docker-compose.yml` (running on port `3001`). Once running, monitors should be added following the specifications below. The system health dashboards inside BullRun (`/admin/monitoring`) will integrate these statuses.

---

## Planned Monitors Specification

| Monitor Name | Type | URL / Host | Interval | Expected Response / Status Code |
| :--- | :--- | :--- | :--- | :--- |
| **BullRun Frontend** | HTTP(s) | `http://frontend:3000/` | 60s | 200 OK |
| **BullRun Backend Core** | HTTP(s) | `http://backend:8000/health` | 30s | 200 OK (`{"status":"healthy"}`) |
| **BullRun Database Probe** | HTTP(s) | `http://backend:8000/health/database` | 30s | 200 OK (`{"status":"healthy"}`) |
| **BullRun Redis Probe** | HTTP(s) | `http://backend:8000/health/redis` | 30s | 200 OK (`{"status":"healthy"}`) |
| **BullRun System Metrics** | HTTP(s) | `http://backend:8000/health/system` | 60s | 200 OK (`{"status":"healthy"}`) |
| **Market Data Provider** | HTTP(s) | `http://backend:8000/health/market-data` | 60s | 200 OK (`{"status":"not_configured"}`) |
| **Trading Engine** | HTTP(s) | `http://backend:8000/health/trading-engine` | 60s | 200 OK (`{"status":"not_configured"}`) |

---

## Setup Instructions

1. Start Uptime Kuma via docker-compose:
   ```bash
   docker compose up -d uptime-kuma
   ```
2. Navigate to `http://localhost:3001` in your browser.
3. Complete initial admin account creation.
4. Add the monitors listed in the table above (see detailed guide in [docs/uptime-kuma-monitoring.md](../../docs/uptime-kuma-monitoring.md)).
5. Setup notification channels (Slack, Discord, Telegram, or Email Webhooks).
