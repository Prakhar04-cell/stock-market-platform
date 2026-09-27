"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { OrderPadModal } from "@/components/trading/order-pad-modal";
import { useMarketWebSocket, WsPriceUpdate } from "@/lib/market-ws";
import {
  formatINR,
  formatPercentage,
  formatCompactINR,
} from "@/lib/formatters";

interface WatchlistItem {
  id: string;
  stock_id?: string;
  symbol: string;
  stock?: {
    id: string;
    symbol: string;
    name: string;
    exchange_code?: string;
  };
  name?: string;
  exchange?: string;
  price?: number;
  change?: number;
  change_percent?: number;
  volume?: string;
  market_cap?: string;
  range_low?: number;
  range_high?: number;
}

interface WatchlistData {
  id: string;
  name: string;
  items: WatchlistItem[];
}

export default function WatchlistPage() {
  const router = useRouter();

  const [watchlists, setWatchlists] = useState<WatchlistData[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<string | null>(null);
  const [liveQuotes, setLiveQuotes] = useState<
    Record<string, { ltp: number; change: number; change_percent: number }>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [addStockModalOpen, setAddStockModalOpen] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);

  // Filter & Sort
  const [filterQuery, setFilterQuery] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "change" | "price">("default");

  // Order pad modal
  const [orderModalStock, setOrderModalStock] = useState<{
    symbol: string;
    stockId: string;
    name?: string;
    side: "BUY" | "SELL";
  } | null>(null);

  // Load Watchlists
  const loadWatchlists = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<WatchlistData[]>("/api/v1/watchlists");
      if (data && data.length > 0) {
        setWatchlists(data);
        if (!activeWatchlistId) {
          setActiveWatchlistId(data[0].id);
        }

        // Fetch quotes
        const allSymbols = Array.from(
          new Set(
            data.flatMap((w) =>
              w.items.map((i) => i.symbol || i.stock?.symbol).filter((s): s is string => Boolean(s))
            )
          )
        );

        if (allSymbols.length > 0) {
          try {
            const quotes = await apiRequest<Record<string, any>>(
              `/api/v1/market/quotes?symbols=${encodeURIComponent(allSymbols.join(","))}`
            );
            if (quotes) {
              const mapped: Record<string, { ltp: number; change: number; change_percent: number }> = {};
              Object.entries(quotes).forEach(([sym, q]: [string, any]) => {
                if (q && q.ltp) {
                  mapped[sym.toUpperCase()] = {
                    ltp: Number(q.ltp),
                    change: Number(q.change || 0),
                    change_percent: Number(q.change_percent || 0),
                  };
                }
              });
              setLiveQuotes(mapped);
            }
          } catch {
            // Silently fall back
          }
        }
      } else {
        // Fallback default watchlists
        const defaultLists: WatchlistData[] = [
          {
            id: "wl-1",
            name: "My Watchlist",
            items: [
              {
                id: "item-1",
                symbol: "RELIANCE",
                name: "Reliance Industries Ltd.",
                exchange: "NSE",
                price: 2845.5,
                change: 34.25,
                change_percent: 1.22,
                volume: "42.5 L",
                market_cap: "₹19.24 L Cr",
                range_low: 2220,
                range_high: 3024,
              },
              {
                id: "item-2",
                symbol: "TCS",
                name: "Tata Consultancy Services Ltd.",
                exchange: "NSE",
                price: 3912.4,
                change: 45.1,
                change_percent: 1.17,
                volume: "18.2 L",
                market_cap: "₹14.15 L Cr",
                range_low: 3310,
                range_high: 4254,
              },
              {
                id: "item-3",
                symbol: "HDFCBANK",
                name: "HDFC Bank Limited",
                exchange: "NSE",
                price: 1684.2,
                change: 18.4,
                change_percent: 1.1,
                volume: "84.2 L",
                market_cap: "₹12.80 L Cr",
                range_low: 1363,
                range_high: 1794,
              },
              {
                id: "item-4",
                symbol: "INFY",
                name: "Infosys Limited",
                exchange: "BSE",
                price: 1620.4,
                change: -12.3,
                change_percent: -0.75,
                volume: "38.9 L",
                market_cap: "₹6.72 L Cr",
                range_low: 1358,
                range_high: 1953,
              },
              {
                id: "item-5",
                symbol: "SBIN",
                name: "State Bank of India",
                exchange: "NSE",
                price: 812.3,
                change: -4.5,
                change_percent: -0.55,
                volume: "112.5 L",
                market_cap: "₹7.24 L Cr",
                range_low: 543,
                range_high: 896,
              },
              {
                id: "item-6",
                symbol: "TATAMOTORS",
                name: "Tata Motors Limited",
                exchange: "NSE",
                price: 948.5,
                change: 22.8,
                change_percent: 2.46,
                volume: "64.1 L",
                market_cap: "₹3.48 L Cr",
                range_low: 600,
                range_high: 1179,
              },
            ],
          },
          {
            id: "wl-2",
            name: "🔥 Trending",
            items: [
              {
                id: "item-201",
                symbol: "ZOMATO",
                name: "Zomato Ltd",
                exchange: "NSE",
                price: 245.8,
                change: 14.8,
                change_percent: 6.4,
                volume: "320 L",
                market_cap: "₹2.15 L Cr",
                range_low: 98,
                range_high: 298,
              },
              {
                id: "item-202",
                symbol: "BEL",
                name: "Bharat Electronics Ltd",
                exchange: "NSE",
                price: 312.4,
                change: 16.2,
                change_percent: 5.47,
                volume: "142 L",
                market_cap: "₹2.28 L Cr",
                range_low: 124,
                range_high: 340,
              },
            ],
          },
          {
            id: "wl-3",
            name: "Banking & Finance",
            items: [
              {
                id: "item-301",
                symbol: "ICICIBANK",
                name: "ICICI Bank Ltd",
                exchange: "NSE",
                price: 1140.6,
                change: 14.2,
                change_percent: 1.26,
                volume: "61 L",
                market_cap: "₹8.02 L Cr",
                range_low: 912,
                range_high: 1332,
              },
              {
                id: "item-302",
                symbol: "KOTAKBANK",
                name: "Kotak Mahindra Bank",
                exchange: "NSE",
                price: 1820.5,
                change: 12.1,
                change_percent: 0.67,
                volume: "24 L",
                market_cap: "₹3.62 L Cr",
                range_low: 1544,
                range_high: 1920,
              },
            ],
          },
        ];
        setWatchlists(defaultLists);
        setActiveWatchlistId("wl-1");
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, [activeWatchlistId]);

  useEffect(() => {
    loadWatchlists();
  }, [loadWatchlists]);

  // WebSocket Live Updates
  useMarketWebSocket("", (update: WsPriceUpdate) => {
    if (update.symbol && update.ltp) {
      const sym = update.symbol.toUpperCase();
      setLiveQuotes((prev) => ({
        ...prev,
        [sym]: {
          ltp: Number(update.ltp),
          change: update.change !== undefined ? Number(update.change) : prev[sym]?.change ?? 0,
          change_percent:
            update.change_percent !== undefined
              ? Number(update.change_percent)
              : prev[sym]?.change_percent ?? 0,
        },
      }));
    }
  });

  // Current active watchlist
  const activeWatchlist = useMemo(() => {
    return watchlists.find((w) => w.id === activeWatchlistId) || watchlists[0];
  }, [watchlists, activeWatchlistId]);

  // Filtered & sorted items
  const displayedItems = useMemo(() => {
    if (!activeWatchlist) return [];
    let items = [...activeWatchlist.items];

    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.symbol.toLowerCase().includes(q) ||
          (i.name && i.name.toLowerCase().includes(q)) ||
          (i.stock?.name && i.stock.name.toLowerCase().includes(q))
      );
    }

    if (sortBy === "change") {
      items.sort((a, b) => {
        const chgA = liveQuotes[a.symbol.toUpperCase()]?.change_percent ?? a.change_percent ?? 0;
        const chgB = liveQuotes[b.symbol.toUpperCase()]?.change_percent ?? b.change_percent ?? 0;
        return chgB - chgA;
      });
    } else if (sortBy === "price") {
      items.sort((a, b) => {
        const prA = liveQuotes[a.symbol.toUpperCase()]?.ltp ?? a.price ?? 0;
        const prB = liveQuotes[b.symbol.toUpperCase()]?.ltp ?? b.price ?? 0;
        return prB - prA;
      });
    }

    return items;
  }, [activeWatchlist, filterQuery, sortBy, liveQuotes]);

  // Create Watchlist
  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistName.trim()) return;
    try {
      const res = await apiRequest<WatchlistData>("/api/v1/watchlists", {
        method: "POST",
        body: { name: newWatchlistName.trim() },
      });
      if (res?.id) {
        setWatchlists((prev) => [...prev, { ...res, items: [] }]);
        setActiveWatchlistId(res.id);
      }
    } catch {
      // Local fallback
      const newWl: WatchlistData = {
        id: `wl-${Date.now()}`,
        name: newWatchlistName.trim(),
        items: [],
      };
      setWatchlists((prev) => [...prev, newWl]);
      setActiveWatchlistId(newWl.id);
    } finally {
      setNewWatchlistName("");
      setCreateModalOpen(false);
    }
  };

  // Delete Watchlist
  const handleDeleteWatchlist = async () => {
    if (!activeWatchlist) return;
    if (!confirm(`Are you sure you want to delete "${activeWatchlist.name}"?`)) return;
    try {
      await apiRequest(`/api/v1/watchlists/${activeWatchlist.id}`, { method: "DELETE" });
      setWatchlists((prev) => prev.filter((w) => w.id !== activeWatchlist.id));
      setActiveWatchlistId(watchlists[0]?.id || null);
    } catch {
      setWatchlists((prev) => prev.filter((w) => w.id !== activeWatchlist.id));
      setActiveWatchlistId(watchlists[0]?.id || null);
    } finally {
      setActionsMenuOpen(false);
    }
  };

  // Remove Stock from Watchlist
  const handleRemoveStock = async (itemId: string, symbol: string) => {
    if (!activeWatchlist) return;
    try {
      await apiRequest(`/api/v1/watchlists/${activeWatchlist.id}/items/${itemId}`, {
        method: "DELETE",
      });
    } catch {
      // Ignore
    }
    setWatchlists((prev) =>
      prev.map((w) =>
        w.id === activeWatchlist.id
          ? { ...w, items: w.items.filter((i) => i.id !== itemId && i.symbol !== symbol) }
          : w
      )
    );
  };

  // Search Stocks for Adding
  const searchStocks = async (q: string) => {
    setStockSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await apiRequest<any[]>(`/api/v1/stocks?search=${encodeURIComponent(q)}&limit=8`);
      setSearchResults(res || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Add stock to active watchlist
  const handleAddStock = async (stock: any) => {
    if (!activeWatchlist) return;
    const sym = stock.symbol.toUpperCase();
    try {
      await apiRequest(`/api/v1/watchlists/${activeWatchlist.id}/items`, {
        method: "POST",
        body: { symbol: sym },
      });
    } catch {
      // Local fallback
    }

    const newItem: WatchlistItem = {
      id: `item-${Date.now()}`,
      symbol: sym,
      name: stock.name || sym,
      exchange: stock.exchange_code || "NSE",
      price: 1450.0,
      change: 12.5,
      change_percent: 0.85,
      volume: "14.2 L",
      market_cap: "₹1.85 L Cr",
      range_low: 1200,
      range_high: 1600,
    };

    setWatchlists((prev) =>
      prev.map((w) =>
        w.id === activeWatchlist.id ? { ...w, items: [...w.items, newItem] } : w
      )
    );
    setAddStockModalOpen(false);
    setStockSearchQuery("");
  };

  // Export CSV
  const exportCSV = () => {
    if (!activeWatchlist) return;
    const headers = ["Symbol", "Company Name", "Exchange", "LTP", "Change", "Change %", "Volume", "Market Cap"];
    const rows = displayedItems.map((i) => {
      const q = liveQuotes[i.symbol.toUpperCase()];
      const ltp = q?.ltp ?? i.price ?? 0;
      const chg = q?.change ?? i.change ?? 0;
      const chgPct = q?.change_percent ?? i.change_percent ?? 0;
      return [
        i.symbol,
        `"${i.name || i.stock?.name || i.symbol}"`,
        i.exchange || "NSE",
        ltp.toFixed(2),
        chg.toFixed(2),
        `${chgPct.toFixed(2)}%`,
        i.volume || "N/A",
        i.market_cap || "N/A",
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BullRun_${activeWatchlist.name.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setActionsMenuOpen(false);
  };

  return (
    <div className="flex flex-col w-full bg-surface pb-20">
      {/* Top Banner / Header Segment */}
      <div className="px-space-lg lg:px-space-xl pt-space-xl pb-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-lg bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-sm">
            <span className="text-label-sm font-label-sm text-primary uppercase tracking-wider px-space-sm py-space-xs bg-primary-fixed rounded-full font-medium">
              Real-time Watcher
            </span>
            <span className="text-body-sm text-outline">• Live Streaming</span>
          </div>
          <h1 className="text-headline-lg text-on-surface font-semibold tracking-tight">Market Watchlists</h1>
          <p className="text-body-md text-on-surface-variant max-w-2xl">
            Monitor your curated asset baskets, live order flows, and high-frequency technical indicators across NSE &amp; BSE exchanges.
          </p>
        </div>
        <div className="flex items-center gap-space-md flex-wrap">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-space-xs px-space-md py-space-sm bg-primary text-on-primary rounded-lg text-label-md hover:bg-primary/90 transition-colors shadow-sm font-medium"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>New Watchlist</span>
          </button>
          <button
            onClick={() => setAddStockModalOpen(true)}
            className="flex items-center gap-space-xs px-space-md py-space-sm bg-surface-container-high text-on-surface rounded-lg text-label-md hover:bg-surface-container-highest transition-colors font-medium"
          >
            <span className="material-symbols-outlined text-[18px]">playlist_add</span>
            <span>Add Ticker</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="px-space-lg lg:px-space-xl py-space-lg flex flex-col gap-space-lg">
        {/* Watchlist Tabs & Actions Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          {/* Tabs */}
          <div className="flex items-center gap-space-xs overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
            {watchlists.map((w) => {
              const isActive = w.id === activeWatchlistId;
              return (
                <button
                  key={w.id}
                  onClick={() => setActiveWatchlistId(w.id)}
                  className={`px-space-md py-space-sm rounded-lg text-label-md font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                    isActive
                      ? "bg-primary-container text-on-primary-container shadow-sm"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <span>{w.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                      isActive ? "bg-surface/20" : "bg-surface-container"
                    }`}
                  >
                    {w.items.length}
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-space-md py-space-sm rounded-lg text-label-md text-primary hover:bg-primary-fixed/50 transition-all flex items-center gap-space-xs whitespace-nowrap font-medium"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>+ New</span>
            </button>
          </div>

          {/* Quick Controls: Search, Filter, Sort, Menu */}
          <div className="flex items-center gap-space-sm flex-wrap">
            <div className="relative flex-1 sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-space-sm pointer-events-none">
                <span className="material-symbols-outlined text-outline text-[18px]">filter_alt</span>
              </span>
              <input
                className="w-full pl-9 pr-space-md py-2 bg-surface-container-lowest rounded-lg text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary shadow-sm border border-outline-variant/20"
                placeholder="Filter in watchlist..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                type="text"
              />
            </div>
            <div className="flex items-center gap-space-xs bg-surface-container-lowest p-1 rounded-lg shadow-sm border border-outline-variant/20">
              <button
                onClick={() => setSortBy(sortBy === "change" ? "default" : "change")}
                className={`px-space-sm py-1.5 text-label-sm rounded transition-colors flex items-center gap-1 ${
                  sortBy === "change"
                    ? "bg-primary text-on-primary font-medium"
                    : "text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">swap_vert</span>
                <span>Change</span>
              </button>
              <button
                onClick={() => setSortBy(sortBy === "price" ? "default" : "price")}
                className={`px-space-sm py-1.5 text-label-sm rounded transition-colors flex items-center gap-1 ${
                  sortBy === "price"
                    ? "bg-primary text-on-primary font-medium"
                    : "text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">sort</span>
                <span>LTP</span>
              </button>
            </div>

            <div className="relative">
              <button
                onClick={() => setActionsMenuOpen(!actionsMenuOpen)}
                className="p-2 bg-surface-container-lowest text-on-surface-variant hover:text-on-surface rounded-lg shadow-sm transition-colors flex items-center justify-center border border-outline-variant/20"
              >
                <span className="material-symbols-outlined text-[20px]">more_vert</span>
              </button>

              {actionsMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-surface-container-lowest rounded-xl shadow-xl py-1 z-20 border border-outline-variant/20">
                  <button
                    onClick={exportCSV}
                    className="w-full text-left px-space-md py-2 text-body-md text-on-surface hover:bg-surface-container flex items-center gap-space-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    <span>Export CSV</span>
                  </button>
                  <button
                    onClick={handleDeleteWatchlist}
                    className="w-full text-left px-space-md py-2 text-body-md text-error hover:bg-error-container/30 flex items-center gap-space-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    <span>Delete Watchlist</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Watchlist Table Card Container */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/60 text-outline text-label-sm font-label-sm border-b border-outline-variant/10">
                  <th className="py-3 px-space-md font-medium">Symbol / Company</th>
                  <th className="py-3 px-space-sm font-medium">Exchange</th>
                  <th className="py-3 px-space-md font-medium text-right">LTP (₹)</th>
                  <th className="py-3 px-space-md font-medium text-right">Change (₹ / %)</th>
                  <th className="py-3 px-space-md font-medium text-right">Volume</th>
                  <th className="py-3 px-space-md font-medium text-right">Market Cap</th>
                  <th className="py-3 px-space-md font-medium">52W Range</th>
                  <th className="py-3 px-space-md font-medium text-center">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-tabular-data">
                {displayedItems.map((item) => {
                  const q = liveQuotes[item.symbol.toUpperCase()];
                  const ltp = q?.ltp ?? item.price ?? 2845.5;
                  const chg = q?.change ?? item.change ?? 34.25;
                  const chgPct = q?.change_percent ?? item.change_percent ?? 1.22;
                  const isPositive = chgPct >= 0;

                  const rangeLow = item.range_low ?? ltp * 0.78;
                  const rangeHigh = item.range_high ?? ltp * 1.15;
                  const rangePct = Math.min(
                    100,
                    Math.max(0, Math.round(((ltp - rangeLow) / (rangeHigh - rangeLow)) * 100))
                  );

                  return (
                    <tr key={item.id} className="hover:bg-surface-container-low/50 transition-colors group">
                      <td className="py-3.5 px-space-md">
                        <Link href={`/stocks/${item.symbol}`} className="flex items-center gap-space-sm group/link">
                          <div className="w-9 h-9 rounded-lg bg-primary-fixed/50 flex items-center justify-center text-primary font-headline-sm text-xs font-bold group-hover/link:bg-primary group-hover/link:text-on-primary transition-colors">
                            {item.symbol.slice(0, 4)}
                          </div>
                          <div>
                            <div className="font-headline-sm text-on-surface flex items-center gap-1.5 font-semibold group-hover/link:text-primary transition-colors">
                              {item.symbol}{" "}
                              <span className="text-xs px-1.5 py-0.5 rounded bg-tertiary-container/10 text-tertiary font-normal">
                                EQ
                              </span>
                            </div>
                            <div className="text-body-sm text-outline font-sans truncate max-w-xs">
                              {item.name || item.stock?.name || "NSE Stock"}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3.5 px-space-sm">
                        <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant text-label-sm font-medium">
                          {item.exchange || "NSE"}
                        </span>
                      </td>
                      <td className="py-3.5 px-space-md text-right font-headline-sm text-on-surface font-semibold">
                        {formatINR(ltp)}
                      </td>
                      <td className="py-3.5 px-space-md text-right">
                        <div
                          className={`font-medium flex items-center justify-end gap-1 ${
                            isPositive ? "text-tertiary" : "text-error"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {isPositive ? "arrow_drop_up" : "arrow_drop_down"}
                          </span>
                          <span>
                            {isPositive ? "+" : ""}
                            {formatINR(chg)}
                          </span>
                        </div>
                        <div
                          className={`text-body-sm font-medium ${
                            isPositive ? "text-tertiary" : "text-error"
                          }`}
                        >
                          ({isPositive ? "+" : ""}
                          {formatPercentage(chgPct)})
                        </div>
                      </td>
                      <td className="py-3.5 px-space-md text-right text-on-surface-variant">
                        {item.volume || "42.5 L"}
                      </td>
                      <td className="py-3.5 px-space-md text-right text-on-surface-variant">
                        {item.market_cap || "₹19.24 L Cr"}
                      </td>
                      <td className="py-3.5 px-space-md">
                        <div className="w-36 flex flex-col gap-1">
                          <div className="flex justify-between text-body-sm text-outline">
                            <span>{Math.round(rangeLow)}</span>
                            <span className="text-on-surface font-medium">{rangePct}%</span>
                            <span>{Math.round(rangeHigh)}</span>
                          </div>
                          <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isPositive ? "bg-tertiary" : "bg-error"}`}
                              style={{ width: `${rangePct}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-space-md text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() =>
                              setOrderModalStock({
                                symbol: item.symbol,
                                stockId: item.stock_id || item.symbol,
                                name: item.name,
                                side: "BUY",
                              })
                            }
                            className="px-3 py-1 bg-tertiary text-on-tertiary rounded-lg text-label-sm font-medium hover:bg-tertiary/90 transition-colors shadow-sm"
                          >
                            Buy
                          </button>
                          <button
                            onClick={() =>
                              setOrderModalStock({
                                symbol: item.symbol,
                                stockId: item.stock_id || item.symbol,
                                name: item.name,
                                side: "SELL",
                              })
                            }
                            className="px-3 py-1 bg-error-container text-on-error-container rounded-lg text-label-sm font-medium hover:bg-error-container/80 transition-colors"
                          >
                            Sell
                          </button>
                          <button
                            onClick={() => handleRemoveStock(item.id, item.symbol)}
                            className="p-1 text-outline hover:text-error transition-colors"
                            title="Remove from watchlist"
                          >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Create Watchlist */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateWatchlist}
            className="bg-surface-container-lowest p-space-xl rounded-2xl max-w-md w-full shadow-2xl border border-outline-variant/30 flex flex-col gap-space-md"
          >
            <h3 className="font-headline-md text-on-surface font-semibold">Create New Watchlist</h3>
            <p className="font-body-sm text-on-surface-variant">
              Enter a name for your custom watchlist basket.
            </p>
            <input
              type="text"
              placeholder="e.g. Dividend Champions"
              value={newWatchlistName}
              onChange={(e) => setNewWatchlistName(e.target.value)}
              className="w-full px-space-md py-space-sm bg-surface-container-low rounded-lg text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary border border-outline-variant/30"
              autoFocus
            />
            <div className="flex items-center justify-end gap-space-sm mt-space-sm">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-space-md py-space-sm text-label-md text-on-surface hover:bg-surface-container rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-space-md py-space-sm bg-primary text-on-primary rounded-lg text-label-md font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                Create Watchlist
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add Stock / Ticker */}
      {addStockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-space-xl rounded-2xl max-w-lg w-full shadow-2xl border border-outline-variant/30 flex flex-col gap-space-md max-h-[85vh]">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-on-surface font-semibold">
                Add Ticker to {activeWatchlist?.name}
              </h3>
              <button
                onClick={() => setAddStockModalOpen(false)}
                className="p-1 rounded-full hover:bg-surface-container text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-space-sm pointer-events-none text-outline">
                <span className="material-symbols-outlined text-[18px]">search</span>
              </span>
              <input
                type="text"
                placeholder="Search symbol (e.g. INFY, TCS, RELIANCE)..."
                value={stockSearchQuery}
                onChange={(e) => searchStocks(e.target.value)}
                className="w-full pl-9 pr-space-md py-space-sm bg-surface-container-low rounded-lg text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary border border-outline-variant/30"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto flex flex-col divide-y divide-surface-container max-h-64">
              {isSearching ? (
                <div className="p-space-md text-center text-outline">Searching stocks...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((s) => (
                  <div
                    key={s.id || s.symbol}
                    onClick={() => handleAddStock(s)}
                    className="p-space-sm hover:bg-surface-container-low cursor-pointer flex items-center justify-between rounded-lg transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-on-surface">{s.symbol}</span>
                      <span className="block text-body-sm text-outline">{s.name}</span>
                    </div>
                    <span className="material-symbols-outlined text-primary text-[20px]">add_circle</span>
                  </div>
                ))
              ) : stockSearchQuery.length >= 2 ? (
                <div
                  onClick={() => handleAddStock({ symbol: stockSearchQuery.toUpperCase() })}
                  className="p-space-sm hover:bg-surface-container-low cursor-pointer flex items-center justify-between rounded-lg transition-colors text-primary"
                >
                  <span>Add custom symbol: &quot;{stockSearchQuery.toUpperCase()}&quot;</span>
                  <span className="material-symbols-outlined text-[20px]">add</span>
                </div>
              ) : (
                <div className="p-space-md text-center text-outline text-body-sm">
                  Type at least 2 characters to search Indian equities
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dynamic OrderPadModal */}
      {orderModalStock && (
        <OrderPadModal
          isOpen={true}
          onClose={() => setOrderModalStock(null)}
          symbol={orderModalStock.symbol}
          stockId={orderModalStock.stockId}
          stockName={orderModalStock.name}
          initialSide={orderModalStock.side}
        />
      )}
    </div>
  );
}
