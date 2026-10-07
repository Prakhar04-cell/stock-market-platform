import { apiRequest } from "@/lib/api-client";

export interface PositionItem {
  id: string;
  symbol: string;
  exchange?: string;
  product_type: "MIS" | "CNC" | "NRML";
  side: "BUY" | "SELL";
  quantity: number;
  entry_price: number;
  current_price?: number;
  unrealized_pnl?: number;
  pnl_percent?: number;
  status: "OPEN" | "CLOSED";
  realized_pnl?: number;
  exit_price?: number;
}

const POSITIONS_CACHE_KEY = "bullrun_positions_cache";

// Module-level in-memory cache to guarantee zero-latency across client-side page transitions
let memoryCachedPositions: PositionItem[] | null = null;
let activeFetchPromise: Promise<PositionItem[]> | null = null;

/**
 * Robustly normalizes holding and position records from backend APIs
 * into the authoritative PositionItem structure.
 */
export function normalizePositionItem(raw: any): PositionItem {
  const qty = Number(raw.quantity ?? 0);
  const avgBuyPrice = Number(raw.entry_price ?? raw.average_buy_price ?? 0);
  const curPrice =
    raw.current_price !== undefined && raw.current_price !== null
      ? Number(raw.current_price)
      : undefined;
  const unPnl =
    raw.unrealized_pnl !== undefined && raw.unrealized_pnl !== null
      ? Number(raw.unrealized_pnl)
      : undefined;
  const pnlPct =
    raw.pnl_percent !== undefined && raw.pnl_percent !== null
      ? Number(raw.pnl_percent)
      : undefined;

  // Status is OPEN if quantity > 0 and status is not explicitly CLOSED
  const rawStatus = String(raw.status ?? "").toUpperCase();
  const status: "OPEN" | "CLOSED" =
    rawStatus === "CLOSED" ? "CLOSED" : qty > 0 ? "OPEN" : "CLOSED";

  return {
    id: String(raw.id || `pos-${raw.symbol}`),
    symbol: String(raw.symbol || "").toUpperCase(),
    exchange: raw.exchange || "NSE • EQ",
    product_type: (raw.product_type as "MIS" | "CNC" | "NRML") || "CNC",
    side: (raw.side as "BUY" | "SELL") || "BUY",
    quantity: qty,
    entry_price: avgBuyPrice,
    current_price: curPrice,
    unrealized_pnl: unPnl,
    pnl_percent: pnlPct,
    status,
    realized_pnl:
      raw.realized_pnl !== undefined && raw.realized_pnl !== null
        ? Number(raw.realized_pnl)
        : 0,
    exit_price:
      raw.exit_price !== undefined && raw.exit_price !== null
        ? Number(raw.exit_price)
        : undefined,
  };
}

/**
 * Retrieves cached positions synchronously for instantaneous first-paint render.
 * Checks memory first, then sessionStorage.
 */
export function getCachedPositions(): PositionItem[] | null {
  if (memoryCachedPositions !== null) {
    return memoryCachedPositions;
  }
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(POSITIONS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.data)) {
      // Validate that cached data belongs to the currently active token
      const currentToken = localStorage.getItem("tradex_token");
      if (parsed.token && currentToken && parsed.token !== currentToken) {
        sessionStorage.removeItem(POSITIONS_CACHE_KEY);
        return null;
      }
      memoryCachedPositions = parsed.data;
      return parsed.data;
    }
  } catch {
    // If parsing fails, ignore corrupted cache
  }
  return null;
}

/**
 * Persists positions to both memory and sessionStorage.
 */
export function saveCachedPositions(positions: PositionItem[]): void {
  memoryCachedPositions = positions;
  if (typeof window !== "undefined") {
    try {
      const currentToken = localStorage.getItem("tradex_token");
      sessionStorage.setItem(
        POSITIONS_CACHE_KEY,
        JSON.stringify({
          data: positions,
          timestamp: Date.now(),
          token: currentToken,
        })
      );
    } catch {
      // Ignore sessionStorage quota errors
    }
  }
}

/**
 * Invalidates cached positions (e.g. upon user logout).
 */
export function clearPositionsCache(): void {
  memoryCachedPositions = null;
  activeFetchPromise = null;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(POSITIONS_CACHE_KEY);
    } catch {
      // Ignore
    }
  }
}

/**
 * Fetches fresh positions from the backend with in-flight request deduplication.
 * Updates both memory and session caches upon completion.
 */
export async function fetchPositionsWithCache(force = false): Promise<PositionItem[]> {
  if (!force && activeFetchPromise) {
    return activeFetchPromise;
  }

  const fetchPromise = (async () => {
    try {
      const rawData = await apiRequest<any[]>("/api/v1/positions");
      const normalized = Array.isArray(rawData)
        ? rawData.map(normalizePositionItem)
        : [];
      saveCachedPositions(normalized);
      return normalized;
    } finally {
      activeFetchPromise = null;
    }
  })();

  activeFetchPromise = fetchPromise;
  return fetchPromise;
}
