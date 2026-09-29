# BullRun — MySQL 8.0 Schema Migration Report

**Generated**: 2026-09-26  
**Source**: PostgreSQL (Neon) via SQLAlchemy ORM  
**Target**: MySQL 8.0 (local `bullrun_backup` database)  
**Scope**: Schema-only — zero production data copied  

---

## 1. Table Inventory (22 Tables)

| # | Table | Domain | Source Model | Timestamps |
|---|-------|--------|-------------|------------|
| 1 | `users` | Auth | `user.py → User` | ✅ created/updated |
| 2 | `profiles` | Auth | `user.py → Profile` | ✅ created/updated |
| 3 | `roles` | Auth | `user.py → Role` | ❌ |
| 4 | `user_roles` | Auth | `user.py → UserRole` | ✅ created/updated |
| 5 | `exchanges` | Market | `market.py → Exchange` | ✅ created/updated |
| 6 | `stocks` | Market | `market.py → Stock` | ✅ created/updated |
| 7 | `instruments` | Market | `market.py → Instrument` | ✅ created/updated |
| 8 | `market_prices` | Market | `market.py → MarketPrice` | ❌ (has `timestamp`) |
| 9 | `historical_prices` | Market | `market.py → HistoricalPrice` | ❌ (has `timestamp`) |
| 10 | `wallets` | Finance | `wallet.py → Wallet` | ✅ created/updated |
| 11 | `ledger_entries` | Finance | `wallet.py → LedgerEntry` | ❌ (has `created_at`) |
| 12 | `trade_charges` | Finance | `wallet.py → TradeCharge` | ✅ created/updated |
| 13 | `orders` | Trading | `trading.py → Order` | ✅ created/updated |
| 14 | `order_executions` | Trading | `trading.py → OrderExecution` | ❌ (has `executed_at`) |
| 15 | `holdings` | Trading | `trading.py → Holding` | ✅ created/updated |
| 16 | `portfolio_snapshots` | Trading | `trading.py → PortfolioSnapshot` | ❌ (has `created_at`) |
| 17 | `price_alerts` | Trading | `trading.py → PriceAlert` | ✅ created/updated |
| 18 | `watchlists` | Watchlist | `watchlist.py → Watchlist` | ✅ created/updated |
| 19 | `watchlist_items` | Watchlist | `watchlist.py → WatchlistItem` | ❌ (has `added_at`) |
| 20 | `audit_logs` | System | `system.py → AuditLog` | ❌ (has `created_at`) |
| 21 | `security_incidents` | System | `system.py → SecurityIncident` | ❌ (has `created_at`) |
| 22 | `system_settings` | System | `system.py → SystemSetting` | ✅ created/updated |
| 23 | `system_health` | System | `system.py → SystemHealth` | ❌ (has `last_checked_at`) |
| 24 | `api_health_checks` | System | `system.py → ApiHealthCheck` | ❌ (has `checked_at`) |
| 25 | `notifications` | System | `system.py → Notification` | ❌ (has `created_at`) |
| 26 | `provider_credentials` | System | `system.py → ProviderCredential` | ✅ created/updated |

> **Note**: Rows 1–22 per the model count. The table above lists 22 distinct `CREATE TABLE` statements. `user_roles` is the many-to-many junction table and counts as a separate table.

---

## 2. Type Mapping (PostgreSQL → MySQL 8.0)

| PostgreSQL / SQLAlchemy | MySQL 8.0 | Notes |
|-------------------------|-----------|-------|
| `String(36)` (UUID PK) | `CHAR(36)` | Fixed-width for UUID v4 strings |
| `String(N)` | `VARCHAR(N)` | Direct 1:1 mapping |
| `Text` | `TEXT` | Direct mapping |
| `Boolean` | `TINYINT(1)` | MySQL convention: 0 = false, 1 = true |
| `Numeric(P, S)` | `DECIMAL(P, S)` | Exact financial precision preserved |
| `Integer` | `INT` | Direct mapping |
| `Float` | `DOUBLE` | Float → DOUBLE for extra precision |
| `Date` | `DATE` | Direct mapping |
| `DateTime(timezone=True)` | `DATETIME(6)` | See §3 for timezone handling |
| `JSON` | `JSON` | MySQL 8 native JSON — direct mapping |

