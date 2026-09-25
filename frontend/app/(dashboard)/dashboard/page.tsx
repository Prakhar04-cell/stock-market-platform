"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  RefreshCw,
  Flame,
  Activity,
  ChevronRight,
  ExternalLink,
  LineChart,
} from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { OrderPadModal } from "@/components/trading/order-pad-modal";
import { MetricCardSkeleton, TableRowSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  formatINR,
  formatCompactINR,
  formatStockPrice,
  formatPercentage,
  formatPnL,
} from "@/lib/formatters";

interface PortfolioSummary {
  total_invested_value: number;
  current_portfolio_value: number;
  total_unrealized_pnl: number;
  realized_pnl: number;
  total_pnl: number;
  cash_balance: number;
  available_cash: number;
  holdings: any[];
}

interface MoverItem {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  change: number;
  change_percent: number;
  is_positive: boolean;
  volume: number;
  status: string;
}

interface MarketMovers {
  gainers: MoverItem[];
  losers: MoverItem[];
  most_active: MoverItem[];
  total_tracked: number;
  status: string;
}

export default function DashboardPage() {
  const router = useRouter();

  // Portfolio data
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [isPortfolioLoading, setIsPortfolioLoading] = useState(true);

  // Market Movers
  const [movers, setMovers] = useState<MarketMovers | null>(null);
  const [isMoversLoading, setIsMoversLoading] = useState(true);
  const [activeMoverTab, setActiveMoverTab] = useState<"GAINERS" | "LOSERS" | "ACTIVE">("GAINERS");

  // Portfolio Chart timeframe
  const [chartTimeframe, setChartTimeframe] = useState<"1D" | "1W" | "1M" | "3M" | "1Y" | "ALL">("1D");

  // Order Pad modal trigger
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderTarget, setOrderTarget] = useState({ symbol: "RELIANCE", name: "Reliance Industries Ltd", side: "BUY" as "BUY" | "SELL" });

  const loadDashboardData = useCallback(async () => {
    setIsPortfolioLoading(true);
    setIsMoversLoading(true);

    try {
      const [portData, movData] = await Promise.allSettled([
        apiRequest<PortfolioSummary>("/api/v1/portfolio"),
        apiRequest<MarketMovers>("/api/v1/market/movers"),
      ]);

      if (portData.status === "fulfilled" && portData.value) {
        setPortfolio(portData.value);
      } else {
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
      }

      if (movData.status === "fulfilled" && movData.value) {
        setMovers(movData.value);
      }
    } finally {
      setIsPortfolioLoading(false);
      setIsMoversLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleQuickTrade = (symbol: string, name: string, side: "BUY" | "SELL") => {
    setOrderTarget({ symbol, name, side });
    setOrderModalOpen(true);
  };

  const invested = portfolio ? Number(portfolio.total_invested_value) : 0;
  const portfolioVal = portfolio ? Number(portfolio.current_portfolio_value) : 0;
  const totalPnl = portfolio ? Number(portfolio.total_pnl) : 0;
  const unrealizedPnl = portfolio ? Number(portfolio.total_unrealized_pnl) : 0;
  const pnlPercent = invested > 0 ? (totalPnl / invested) * 100 : 0;
  const unrealizedPercent = invested > 0 ? (unrealizedPnl / invested) * 100 : 0;
  const unrealizedPnlData = formatPnL(unrealizedPnl, unrealizedPercent);
  const overallPnlData = formatPnL(totalPnl, pnlPercent);

  const currentMoverList =
    activeMoverTab === "GAINERS"
      ? movers?.gainers || []
      : activeMoverTab === "LOSERS"
      ? movers?.losers || []
      : movers?.most_active || [];

  return (
    <div className="space-y-6 select-none">
      {/* 1. Top Section: Portfolio Overview Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-[#111827] tracking-tight">
              Portfolio Overview
            </h1>
            <p className="text-xs text-[#6B7280]">
              Paper Trading mark-to-market performance &amp; capital allocation
            </p>
          </div>
          <button
            onClick={loadDashboardData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-xs font-semibold text-[#4B5563] hover:text-[#111827] hover:bg-[#F7F8FA] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPortfolioLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {isPortfolioLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Total Portfolio Value */}
            <div className="bg-white border border-[#E5E7EB] p-4 sm:p-5 rounded-[10px] space-y-2">
              <span className="text-xs font-semibold text-[#6B7280] block">
                Portfolio Value
              </span>
              <div
                className="financial-num text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#111827] tracking-tight tabular-nums leading-[1.1]"
                title={formatINR(portfolioVal)}
              >
                {formatINR(portfolioVal)}
              </div>
              <div className="text-[11px] text-[#6B7280]">
                Virtual Cash: <span className="font-financial font-bold text-[#111827]">{formatINR(portfolio ? Number(portfolio.available_cash) : 100000)}</span>
              </div>
            </div>

            {/* Card 2: Invested Value */}
            <div className="bg-white border border-[#E5E7EB] p-4 sm:p-5 rounded-[10px] space-y-2">
              <span className="text-xs font-semibold text-[#6B7280] block">
                Invested Capital
              </span>
              <div
                className="financial-num text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#111827] tracking-tight tabular-nums leading-[1.1]"
                title={formatINR(invested)}
              >
                {formatINR(invested)}
              </div>
              <div className="text-[11px] text-[#6B7280]">
                Active Holdings: <span className="font-financial font-bold text-[#111827]">{portfolio?.holdings?.length || 0}</span>
              </div>
            </div>

            {/* Card 3: Unrealized P&L */}
            <div className="bg-white border border-[#E5E7EB] p-4 sm:p-5 rounded-[10px] space-y-2">
              <span className="text-xs font-semibold text-[#6B7280] block">
                Unrealized P&amp;L
              </span>
              <div
                className={`financial-num text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight tabular-nums leading-[1.1] ${unrealizedPnlData.colorClass}`}
              >
                {unrealizedPnlData.amountText}
              </div>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className={`financial-pnl-pct ${unrealizedPnlData.colorClass}`}>
                  {unrealizedPnlData.percentText}
                </span>
                <span className="text-[11px] text-[#6B7280]">Mark-to-Market</span>
              </div>
            </div>

            {/* Card 4: Overall P&L */}
            <div className="bg-white border border-[#E5E7EB] p-4 sm:p-5 rounded-[10px] space-y-2">
              <span className="text-xs font-semibold text-[#6B7280] block">
                Overall Return
              </span>
              <div
                className={`financial-num text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight tabular-nums leading-[1.1] ${overallPnlData.colorClass}`}
              >
                {overallPnlData.amountText}
              </div>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className={`financial-pnl-pct ${overallPnlData.colorClass}`}>
                  {overallPnlData.percentText}
                </span>
                <span className="text-[11px] text-[#6B7280]">
                  Realized: <span className="font-financial font-bold text-[#111827]">{formatINR(portfolio ? Number(portfolio.realized_pnl) : 0)}</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Portfolio Performance Chart & Market Discovery Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Portfolio Performance Chart */}
        <div className="lg:col-span-2 bg-white border border-[#E5E7EB] p-5 rounded-[10px] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
            <div>
              <h2 className="text-sm font-bold text-[#111827]">
                Portfolio Performance Trajectory
              </h2>
              <span className="text-[11px] text-[#6B7280]">
                Historical mark-to-market valuation curves
              </span>
            </div>

            {/* Timeframe Controls */}
            <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-[8px] border border-[#E5E7EB]">
              {(["1D", "1W", "1M", "3M", "1Y", "ALL"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setChartTimeframe(tf)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-[6px] transition-all ${
                    chartTimeframe === tf
                      ? "bg-white text-[#F97316] font-bold shadow-xs border border-[#E5E7EB]"
                      : "text-[#6B7280] hover:text-[#111827]"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Canvas or Honest Empty State */}
          {portfolio?.holdings && portfolio.holdings.length > 0 ? (
            <div className="h-64 flex flex-col justify-between py-2">
              <div className="flex items-baseline justify-between font-mono">
                <div>
                  <span className="text-xs text-[#6B7280]">Current Asset Value</span>
                  <div className="text-2xl font-bold text-[#111827] tabular-nums">
                    {formatINR(portfolioVal)}
                  </div>
                </div>
                <div className={`text-xs font-bold ${overallPnlData.colorClass}`}>
                  {overallPnlData.percentText} Return
                </div>
              </div>

              {/* Visual Trajectory Bars */}
              <div className="flex-1 flex items-end gap-3 pt-6 pb-2">
                {portfolio.holdings.map((h, i) => {
                  const val = Number(h.current_value || h.invested_value || 1000);
                  const maxVal = Math.max(...portfolio.holdings.map((item) => Number(item.current_value || item.invested_value || 1000)), 1);
                  const heightPct = Math.min(100, Math.max(15, (val / maxVal) * 100));

                  return (
                    <div key={h.id || i} className="flex-1 flex flex-col items-center gap-2 group">
                      <div
                        className="w-full rounded-[4px] bg-[#F97316] group-hover:bg-[#EA580C] transition-all"
                        style={{ height: `${heightPct}%` }}
                        title={`${h.symbol}: ${formatINR(val)}`}
                      />
                      <span className="text-[10px] font-mono text-[#6B7280] truncate max-w-[60px]">
                        {h.symbol}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-2 border-t border-[#E5E7EB] text-[11px] text-[#6B7280]">
                <span>Allocation by Holding</span>
                <span>Active Holdings: {portfolio.holdings.length}</span>
              </div>
            </div>
          ) : (
            <div className="py-12">
              <EmptyState
                icon={LineChart}
                title="No portfolio history available yet"
                description="Start paper trading to build your simulated portfolio and track your equity trajectory over time."
                action={
                  <Link
                    href="/stocks/RELIANCE"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[#F97316] text-white text-xs font-semibold hover:bg-[#EA580C] transition-colors"
                  >
                    <span>Explore Markets &amp; Trade</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                }
              />
            </div>
          )}
        </div>

        {/* Right (1 col): Market Discovery (Top Gainers, Losers, Most Active) */}
        <div className="bg-white border border-[#E5E7EB] p-5 rounded-[10px] space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
            <div>
              <h2 className="text-sm font-bold text-[#111827]">Market Discovery</h2>
              <span className="text-[11px] text-[#6B7280]">Real-time Indian indices &amp; stocks</span>
            </div>
          </div>

          {/* Subtabs: Top Gainers, Top Losers, Most Active */}
          <div className="grid grid-cols-3 gap-1 bg-[#F8FAFC] p-1 rounded-[8px] border border-[#E5E7EB]">
            <button
              onClick={() => setActiveMoverTab("GAINERS")}
              className={`py-1 text-xs font-semibold rounded-[6px] transition-all ${
                activeMoverTab === "GAINERS"
                  ? "bg-white text-[#16A34A] font-bold shadow-xs border border-[#E5E7EB]"
                  : "text-[#6B7280] hover:text-[#111827]"
              }`}
            >
              Gainers
            </button>
            <button
              onClick={() => setActiveMoverTab("LOSERS")}
              className={`py-1 text-xs font-semibold rounded-[6px] transition-all ${
                activeMoverTab === "LOSERS"
                  ? "bg-white text-[#DC2626] font-bold shadow-xs border border-[#E5E7EB]"
                  : "text-[#6B7280] hover:text-[#111827]"
              }`}
            >
              Losers
            </button>
            <button
              onClick={() => setActiveMoverTab("ACTIVE")}
              className={`py-1 text-xs font-semibold rounded-[6px] transition-all ${
                activeMoverTab === "ACTIVE"
                  ? "bg-white text-[#F97316] font-bold shadow-xs border border-[#E5E7EB]"
                  : "text-[#6B7280] hover:text-[#111827]"
              }`}
            >
              Active
            </button>
          </div>

          {/* Compact Stock Rows */}
          {isMoversLoading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-[#E5E7EB]">
                  <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : currentMoverList.length > 0 ? (
            <div className="divide-y divide-[#E5E7EB]">
              {currentMoverList.map((item) => {
                const itemPnl = formatPnL(item.change, item.change_percent);
                return (
                  <div
                    key={item.symbol}
                    className="py-2.5 flex items-center justify-between hover:bg-[#F8FAFC] px-1 rounded-[8px] transition-colors group"
                  >
                    <Link
                      href={`/stocks/${encodeURIComponent(item.symbol)}`}
                      className="flex items-center gap-2.5 min-w-0"
                    >
                      <div className="w-7 h-7 rounded-[6px] bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-center font-bold text-[#111827] text-[11px] font-mono shrink-0">
                        {item.symbol.slice(0, 2)}
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-xs text-[#111827] group-hover:text-[#F97316] transition-colors block">
                          {item.symbol}
                        </span>
                        <span className="text-[10px] text-[#6B7280] block font-mono">
                          {item.exchange}
                        </span>
                      </div>
                    </Link>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right font-financial">
                        <div className="text-sm font-bold text-[#111827] tabular-nums tracking-tight">
                          {formatStockPrice(item.price)}
                        </div>
                        <div
                          className={`text-[11px] font-semibold tabular-nums ${itemPnl.colorClass}`}
                        >
                          {itemPnl.percentText}
                        </div>
                      </div>

                      {/* Quick Buy Button */}
                      <button
                        onClick={() => handleQuickTrade(item.symbol, item.name, "BUY")}
                        className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded-[6px] bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] text-[10px] font-bold hover:bg-[#DCFCE7]"
                      >
                        BUY
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-[#6B7280]">
              Market movers data currently unavailable from feed.
            </div>
          )}

          <div className="pt-2 border-t border-[#E5E7EB] text-center">
            <Link
              href="/watchlist"
              className="text-xs font-semibold text-[#F97316] hover:underline inline-flex items-center gap-1"
            >
              <span>Manage your personal watchlist</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Quick Action Order Pad Modal */}
      <OrderPadModal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        stockId={orderTarget.symbol}
        symbol={orderTarget.symbol}
        stockName={orderTarget.name}
        defaultSide={orderTarget.side}
        onOrderPlaced={loadDashboardData}
      />
    </div>
  );
}
