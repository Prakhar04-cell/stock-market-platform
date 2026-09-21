"""Phase 2: Upstox Real Market Data & Paper Trading Schema

Revision ID: 0002_phase2_market_paper_trading
Revises: 0001_initial_schema
Create Date: 2026-09-21 14:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0002_phase2_market_paper_trading'
down_revision: Union[str, None] = '0001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add instrument_key to stocks
    op.add_column('stocks', sa.Column('instrument_key', sa.String(length=100), nullable=True))
    op.create_index('ix_stocks_instrument_key', 'stocks', ['instrument_key'], unique=True)

    # 2. Create instruments table
    op.create_table(
        'instruments',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('instrument_key', sa.String(length=100), nullable=False, unique=True),
        sa.Column('symbol', sa.String(length=50), nullable=False),
        sa.Column('trading_symbol', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('exchange', sa.String(length=20), nullable=False),
        sa.Column('segment', sa.String(length=30), nullable=False),
        sa.Column('instrument_type', sa.String(length=30), nullable=False),
        sa.Column('isin', sa.String(length=50), nullable=True),
        sa.Column('lot_size', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('tick_size', sa.Numeric(precision=10, scale=4), nullable=False, server_default='0.05'),
        sa.Column('expiry', sa.DateTime(timezone=True), nullable=True),
        sa.Column('strike_price', sa.Numeric(precision=18, scale=4), nullable=True),
        sa.Column('underlying_key', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_instruments_instrument_key', 'instruments', ['instrument_key'])
    op.create_index('ix_instruments_symbol', 'instruments', ['symbol'])
    op.create_index('ix_instruments_trading_symbol', 'instruments', ['trading_symbol'])
    op.create_index('ix_instruments_exchange', 'instruments', ['exchange'])
    op.create_index('ix_instruments_segment', 'instruments', ['segment'])
    op.create_index('ix_instruments_isin', 'instruments', ['isin'])

    # 3. Add instrument_key to market_prices and historical_prices
    op.add_column('market_prices', sa.Column('instrument_key', sa.String(length=100), nullable=True))
    op.create_index('ix_market_prices_instrument_key', 'market_prices', ['instrument_key'])

    op.add_column('historical_prices', sa.Column('instrument_key', sa.String(length=100), nullable=True))
    op.create_index('ix_historical_prices_instrument_key', 'historical_prices', ['instrument_key'])
    op.create_index('ix_historical_prices_key_time', 'historical_prices', ['instrument_key', 'timestamp'])

    # 4. Create provider_credentials table
    op.create_table(
        'provider_credentials',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('provider_name', sa.String(length=50), nullable=False, unique=True),
        sa.Column('access_token', sa.Text(), nullable=False),
        sa.Column('refresh_token', sa.Text(), nullable=True),
        sa.Column('token_type', sa.String(length=20), nullable=False, server_default='Bearer'),
        sa.Column('issued_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('user_id', sa.String(length=100), nullable=True),
        sa.Column('user_name', sa.String(length=150), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('extra_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_provider_credentials_provider_name', 'provider_credentials', ['provider_name'])


def downgrade() -> None:
    op.drop_table('provider_credentials')
    op.drop_index('ix_historical_prices_key_time', table_name='historical_prices')
    op.drop_index('ix_historical_prices_instrument_key', table_name='historical_prices')
    op.drop_column('historical_prices', 'instrument_key')
    op.drop_index('ix_market_prices_instrument_key', table_name='market_prices')
    op.drop_column('market_prices', 'instrument_key')
    op.drop_table('instruments')
    op.drop_index('ix_stocks_instrument_key', table_name='stocks')
    op.drop_column('stocks', 'instrument_key')