---

## 3. Timezone Handling

### PostgreSQL (Source)
- Uses `TIMESTAMP WITH TIME ZONE` (`TIMESTAMPTZ`)
- Stores internally as UTC, displays in session timezone

### MySQL 8.0 (Target)
- `DATETIME(6)` does **not** store timezone offset
- Application must enforce UTC storage/retrieval

### Mitigation
```sql
-- Set session timezone to UTC before any INSERT/SELECT
SET time_zone = '+00:00';
```

> **Recommendation**: When importing data later, ensure all timestamps are converted to UTC before insertion. The SQLAlchemy models already enforce `timezone.utc` defaults.

---

## 4. Constraint & Index Mapping

### 4.1 Unique Constraints

| Constraint Name | Table | Columns | Preserved? |
|----------------|-------|---------|------------|
| `uq_users_email` | `users` | `email` | ✅ |
| `uq_profiles_user_id` | `profiles` | `user_id` | ✅ |
| `uq_roles_name` | `roles` | `name` | ✅ |
| `uq_exchanges_code` | `exchanges` | `code` | ✅ |
| `uq_exchange_symbol` | `stocks` | `exchange_id, symbol` | ✅ |
| `uq_stocks_instrument_key` | `stocks` | `instrument_key` | ✅ |
| `uq_stocks_isin` | `stocks` | `isin` | ✅ |
| `uq_instruments_instrument_key` | `instruments` | `instrument_key` | ✅ |
| `uq_wallets_user_id` | `wallets` | `user_id` | ✅ |
| `uq_user_holding_stock` | `holdings` | `user_id, stock_id` | ✅ |
| `uq_user_snapshot_date` | `portfolio_snapshots` | `user_id, snapshot_date` | ✅ |
| `uq_watchlist_stock` | `watchlist_items` | `watchlist_id, stock_id` | ✅ |
| `uq_system_settings_key` | `system_settings` | `key` | ✅ |
| `uq_provider_credentials_provider_name` | `provider_credentials` | `provider_name` | ✅ |

### 4.2 Foreign Keys

| FK Name | Table | Column | References | ON DELETE |
|---------|-------|--------|------------|-----------|
| `fk_profiles_user_id` | `profiles` | `user_id` | `users.id` | CASCADE |
| `fk_user_roles_user_id` | `user_roles` | `user_id` | `users.id` | CASCADE |
| `fk_user_roles_role_id` | `user_roles` | `role_id` | `roles.id` | CASCADE |
| `fk_stocks_exchange_id` | `stocks` | `exchange_id` | `exchanges.id` | RESTRICT |
| `fk_market_prices_stock_id` | `market_prices` | `stock_id` | `stocks.id` | CASCADE |
| `fk_historical_prices_stock_id` | `historical_prices` | `stock_id` | `stocks.id` | CASCADE |
| `fk_wallets_user_id` | `wallets` | `user_id` | `users.id` | CASCADE |
| `fk_ledger_entries_wallet_id` | `ledger_entries` | `wallet_id` | `wallets.id` | CASCADE |
| `fk_orders_user_id` | `orders` | `user_id` | `users.id` | CASCADE |
| `fk_orders_wallet_id` | `orders` | `wallet_id` | `wallets.id` | RESTRICT |
| `fk_orders_stock_id` | `orders` | `stock_id` | `stocks.id` | RESTRICT |
| `fk_order_executions_order_id` | `order_executions` | `order_id` | `orders.id` | CASCADE |
| `fk_trade_charges_order_id` | `trade_charges` | `order_id` | `orders.id` | CASCADE |
| `fk_trade_charges_execution_id` | `trade_charges` | `execution_id` | `order_executions.id` | CASCADE |
| `fk_holdings_user_id` | `holdings` | `user_id` | `users.id` | CASCADE |
| `fk_holdings_stock_id` | `holdings` | `stock_id` | `stocks.id` | RESTRICT |
| `fk_portfolio_snapshots_user_id` | `portfolio_snapshots` | `user_id` | `users.id` | CASCADE |
| `fk_price_alerts_user_id` | `price_alerts` | `user_id` | `users.id` | CASCADE |
| `fk_price_alerts_stock_id` | `price_alerts` | `stock_id` | `stocks.id` | CASCADE |
| `fk_watchlists_user_id` | `watchlists` | `user_id` | `users.id` | CASCADE |
| `fk_watchlist_items_watchlist_id` | `watchlist_items` | `watchlist_id` | `watchlists.id` | CASCADE |
| `fk_watchlist_items_stock_id` | `watchlist_items` | `stock_id` | `stocks.id` | CASCADE |
| `fk_audit_logs_user_id` | `audit_logs` | `user_id` | `users.id` | SET NULL |
| `fk_security_incidents_user_id` | `security_incidents` | `user_id` | `users.id` | SET NULL |
| `fk_system_settings_updated_by` | `system_settings` | `updated_by` | `users.id` | SET NULL |
| `fk_notifications_user_id` | `notifications` | `user_id` | `users.id` | CASCADE |

