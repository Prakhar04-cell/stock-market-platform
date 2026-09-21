from decimal import Decimal
from typing import Optional
from app.core.exceptions import TradeXException
from app.models.trading import Holding
from app.models.wallet import Wallet
from app.services.paper_trading.charge_engine import calculate_simulated_charges


class RiskService:
    """
    Pre-trade risk and balance verification engine for paper trading.
    Enforces strict account solvency and prevents unauthorized short selling.
    """

    @staticmethod
    def validate_order_params(
        side: str,
        order_type: str,
        quantity: Decimal,
        price: Optional[Decimal] = None,
        stop_price: Optional[Decimal] = None,
    ):
        side_clean = side.upper()
        if side_clean not in ["BUY", "SELL"]:
            raise TradeXException(
                code="INVALID_ORDER_SIDE",
                message=f"Order side must be BUY or SELL. Received: {side}",
                status_code=400,
            )

        type_clean = order_type.upper()
        if type_clean not in ["MARKET", "LIMIT", "STOP", "STOP_LIMIT"]:
            raise TradeXException(
                code="INVALID_ORDER_TYPE",
                message=f"Order type must be MARKET, LIMIT, STOP, or STOP_LIMIT. Received: {order_type}",
                status_code=400,
            )

        if quantity <= Decimal("0"):
            raise TradeXException(
                code="INVALID_QUANTITY",
                message="Order quantity must be greater than zero.",
                status_code=400,
            )

        if type_clean in ["LIMIT", "STOP_LIMIT"] and (not price or price <= Decimal("0")):
            raise TradeXException(
                code="INVALID_PRICE",
                message="Limit price must be greater than zero for LIMIT orders.",
                status_code=400,
            )

        if type_clean in ["STOP", "STOP_LIMIT"] and (not stop_price or stop_price <= Decimal("0")):
            raise TradeXException(
                code="INVALID_STOP_PRICE",
                message="Trigger / stop price must be greater than zero for STOP orders.",
                status_code=400,
            )

    @staticmethod
    def validate_buy_margin(
        wallet: Wallet,
        estimated_price: Decimal,
        quantity: Decimal,
    ):
        """Verifies virtual cash availability including simulated regulatory charges."""
        charges = calculate_simulated_charges("BUY", quantity, estimated_price)
        required_funds = (quantity * estimated_price) + charges.total_charges
        available_cash = wallet.balance - wallet.locked_balance

        if available_cash < required_funds:
            raise TradeXException(
                code="INSUFFICIENT_FUNDS",
                message=(
                    f"Insufficient virtual cash balance. "
                    f"Required: {wallet.currency} {required_funds:,.2f} (includes {wallet.currency} {charges.total_charges:,.2f} simulated charges), "
                    f"Available: {wallet.currency} {available_cash:,.2f}."
                ),
                status_code=400,
            )

    @staticmethod
    def validate_sell_holdings(
        holding: Optional[Holding],
        sell_quantity: Decimal,
        symbol: str,
    ):
        """Verifies trader possesses sufficient shares to execute delivery SELL."""
        if not holding or holding.quantity < sell_quantity:
            avail = holding.quantity if holding else Decimal("0.0000")
            raise TradeXException(
                code="INSUFFICIENT_HOLDINGS",
                message=(
                    f"Insufficient holdings to sell {symbol}. "
                    f"Requested: {sell_quantity}, Available in portfolio: {avail}."
                ),
                status_code=400,
            )


risk_service = RiskService()
