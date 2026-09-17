from typing import Any, Dict, List, Optional
from app.core.exceptions import ProviderNotConfiguredError
from app.services.providers.base import MarketDataProvider, ExecutionProvider


class ZerodhaMarketDataProvider(MarketDataProvider):
    """Zerodha Kite Connect Market Data API placeholder for Phase 2."""

    @property
    def provider_name(self) -> str:
        return "Zerodha Kite Connect"

    @property
    def status(self) -> str:
        return "NOT_CONFIGURED"

    async def get_quote(self, symbol: str, exchange: str = "NSE") -> Optional[Dict[str, Any]]:
        raise ProviderNotConfiguredError(provider_type="Zerodha Market Data Provider")

    async def get_historical_bars(
        self,
        symbol: str,
        interval: str = "1D",
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        raise ProviderNotConfiguredError(provider_type="Zerodha Market Data Provider")


class ZerodhaExecutionProvider(ExecutionProvider):
    """Zerodha Kite Connect Order Execution API placeholder for Phase 2."""

    @property
    def provider_name(self) -> str:
        return "Zerodha Order Engine"

    @property
    def status(self) -> str:
        return "NOT_CONFIGURED"

    async def place_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        raise ProviderNotConfiguredError(provider_type="Zerodha Order Engine")

    async def cancel_order(self, order_id: str) -> bool:
        raise ProviderNotConfiguredError(provider_type="Zerodha Order Engine")

    async def get_order_status(self, order_id: str) -> Dict[str, Any]:
        raise ProviderNotConfiguredError(provider_type="Zerodha Order Engine")
