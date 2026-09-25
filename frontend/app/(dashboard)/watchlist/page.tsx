"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { OrderPadModal } from "@/components/trading/order-pad-modal";
import { TableRowSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { marketWs, WsPriceUpdate } from "@/lib/market-ws";
import { formatStockPrice, formatPercentage, formatPnL } from "@/lib/formatters";
import {
  Bookmark,
  Plus,
  Trash2,
  TrendingUp,
  Search,
  Eye,
  RefreshCw,
  X,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";

interface WatchlistItem {
  id: string;
  stock_id: string;
  symbol: string;
  stock?: {
    id: string;
    symbol: string;
    name: string;
    exchange_code?: string;
  };
  price?: number;
  change?: number;
  change_percent?: number;
  is_positive?: boolean;
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
  const [liveQuotes, setLiveQuotes] = useState<Record<string, { ltp: number; change: number; change_percent: number }>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Watchlist modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState("");

  // Search & add stock modal
  const [addStockModalOpen, setAddStockModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Order pad modal
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderTarget, setOrderTarget] = useState({ symbol: "RELIANCE", name: "Reliance Industries", side: "BUY" as "BUY" | "SELL" });

  const loadWatchlists = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<WatchlistData[]>("/api/v1/watchlists");
      setWatchlists(data || []);
      if (data && data.length > 0 && !activeWatchlistId) {
        setActiveWatchlistId(data[0].id);
      }

      // Batch-fetch real quotes for all symbols across watchlists
      const allSymbols: string[] = Array.from(
        new Set(
          (data || []).flatMap((w) =>
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
                  change: q.change !== null ? Number(q.change) : 0,
                  change_percent: q.change_percent !== null ? Number(q.change_percent) : 0,
                };
              }
            });
            setLiveQuotes((prev) => ({ ...prev, ...mapped }));
          }
        } catch {
          // Ignore quote error
        }
      }
    } catch {
      setWatchlists([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeWatchlistId]);

  useEffect(() => {
    loadWatchlists();
  }, [loadWatchlists]);

  const activeWatchlist = watchlists.find((w) => w.id === activeWatchlistId) || watchlists[0];

  // Subscribe to live websocket updates for active watchlist items
  useEffect(() => {
    if (!activeWatchlist?.items || activeWatchlist.items.length === 0) return;

    const symbols: string[] = activeWatchlist.items
      .map((i) => i.symbol || i.stock?.symbol)
      .filter((s): s is string => Boolean(s));

    const unsubs = symbols.map((sym) =>
      marketWs.subscribe(sym, (update: WsPriceUpdate) => {
        const val = typeof update.ltp === "string" ? parseFloat(update.ltp) : update.ltp;
        const chg = typeof update.change === "string" ? parseFloat(update.change) : update.change;
        const chgPct = typeof update.change_percent === "string" ? parseFloat(update.change_percent) : update.change_percent;

        if (val) {
          setLiveQuotes((prev) => ({
            ...prev,
            [sym.toUpperCase()]: {
              ltp: val,
              change: chg ?? prev[sym.toUpperCase()]?.change ?? 0,
              change_percent: chgPct ?? prev[sym.toUpperCase()]?.change_percent ?? 0,
            },
          }));
        }
      })
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [activeWatchlist]);

  // Debounced search for adding stock
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await apiRequest(`/api/v1/market/instruments/search?query=${encodeURIComponent(searchQuery.trim())}&limit=8`);
        setSearchResults(data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistName.trim()) return;
    try {
      const created = await apiRequest("/api/v1/watchlists", {
        method: "POST",
        body: JSON.stringify({ name: newWatchlistName }),
      });
      setNewWatchlistName("");
      setCreateModalOpen(false);
      await loadWatchlists();
      setActiveWatchlistId(created.id);
    } catch {
      // Ignore
    }
  };

  const handleAddStock = async (stockItem: any) => {
    if (!activeWatchlist) return;
    try {
      await apiRequest(`/api/v1/watchlists/${activeWatchlist.id}/items`, {
        method: "POST",
        body: JSON.stringify({ stock_id: stockItem.symbol }),
      });
      setAddStockModalOpen(false);
      setSearchQuery("");
      await loadWatchlists();
    } catch {
      // Ignore
    }
  };

  const handleRemoveStock = async (itemId: string) => {
    if (!activeWatchlist) return;
    try {
      await apiRequest(`/api/v1/watchlists/${activeWatchlist.id}/items/${itemId}`, {
        method: "DELETE",
      });
      await loadWatchlists();
    } catch {
      // Ignore
    }
  };

  const openOrderPad = (symbol: string, name: string, side: "BUY" | "SELL") => {
    setOrderTarget({ symbol, name, side });
    setOrderModalOpen(true);
  };

  return (
    <div className="space-y-6 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E5E7EB] p-4 sm:p-5 rounded-xl shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-[#111827] tracking-tight">
            Watchlists
          </h1>
          <p className="text-xs text-[#6B7280]">
            Track indices, equities, and execute simulated paper trades
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAddStockModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4F46E5] text-white text-xs font-bold hover:bg-[#4338CA] shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Stock</span>
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-xs font-semibold text-[#4B5563] hover:text-[#111827] hover:bg-[#F7F8FA] transition-colors"
          >
            <span>New List</span>
          </button>

          <button
            onClick={loadWatchlists}
            className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#4B5563] hover:text-[#111827] hover:bg-[#F7F8FA]"
            title="Refresh Quotes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Watchlist Tabs Bar */}
      {watchlists.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {watchlists.map((wl) => (
            <button
              key={wl.id}
              onClick={() => setActiveWatchlistId(wl.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                (activeWatchlistId || watchlists[0]?.id) === wl.id
                  ? "bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]"
                  : "bg-white text-[#6B7280] border border-[#E5E7EB] hover:text-[#111827] hover:bg-[#F7F8FA]"
              }`}
            >
              <span>{wl.name}</span>
              <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-[#4B5563]">
                {wl.items?.length || 0}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Watchlist Items Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <table className="w-full text-xs">
              <tbody>
                <TableRowSkeleton cols={5} />
                <TableRowSkeleton cols={5} />
                <TableRowSkeleton cols={5} />
                <TableRowSkeleton cols={5} />
              </tbody>
            </table>
          </div>
        ) : !activeWatchlist || !activeWatchlist.items || activeWatchlist.items.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={Bookmark}
              title="Your watchlist is empty"
              description="Add stocks to quickly track their performance and place instant paper orders."
              action={
                <button
                  onClick={() => setAddStockModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4F46E5] text-white text-xs font-bold hover:bg-[#4338CA] shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Explore Markets &amp; Add</span>
                </button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F7F8FA] border-b border-[#E5E7EB] text-[#6B7280] text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Instrument</th>
                  <th className="py-3 px-4 text-right">LTP (₹)</th>
                  <th className="py-3 px-4 text-right">Day Change</th>
                  <th className="py-3 px-4 text-right">Change %</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {activeWatchlist.items.map((item) => {
                  const sym = (item.symbol || item.stock?.symbol || "").toUpperCase();
                  const q = liveQuotes[sym];
                  const price = q?.ltp;
                  const chg = q?.change ?? 0;
                  const chgPct = q?.change_percent ?? 0;
                  const pnl = formatPnL(chg, chgPct);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#F7F8FA] transition-colors group"
                    >
                      {/* Instrument */}
                      <td className="py-3 px-4">
                        <Link
                          href={`/stocks/${encodeURIComponent(sym)}`}
                          className="flex items-center gap-2.5"
                        >
                          <div className="w-7 h-7 rounded-md bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center font-bold text-[#374151] text-[11px] font-mono shrink-0">
                            {sym.slice(0, 2)}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-[#111827] group-hover:text-[#4F46E5] transition-colors block">
                              {sym}
                            </span>
                            <span className="text-[10.5px] text-[#6B7280] block truncate max-w-[200px]">
                              {item.stock?.name || `${sym} Equities`}
                            </span>
                          </div>
                        </Link>
                      </td>

                      {/* LTP */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-xs text-[#111827] tabular-nums">
                        {price !== undefined
                          ? formatStockPrice(price)
                          : "₹ --"}
                      </td>

                      {/* Day Change */}
                      <td
                        className={`py-3 px-4 text-right font-mono font-semibold text-xs tabular-nums ${
                          price !== undefined
                            ? pnl.colorClass
                            : "text-[#9CA3AF]"
                        }`}
                      >
                        {price !== undefined ? pnl.amountText : "--"}
                      </td>

                      {/* Change % */}
                      <td
                        className={`py-3 px-4 text-right font-mono font-bold text-xs tabular-nums ${
                          price !== undefined
                            ? pnl.colorClass
                            : "text-[#9CA3AF]"
                        }`}
                      >
                        {price !== undefined ? pnl.percentText : "--"}
                      </td>

                      {/* Actions: View, Buy, Sell, Remove */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            href={`/stocks/${encodeURIComponent(sym)}`}
                            className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#4B5563] hover:text-[#111827] hover:bg-white"
                            title="View Chart & Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            onClick={() => openOrderPad(sym, item.stock?.name || sym, "BUY")}
                            className="px-2 py-1 rounded bg-[#ECFDF5] text-[#00A86B] border border-[#A7F3D0] text-[10.5px] font-bold hover:bg-[#D1FAE5] transition-colors"
                          >
                            BUY
                          </button>

                          <button
                            onClick={() => openOrderPad(sym, item.stock?.name || sym, "SELL")}
                            className="px-2 py-1 rounded bg-[#FEF2F2] text-[#EF4444] border border-[#FECACA] text-[10.5px] font-bold hover:bg-[#FEE2E2] transition-colors"
                          >
                            SELL
                          </button>

                          <button
                            onClick={() => handleRemoveStock(item.id)}
                            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#EF4444] hover:bg-rose-50 transition-colors"
                            title="Remove from watchlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Stock Modal */}
      {addStockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl select-none">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-[#111827]">Add Instrument to Watchlist</h3>
              <button
                onClick={() => setAddStockModalOpen(false)}
                className="text-[#9CA3AF] hover:text-[#111827]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search symbol (e.g. RELIANCE, TCS, INFY)..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#F7F8FA] border border-[#E5E7EB] text-xs text-[#111827] focus:outline-none focus:border-[#4F46E5]"
                autoFocus
              />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
              {isSearching ? (
                <div className="p-4 text-center text-[#6B7280]">Searching...</div>
              ) : searchResults.length === 0 && searchQuery ? (
                <div className="p-4 text-center text-[#6B7280]">No instruments found.</div>
              ) : (
                searchResults.map((item) => (
                  <div
                    key={item.instrument_key || item.symbol}
                    onClick={() => handleAddStock(item)}
                    className="p-2.5 flex items-center justify-between hover:bg-[#F7F8FA] cursor-pointer rounded-lg transition-colors"
                  >
                    <div>
                      <span className="font-bold text-[#111827]">{item.symbol}</span>
                      <span className="text-[10.5px] text-[#6B7280] block">{item.name}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-[#4B5563] font-mono">
                      {item.exchange || "NSE"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Watchlist Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateWatchlist}
            className="bg-white border border-[#E5E7EB] rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl select-none"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-[#111827]">Create New Watchlist</h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-[#9CA3AF] hover:text-[#111827]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#4B5563] block mb-1.5">
                Watchlist Name
              </label>
              <input
                type="text"
                value={newWatchlistName}
                onChange={(e) => setNewWatchlistName(e.target.value)}
                placeholder="e.g. Bluechips, Banking, Tech"
                className="w-full px-3 py-2 rounded-lg bg-[#F7F8FA] border border-[#E5E7EB] text-xs text-[#111827] focus:outline-none focus:border-[#4F46E5]"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="flex-1 py-2 rounded-xl border border-[#E5E7EB] text-xs font-semibold text-[#4B5563] hover:bg-[#F7F8FA]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newWatchlistName.trim()}
                className="flex-1 py-2 rounded-xl bg-[#4F46E5] text-white text-xs font-bold hover:bg-[#4338CA] disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Trade Order Pad Modal */}
      <OrderPadModal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        stockId={orderTarget.symbol}
        symbol={orderTarget.symbol}
        stockName={orderTarget.name}
        defaultSide={orderTarget.side}
        onOrderPlaced={loadWatchlists}
      />
    </div>
  );
}
