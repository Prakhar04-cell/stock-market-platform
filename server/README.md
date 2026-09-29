# BullRun Server Architecture & Deployment

## Overview
This directory contains production and development server configurations, reverse proxy settings (Nginx), and Docker Compose environment orchestration.

---

## Directory Layout
```
server/
├── docker-compose.yml     # Multi-container orchestration (FastAPI, Next.js, Postgres, Redis)
├── nginx/
│   └── nginx.conf         # High-performance reverse proxy for HTTP and WebSockets
└── README.md              # Server configuration guide (this file)
```

---

## Service Architecture
- **Reverse Proxy / Gateway:** Nginx listening on port 80/443, proxying `/api/` and WebSocket `/api/v1/ws/` to FastAPI, and all UI requests to Next.js.
- **Frontend Container:** Next.js Node.js server running on port 3000.
- **Backend Container:** FastAPI / Uvicorn server running on port 8000 with 4 workers.
- **Database:** PostgreSQL (Neon cloud or containerized Postgres 16).
- **Cache / PubSub:** Redis 7 for real-time market data streaming and WebSocket connection state tracking.

---

## Running Server Services
```bash
# Start all containers in background
docker-compose -f server/docker-compose.yml up -d

# Check container logs
docker-compose -f server/docker-compose.yml logs -f backend

# Stop all containers
docker-compose -f server/docker-compose.yml down
```
