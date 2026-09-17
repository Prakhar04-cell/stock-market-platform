from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class LedgerEntryResponse(BaseModel):
    id: str
    wallet_id: str
    transaction_type: str
    amount: Decimal
    balance_after: Decimal
    reference_id: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class WalletResponse(BaseModel):
    id: str
    user_id: str
    currency: str
    balance: Decimal
    locked_balance: Decimal
    available_balance: Decimal
    invested_value: Decimal
    current_value: Optional[Decimal] = None
    total_pnl: Optional[Decimal] = None
    market_data_status: str = "WAITING_FOR_PROVIDER"
    market_data_message: str = "Market data provider is not connected yet. Phase 1 foundation active."
    model_config = ConfigDict(from_attributes=True)


class WalletSummaryResponse(BaseModel):
    wallet: WalletResponse
    recent_ledger: List[LedgerEntryResponse] = []
