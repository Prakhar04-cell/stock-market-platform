/**
 * BullRun Centralized Indian Financial Number Formatters
 *
 * Implements standard Indian financial notation (Lakhs, Crores, LPA, INR currency).
 * Examples:
 * - formatINR(125000) => "₹1,25,000.00"
 * - formatIndianNumber(125000) => "1,25,000.00"
 * - formatLakhCrore(12500000) => "₹1.25 Cr"
 * - formatLakhCrore(250000) => "₹2.50 Lakh"
 * - formatLPA(2100000) => "₹21 LPA"
 * - formatStockPrice(2345.6) => "₹2,345.60"
 * - formatPnL(12450.25, 2.5) => { text: "+₹12,450.25 (+2.50%)", colorClass: "text-[#16A34A]", isPositive: true }
 */

export interface FormatOptions {
  decimals?: number;
  showSign?: boolean;
  compact?: boolean;
}

/**
 * Standard Indian Rupee Currency Formatter
 * Uses the Indian numbering system (e.g. 1,00,000) with the ₹ symbol.
 */
export function formatINR(
  amount: number | string | null | undefined,
  decimals: number = 2
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return "₹0.00";
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
 * Examples: 1,25,000 or 1,25,000.50
 */
export function formatIndianNumber(
  amount: number | string | null | undefined,
  decimals: number = 2
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return "0.00";
  }
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Formats large amounts using readable Indian Lakh / Crore notation.
 * Examples:
 * - >= 1,00,00,000 => "₹1.25 Cr"
 * - >= 1,00,000 => "₹2.50 Lakh"
 * - < 1,00,000 => "₹21,500"
 */
export function formatLakhCrore(
  amount: number | string | null | undefined,
  decimals: number = 2
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return "₹0";
  }
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  if (abs >= 10000000) {
    // 1 Crore = 10,000,000
    const cr = abs / 10000000;
    return `${sign}₹${cr.toFixed(decimals)} Cr`;
  } else if (abs >= 100000) {
    // 1 Lakh = 100,000
    const lakh = abs / 100000;
    return `${sign}₹${lakh.toFixed(decimals)} Lakh`;
  } else if (abs >= 1000) {
    // Standard thousands
    return `${sign}₹${new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: decimals,
    }).format(abs)}`;
  }
  return `${sign}₹${abs.toFixed(decimals)}`;
}

/**
 * Formats values into Lakhs Per Annum (LPA) or standard notation
 * Example: 2100000 => "₹21 LPA"
 */
export function formatLPA(
  amount: number | string | null | undefined
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return "₹0 LPA";
  }
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const lpa = num / 100000;
  return `₹${lpa.toFixed(lpa % 1 === 0 ? 0 : 2)} LPA`;
}

/**
 * Stock Price Formatter:
 * Precise price with standard ₹ currency symbol and 2 decimal places.
 * Example: 2345.6 => "₹2,345.60"
 */
export function formatStockPrice(
  price: number | string | null | undefined
): string {
  if (price === null || price === undefined || isNaN(Number(price))) {
    return "—";
  }
  const num = typeof price === "string" ? parseFloat(price) : price;
  return `₹${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)}`;
}

/**
 * P&L Formatter:
 * Provides formatted string with explicit '+' or '-' sign, currency,
 * and associated status color classes according to BullRun design system:
 * - Positive: text-[#16A34A]
 * - Negative: text-[#DC2626]
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
} {
  const pnlNum = pnl === null || pnl === undefined || isNaN(Number(pnl)) ? 0 : typeof pnl === "string" ? parseFloat(pnl) : pnl;
  const isPositive = pnlNum >= 0;
  const sign = isPositive ? "+" : "-";
  const absPnl = Math.abs(pnlNum);
  const amountFormatted = `${sign}₹${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absPnl)}`;

  let percentText = "";
  if (percent !== undefined && percent !== null && !isNaN(Number(percent))) {
    const pctNum = typeof percent === "string" ? parseFloat(percent) : percent;
    percentText = `(${pctNum >= 0 ? "+" : ""}${pctNum.toFixed(2)}%)`;
  }

  return {
    amountText: amountFormatted,
    percentText,
    fullText: percentText ? `${amountFormatted} ${percentText}` : amountFormatted,
    colorClass: isPositive ? "text-[#16A34A]" : "text-[#DC2626]",
    isPositive,
  };
}
