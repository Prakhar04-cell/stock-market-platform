-- ============================================================================
-- BullRun — MySQL 8.0 Schema  (schema-only, no production data)
-- Source of truth: backend/app/models/ + backend/alembic/versions/
-- Generated: 2026-09-26
-- ============================================================================
-- Engine  : InnoDB  (ACID, FK support)
-- Charset : utf8mb4 / utf8mb4_unicode_ci
-- Financials : DECIMAL(18,4) — mirrors PostgreSQL NUMERIC(18,4)
-- PKs     : CHAR(36) UUIDs stored as strings (matches SQLAlchemy String(36))
-- Booleans: TINYINT(1) with DEFAULT 0/1
-- JSON    : MySQL 8 native JSON type
-- Timestamps: DATETIME(6) — microsecond precision, UTC
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `bullrun_backup`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `bullrun_backup`;

-- ============================================================================
-- 1. USERS & AUTH
-- ============================================================================

CREATE TABLE `users` (
  `id`              CHAR(36)     NOT NULL,
  `email`           VARCHAR(255) NOT NULL,
  `hashed_password` VARCHAR(255) NOT NULL,
  `is_active`       TINYINT(1)   NOT NULL DEFAULT 1,
  `is_verified`     TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  INDEX `ix_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `profiles` (
  `id`          CHAR(36)     NOT NULL,
  `user_id`     CHAR(36)     NOT NULL,
  `first_name`  VARCHAR(100) DEFAULT NULL,
  `last_name`   VARCHAR(100) DEFAULT NULL,
  `phone`       VARCHAR(20)  DEFAULT NULL,
  `avatar_url`  VARCHAR(255) DEFAULT NULL,
  `preferences` JSON         DEFAULT NULL,
  `created_at`  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_profiles_user_id` (`user_id`),
  INDEX `ix_profiles_user_id` (`user_id`),
  CONSTRAINT `fk_profiles_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `roles` (
  `id`          CHAR(36)     NOT NULL,
  `name`        VARCHAR(50)  NOT NULL  COMMENT 'e.g. TRADER, ADMIN',
  `description` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_name` (`name`),
  INDEX `ix_roles_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `user_roles` (
  `id`         CHAR(36)    NOT NULL,
  `user_id`    CHAR(36)    NOT NULL,
  `role_id`    CHAR(36)    NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `ix_user_roles_user_id` (`user_id`),
  INDEX `ix_user_roles_role_id` (`role_id`),
  CONSTRAINT `fk_user_roles_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 2. EXCHANGES & MARKET DATA
-- ============================================================================

CREATE TABLE `exchanges` (
  `id`         CHAR(36)     NOT NULL,
  `code`       VARCHAR(20)  NOT NULL  COMMENT 'NSE, BSE, NASDAQ',
  `name`       VARCHAR(100) NOT NULL,
  `currency`   VARCHAR(10)  NOT NULL DEFAULT 'INR',
  `timezone`   VARCHAR(50)  NOT NULL DEFAULT 'Asia/Kolkata',
  `is_active`  TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at` DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_exchanges_code` (`code`),
  INDEX `ix_exchanges_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `stocks` (
  `id`             CHAR(36)      NOT NULL,
  `exchange_id`    CHAR(36)      NOT NULL,
  `symbol`         VARCHAR(30)   NOT NULL  COMMENT 'e.g. RELIANCE, TCS, INFY',
  `instrument_key` VARCHAR(100)  DEFAULT NULL COMMENT 'Upstox key e.g. NSE_EQ|INE002A01018',
  `name`           VARCHAR(150)  NOT NULL,
  `isin`           VARCHAR(30)   DEFAULT NULL,
  `sector`         VARCHAR(100)  DEFAULT NULL,
  `is_tradable`    TINYINT(1)    NOT NULL DEFAULT 1,
  `lot_size`       INT           NOT NULL DEFAULT 1,
  `tick_size`      DECIMAL(10,4) NOT NULL DEFAULT 0.0500,
  `created_at`     DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`     DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_exchange_symbol` (`exchange_id`, `symbol`),
  UNIQUE KEY `uq_stocks_instrument_key` (`instrument_key`),
  UNIQUE KEY `uq_stocks_isin` (`isin`),
  INDEX `ix_stocks_symbol` (`symbol`),
  INDEX `ix_stocks_instrument_key` (`instrument_key`),
  INDEX `ix_stocks_exchange_id` (`exchange_id`),
  CONSTRAINT `fk_stocks_exchange_id` FOREIGN KEY (`exchange_id`) REFERENCES `exchanges` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `instruments` (
  `id`              CHAR(36)      NOT NULL,
  `instrument_key`  VARCHAR(100)  NOT NULL  COMMENT 'Primary provider identifier',
  `symbol`          VARCHAR(50)   NOT NULL,
  `trading_symbol`  VARCHAR(100)  NOT NULL,
  `name`            VARCHAR(200)  NOT NULL,
  `exchange`        VARCHAR(20)   NOT NULL  COMMENT 'NSE, BSE, MCX',
  `segment`         VARCHAR(30)   NOT NULL  COMMENT 'NSE_EQ, NSE_INDEX, BSE_EQ, etc.',
  `instrument_type` VARCHAR(30)   NOT NULL  COMMENT 'EQ, INDEX, FUT, OPT, COM',
  `isin`            VARCHAR(50)   DEFAULT NULL,
  `lot_size`        INT           NOT NULL DEFAULT 1,
  `tick_size`       DECIMAL(10,4) NOT NULL DEFAULT 0.0500,
  `expiry`          DATETIME(6)   DEFAULT NULL,
  `strike_price`    DECIMAL(18,4) DEFAULT NULL,
  `underlying_key`  VARCHAR(100)  DEFAULT NULL,
  `created_at`      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_instruments_instrument_key` (`instrument_key`),
  INDEX `ix_instruments_instrument_key` (`instrument_key`),
  INDEX `ix_instruments_symbol` (`symbol`),
  INDEX `ix_instruments_trading_symbol` (`trading_symbol`),
  INDEX `ix_instruments_exchange` (`exchange`),
  INDEX `ix_instruments_segment` (`segment`),
  INDEX `ix_instruments_isin` (`isin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `market_prices` (
  `id`             CHAR(36)      NOT NULL,
  `stock_id`       CHAR(36)      NOT NULL,
  `instrument_key` VARCHAR(100)  DEFAULT NULL,
  `open`           DECIMAL(18,4) DEFAULT NULL,
  `high`           DECIMAL(18,4) DEFAULT NULL,
  `low`            DECIMAL(18,4) DEFAULT NULL,
  `close`          DECIMAL(18,4) DEFAULT NULL,
  `ltp`            DECIMAL(18,4) DEFAULT NULL COMMENT 'Last Traded Price',
  `volume`         INT           DEFAULT NULL,
  `change`         DECIMAL(18,4) DEFAULT NULL,
  `change_percent` DECIMAL(10,4) DEFAULT NULL,
  `timestamp`      DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `ix_market_prices_stock_id` (`stock_id`),
  INDEX `ix_market_prices_instrument_key` (`instrument_key`),
  INDEX `ix_market_prices_timestamp` (`timestamp`),
  CONSTRAINT `fk_market_prices_stock_id` FOREIGN KEY (`stock_id`) REFERENCES `stocks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `historical_prices` (
  `id`             CHAR(36)      NOT NULL,
  `stock_id`       CHAR(36)      NOT NULL,
  `instrument_key` VARCHAR(100)  DEFAULT NULL,
  `interval`       VARCHAR(20)   NOT NULL DEFAULT '1D' COMMENT '1m, 5m, 15m, 1h, 1D',
  `open`           DECIMAL(18,4) NOT NULL,
  `high`           DECIMAL(18,4) NOT NULL,
  `low`            DECIMAL(18,4) NOT NULL,
  `close`          DECIMAL(18,4) NOT NULL,
  `volume`         INT           NOT NULL DEFAULT 0,
  `timestamp`      DATETIME(6)   NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `ix_historical_prices_stock_id` (`stock_id`),
  INDEX `ix_historical_prices_instrument_key` (`instrument_key`),
  INDEX `ix_historical_prices_timestamp` (`timestamp`),
  INDEX `ix_historical_prices_key_time` (`instrument_key`, `timestamp`),
  CONSTRAINT `fk_historical_prices_stock_id` FOREIGN KEY (`stock_id`) REFERENCES `stocks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 3. WALLETS & LEDGER
-- ============================================================================

CREATE TABLE `wallets` (
  `id`             CHAR(36)      NOT NULL,
  `user_id`        CHAR(36)      NOT NULL,
  `currency`       VARCHAR(10)   NOT NULL DEFAULT 'INR',
  `balance`        DECIMAL(18,4) NOT NULL DEFAULT 100000.0000,
  `locked_balance` DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  `created_at`     DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`     DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wallets_user_id` (`user_id`),
  INDEX `ix_wallets_user_id` (`user_id`),
  CONSTRAINT `fk_wallets_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `ledger_entries` (
  `id`               CHAR(36)      NOT NULL,
  `wallet_id`        CHAR(36)      NOT NULL,
  `transaction_type` VARCHAR(50)   NOT NULL  COMMENT 'DEPOSIT, WITHDRAWAL, ORDER_LOCK, ORDER_UNLOCK, TRADE_BUY, TRADE_SELL, CHARGES',
  `amount`           DECIMAL(18,4) NOT NULL,
  `balance_after`    DECIMAL(18,4) NOT NULL,
  `reference_id`     VARCHAR(100)  DEFAULT NULL COMMENT 'e.g. order_id or admin action',
  `description`      TEXT          DEFAULT NULL,
  `created_at`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `ix_ledger_entries_wallet_id` (`wallet_id`),
  INDEX `ix_ledger_entries_reference_id` (`reference_id`),
  INDEX `ix_ledger_entries_created_at` (`created_at`),
  CONSTRAINT `fk_ledger_entries_wallet_id` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 4. ORDERS, EXECUTIONS, HOLDINGS, PORTFOLIO
-- ============================================================================

CREATE TABLE `orders` (
  `id`                       CHAR(36)      NOT NULL,
  `user_id`                  CHAR(36)      NOT NULL,
  `wallet_id`                CHAR(36)      NOT NULL,
  `stock_id`                 CHAR(36)      NOT NULL,
  `order_type`               VARCHAR(20)   NOT NULL  COMMENT 'MARKET, LIMIT, STOP, STOP_LIMIT',
  `side`                     VARCHAR(10)   NOT NULL  COMMENT 'BUY, SELL',
  `quantity`                 DECIMAL(14,4) NOT NULL,
  `price`                    DECIMAL(18,4) DEFAULT NULL COMMENT 'Limit price',
  `stop_price`               DECIMAL(18,4) DEFAULT NULL COMMENT 'Trigger price',
  `status`                   VARCHAR(30)   NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, OPEN, PARTIALLY_FILLED, FILLED, CANCELLED, REJECTED, EXPIRED',
  `filled_quantity`          DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
  `average_execution_price`  DECIMAL(18,4) DEFAULT NULL,
  `created_at`               DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`               DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `ix_orders_user_id` (`user_id`),
  INDEX `ix_orders_wallet_id` (`wallet_id`),
  INDEX `ix_orders_stock_id` (`stock_id`),
  INDEX `ix_orders_status` (`status`),
  CONSTRAINT `fk_orders_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_orders_wallet_id` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_orders_stock_id` FOREIGN KEY (`stock_id`) REFERENCES `stocks` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `order_executions` (
  `id`                CHAR(36)      NOT NULL,
  `order_id`          CHAR(36)      NOT NULL,
  `execution_price`   DECIMAL(18,4) NOT NULL,
  `executed_quantity`  DECIMAL(14,4) NOT NULL,
  `trade_charges`     DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  `executed_at`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `exchange_trade_id` VARCHAR(100)  DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `ix_order_executions_order_id` (`order_id`),
  INDEX `ix_order_executions_executed_at` (`executed_at`),
  INDEX `ix_order_executions_exchange_trade_id` (`exchange_trade_id`),
  CONSTRAINT `fk_order_executions_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `trade_charges` (
  `id`                 CHAR(36)      NOT NULL,
  `order_id`           CHAR(36)      DEFAULT NULL,
  `execution_id`       CHAR(36)      DEFAULT NULL,
  `brokerage`          DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  `stt`                DECIMAL(18,4) NOT NULL DEFAULT 0.0000  COMMENT 'Securities Transaction Tax',
  `exchange_turnover`  DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  `stamp_duty`         DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  `sebi_turnover`      DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  `gst`                DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  `total_charges`      DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  `created_at`         DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`         DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `ix_trade_charges_order_id` (`order_id`),
  INDEX `ix_trade_charges_execution_id` (`execution_id`),
  CONSTRAINT `fk_trade_charges_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_trade_charges_execution_id` FOREIGN KEY (`execution_id`) REFERENCES `order_executions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `holdings` (
  `id`                CHAR(36)      NOT NULL,
  `user_id`           CHAR(36)      NOT NULL,
  `stock_id`          CHAR(36)      NOT NULL,
  `quantity`          DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
  `average_buy_price` DECIMAL(18,4) NOT NULL,
  `created_at`        DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`        DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_holding_stock` (`user_id`, `stock_id`),
  INDEX `ix_holdings_user_id` (`user_id`),
  INDEX `ix_holdings_stock_id` (`stock_id`),
  CONSTRAINT `fk_holdings_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_holdings_stock_id` FOREIGN KEY (`stock_id`) REFERENCES `stocks` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `portfolio_snapshots` (
  `id`                    CHAR(36)      NOT NULL,
  `user_id`               CHAR(36)      NOT NULL,
  `snapshot_date`         DATE          NOT NULL,
  `total_invested_value`  DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  `total_market_value`    DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  `unrealized_pnl`        DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  `realized_pnl`          DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  `cash_balance`          DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
  `created_at`            DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_snapshot_date` (`user_id`, `snapshot_date`),
  INDEX `ix_portfolio_snapshots_user_id` (`user_id`),
  INDEX `ix_portfolio_snapshots_snapshot_date` (`snapshot_date`),
  CONSTRAINT `fk_portfolio_snapshots_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `price_alerts` (
  `id`           CHAR(36)      NOT NULL,
  `user_id`      CHAR(36)      NOT NULL,
  `stock_id`     CHAR(36)      NOT NULL,
  `target_price` DECIMAL(18,4) NOT NULL,
  `condition`    VARCHAR(10)   NOT NULL DEFAULT 'ABOVE' COMMENT 'ABOVE, BELOW',
  `is_triggered` TINYINT(1)    NOT NULL DEFAULT 0,
  `is_active`    TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`   DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`   DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `ix_price_alerts_user_id` (`user_id`),
  INDEX `ix_price_alerts_stock_id` (`stock_id`),
  CONSTRAINT `fk_price_alerts_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_price_alerts_stock_id` FOREIGN KEY (`stock_id`) REFERENCES `stocks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 5. WATCHLISTS
-- ============================================================================

CREATE TABLE `watchlists` (
  `id`         CHAR(36)     NOT NULL,
  `user_id`    CHAR(36)     NOT NULL,
  `name`       VARCHAR(100) NOT NULL,
  `is_default` TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at` DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `ix_watchlists_user_id` (`user_id`),
  CONSTRAINT `fk_watchlists_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `watchlist_items` (
  `id`            CHAR(36)    NOT NULL,
  `watchlist_id`  CHAR(36)    NOT NULL,
  `stock_id`      CHAR(36)    NOT NULL,
  `display_order` INT         NOT NULL DEFAULT 0,
  `added_at`      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_watchlist_stock` (`watchlist_id`, `stock_id`),
  INDEX `ix_watchlist_items_watchlist_id` (`watchlist_id`),
  INDEX `ix_watchlist_items_stock_id` (`stock_id`),
  CONSTRAINT `fk_watchlist_items_watchlist_id` FOREIGN KEY (`watchlist_id`) REFERENCES `watchlists` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_watchlist_items_stock_id` FOREIGN KEY (`stock_id`) REFERENCES `stocks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 6. SYSTEM, AUDIT & OPERATIONS
-- ============================================================================

CREATE TABLE `audit_logs` (
  `id`          CHAR(36)     NOT NULL,
  `user_id`     CHAR(36)     DEFAULT NULL,
  `action`      VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50)  NOT NULL,
  `entity_id`   VARCHAR(50)  DEFAULT NULL,
  `old_values`  JSON         DEFAULT NULL,
  `new_values`  JSON         DEFAULT NULL,
  `ip_address`  VARCHAR(50)  DEFAULT NULL,
  `user_agent`  VARCHAR(255) DEFAULT NULL,
  `created_at`  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `ix_audit_logs_user_id` (`user_id`),
  INDEX `ix_audit_logs_action` (`action`),
  INDEX `ix_audit_logs_created_at` (`created_at`),
  CONSTRAINT `fk_audit_logs_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `security_incidents` (
  `id`            CHAR(36)     NOT NULL,
  `incident_type` VARCHAR(100) NOT NULL,
  `severity`      VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM' COMMENT 'LOW, MEDIUM, HIGH, CRITICAL',
  `description`   TEXT         NOT NULL,
  `ip_address`    VARCHAR(50)  DEFAULT NULL,
  `user_agent`    VARCHAR(255) DEFAULT NULL,
  `user_id`       CHAR(36)     DEFAULT NULL,
  `resolved`      TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `ix_security_incidents_incident_type` (`incident_type`),
  INDEX `ix_security_incidents_created_at` (`created_at`),
  CONSTRAINT `fk_security_incidents_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `system_settings` (
  `id`          CHAR(36)     NOT NULL,
  `key`         VARCHAR(100) NOT NULL  COMMENT 'e.g. INITIAL_PAPER_BALANCE, MAINTENANCE_MODE',
  `value`       TEXT         NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `updated_by`  CHAR(36)     DEFAULT NULL,
  `created_at`  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_system_settings_key` (`key`),
  INDEX `ix_system_settings_key` (`key`),
  CONSTRAINT `fk_system_settings_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `system_health` (
  `id`              CHAR(36)     NOT NULL,
  `service_name`    VARCHAR(100) NOT NULL,
  `status`          VARCHAR(30)  NOT NULL  COMMENT 'HEALTHY, DEGRADED, DOWN, NOT_CONFIGURED',
  `response_time_ms` DOUBLE      DEFAULT NULL,
  `last_checked_at` DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `details`         JSON         DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `ix_system_health_service_name` (`service_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `api_health_checks` (
  `id`            CHAR(36)     NOT NULL,
  `provider_name` VARCHAR(100) NOT NULL,
  `status`        VARCHAR(30)  NOT NULL DEFAULT 'NOT_CONFIGURED',
  `error_message` TEXT         DEFAULT NULL,
  `latency_ms`    DOUBLE       DEFAULT NULL,
  `checked_at`    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `ix_api_health_checks_provider_name` (`provider_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `notifications` (
  `id`                CHAR(36)     NOT NULL,
  `user_id`           CHAR(36)     NOT NULL,
  `title`             VARCHAR(150) NOT NULL,
  `message`           TEXT         NOT NULL,
  `notification_type` VARCHAR(50)  NOT NULL DEFAULT 'INFO' COMMENT 'INFO, SUCCESS, WARNING, DANGER',
  `is_read`           TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`        DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `ix_notifications_user_id` (`user_id`),
  INDEX `ix_notifications_created_at` (`created_at`),
  CONSTRAINT `fk_notifications_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `provider_credentials` (
  `id`            CHAR(36)     NOT NULL,
  `provider_name` VARCHAR(50)  NOT NULL  COMMENT 'e.g. upstox',
  `access_token`  TEXT         NOT NULL,
  `refresh_token` TEXT         DEFAULT NULL,
  `token_type`    VARCHAR(20)  NOT NULL DEFAULT 'Bearer',
  `issued_at`     DATETIME(6)  NOT NULL,
  `expires_at`    DATETIME(6)  NOT NULL,
  `user_id`       VARCHAR(100) DEFAULT NULL COMMENT 'Provider user/client ID',
  `user_name`     VARCHAR(150) DEFAULT NULL,
  `is_active`     TINYINT(1)   NOT NULL DEFAULT 1,
  `extra_data`    JSON         DEFAULT NULL,
  `created_at`    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_provider_credentials_provider_name` (`provider_name`),
  INDEX `ix_provider_credentials_provider_name` (`provider_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- END OF SCHEMA — 26 tables total
-- ============================================================================