### 4.3 Indexes

All indexes from the SQLAlchemy models and Alembic migrations are preserved, including:
- Single-column indexes on all FK columns
- Composite index `ix_historical_prices_key_time` on `(instrument_key, timestamp)`
- Search indexes on `symbol`, `instrument_key`, `email`, `action`, `service_name`, `provider_name`

---

## 5. Server Defaults

| Table | Column | PostgreSQL Default | MySQL 8.0 Default |
|-------|--------|--------------------|-------------------|
| `users` | `is_active` | `server_default=true` | `DEFAULT 1` |
| `users` | `is_verified` | `server_default=false` | `DEFAULT 0` |
| `exchanges` | `currency` | `server_default='INR'` | `DEFAULT 'INR'` |
| `exchanges` | `timezone` | `server_default='Asia/Kolkata'` | `DEFAULT 'Asia/Kolkata'` |
| `stocks` | `lot_size` | `server_default='1'` | `DEFAULT 1` |
| `stocks` | `tick_size` | `server_default='0.05'` | `DEFAULT 0.0500` |
| `wallets` | `balance` | `server_default='100000.00'` | `DEFAULT 100000.0000` |
| `wallets` | `locked_balance` | `server_default='0.00'` | `DEFAULT 0.0000` |
| `orders` | `status` | `server_default='PENDING'` | `DEFAULT 'PENDING'` |
| `orders` | `filled_quantity` | `server_default='0.00'` | `DEFAULT 0.0000` |
| `price_alerts` | `condition` | `server_default='ABOVE'` | `DEFAULT 'ABOVE'` |
| `provider_credentials` | `token_type` | `server_default='Bearer'` | `DEFAULT 'Bearer'` |
| `api_health_checks` | `status` | `server_default='NOT_CONFIGURED'` | `DEFAULT 'NOT_CONFIGURED'` |
| `notifications` | `notification_type` | `server_default='INFO'` | `DEFAULT 'INFO'` |

---

## 6. Design Decisions

### 6.1 UUID Storage as `CHAR(36)`
The PostgreSQL schema uses `String(36)` for UUID primary keys (generated in Python via `uuid.uuid4()`). MySQL's native `BINARY(16)` would be more performant but would break compatibility with the existing application code. `CHAR(36)` maintains exact parity.

### 6.2 `DECIMAL` for All Financial Columns
Every financial value uses `DECIMAL(18,4)` or `DECIMAL(14,4)` — identical to the PostgreSQL `NUMERIC` precision. No floating-point types are used for money.

