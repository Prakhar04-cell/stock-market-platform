# BullRun Database Architecture & Schema

## Overview
BullRun uses **Neon PostgreSQL** (with `asyncpg` for FastAPI asynchronous queries and standard `psycopg2`/SQLAlchemy for synchronous tasks) alongside **Redis** for sub-millisecond market price caching and session management. A MySQL compatible DDL is also maintained for cross-database reporting.

---

## Directory Structure
```
database/
├── schema/
│   ├── bullrun_schema.sql       # Canonical SQL Schema (DDL)
│   └── MYSQL_SCHEMA_REPORT.md   # Schema audit, constraints, & indexes report
├── migrations/                  # Database migration version scripts
├── seeds/                       # Test & initial market symbol seed data
├── backups/                     # Database dump backups & restore scripts
├── bullrun_schema.sql           # Root copy of production DDL schema
└── README.md                    # Database documentation (this file)
```

---

## Core Entities & Tables

1. **`users`**:
   - `id` (UUID/VARCHAR, Primary Key)
   - `email` (VARCHAR, Unique, Indexed)
   - `password_hash` (VARCHAR)
   - `full_name` (VARCHAR)
   - `phone` (VARCHAR)
   - `role` (VARCHAR: `TRADER`, `ADMIN`)
   - `is_verified` (BOOLEAN)
   - `created_at`, `updated_at` (TIMESTAMP)

2. **`wallets` / `balances`**:
   - `id` (UUID, Primary Key)
   - `user_id` (UUID, Foreign Key -> `users.id`)
   - `cash_balance` (DECIMAL(15,2))
   - `available_cash` (DECIMAL(15,2))
   - `reserved_margin` (DECIMAL(15,2))
   - `currency` (VARCHAR, default `INR`)

3. **`stocks` / `instruments`**:
   - `id` (VARCHAR, Primary Key)
   - `symbol` (VARCHAR, Unique, Indexed: e.g. `RELIANCE`, `TCS`)
   - `name` (VARCHAR)
   - `exchange_code` (VARCHAR: `NSE`, `BSE`)
   - `instrument_key` (VARCHAR, Indexed: e.g. `NSE_EQ|INE002A01018`)
   - `lot_size` (INT)
   - `tick_size` (DECIMAL(6,2))
   - `is_active` (BOOLEAN)

4. **`orders`**:
   - `id` (VARCHAR, Primary Key, e.g. `ORD-...`)
   - `user_id` (UUID, Foreign Key -> `users.id`)
   - `stock_id` (VARCHAR, Foreign Key -> `stocks.id`)
   - `symbol` (VARCHAR)
   - `side` (ENUM: `BUY`, `SELL`)
   - `order_type` (ENUM: `MARKET`, `LIMIT`, `SL`, `SL-M`)
   - `product_type` (ENUM: `CNC`, `MIS`, `NRML`)
   - `quantity` (INT)
   - `filled_quantity` (INT, default 0)
   - `price` (DECIMAL(12,2))
   - `trigger_price` (DECIMAL(12,2))
   - `status` (ENUM: `PENDING`, `OPEN`, `FILLED`, `CANCELLED`, `REJECTED`)
   - `trade_charges` (DECIMAL(8,2))
   - `created_at`, `updated_at` (TIMESTAMP)

5. **`holdings`**:
   - `id` (UUID, Primary Key)
   - `user_id` (UUID, Foreign Key -> `users.id`)
   - `stock_id` (VARCHAR, Foreign Key -> `stocks.id`)
   - `symbol` (VARCHAR)
   - `quantity` (INT)
   - `average_buy_price` (DECIMAL(12,2))
   - `invested_value` (DECIMAL(15,2))
   - `created_at`, `updated_at` (TIMESTAMP)

6. **`positions`**:
   - `id` (UUID, Primary Key)
   - `user_id` (UUID, Foreign Key -> `users.id`)
   - `symbol` (VARCHAR)
   - `product_type` (VARCHAR: `MIS`, `CNC`)
   - `side` (VARCHAR: `BUY`, `SELL`)
   - `quantity` (INT)
   - `entry_price` (DECIMAL(12,2))
   - `status` (VARCHAR: `OPEN`, `CLOSED`)
   - `realized_pnl` (DECIMAL(12,2))

7. **`watchlists` & `watchlist_items`**:
   - User custom watchlists containing stock symbols.

8. **`notifications`**:
   - System, price alert, and order execution notifications.

---

## Alembic Migration Workflow
Migrations are managed in `backend/alembic`:
```bash
# Apply pending migrations
alembic upgrade head

# Create a new migration revision
alembic revision --autogenerate -m "description_of_changes"
```
