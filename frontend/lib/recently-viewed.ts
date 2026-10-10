export interface RecentlyViewedItem {
  symbol: string;
  name: string;
  exchange: string;
  timestamp: number;
}

const STORAGE_KEY = "bullrun_recently_viewed";
const LEGACY_STORAGE_KEY = "tradex_recently_viewed";
const MAX_ITEMS = 8;

export function getRecentlyViewed(): RecentlyViewedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function addRecentlyViewed(item: { symbol: string; name?: string; exchange?: string }): void {
  if (typeof window === "undefined" || !item.symbol) return;
  try {
    const current = getRecentlyViewed().filter(
      (i) => i.symbol.toUpperCase() !== item.symbol.toUpperCase()
    );
    const updated: RecentlyViewedItem[] = [
      {
        symbol: item.symbol.toUpperCase(),
        name: item.name || item.symbol.toUpperCase(),
        exchange: item.exchange || "NSE",
        timestamp: Date.now(),
      },
      ...current,
    ].slice(0, MAX_ITEMS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage write errors
  }
}

export function clearRecentlyViewed(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
