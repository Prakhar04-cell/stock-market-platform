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
    current_value: Optional[Decimal] = None
    unrealized_pnl: Optional[Decimal] = None
    market_data_status: str = "NOT_CONFIGURED"
    market_data_message: str = "Market data provider not connected"
    model_config = ConfigDict(from_attributes=True)


class PortfolioSummaryResponse(BaseModel):
    total_invested_value: Decimal
    current_portfolio_value: Optional[Decimal] = None
    total_unrealized_pnl: Optional[Decimal] = None
    cash_balance: Decimal
    provider_status: str = "NOT_CONFIGURED"
    provider_message: str = "Market data provider is not connected yet. Phase 1 foundation active."
    holdings: List[HoldingResponse] = []
