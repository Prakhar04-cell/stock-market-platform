from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class StockBase(BaseModel):
    symbol: str
    name: str
    isin: Optional[str] = None
    sector: Optional[str] = None
    lot_size: int = 1
    tick_size: Decimal = Decimal("0.05")
    is_tradable: bool = True


class StockResponse(StockBase):
    id: str
    exchange_code: str
    market_data_status: str = "NOT_CONFIGURED"
    market_data_message: Optional[str] = "Waiting for market data provider"
    ltp: Optional[Decimal] = None
    day_change: Optional[Decimal] = None
    day_change_percent: Optional[Decimal] = None
    model_config = ConfigDict(from_attributes=True)



class StockDetailResponse(StockResponse):
    market_stats: Dict[str, Any] = {
        "status": "NOT_CONFIGURED",
        "message": "Market data provider is not connected yet.",
        "open": None,
        "high": None,
        "low": None,
        "close": None,
        "volume": None,
        "52w_high": None,
        "52w_low": None,
    }
    company_info: Dict[str, Any] = {}
    chart_compatible_format: str = "TradingView_Lightweight_Charts_v4"
