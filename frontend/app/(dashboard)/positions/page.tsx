"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { OrderPadModal } from "@/components/trading/order-pad-modal";
import { useMarketWebSocket, WsPriceUpdate } from "@/lib/market-ws";
import {
  formatINR,
  formatCompactINR,
  formatPercentage,
} from "@/lib/formatters";
import {
  PositionItem,
  getCachedPositions,
  saveCachedPositions,
  fetchPositionsWithCache,
} from "@/lib/positions-service";

export default function PositionsPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"OPEN" | "CLOSED">("OPEN");
  const [productFilter, setProductFilter] = useState<"ALL" | "MIS" | "CNC">("ALL");
  const [symbolFilter, setSymbolFilter] = useState("");

  // Synchronous cache restoration: positions are available on the very first frame of render
  const [positions, setPositions] = useState<PositionItem[]>(() => getCachedPositions() ?? []);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(() => getCachedPositions() === null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Square off all confirmation state
  const [squareOffConfirmOpen, setSquareOffConfirmOpen] = useState(false);
  const [isSquaringOff, setIsSquaringOff] = useState(false);

  // Trade modal state
  const [orderModalStock, setOrderModalStock] = useState<{
    symbol: string;
    stockId: string;
    side: "BUY" | "SELL";
  } | null>(null);

  // Fetch Positions in background with instant cache preservation
  const loadPositions = useCallback(async (force = false) => {
    setIsRefreshing(true);
    try {
      const data = await fetchPositionsWithCache(force);
      setPositions(data);
      const prices: Record<string, number> = {};
      data.forEach((p) => {
        if (p.current_price) {
          prices[p.symbol.toUpperCase()] = Number(p.current_price);
        }
      });
      setLivePrices((prev) => ({ ...prev, ...prices }));
    } catch {
      // Preserve existing cached positions if network fails
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  // WebSocket Live Updates
  useMarketWebSocket("", (update: WsPriceUpdate) => {
    if (update.symbol && update.ltp) {
      const sym = update.symbol.toUpperCase();
      const val = Number(update.ltp);
      setLivePrices((prev) => ({ ...prev, [sym]: val }));
    }
  });

  // Calculate Summary Metrics
  const openPositions = useMemo(() => positions.filter((p) => p.status === "OPEN"), [positions]);
  const closedPositions = useMemo(() => positions.filter((p) => p.status === "CLOSED"), [positions]);

  const totalUnrealizedPnL = useMemo(() => {
    return openPositions.reduce((acc, p) => {
      const ltp = livePrices[p.symbol.toUpperCase()] ?? p.current_price ?? p.entry_price;
      const diff = p.side === "BUY" ? ltp - p.entry_price : p.entry_price - ltp;
      return acc + diff * p.quantity;
    }, 0);
  }, [openPositions, livePrices]);

  const totalInvestedValue = useMemo(() => {
    return openPositions.reduce((acc, p) => acc + p.quantity * p.entry_price, 0);
  }, [openPositions]);

  const unrealizedPnLPct = totalInvestedValue > 0 ? (totalUnrealizedPnL / totalInvestedValue) * 100 : 0;

  const totalRealizedPnL = useMemo(() => {
    return closedPositions.reduce((acc, p) => acc + (p.realized_pnl ?? 0), 0);
  }, [closedPositions]);

  // Filtered positions based on activeTab, productFilter, symbolFilter
  const displayedPositions = useMemo(() => {
    const list = activeTab === "OPEN" ? openPositions : closedPositions;
    return list.filter((p) => {
      const matchProduct = productFilter === "ALL" || p.product_type === productFilter;
      const matchSymbol = p.symbol.toLowerCase().includes(symbolFilter.toLowerCase());
      return matchProduct && matchSymbol;
    });
  }, [activeTab, openPositions, closedPositions, productFilter, symbolFilter]);

  // Handle Square Off All
  const handleSquareOffAll = async () => {
    setIsSquaringOff(true);
    try {
      await apiRequest("/api/v1/positions/square-off-all", { method: "POST" });
      await loadPositions(true);
    } catch {
      // Optimistically mark all open positions as closed and update cache immediately
      setPositions((prev) => {
        const updated: PositionItem[] = prev.map((p) =>
          p.status === "OPEN"
            ? { ...p, status: "CLOSED", realized_pnl: p.unrealized_pnl || 0 }
            : p
        );
        saveCachedPositions(updated);
        return updated;
      });
    } finally {
      setIsSquaringOff(false);
      setSquareOffConfirmOpen(false);
    }
  };

  // Export CSV Report
  const exportReport = () => {
    const headers = ["Symbol", "Product", "Side", "Quantity", "Entry Price", "LTP", "PnL Amount", "Status"];
    const rows = displayedPositions.map((p) => {
      const ltp = livePrices[p.symbol.toUpperCase()] ?? p.current_price ?? p.entry_price;
      const diff = p.side === "BUY" ? ltp - p.entry_price : p.entry_price - ltp;
      const pnl = p.status === "OPEN" ? diff * p.quantity : p.realized_pnl ?? 0;
      return [p.symbol, p.product_type, p.side, p.quantity, p.entry_price, ltp, pnl.toFixed(2), p.status];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BullRun_Positions_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col w-full bg-surface pb-space-xl">
      {/* Header / Summary Banner Section */}
      <div className="px-space-lg lg:px-space-xl pt-space-xl pb-space-lg bg-surface-container-lowest border-b border-outline-variant/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-lg">
          <div>
            <div className="flex items-center gap-space-xs text-secondary text-label-sm uppercase tracking-wider font-tabular-data">
              <span>Portfolio Summary</span>
              <span>/</span>
              <span className="text-primary font-medium">Active Session</span>
              {isRefreshing && (
                <span className="inline-flex items-center gap-1.5 ml-space-sm text-label-xs text-secondary/70 lowercase font-sans">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                  syncing...
                </span>
              )}
            </div>
            <h1 className="font-headline-lg text-on-surface font-semibold tracking-tight mt-space-xs">
              Portfolio Positions
            </h1>
          </div>
          <div className="flex items-center gap-space-sm flex-wrap">
            <button
              onClick={exportReport}
              className="px-space-md py-space-sm bg-surface-container hover:bg-surface-container-high text-on-surface text-label-md rounded-lg transition-colors flex items-center gap-space-xs shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Export Report</span>
            </button>
            <button
              disabled={openPositions.length === 0}
              onClick={() => setSquareOffConfirmOpen(true)}
              className="px-space-md py-space-sm bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-on-primary text-label-md rounded-lg transition-colors flex items-center gap-space-xs shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              <span>Square Off All</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Banner Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mt-space-lg">
          {/* Total Unrealized P&L */}
          <div className="p-space-lg bg-surface-container-low rounded-xl flex flex-col justify-between border border-outline-variant/20">
            <span className="text-body-sm text-secondary font-medium">Total Unrealized P&amp;L</span>
            <div className="flex items-baseline gap-space-sm mt-space-md">
              {isInitialLoading ? (
                <div className="w-28 h-8 bg-surface-container-high rounded animate-pulse" />
              ) : (
                <>
                  <span
                    className={`font-headline-md font-tabular-data font-semibold ${
                      totalUnrealizedPnL >= 0 ? "text-tertiary" : "text-error"
                    }`}
                  >
                    {totalUnrealizedPnL >= 0 ? "+" : ""}
                    {formatINR(totalUnrealizedPnL)}
                  </span>
                  <span
                    className={`text-label-sm px-space-xs py-0.5 rounded font-tabular-data font-medium ${
                      totalUnrealizedPnL >= 0
                        ? "text-tertiary bg-tertiary-container/10"
                        : "text-error bg-error-container/20"
                    }`}
                  >
                    {unrealizedPnLPct >= 0 ? "+" : ""}
                    {formatPercentage(unrealizedPnLPct)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Realized P&L (Today) */}
          <div className="p-space-lg bg-surface-container-low rounded-xl flex flex-col justify-between border border-outline-variant/20">
            <span className="text-body-sm text-secondary font-medium">Realized P&amp;L (Today)</span>
            <div className="flex items-baseline gap-space-sm mt-space-md">
              {isInitialLoading ? (
                <div className="w-24 h-8 bg-surface-container-high rounded animate-pulse" />
              ) : (
                <>
                  <span
                    className={`font-headline-md font-tabular-data font-semibold ${
                      totalRealizedPnL >= 0 ? "text-tertiary" : "text-error"
                    }`}
                  >
                    {totalRealizedPnL >= 0 ? "+" : ""}
                    {formatINR(totalRealizedPnL)}
                  </span>
                  <span className="text-label-sm text-secondary bg-surface-container px-space-xs py-0.5 rounded font-tabular-data">
                    Settled
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Total Invested Value */}
          <div className="p-space-lg bg-surface-container-low rounded-xl flex flex-col justify-between border border-outline-variant/20">
            <span className="text-body-sm text-secondary font-medium">Total Invested Value</span>
            <div className="flex items-baseline gap-space-sm mt-space-md">
              {isInitialLoading ? (
                <div className="w-24 h-8 bg-surface-container-high rounded animate-pulse" />
              ) : (
                <span className="font-headline-md text-on-surface font-tabular-data font-semibold">
                  {formatINR(totalInvestedValue)}
                </span>
              )}
            </div>
          </div>

          {/* Margin Used / Available */}
          <div className="p-space-lg bg-surface-container-low rounded-xl flex flex-col justify-between border border-outline-variant/20">
            <span className="text-body-sm text-secondary font-medium">Margin Used / Available</span>
            <div className="flex items-baseline gap-space-sm mt-space-md">
              <span className="font-headline-md text-on-surface font-tabular-data font-semibold">
                ₹4.8L / ₹15.2L
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-space-lg lg:px-space-xl mt-space-lg">
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/20">
          {/* Nav Tabs & Filter Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-lg border-b border-surface-container-high">
            {/* Top Navigation Tabs */}
            <div className="flex items-center gap-space-xs bg-surface-container-low p-1 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab("OPEN")}
                className={`px-space-md py-space-xs text-label-md rounded-md font-medium transition-all ${
                  activeTab === "OPEN"
                    ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Open Positions{" "}
                <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
                  {openPositions.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("CLOSED")}
                className={`px-space-md py-space-xs text-label-md rounded-md font-medium transition-all ${
                  activeTab === "CLOSED"
                    ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Closed Positions{" "}
                <span className="ml-1 text-xs bg-surface-container text-secondary px-1.5 py-0.5 rounded-full font-bold">
                  {closedPositions.length}
                </span>
              </button>
            </div>

            {/* Filter Buttons & Search */}
            <div className="flex flex-wrap items-center gap-space-sm">
              <div className="flex items-center gap-space-xs bg-surface-container-low p-1 rounded-lg">
                {(["ALL", "MIS", "CNC"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setProductFilter(filter)}
                    className={`px-space-sm py-space-xs text-label-sm rounded font-medium transition-colors ${
                      productFilter === filter
                        ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {filter === "ALL" ? "All" : filter === "MIS" ? "Intraday (MIS)" : "Delivery (CNC)"}
                  </button>
                ))}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-space-sm pointer-events-none">
                  <span className="material-symbols-outlined text-outline text-[16px]">filter_list</span>
                </span>
                <input
                  className="pl-8 pr-space-sm py-1.5 bg-surface-container-low rounded-lg text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary w-44"
                  placeholder="Filter symbol..."
                  value={symbolFilter}
                  onChange={(e) => setSymbolFilter(e.target.value)}
                  type="text"
                />
              </div>
            </div>
          </div>

          {/* Positions Table */}
          <div className="overflow-x-auto w-full mt-space-md">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-label-sm text-outline border-b border-outline-variant/20 bg-surface-container-low/40">
                  <th className="py-space-md px-space-md font-medium">Symbol / Exchange</th>
                  <th className="py-space-md px-space-md font-medium">Product</th>
                  <th className="py-space-md px-space-md font-medium">Quantity</th>
                  <th className="py-space-md px-space-md font-medium text-right">Entry Price</th>
                  <th className="py-space-md px-space-md font-medium text-right">Current LTP</th>
                  <th className="py-space-md px-space-md font-medium text-right">P&amp;L (₹ &amp; %)</th>
                  <th className="py-space-md px-space-md font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-body-md">
                {isInitialLoading ? (
                  // Initial loading skeleton rows
                  [1, 2, 3, 4].map((idx) => (
                    <tr key={`skeleton-${idx}`} className="animate-pulse">
                      <td className="py-space-md px-space-md">
                        <div className="flex items-center gap-space-sm">
                          <div className="w-8 h-8 rounded-lg bg-surface-container-high" />
                          <div className="space-y-1">
                            <div className="w-20 h-4 bg-surface-container-high rounded" />
                            <div className="w-14 h-3 bg-surface-container rounded" />
                          </div>
                        </div>
                      </td>
                      <td className="py-space-md px-space-md">
                        <div className="w-12 h-5 bg-surface-container rounded" />
                      </td>
                      <td className="py-space-md px-space-md">
                        <div className="w-10 h-4 bg-surface-container rounded" />
                      </td>
                      <td className="py-space-md px-space-md text-right">
                        <div className="w-16 h-4 bg-surface-container rounded ml-auto" />
                      </td>
                      <td className="py-space-md px-space-md text-right">
                        <div className="w-16 h-4 bg-surface-container rounded ml-auto" />
                      </td>
                      <td className="py-space-md px-space-md text-right">
                        <div className="w-20 h-4 bg-surface-container rounded ml-auto" />
                      </td>
                      <td className="py-space-md px-space-md text-center">
                        <div className="w-16 h-6 bg-surface-container rounded mx-auto" />
                      </td>
                    </tr>
                  ))
                ) : displayedPositions.length > 0 ? (
                  displayedPositions.map((pos) => {
                    const ltp = livePrices[pos.symbol.toUpperCase()] ?? pos.current_price ?? pos.entry_price;
                    const diff = pos.side === "BUY" ? ltp - pos.entry_price : pos.entry_price - ltp;
                    const pnl = pos.status === "OPEN" ? diff * pos.quantity : pos.realized_pnl ?? 0;
                    const pnlPct = pos.entry_price > 0 ? (diff / pos.entry_price) * 100 : 0;
                    const isPositive = pnl >= 0;

                    return (
                      <tr key={pos.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-space-md px-space-md">
                          <Link href={`/stocks/${pos.symbol}`} className="flex items-center gap-space-sm group">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center font-bold justify-center text-label-sm group-hover:bg-primary group-hover:text-on-primary transition-colors">
                              {pos.symbol.slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-medium text-on-surface group-hover:text-primary transition-colors">
                                {pos.symbol}
                              </div>
                              <div className="text-body-sm text-outline font-tabular-data">
                                {pos.exchange || "NSE • EQ"}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="py-space-md px-space-md">
                          <span
                            className={`px-space-xs py-0.5 text-label-sm rounded font-medium ${
                              pos.product_type === "MIS"
                                ? "bg-primary-container/10 text-primary"
                                : "bg-secondary-container text-on-secondary-container"
                            }`}
                          >
                            {pos.product_type}
                          </span>
                        </td>
                        <td className="py-space-md px-space-md font-tabular-data">
                          <div className="flex items-center gap-space-xs">
                            <span
                              className={`px-1.5 py-0.5 text-xs rounded font-bold ${
                                pos.side === "BUY"
                                  ? "bg-tertiary-container/10 text-tertiary"
                                  : "bg-error-container text-on-error-container"
                              }`}
                            >
                              {pos.side}
                            </span>
                            <span className="font-medium text-on-surface">{pos.quantity}</span>
                          </div>
                        </td>
                        <td className="py-space-md px-space-md text-right font-tabular-data text-on-surface">
                          {formatINR(pos.entry_price)}
                        </td>
                        <td className="py-space-md px-space-md text-right font-tabular-data text-on-surface font-medium">
                          {pos.status === "OPEN" ? formatINR(ltp) : formatINR(pos.exit_price ?? ltp)}
                        </td>
                        <td className="py-space-md px-space-md text-right font-tabular-data">
                          <div className={`font-semibold ${isPositive ? "text-tertiary" : "text-error"}`}>
                            {isPositive ? "+" : ""}
                            {formatINR(pnl)}
                          </div>
                          <div className={`text-body-sm font-medium ${isPositive ? "text-tertiary" : "text-error"}`}>
                            ({isPositive ? "+" : ""}
                            {formatPercentage(pnlPct)})
                          </div>
                        </td>
                        <td className="py-space-md px-space-md text-center">
                          <div className="flex items-center justify-center gap-space-xs">
                            {pos.status === "OPEN" ? (
                              <>
                                <button
                                  onClick={() =>
                                    setOrderModalStock({
                                      symbol: pos.symbol,
                                      stockId: pos.symbol,
                                      side: pos.side === "BUY" ? "SELL" : "BUY",
                                    })
                                  }
                                  className="px-space-sm py-1 bg-surface-container hover:bg-surface-container-highest text-on-surface text-label-sm rounded transition-colors font-medium"
                                >
                                  Square Off
                                </button>
                                <button
                                  onClick={() =>
                                    setOrderModalStock({
                                      symbol: pos.symbol,
                                      stockId: pos.symbol,
                                      side: pos.side,
                                    })
                                  }
                                  className="px-space-sm py-1 bg-primary/10 hover:bg-primary/20 text-primary text-label-sm rounded transition-colors font-medium"
                                >
                                  Add
                                </button>
                              </>
                            ) : (
                              <span className="text-body-sm text-outline">Closed</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-space-xl text-center">
                      <div className="flex flex-col items-center justify-center gap-space-sm text-outline">
                        <span className="material-symbols-outlined text-[36px]">folder_open</span>
                        <p className="font-body-md text-on-surface-variant font-medium">
                          {activeTab === "OPEN"
                            ? symbolFilter || productFilter !== "ALL"
                              ? "No open positions match your filter criteria."
                              : "No open positions found in your account."
                            : "No closed positions recorded for this session."}
                        </p>
                        {activeTab === "OPEN" && !symbolFilter && productFilter === "ALL" && (
                          <Link
                            href="/terminal"
                            className="mt-space-xs px-space-md py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-label-md rounded-lg font-semibold transition-colors"
                          >
                            Open Trading Terminal
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Square Off All */}
      {squareOffConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-space-xl rounded-2xl max-w-md w-full shadow-2xl border border-outline-variant/30 flex flex-col gap-space-md">
            <div className="flex items-center gap-space-sm text-error">
              <span className="material-symbols-outlined text-[28px]">warning</span>
              <h3 className="font-headline-md text-on-surface font-semibold">Square Off All Positions?</h3>
            </div>
            <p className="font-body-md text-on-surface-variant">
              This will trigger market orders to close all {openPositions.length} active positions immediately at prevailing market prices.
            </p>
            <div className="flex items-center justify-end gap-space-sm mt-space-md">
              <button
                onClick={() => setSquareOffConfirmOpen(false)}
                className="px-space-md py-space-sm rounded-lg text-label-md text-on-surface hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isSquaringOff}
                onClick={handleSquareOffAll}
                className="px-space-md py-space-sm bg-error text-on-error rounded-lg text-label-md font-semibold hover:bg-error/90 transition-colors shadow-md"
              >
                {isSquaringOff ? "Squaring Off..." : "Confirm Square Off"}
              </button>
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
          initialSide={orderModalStock.side}
          onOrderPlaced={() => loadPositions(true)}
        />
      )}
    </div>
  );
}
