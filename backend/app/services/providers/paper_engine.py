from decimal import Decimal
from typing import Any, Dict, Optional
from app.services.paper_trading.execution_service import paper_execution_service
from app.services.providers.base import ExecutionProvider


class PaperExecutionProvider(ExecutionProvider):
    """
    Virtual Paper Trading Execution Provider.
    Strictly isolated from broker real-money routing.
    Executes simulated orders against virtual wallets with full database auditing.
    """

    @property
    def provider_name(self) -> str:
        return "BullRun Paper Trading Engine"

    @property
    def status(self) -> str:
        return "HEALTHY"

    async def place_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """Submit and execute a paper order via paper_execution_service."""
        order = await paper_execution_service.submit_order(
            user_id=order_data["user_id"],
            stock_id=order_data["stock_id"],
            side=order_data["side"],
            order_type=order_data["order_type"],
            quantity=Decimal(str(order_data["quantity"])),
            price=Decimal(str(order_data["price"])) if order_data.get("price") is not None else None,
            stop_price=Decimal(str(order_data["stop_price"])) if order_data.get("stop_price") is not None else None,
            db=order_data.get("db"),
        )
        return {
            "order_id": order.id,
            "status": order.status,
            "side": order.side,
            "quantity": float(order.quantity),
            "price": float(order.price) if order.price else None,
            "average_execution_price": float(order.average_execution_price) if order.average_execution_price else None,
            "execution_engine": "PAPER_TRADING",
        }

    async def cancel_order(self, order_id: str, user_id: Optional[str] = None, db: Optional[Any] = None) -> bool:
        """Cancel an open paper order via paper_execution_service."""
        if not user_id:
            raise ValueError("user_id required to cancel paper order")
        await paper_execution_service.cancel_order(order_id=order_id, user_id=user_id, db=db)
        return True

    async def get_order_status(self, order_id: str) -> Dict[str, Any]:
        """Query status of a paper order."""
        return {
            "order_id": order_id,
            "execution_engine": "PAPER_TRADING",
            "is_paper": True,
        }


paper_execution_provider = PaperExecutionProvider()
