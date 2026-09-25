/**
 * BullRun Centralized Indian Financial Number Formatting System
 *
 * Adheres strictly to Indian fintech formatting standards:
 *
 * 1. STOCK PRICES:
 *    Always exact INR price formatting (never abbreviated):
 *    e.g., ₹23,358.15, ₹2,450.50
 *
 * 2. PORTFOLIO / COMPACT INVESTMENT VALUES:
 *    Sensible compact thresholds preserving precision:
 *    - < 1,000: ₹950.00
 *    - 1,000 to 99,999: ₹76.61K
 *    - 1,00,000 to 99,99,999: ₹1.25 Lakh / ₹12.50 Lakh
 *    - >= 1,00,00,000: ₹1.25 Crore
 *
 * 3. INDIAN NUMBER SYSTEM (Full formatting):
 *    Uses en-IN grouping (e.g., 1,000, 10,000, 1,00,000, 10,00,000, 1,00,00,000)
 *
 * 4. P&L:
 *    - Positive (> 0): +₹12,450.50 | +1.42% (text-[#16A34A])
 *    - Negative (< 0): -₹3,240.50 | -0.84% (text-[#DC2626])
 *    - Zero (== 0): ₹0.00 | 0.00% (text-[#6B7280]) -> NEVER show +₹0.00 or +0.00%!
 *
 * 5. LPA:
 *    Reserved solely for CTC/annual salary values: ₹21 LPA.
 */

export interface FormatOptions {
  decimals?: number;
  showDecimals?: boolean;
}

/**
 * Standard Indian Rupee Full Currency Formatter
 * Uses the Indian numbering system (e.g. ₹1,00,000, ₹10,00,000, ₹1,00,00,000)
 *
 * @param amount - The numeric or string value
 * @param decimals - Decimal places (defaults to 2; pass 0 for integer amounts)
 */
export function formatINR(
  amount: number | string | null | undefined,
  decimals: number = 2
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return decimals > 0 ? `₹0.${"0".repeat(decimals)}` : "₹0";
  }
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Indian Number Formatter without currency symbol
 * Uses standard Indian grouping: 1,000 | 10,000 | 1,00,000 | 10,00,000 | 1,00,00,000
 */
export function formatIndianNumber(
  amount: number | string | null | undefined,
  decimals: number = 2
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return decimals > 0 ? `0.${"0".repeat(decimals)}` : "0";
  }
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Compact Indian Currency Formatter for Dashboard / Portfolio Cards
 *
 * Examples:
 * - 76605.74 => "₹76.61K"
 * - 125000 => "₹1.25 Lakh"
 * - 1250000 => "₹12.50 Lakh"
 * - 12500000 => "₹1.25 Crore"
 * - 450.50 => "₹450.50"
 */
export function formatCompactINR(
  amount: number | string | null | undefined,
  decimals: number = 2
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return "₹0.00";
  }
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  if (abs >= 10000000) {
    // 1 Crore = 10,000,000 (100 Lakhs)
    const cr = abs / 10000000;
    return `${sign}₹${cr.toFixed(decimals)} Crore`;
  } else if (abs >= 100000) {
    // 1 Lakh = 100,000
    const lakh = abs / 100000;
    return `${sign}₹${lakh.toFixed(decimals)} Lakh`;
  } else if (abs >= 1000) {
    // Thousands in compact view (e.g. ₹76.61K)
    const k = abs / 1000;
    return `${sign}₹${k.toFixed(decimals)}K`;
  }

  return `${sign}₹${abs.toFixed(decimals)}`;
}

/**
 * Format Lakhs / Crores (conforming alias of formatCompactINR)
 * Supports custom decimal precision.
 */
export function formatLakhCrore(
  amount: number | string | null | undefined,
  decimals: number = 2
): string {
  return formatCompactINR(amount, decimals);
}

/**
 * Stock Price Formatter:
 * Strict rule: Never abbreviate stock prices into Lakh/Crore.
 * Always formatted with exact INR values e.g. ₹23,358.15, ₹2,450.50
 */
export function formatStockPrice(
  price: number | string | null | undefined
): string {
  if (price === null || price === undefined || isNaN(Number(price))) {
    return "—";
  }
  const num = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Percentage Formatter
 * Strict rule:
 * - Positive (> 0): +1.42%
 * - Negative (< 0): -0.84%
 * - Zero (== 0): 0.00% (NO '+' SIGN!)
 */
export function formatPercentage(
  value: number | string | null | undefined,
  decimals: number = 2
): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return "0.00%";
  }
  const num = typeof value === "string" ? parseFloat(value) : value;

  // Zero check with precision threshold to prevent floating point anomalies like +0.00%
  if (Math.abs(num) < 0.00001) {
    return `${(0).toFixed(decimals)}%`;
  }

  const sign = num > 0 ? "+" : "";
  return `${sign}${num.toFixed(decimals)}%`;
}

/**
 * P&L Formatter
 * Strict rule:
 * - Positive (> 0): +₹12,450.50 | +1.42% (text-[#16A34A])
 * - Negative (< 0): -₹3,240.50 | -0.84% (text-[#DC2626])
 * - Zero (== 0): ₹0.00 | 0.00% (text-[#6B7280]) -> NEVER show +₹0.00 (+0.00%)
 */
export function formatPnL(
  pnl: number | string | null | undefined,
  percent?: number | string | null | undefined
): {
  amountText: string;
  percentText: string;
  fullText: string;
  colorClass: string;
  isPositive: boolean;
  isNegative: boolean;
  isZero: boolean;
} {
  const pnlNum =
    pnl === null || pnl === undefined || isNaN(Number(pnl))
      ? 0
      : typeof pnl === "string"
      ? parseFloat(pnl)
      : pnl;

  const isZero = Math.abs(pnlNum) < 0.005; // Less than half a paisa is zero
  const isPositive = !isZero && pnlNum > 0;
  const isNegative = !isZero && pnlNum < 0;

  let amountText = "";
  if (isZero) {
    amountText = "₹0.00";
  } else {
    const sign = isPositive ? "+" : "-";
    const absPnl = Math.abs(pnlNum);
    amountText = `${sign}₹${new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absPnl)}`;
  }

  let percentText = "";
  if (percent !== undefined && percent !== null && !isNaN(Number(percent))) {
    const pctNum = typeof percent === "string" ? parseFloat(percent) : percent;
    if (Math.abs(pctNum) < 0.005) {
      percentText = isPositive ? "+0.00%" : isNegative ? "-0.00%" : "0.00%";
    } else {
      const pctSign = pctNum > 0 ? "+" : "";
      percentText = `${pctSign}${pctNum.toFixed(2)}%`;
    }
  }

  const fullText = percentText
    ? `${amountText} (${percentText})`
    : amountText;

  let colorClass = "text-[#111827]";
  if (isPositive) {
    colorClass = "text-[#16A34A]";
  } else if (isNegative) {
    colorClass = "text-[#DC2626]";
  }

  return {
    amountText,
    percentText,
    fullText,
    colorClass,
    isPositive,
    isNegative,
    isZero,
  };
}

/**
 * LPA Formatter
 * Strict rule: ONLY used for annual salary / CTC / compensation figures.
 * Never used for stock prices, portfolio value, orders, or P&L.
 */
export function formatLPA(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return "₹0 LPA";
  }
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const lpa = num / 100000;
  return `₹${lpa.toFixed(lpa % 1 === 0 ? 0 : 2)} LPA`;
}
