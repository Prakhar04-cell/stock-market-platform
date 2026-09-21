from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class HoldingResponse(BaseModel):
    id: str
    stock_id: str
    symbol: str
    name: str
    quantity: Decimal
    average_buy_price: Decimal
    invested_value: Decimal
    current_price: Optional[Decimal] = None
    current_value: Optional[Decimal] = None
    unrealized_pnl: Optional[Decimal] = None
    pnl_percent: Optional[Decimal] = None
    day_change: Optional[Decimal] = None
    day_change_percent: Optional[Decimal] = None
    market_data_status: str = "LIVE"
    market_data_message: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class PortfolioSummaryResponse(BaseModel):
    total_invested_value: Decimal
    current_portfolio_value: Optional[Decimal] = None
    total_unrealized_pnl: Optional[Decimal] = None
    realized_pnl: Optional[Decimal] = None
    total_pnl: Optional[Decimal] = None
    cash_balance: Decimal
    available_cash: Optional[Decimal] = None
    provider_status: str = "healthy"
    provider_message: Optional[str] = None
    holdings: List[HoldingResponse] = []
