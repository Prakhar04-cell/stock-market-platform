"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { OrderPadModal } from "@/components/trading/order-pad-modal";
import { ProviderStatusBanner } from "@/components/trading/provider-status-banner";
import {
  Bookmark,
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  Search,
  Check,
  AlertCircle,
  Eye,
} from "lucide-react";

export default function WatchlistPage() {
  const [watchlists, setWatchlists] = useState<any[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [addStockModalOpen, setAddStockModalOpen] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [targetStock, setTargetStock] = useState({ id: "", symbol: "", name: "", side: "BUY" as "BUY" | "SELL" });

  const loadWatchlists = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest("/api/v1/watchlists");
      setWatchlists(data);
      if (data.length > 0 && !activeWatchlistId) {
        setActiveWatchlistId(data[0].id);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWatchlists();
  }, []);

  const activeWatchlist = watchlists.find((w) => w.id === activeWatchlistId) || watchlists[0];

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

  const handleRenameWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameValue.trim() || !renameTargetId) return;
    try {
      await apiRequest(`/api/v1/watchlists/${renameTargetId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: renameValue }),
      });
      setRenameModalOpen(false);
      loadWatchlists();
    } catch {
      // Ignore
    }
  };

  const handleDeleteWatchlist = async (id: string) => {
    if (!confirm("Are you sure you want to delete this watchlist?")) return;
    try {
      await apiRequest(`/api/v1/watchlists/${id}`, { method: "DELETE" });
      const remaining = watchlists.filter((w) => w.id !== id);
      setWatchlists(remaining);
      setActiveWatchlistId(remaining.length > 0 ? remaining[0].id : null);
    } catch {
      // Ignore
    }
  };

  const handleSearchStocks = async (query: string) => {
    setStockSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await apiRequest(`/api/v1/stocks?search=${encodeURIComponent(query)}`);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
  };

  const handleAddStockToWatchlist = async (stockId: string) => {
    if (!activeWatchlist?.id) return;
    try {
      await apiRequest(`/api/v1/watchlists/${activeWatchlist.id}/items`, {
        method: "POST",
        body: JSON.stringify({ stock_id: stockId }),
      });
      setAddStockModalOpen(false);
      setStockSearchQuery("");
      setSearchResults([]);
      loadWatchlists();
    } catch {
      // Ignore
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!activeWatchlist?.id) return;
    try {
      await apiRequest(`/api/v1/watchlists/${activeWatchlist.id}/items/${itemId}`, {
        method: "DELETE",
      });
      loadWatchlists();
    } catch {
      // Ignore
    }
  };

  const openOrder = (stock: any, side: "BUY" | "SELL") => {
    setTargetStock({
      id: stock.id,
      symbol: stock.symbol,
      name: stock.name,
      side,
    });
    setOrderModalOpen(true);
  };

  return (
    <div className="space-y-5 select-none">
      <ProviderStatusBanner />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/90 p-4 rounded-2xl shadow-card">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Watchlist
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize and track selected Indian equities, indices, and derivatives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Watchlist
          </Button>

          {activeWatchlist && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAddStockModalOpen(true);
                handleSearchStocks("");
              }}
              className="border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
            >
              <Search className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              Add Stocks
            </Button>
          )}
        </div>
      </div>

      {/* Watchlist Tabs Strip */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {watchlists.map((wl) => {
            const isActive = activeWatchlist?.id === wl.id;
            return (
              <div
                key={wl.id}
                className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-white text-indigo-600 shadow-xs border border-slate-200 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
                onClick={() => setActiveWatchlistId(wl.id)}
              >
                <span>{wl.name}</span>
                <span className="text-[10px] px-1.5 rounded-full bg-slate-100 text-slate-500 font-mono">
                  {wl.items?.length || 0}
                </span>

                {/* Edit / Delete Icons */}
                <div className="hidden group-hover:flex items-center gap-1 ml-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenameTargetId(wl.id);
                      setRenameValue(wl.name);
                      setRenameModalOpen(true);
                    }}
                    className="text-slate-400 hover:text-slate-700 p-0.5"
                    title="Rename"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  {watchlists.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWatchlist(wl.id);
                      }}
                      className="text-slate-400 hover:text-rose-600 p-0.5"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Watchlist Items Table (Section 9) */}
      {activeWatchlist && activeWatchlist.items?.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stock</TableHead>
              <TableHead>Exchange</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead className="text-right">Change %</TableHead>
              <TableHead className="text-right">Volume</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeWatchlist.items.map((item: any) => {
              const stock = item.stock;
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center font-mono border border-slate-200">
                        {stock?.symbol?.slice(0, 2) || "EQ"}
                      </div>
                      <div>
                        <Link
                          href={`/stocks/${stock?.symbol}`}
                          className="font-bold text-slate-900 hover:text-indigo-600 transition-colors block leading-tight"
                        >
                          {stock?.symbol}
                        </Link>
                        <span className="text-[11px] text-slate-500 block truncate max-w-xs">
                          {stock?.name}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono font-medium">
                      {stock?.exchange_code || "NSE EQ"}
                    </span>
                  </TableCell>

                  <TableCell className="text-right font-mono font-semibold text-slate-800">
                    --
                  </TableCell>

                  <TableCell className="text-right font-mono text-slate-400">
                    --
                  </TableCell>

                  <TableCell className="text-right font-mono text-slate-400">
                    --
                  </TableCell>

                  <TableCell className="text-right font-mono text-slate-500 text-xs">
                    --
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Link
                        href={`/stocks/${stock?.symbol}`}
                        className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => openOrder(stock, "BUY")}
                        className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-[10px] font-bold transition-colors"
                      >
                        Buy
                      </button>
                      <button
                        onClick={() => openOrder(stock, "SELL")}
                        className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-[10px] font-bold transition-colors"
                      >
                        Sell
                      </button>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                        title="Remove from Watchlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        /* Section 25 Empty State */
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-white shadow-card flex flex-col items-center justify-center">
          <div className="p-3 rounded-full bg-indigo-50 text-indigo-600 mb-3">
            <Bookmark className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            Add stocks to start building your watchlist
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
            Search top companies like Reliance, HDFC Bank, TCS, or Tata Motors to monitor price action.
          </p>
          <Button
            size="sm"
            onClick={() => {
              setAddStockModalOpen(true);
              handleSearchStocks("");
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm"
          >
            <Search className="w-3.5 h-3.5 mr-1" />
            Search and Add Stocks
          </Button>
        </div>
      )}

      {/* Create Watchlist Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Watchlist"
        description="Name your custom list for categorized market tracking."
      >
        <form onSubmit={handleCreateWatchlist} className="space-y-4">
          <Input
            label="Watchlist Name"
            placeholder="e.g. Banking Stocks, Tech Leaders"
            value={newWatchlistName}
            onChange={(e) => setNewWatchlistName(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Create Watchlist
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rename Watchlist Modal */}
      <Modal
        isOpen={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        title="Rename Watchlist"
      >
        <form onSubmit={handleRenameWatchlist} className="space-y-4">
          <Input
            label="New Name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setRenameModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Save Name
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Stock Search Modal */}
      <Modal
        isOpen={addStockModalOpen}
        onClose={() => setAddStockModalOpen(false)}
        title="Add Stock to Watchlist"
        description={`Add to ${activeWatchlist?.name || "Watchlist"}`}
      >
        <div className="space-y-4">
          <Input
            placeholder="Type company name or symbol (e.g. RELIANCE)..."
            value={stockSearchQuery}
            onChange={(e) => handleSearchStocks(e.target.value)}
            autoFocus
          />

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/50">
            {searchResults.length > 0 ? (
              searchResults.map((stk) => (
                <div
                  key={stk.id}
                  className="p-3 flex items-center justify-between hover:bg-white transition-colors"
                >
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">{stk.symbol}</span>
                    <span className="text-[11px] text-slate-500">{stk.name}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddStockToWatchlist(stk.id)}
                    className="text-xs h-7 border-slate-200 hover:bg-slate-50"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                {stockSearchQuery ? "No stocks matching your query" : "Search to explore tradeable equities"}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Order Pad Modal */}
      <OrderPadModal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        stockId={targetStock.id}
        symbol={targetStock.symbol}
        stockName={targetStock.name}
        defaultSide={targetStock.side}
      />
    </div>
  );
}
