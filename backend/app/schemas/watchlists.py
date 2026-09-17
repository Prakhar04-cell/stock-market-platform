from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.stocks import StockResponse


class WatchlistItemResponse(BaseModel):
    id: str
    watchlist_id: str
    stock_id: str
    display_order: int
    added_at: datetime
    stock: StockResponse
    model_config = ConfigDict(from_attributes=True)


class WatchlistCreate(BaseModel):
    name: str


class WatchlistUpdate(BaseModel):
    name: str


class WatchlistItemAdd(BaseModel):
    stock_id: str


class WatchlistResponse(BaseModel):
    id: str
    name: str
    is_default: bool
    created_at: datetime
    updated_at: datetime
    items: List[WatchlistItemResponse] = []
    model_config = ConfigDict(from_attributes=True)
