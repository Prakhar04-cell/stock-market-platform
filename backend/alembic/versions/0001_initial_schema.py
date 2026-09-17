"""Initial database schema for TradeX platform foundation

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-09-17 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Users & Roles
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_users_email', 'users', ['email'])

    op.create_table(
        'profiles',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('first_name', sa.String(length=100), nullable=True),
        sa.Column('last_name', sa.String(length=100), nullable=True),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('avatar_url', sa.String(length=255), nullable=True),
        sa.Column('preferences', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        'roles',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('name', sa.String(length=50), nullable=False, unique=True),
        sa.Column('description', sa.String(length=255), nullable=True),
    )

    op.create_table(
        'user_roles',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role_id', sa.String(length=36), sa.ForeignKey('roles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 2. Exchanges & Stocks
    op.create_table(
        'exchanges',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('code', sa.String(length=20), nullable=False, unique=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
        sa.Column('timezone', sa.String(length=50), nullable=False, server_default='Asia/Kolkata'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        'stocks',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('exchange_id', sa.String(length=36), sa.ForeignKey('exchanges.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('symbol', sa.String(length=30), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('isin', sa.String(length=30), nullable=True, unique=True),
        sa.Column('sector', sa.String(length=100), nullable=True),
        sa.Column('is_tradable', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('lot_size', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('tick_size', sa.Numeric(precision=10, scale=4), nullable=False, server_default='0.05'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('exchange_id', 'symbol', name='uq_exchange_symbol'),
    )
    op.create_index('ix_stocks_symbol', 'stocks', ['symbol'])

    op.create_table(
        'market_prices',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('stock_id', sa.String(length=36), sa.ForeignKey('stocks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('open', sa.Numeric(precision=18, scale=4), nullable=True),
        sa.Column('high', sa.Numeric(precision=18, scale=4), nullable=True),
        sa.Column('low', sa.Numeric(precision=18, scale=4), nullable=True),
        sa.Column('close', sa.Numeric(precision=18, scale=4), nullable=True),
        sa.Column('ltp', sa.Numeric(precision=18, scale=4), nullable=True),
        sa.Column('volume', sa.Integer(), nullable=True),
        sa.Column('change', sa.Numeric(precision=18, scale=4), nullable=True),
        sa.Column('change_percent', sa.Numeric(precision=10, scale=4), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        'historical_prices',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('stock_id', sa.String(length=36), sa.ForeignKey('stocks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('interval', sa.String(length=20), nullable=False, server_default='1D'),
        sa.Column('open', sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column('high', sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column('low', sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column('close', sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column('volume', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
    )

    # 3. Wallets & Ledger
    op.create_table(
        'wallets',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
        sa.Column('balance', sa.Numeric(precision=18, scale=4), nullable=False, server_default='100000.00'),
        sa.Column('locked_balance', sa.Numeric(precision=18, scale=4), nullable=False, server_default='0.00'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        'ledger_entries',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('wallet_id', sa.String(length=36), sa.ForeignKey('wallets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('transaction_type', sa.String(length=50), nullable=False),
        sa.Column('amount', sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column('balance_after', sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column('reference_id', sa.String(length=100), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 4. Orders, Executions, Holdings, Portfolio
    op.create_table(
        'orders',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('wallet_id', sa.String(length=36), sa.ForeignKey('wallets.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('stock_id', sa.String(length=36), sa.ForeignKey('stocks.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('order_type', sa.String(length=20), nullable=False),
        sa.Column('side', sa.String(length=10), nullable=False),
        sa.Column('quantity', sa.Numeric(precision=14, scale=4), nullable=False),
        sa.Column('price', sa.Numeric(precision=18, scale=4), nullable=True),
        sa.Column('stop_price', sa.Numeric(precision=18, scale=4), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='PENDING'),
        sa.Column('filled_quantity', sa.Numeric(precision=14, scale=4), nullable=False, server_default='0.00'),
        sa.Column('average_execution_price', sa.Numeric(precision=18, scale=4), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        'order_executions',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('order_id', sa.String(length=36), sa.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False),
        sa.Column('execution_price', sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column('executed_quantity', sa.Numeric(precision=14, scale=4), nullable=False),
        sa.Column('trade_charges', sa.Numeric(precision=18, scale=4), nullable=False, server_default='0.00'),
        sa.Column('executed_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('exchange_trade_id', sa.String(length=100), nullable=True),
    )

    op.create_table(
        'trade_charges',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('order_id', sa.String(length=36), sa.ForeignKey('orders.id', ondelete='CASCADE'), nullable=True),
        sa.Column('execution_id', sa.String(length=36), sa.ForeignKey('order_executions.id', ondelete='CASCADE'), nullable=True),
        sa.Column('brokerage', sa.Numeric(precision=18, scale=4), nullable=False, server_default='0.00'),
        sa.Column('stt', sa.Numeric(precision=18, scale=4), nullable=False, server_default='0.00'),
        sa.Column('exchange_turnover', sa.Numeric(precision=18, scale=4), nullable=False, server_default='0.00'),
        sa.Column('stamp_duty', sa.Numeric(precision=18, scale=4), nullable=False, server_default='0.00'),
        sa.Column('sebi_turnover', sa.Numeric(precision=18, scale=4), nullable=False, server_default='0.00'),
        sa.Column('gst', sa.Numeric(precision=18, scale=4), nullable=False, server_default='0.00'),
        sa.Column('total_charges', sa.Numeric(precision=18, scale=4), nullable=False, server_default='0.00'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        'holdings',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('stock_id', sa.String(length=36), sa.ForeignKey('stocks.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('quantity', sa.Numeric(precision=14, scale=4), nullable=False, server_default='0.00'),
        sa.Column('average_buy_price', sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('user_id', 'stock_id', name='uq_user_holding_stock'),
    )

    op.create_table(
        'portfolio_snapshots',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('snapshot_date', sa.Date(), nullable=False),
        sa.Column('total_invested_value', sa.Numeric(precision=18, scale=4), nullable=False, server_default='0.00'),
        sa.Column('total_market_value', sa.Numeric(precision=18, scale=4), nullable=False, server_default='0.00'),
        sa.Column('unrealized_pnl', sa.Numeric(precision=18, scale=4), nullable=False, server_default='0.00'),
        sa.Column('realized_pnl', sa.Numeric(precision=18, scale=4), nullable=False, server_default='0.00'),
        sa.Column('cash_balance', sa.Numeric(precision=18, scale=4), nullable=False, server_default='0.00'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('user_id', 'snapshot_date', name='uq_user_snapshot_date'),
    )

    op.create_table(
        'price_alerts',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('stock_id', sa.String(length=36), sa.ForeignKey('stocks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('target_price', sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column('condition', sa.String(length=10), nullable=False, server_default='ABOVE'),
        sa.Column('is_triggered', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 5. Watchlists
    op.create_table(
        'watchlists',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        'watchlist_items',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('watchlist_id', sa.String(length=36), sa.ForeignKey('watchlists.id', ondelete='CASCADE'), nullable=False),
        sa.Column('stock_id', sa.String(length=36), sa.ForeignKey('stocks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('added_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('watchlist_id', 'stock_id', name='uq_watchlist_stock'),
    )

    # 6. System & Audit
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.String(length=50), nullable=True),
        sa.Column('old_values', sa.JSON(), nullable=True),
        sa.Column('new_values', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'])

    op.create_table(
        'security_incidents',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('incident_type', sa.String(length=100), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False, server_default='MEDIUM'),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('resolved', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        'system_settings',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('key', sa.String(length=100), nullable=False, unique=True),
        sa.Column('value', sa.Text(), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('updated_by', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        'system_health',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('service_name', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('response_time_ms', sa.Float(), nullable=True),
        sa.Column('last_checked_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('details', sa.JSON(), nullable=True),
    )

    op.create_table(
        'api_health_checks',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('provider_name', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='NOT_CONFIGURED'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('latency_ms', sa.Float(), nullable=True),
        sa.Column('checked_at', sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        'notifications',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(length=150), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('notification_type', sa.String(length=50), nullable=False, server_default='INFO'),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    # Drop all tables in reverse order
    op.drop_table('notifications')
    op.drop_table('api_health_checks')
    op.drop_table('system_health')
    op.drop_table('system_settings')
    op.drop_table('security_incidents')
    op.drop_table('audit_logs')
    op.drop_table('watchlist_items')
    op.drop_table('watchlists')
    op.drop_table('price_alerts')
    op.drop_table('portfolio_snapshots')
    op.drop_table('holdings')
    op.drop_table('trade_charges')
    op.drop_table('order_executions')
    op.drop_table('orders')
    op.drop_table('ledger_entries')
    op.drop_table('wallets')
    op.drop_table('historical_prices')
    op.drop_table('market_prices')
    op.drop_table('stocks')
    op.drop_table('exchanges')
    op.drop_table('user_roles')
    op.drop_table('roles')
    op.drop_table('profiles')
    op.drop_table('users')
