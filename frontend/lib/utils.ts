import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatINR, formatPercentage } from "./formatters";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null | undefined, currency = "INR"): string {
  if (currency === "INR") {
    return formatINR(amount);
  }
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return "—";
  }
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return "—";
  }
  return formatPercentage(value);
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Safely normalizes stock/index symbols.
 * Decodes URL-encoded characters (e.g. "NIFTY%2050" -> "NIFTY 50") exactly once.
 * Trims whitespace and preserves canonical uppercase symbols.
 * Does NOT alter Upstox instrument keys (e.g. "NSE_INDEX|Nifty 50").
 */
export function normalizeStockSymbol(symbol: string | null | undefined): string {
  if (!symbol) return "";
  let decoded = symbol.trim();
  if (decoded.includes("%")) {
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      // Keep raw string if decoding fails
    }
  }
  decoded = decoded.trim();

  // If it's an instrument key with pipe, preserve segment casing
  if (decoded.includes("|")) {
    return decoded;
  }

  return decoded.toUpperCase();
}

// Re-export standardized Indian financial formatters
export * from "./formatters";


