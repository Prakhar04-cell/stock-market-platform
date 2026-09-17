from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Any, Dict, List, Optional


class MarketDataProvider(ABC):
    """Abstract interface for stock market data feeds (e.g. Upstox, Zerodha)."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the market provider."""
        pass

    @property
    @abstractmethod
    def status(self) -> str:
        """Status string: HEALTHY, DEGRADED, DOWN, NOT_CONFIGURED."""
        pass

    @abstractmethod
    async def get_quote(self, symbol: str, exchange: str = "NSE") -> Optional[Dict[str, Any]]:
        """Retrieve real-time quote. Returns None if provider is not configured."""
        pass

    @abstractmethod
    async def get_historical_bars(
        self,
        symbol: str,
        interval: str = "1D",
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieve historical OHLCV bars. Returns empty list if not configured."""
        pass


class ExecutionProvider(ABC):
    """Abstract interface for order execution engines (e.g. Paper Engine, Broker APIs)."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the execution engine."""
        pass

    @property
    @abstractmethod
    def status(self) -> str:
        """Status string: HEALTHY, DEGRADED, DOWN, NOT_CONFIGURED."""
        pass

    @abstractmethod
    async def place_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """Submit order to execution venue."""
        pass

    @abstractmethod
    async def cancel_order(self, order_id: str) -> bool:
        """Request order cancellation."""
        pass

    @abstractmethod
    async def get_order_status(self, order_id: str) -> Dict[str, Any]:
        """Fetch current order execution status."""
        pass
