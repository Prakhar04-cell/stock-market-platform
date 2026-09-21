from decimal import Decimal, ROUND_HALF_UP
from typing import Dict
from app.core.config import settings


class ChargeBreakdown:
    def __init__(
        self,
        turnover: Decimal,
        brokerage: Decimal,
        stt: Decimal,
        exchange_turnover: Decimal,
        stamp_duty: Decimal,
        sebi_turnover: Decimal,
        gst: Decimal,
        total_charges: Decimal,
    ):
        self.turnover = turnover
        self.brokerage = brokerage
        self.stt = stt
        self.exchange_turnover = exchange_turnover
        self.stamp_duty = stamp_duty
        self.sebi_turnover = sebi_turnover
        self.gst = gst
        self.total_charges = total_charges

    def to_dict(self) -> Dict[str, Decimal]:
        return {
            "turnover": self.turnover,
            "brokerage": self.brokerage,
            "stt": self.stt,
            "exchange_turnover": self.exchange_turnover,
            "stamp_duty": self.stamp_duty,
            "sebi_turnover": self.sebi_turnover,
            "gst": self.gst,
            "total_charges": self.total_charges,
        }


def _round_curr(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


def calculate_simulated_charges(side: str, quantity: Decimal, price: Decimal) -> ChargeBreakdown:
    """
    Calculates itemized simulated regulatory, tax, and brokerage fees for paper trading.
    All rates are configuration-driven via settings (not hardcoded).
    """
    turnover = quantity * price
    if turnover <= Decimal("0"):
        zero = Decimal("0.0000")
        return ChargeBreakdown(zero, zero, zero, zero, zero, zero, zero, zero)

    # 1. Brokerage: e.g. 0.03% capped at ₹20 per order
    raw_brokerage = turnover * settings.PAPER_BROKERAGE_PERCENT
    brokerage = min(raw_brokerage, settings.PAPER_BROKERAGE_MAX_PER_ORDER)

    # 2. STT (Securities Transaction Tax): 0.1% on delivery BUY & SELL
    stt = turnover * settings.PAPER_STT_PERCENT

    # 3. Exchange Turnover Charges: 0.00345%
    exchange_turnover = turnover * settings.PAPER_EXCHANGE_TURNOVER_PERCENT

    # 4. Stamp Duty: 0.015% on BUY only
    stamp_duty = (turnover * settings.PAPER_STAMP_DUTY_PERCENT) if side.upper() == "BUY" else Decimal("0.0000")

    # 5. SEBI Turnover Charges: ₹10 / Crore = 0.0001%
    sebi_turnover = turnover * settings.PAPER_SEBI_PERCENT

    # 6. GST: 18% on (Brokerage + Exchange turnover + SEBI charges)
    gst_base = brokerage + exchange_turnover + sebi_turnover
    gst = gst_base * settings.PAPER_GST_PERCENT

    total_charges = brokerage + stt + exchange_turnover + stamp_duty + sebi_turnover + gst

    return ChargeBreakdown(
        turnover=_round_curr(turnover),
        brokerage=_round_curr(brokerage),
        stt=_round_curr(stt),
        exchange_turnover=_round_curr(exchange_turnover),
        stamp_duty=_round_curr(stamp_duty),
        sebi_turnover=_round_curr(sebi_turnover),
        gst=_round_curr(gst),
        total_charges=_round_curr(total_charges),
    )
