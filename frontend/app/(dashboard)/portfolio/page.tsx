"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { OrderPadModal } from "@/components/trading/order-pad-modal";
import { MetricCardSkeleton, TableRowSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { marketWs, WsPriceUpdate } from "@/lib/market-ws";
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  ChevronRight,
  Layers,
} from "lucide-react";

interface HoldingItem {
  id: string;
  stock_id: string;
  symbol: string;
  name?: string;
  quantity: number;
  average_buy_price: number;
  invested_value: number;
  current_price?: number;
  current_value?: number;
  unrealized_pnl?: number;
  pnl_percent?: number;
  day_change?: number;
  day_change_percent?: number;
}

interface PortfolioData {
  total_invested_value: number;
  current_portfolio_value: number;
  total_unrealized_pnl: number;
  realized_pnl: number;
  total_pnl: number;
  cash_balance: number;
  available_cash: number;
  holdings: HoldingItem[];
}

export default function PortfolioPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"HOLDINGS" | "POSITIONS">("HOLDINGS");

  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Sync tab with URL query parameter
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "positions") {
        setActiveTab("POSITIONS");
      }
    }
  }, []);

  // Quick Trade Modal
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderTarget, setOrderTarget] = useState({
    symbol: "RELIANCE",
    name: "Reliance",
    side: "BUY" as "BUY" | "SELL",
  });

  const loadPortfolio = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<PortfolioData>("/api/v1/portfolio");
      setPortfolio(data);
      if (data?.holdings) {
        const initialPrices: Record<string, number> = {};
        data.holdings.forEach((h) => {
          if (h.current_price) {
            initialPrices[h.symbol.toUpperCase()] = Number(h.current_price);
          }
        });
        setLivePrices((prev) => ({ ...prev, ...initialPrices }));
      }
    } catch {
      setPortfolio({
        total_invested_value: 0,
        current_portfolio_value: 0,
        total_unrealized_pnl: 0,
        realized_pnl: 0,
        total_pnl: 0,
        cash_balance: 100000,
        available_cash: 100000,
        holdings: [],
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  // Subscribe to live websocket ticks for holdings
  useEffect(() => {
    if (!portfolio?.holdings || portfolio.holdings.length === 0) return;

    const unsubs = portfolio.holdings.map((h) =>
      marketWs.subscribe(h.symbol, (update: WsPriceUpdate) => {
        const val = typeof update.ltp === "string" ? parseFloat(update.ltp) : update.ltp;
        if (val) {
          setLivePrices((prev) => ({
            ...prev,
            [h.symbol.toUpperCase()]: val,
          }));
        }
      })
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [portfolio]);

  const handleQuickTrade = (symbol: string, name: string, side: "BUY" | "SELL") => {
    setOrderTarget({ symbol, name, side });
    setOrderModalOpen(true);
  };

  const invested = portfolio ? Number(portfolio.total_invested_value) : 0;
  const availableCash = portfolio ? Number(portfolio.available_cash) : 100000;

  // Real-time mark-to-market calculations across holdings
  const computedHoldings = useMemo(() => {
    if (!portfolio?.holdings) return [];

    return portfolio.holdings.map((h) => {
      const sym = h.symbol.toUpperCase();
      const qty = Number(h.quantity);
      const avg = Number(h.average_buy_price);
      const ltp = livePrices[sym] ?? Number(h.current_price || avg);
      const investedVal = qty * avg;
      const currentVal = qty * ltp;
      const pnl = currentVal - investedVal;
      const pnlPct = investedVal > 0 ? (pnl / investedVal) * 100 : 0;

      return {
        ...h,
        liveLtp: ltp,
        computedCurrentVal: currentVal,
        computedInvestedVal: investedVal,
        computedPnl: pnl,
        computedPnlPct: pnlPct,
      };
    });
  }, [portfolio, livePrices]);

  const currentPortfolioVal = computedHoldings.reduce((sum, h) => sum + h.computedCurrentVal, 0);
  const totalUnrealizedPnl = computedHoldings.reduce((sum, h) => sum + h.computedPnl, 0);
  const totalPnl = totalUnrealizedPnl + (portfolio ? Number(portfolio.realized_pnl) : 0);
  const totalPnlPercent = invested > 0 ? (totalPnl / invested) * 100 : 0;
  const isPnlPositive = totalPnl >= 0;

  const handleTabChange = (tab: "HOLDINGS" | "POSITIONS") => {
    setActiveTab(tab);
    if (tab === "POSITIONS") {
      router.push("/portfolio?tab=positions");
    } else {
      router.push("/portfolio");
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* 1. Header with Holdings & Positions Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E5E7EB] p-4 sm:p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-[#111827] tracking-tight">
              Portfolio
            </h1>
            <div className="flex items-center gap-1 bg-[#F7F8FA] p-0.5 rounded-xl border border-[#E5E7EB]">
              <button
                onClick={() => handleTabChange("HOLDINGS")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "HOLDINGS"
                    ? "bg-white text-[#111827] shadow-xs"
                    : "text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                Holdings ({computedHoldings.length})
              </button>
              <button
                onClick={() => handleTabChange("POSITIONS")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "POSITIONS"
                    ? "bg-white text-[#111827] shadow-xs"
                    : "text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                Positions (0)
              </button>
            </div>
          </div>
          <p className="text-xs text-[#6B7280] mt-1">
            Real-time equity valuation computed directly against live Upstox tick streaming.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#00A86B] text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00A86B] animate-pulse" />
            <span>Virtual Capital</span>
          </div>

          <button
            onClick={loadPortfolio}
            className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#4B5563] hover:text-[#111827] hover:bg-[#F7F8FA]"
            title="Refresh Portfolio"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Top Summary Metric Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Total Value */}
          <div className="bg-white border border-[#E5E7EB] p-4 rounded-2xl shadow-xs space-y-1.5">
            <span className="text-xs font-semibold text-[#6B7280] block">Total Value</span>
            <div className="font-mono text-xl sm:text-2xl font-black text-[#111827] tabular-nums">
              ₹{currentPortfolioVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#6B7280] block">Holdings Value</span>
          </div>

          {/* Invested */}
          <div className="bg-white border border-[#E5E7EB] p-4 rounded-2xl shadow-xs space-y-1.5">
            <span className="text-xs font-semibold text-[#6B7280] block">Invested</span>
            <div className="font-mono text-xl sm:text-2xl font-black text-[#111827] tabular-nums">
              ₹{invested.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#6B7280] block">Book Value</span>
          </div>

          {/* Available Balance */}
          <div className="bg-white border border-[#E5E7EB] p-4 rounded-2xl shadow-xs space-y-1.5">
            <span className="text-xs font-semibold text-[#6B7280] block">Available Cash</span>
            <div className="font-mono text-xl sm:text-2xl font-black text-[#111827] tabular-nums">
              ₹{availableCash.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#6B7280] block">Virtual Margin</span>
          </div>

          {/* Today's / Unrealized P&L */}
          <div className="bg-white border border-[#E5E7EB] p-4 rounded-2xl shadow-xs space-y-1.5">
            <span className="text-xs font-semibold text-[#6B7280] block">Unrealized P&amp;L</span>
            <div
              className={`font-mono text-xl sm:text-2xl font-black tabular-nums ${
                totalUnrealizedPnl >= 0 ? "text-[#00A86B]" : "text-[#EF4444]"
              }`}
            >
              {totalUnrealizedPnl >= 0 ? "+" : "-"}₹
              {Math.abs(totalUnrealizedPnl).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#6B7280] block">Live Float</span>
          </div>

          {/* Overall P&L */}
          <div className="bg-white border border-[#E5E7EB] p-4 rounded-2xl shadow-xs space-y-1.5 col-span-2 lg:col-span-1">
            <span className="text-xs font-semibold text-[#6B7280] block">Overall P&amp;L</span>
            <div
              className={`font-mono text-xl sm:text-2xl font-black tabular-nums flex items-baseline gap-1.5 ${
                isPnlPositive ? "text-[#00A86B]" : "text-[#EF4444]"
              }`}
            >
              <span>
                {isPnlPositive ? "+" : "-"}₹
                {Math.abs(totalPnl).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold font-sans">
                ({isPnlPositive ? "+" : ""}
                {totalPnlPercent.toFixed(2)}%)
              </span>
            </div>
            <span className="text-[11px] text-[#6B7280] block">Total Return</span>
          </div>
        </div>
      )}

      {/* 3. Tab Content Area */}
      {activeTab === "HOLDINGS" ? (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#111827]">Holdings Overview</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-[#6B7280] font-bold font-mono">
                {computedHoldings.length}
              </span>
            </div>
            <span className="text-xs text-[#6B7280] font-mono">
              Live LTP Benchmarked
            </span>
          </div>

          {isLoading ? (
            <div className="p-4">
              <table className="w-full text-xs">
                <tbody>
                  <TableRowSkeleton cols={8} />
                  <TableRowSkeleton cols={8} />
                  <TableRowSkeleton cols={8} />
                </tbody>
              </table>
            </div>
          ) : computedHoldings.length === 0 ? (
            <div className="py-16">
              <EmptyState
                icon={Briefcase}
                title="No holdings yet"
                description="Start paper trading to build your simulated equity portfolio and track your investment trajectory."
                action={
                  <Link
                    href="/explore"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4F46E5] text-white text-xs font-bold hover:bg-[#4338CA] shadow-xs transition-colors"
                  >
                    <span>Explore Stocks</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                }
              />
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F7F8FA] border-b border-[#E5E7EB] text-[#6B7280] text-[11px] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Stock</th>
                      <th className="py-3 px-4 text-right">Qty</th>
                      <th className="py-3 px-4 text-right">Avg Price</th>
                      <th className="py-3 px-4 text-right">LTP (₹)</th>
                      <th className="py-3 px-4 text-right">Invested</th>
                      <th className="py-3 px-4 text-right">Current</th>
                      <th className="py-3 px-4 text-right">P&amp;L</th>
                      <th className="py-3 px-4 text-right">P&amp;L %</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {computedHoldings.map((h) => {
                      const isPos = h.computedPnl >= 0;

                      return (
                        <tr key={h.id} className="hover:bg-[#F7F8FA] transition-colors">
                          <td className="py-3 px-4">
                            <Link
                              href={`/stocks/${encodeURIComponent(h.symbol)}`}
                              className="font-bold text-xs text-[#111827] hover:text-[#4F46E5] transition-colors"
                            >
                              {h.symbol}
                            </Link>
                            <span className="text-[10px] text-[#6B7280] block font-mono">
                              {h.name || `${h.symbol} Eq`}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-[#111827] tabular-nums">
                            {h.quantity}
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-[#111827] tabular-nums">
                            ₹{Number(h.average_buy_price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-[#111827] tabular-nums">
                            ₹{h.liveLtp.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-[#111827] tabular-nums">
                            ₹{h.computedInvestedVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-[#111827] tabular-nums">
                            ₹{h.computedCurrentVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>

                          <td
                            className={`py-3 px-4 text-right font-mono font-bold tabular-nums ${
                              isPos ? "text-[#00A86B]" : "text-[#EF4444]"
                            }`}
                          >
                            {isPos ? "+" : ""}₹
                            {h.computedPnl.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          <td
                            className={`py-3 px-4 text-right font-mono font-bold tabular-nums ${
                              isPos ? "text-[#00A86B]" : "text-[#EF4444]"
                            }`}
                          >
                            {isPos ? "+" : ""}
                            {h.computedPnlPct.toFixed(2)}%
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleQuickTrade(h.symbol, h.name || h.symbol, "BUY")}
                                className="px-2.5 py-1 rounded-lg bg-[#ECFDF5] text-[#00A86B] border border-[#A7F3D0] text-[10.5px] font-bold hover:bg-[#D1FAE5] transition-colors"
                              >
                                BUY
                              </button>
                              <button
                                onClick={() => handleQuickTrade(h.symbol, h.name || h.symbol, "SELL")}
                                className="px-2.5 py-1 rounded-lg bg-[#FEF2F2] text-[#EF4444] border border-[#FECACA] text-[10.5px] font-bold hover:bg-[#FEE2E2] transition-colors"
                              >
                                SELL
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-[#E5E7EB]">
                {computedHoldings.map((h) => {
                  const isPos = h.computedPnl >= 0;

                  return (
                    <div key={h.id} className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-sm text-[#111827]">{h.symbol}</span>
                          <span className="text-[10px] text-[#6B7280] block font-mono">
                            Qty: {h.quantity} • Avg: ₹{Number(h.average_buy_price).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-bold text-xs text-[#111827]">
                            ₹{h.liveLtp.toFixed(2)}
                          </span>
                          <span
                            className={`text-[10.5px] block font-bold ${
                              isPos ? "text-[#00A86B]" : "text-[#EF4444]"
                            }`}
                          >
                            {isPos ? "+" : ""}
                            {h.computedPnlPct.toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#F7F8FA] p-2.5 rounded-lg border border-[#E5E7EB]">
                        <div>
                          <span className="text-[10px] text-[#6B7280] block font-sans">Invested</span>
                          <span className="font-bold text-[#111827]">
                            ₹{h.computedInvestedVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-[#6B7280] block font-sans">Current Value</span>
                          <span className="font-bold text-[#111827]">
                            ₹{h.computedCurrentVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleQuickTrade(h.symbol, h.name || h.symbol, "BUY")}
                          className="flex-1 py-1.5 rounded-lg bg-[#ECFDF5] text-[#00A86B] border border-[#A7F3D0] text-xs font-bold"
                        >
                          BUY
                        </button>
                        <button
                          onClick={() => handleQuickTrade(h.symbol, h.name || h.symbol, "SELL")}
                          className="flex-1 py-1.5 rounded-lg bg-[#FEF2F2] text-[#EF4444] border border-[#FECACA] text-xs font-bold"
                        >
                          SELL
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : (
        /* POSITIONS TAB */
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#111827]">Open Intraday Positions</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-[#6B7280] font-bold font-mono">
                0
              </span>
            </div>
            <span className="text-xs text-[#6B7280] font-mono">
              Square-off at 15:15 IST
            </span>
          </div>

          <div className="py-16 text-center">
            <EmptyState
              icon={Layers}
              title="No open positions"
              description="You do not have any open intraday positions today. Delivery holdings are listed under the Holdings tab."
              action={
                <Link
                  href="/terminal"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#111827] text-white text-xs font-bold hover:bg-[#1f2937] shadow-xs transition-colors"
                >
                  <span>Open Trading Terminal</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              }
            />
          </div>
        </div>
      )}

      {/* Quick Trade Modal */}
      <OrderPadModal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        stockId={orderTarget.symbol}
        symbol={orderTarget.symbol}
        stockName={orderTarget.name}
        defaultSide={orderTarget.side}
        onOrderPlaced={loadPortfolio}
      />
    </div>
  );
}
