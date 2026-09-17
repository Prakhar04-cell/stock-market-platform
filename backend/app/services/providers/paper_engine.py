from typing import Any, Dict, Optional
from app.core.exceptions import ProviderNotConfiguredError
from app.services.providers.base import ExecutionProvider


class PaperExecutionProvider(ExecutionProvider):
    """Virtual Paper Trading Engine. In Phase 1, status is NOT_CONFIGURED."""

    @property
    def provider_name(self) -> str:
        return "TradeX Paper Trading Engine"

    @property
    def status(self) -> str:
        return "NOT_CONFIGURED"

    async def place_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        raise ProviderNotConfiguredError(provider_type="Paper Trading Engine")

    async def cancel_order(self, order_id: str) -> bool:
        raise ProviderNotConfiguredError(provider_type="Paper Trading Engine")

    async def get_order_status(self, order_id: str) -> Dict[str, Any]:
        raise ProviderNotConfiguredError(provider_type="Paper Trading Engine")
