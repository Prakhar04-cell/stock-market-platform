from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class OrderExecutionResponse(BaseModel):
    id: str
    execution_price: Decimal
    executed_quantity: Decimal
    trade_charges: Decimal
    executed_at: datetime
    exchange_trade_id: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class OrderCreate(BaseModel):
    stock_id: str
    order_type: str = Field(..., pattern="^(MARKET|LIMIT|STOP|STOP_LIMIT)$")
    side: str = Field(..., pattern="^(BUY|SELL)$")
    quantity: Decimal = Field(..., gt=0)
    price: Optional[Decimal] = Field(None, gt=0)
    stop_price: Optional[Decimal] = Field(None, gt=0)


class OrderResponse(BaseModel):
    id: str
    user_id: str
    stock_id: str
    symbol: Optional[str] = None
    stock_name: Optional[str] = None
    order_type: str
    side: str
    quantity: Decimal
    price: Optional[Decimal] = None
    stop_price: Optional[Decimal] = None
    status: str
    filled_quantity: Decimal
    average_execution_price: Optional[Decimal] = None
    created_at: datetime
    executions: List[OrderExecutionResponse] = []
    model_config = ConfigDict(from_attributes=True)
