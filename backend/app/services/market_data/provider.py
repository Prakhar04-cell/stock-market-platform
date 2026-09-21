from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from app.services.market_data.normalizer import CandleData, InstrumentData, MarketQuote


class MarketDataProvider(ABC):
    """
    Abstract provider-agnostic interface for financial market data providers.
    Ensures TradeX application logic is completely decoupled from specific broker APIs.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the market data provider (e.g. 'Upstox')."""
        pass

    @property
    @abstractmethod
    def is_configured(self) -> bool:
        """Returns True if valid API credentials or access token are loaded."""
        pass

    @property
    @abstractmethod
    def is_token_valid(self) -> bool:
        """Returns True if the current access token has not expired."""
        pass

    @abstractmethod
    async def get_quote(self, symbol_or_key: str) -> Optional[MarketQuote]:
        """Fetch real-time normalized quote for a single symbol or instrument key."""
        pass

    @abstractmethod
    async def get_quotes(self, symbols_or_keys: List[str]) -> Dict[str, MarketQuote]:
        """Fetch batch quotes for multiple symbols or instrument keys."""
        pass

    @abstractmethod
    async def get_historical_candles(
        self,
        instrument_key: str,
        interval: str = "1D",
        to_date: Optional[str] = None,
        from_date: Optional[str] = None,
    ) -> List[CandleData]:
        """Fetch historical candlestick bars for charting."""
        pass

    @abstractmethod
    async def get_intraday_candles(
        self,
        instrument_key: str,
        interval: str = "1m",
    ) -> List[CandleData]:
        """Fetch intraday bars for the current trading day."""
        pass

    @abstractmethod
    async def search_instruments(
        self,
        query: str,
        exchange: Optional[str] = None,
    ) -> List[InstrumentData]:
        """Search instruments by symbol, company name, or ISIN."""
        pass

    @abstractmethod
    async def get_health(self) -> Dict[str, Any]:
        """Subsystem health telemetry."""
        pass