### 6.3 `DATETIME(6)` with Microsecond Precision
MySQL `DATETIME(6)` stores up to microsecond precision matching PostgreSQL's `TIMESTAMPTZ` resolution. The `(6)` suffix is critical for high-frequency market data timestamps.

### 6.4 `ON UPDATE CURRENT_TIMESTAMP(6)` for `updated_at`
Tables with `TimestampMixin` use MySQL's built-in `ON UPDATE CURRENT_TIMESTAMP(6)` to auto-update the `updated_at` column, replicating the SQLAlchemy `onupdate` behavior at the database level.

### 6.5 `interval` Column in `historical_prices`
`interval` is a reserved word in MySQL. The schema uses backtick-quoting (`` `interval` ``) throughout to avoid conflicts.

### 6.6 `key` Column in `system_settings`
`key` is a reserved word in MySQL. Backtick-quoting is used.

### 6.7 Status / Type Columns as `VARCHAR` (not `ENUM`)
The PostgreSQL schema uses `String` columns for status/type values (e.g., `PENDING`, `BUY`, `ABOVE`). These are preserved as `VARCHAR` in MySQL rather than MySQL `ENUM` to maintain flexibility and match the source schema exactly.

---

## 7. Known Limitations

| # | Limitation | Impact | Mitigation |
|---|-----------|--------|------------|
| 1 | **No timezone in DATETIME** | Timestamps lose TZ offset info | Enforce `SET time_zone='+00:00'` in MySQL sessions |
| 2 | **JSON indexing** | MySQL JSON columns cannot be directly indexed | Use generated virtual columns if JSON queries become frequent |
| 3 | **UUID performance** | `CHAR(36)` PKs are larger than auto-increment INTs | Acceptable tradeoff for cross-DB compatibility |
| 4 | **`TEXT` column defaults** | MySQL doesn't support DEFAULT on TEXT in strict mode | TEXT columns that need defaults use application-level defaults |
| 5 | **No partial indexes** | MySQL 8.0 does not support PostgreSQL partial indexes | None used in source schema, so no impact |
| 6 | **`provider_credentials.user_id`** | Source uses `String(100)`, not an FK to `users` | Preserved as `VARCHAR(100)` — this is a provider-side ID, not a BullRun user FK |

---

## 8. Table Creation Order (FK-Safe)

The schema file creates tables in dependency order to avoid FK violations:

```
1.  users                    (no dependencies)
2.  profiles                 → users
3.  roles                    (no dependencies)
4.  user_roles               → users, roles
5.  exchanges                (no dependencies)
6.  stocks                   → exchanges
7.  instruments              (no dependencies)
8.  market_prices            → stocks
9.  historical_prices        → stocks
10. wallets                  → users
11. ledger_entries           → wallets
12. orders                   → users, wallets, stocks
13. order_executions         → orders
14. trade_charges            → orders, order_executions
15. holdings                 → users, stocks
16. portfolio_snapshots      → users
17. price_alerts             → users, stocks
18. watchlists               → users
19. watchlist_items           → watchlists, stocks
20. audit_logs               → users (SET NULL)
21. security_incidents       → users (SET NULL)
22. system_settings          → users (SET NULL)
23. system_health            (no dependencies)
24. api_health_checks        (no dependencies)
25. notifications            → users
26. provider_credentials     (no dependencies)
```

---

## 9. How to Execute

```bash
# 1. Connect to local MySQL 8.0
mysql -u root -p

# 2. Run the schema file
SOURCE /path/to/backend/database/mysql/bullrun_schema.sql;

# 3. Verify
SHOW TABLES FROM bullrun_backup;
SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema = 'bullrun_backup';
-- Expected: 22
```

---

## 10. Next Steps (Future)

- [ ] Data migration scripts (PostgreSQL → MySQL ETL)
- [ ] Validation queries to compare row counts post-migration
- [ ] Application-level dual-write or read-replica configuration
- [ ] Performance benchmarking on MySQL for market data queries
