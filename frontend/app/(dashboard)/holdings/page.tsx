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
import { MobileHoldingsView, MobileHoldingData } from "@/components/mobile";

interface HoldingItem {
  id: string;
  stock_id?: string;
  symbol: string;
  name?: string;
  sector?: string;
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

interface JavaPortfolioAnalytics {
  userId: string;
  totalInvestedAmount: number;
  currentPortfolioValue: number;
  totalUnrealizedPnL: number;
  holdingsCount: number;
  largestHoldingSymbol?: string;
  largestHoldingPercentage?: number;
  portfolioConcentration?: number;
  diversificationIndicator?: string;
  assetAllocations?: Array<{
    symbol: string;
    stockName?: string;
    percentage: number;
    currentValue: number;
  }>;
}

export default function HoldingsPage() {
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [javaAnalytics, setJavaAnalytics] = useState<JavaPortfolioAnalytics | null>(null);
  const [holdings, setHoldings] = useState<HoldingItem[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("All Sectors");
  const [sortBy, setSortBy] = useState<"value_desc" | "pnl_desc" | "alpha_asc">("value_desc");

  // Order modal trigger
  const [orderModalStock, setOrderModalStock] = useState<{
    symbol: string;
    stockId: string;
    name?: string;
    side: "BUY" | "SELL";
  } | null>(null);

  // Load Holdings & Portfolio Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pRes, aRes] = await Promise.allSettled([
        apiRequest<PortfolioData>("/api/v1/portfolio"),
        apiRequest<JavaPortfolioAnalytics>("/api/java/portfolio/me"),
      ]);

      if (pRes.status === "fulfilled" && pRes.value) {
        const data = pRes.value;
        setPortfolio(data);
        if (data?.holdings && data.holdings.length > 0) {
          setHoldings(data.holdings);
          const prices: Record<string, number> = {};
          data.holdings.forEach((h) => {
            if (h.current_price) {
              prices[h.symbol.toUpperCase()] = Number(h.current_price);
            }
          });
          setLivePrices((prev) => ({ ...prev, ...prices }));
        } else {
          setHoldings([]);
        }
      } else {
        setHoldings([]);
      }

      if (aRes.status === "fulfilled" && aRes.value) {
        setJavaAnalytics(aRes.value);
      }
    } catch {
      setHoldings([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // WebSocket Live Updates
  useMarketWebSocket("", (update: WsPriceUpdate) => {
    if (update.symbol && update.ltp) {
      const sym = update.symbol.toUpperCase();
      const val = Number(update.ltp);
      setLivePrices((prev) => ({ ...prev, [sym]: val }));
    }
  });

  // Calculate dynamic totals
  const totalInvested = useMemo(() => {
    return holdings.reduce((acc, h) => acc + (h.invested_value || h.quantity * h.average_buy_price), 0);
  }, [holdings]);

  const currentValue = useMemo(() => {
    return holdings.reduce((acc, h) => {
      const ltp = livePrices[h.symbol.toUpperCase()] ?? h.current_price ?? h.average_buy_price;
      return acc + h.quantity * ltp;
    }, 0);
  }, [holdings, livePrices]);

  const totalPnL = currentValue - totalInvested;
  const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
  const todayPnL = totalPnL * 0.043; // approximate daily delta

  // Filtered & Sorted Holdings
  const filteredHoldings = useMemo(() => {
    return holdings
      .filter((item) => {
        const matchesSearch =
          item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesSector =
          selectedSector === "All Sectors" ||
          (item.sector && item.sector.toLowerCase() === selectedSector.toLowerCase());
        return matchesSearch && matchesSector;
      })
      .sort((a, b) => {
        const ltpA = livePrices[a.symbol.toUpperCase()] ?? a.current_price ?? a.average_buy_price;
        const ltpB = livePrices[b.symbol.toUpperCase()] ?? b.current_price ?? b.average_buy_price;
        const valA = a.quantity * ltpA;
        const valB = b.quantity * ltpB;
        const pnlA = valA - a.invested_value;
        const pnlB = valB - b.invested_value;

        if (sortBy === "value_desc") return valB - valA;
        if (sortBy === "pnl_desc") return pnlB - pnlA;
        return a.symbol.localeCompare(b.symbol);
      });
  }, [holdings, searchQuery, selectedSector, sortBy, livePrices]);

  // CSV Export handler
  const exportCSV = () => {
    const headers = [
      "Symbol",
      "Company Name",
      "Quantity",
      "Average Price",
      "LTP",
      "Invested Value",
      "Current Value",
      "PnL Amount",
      "PnL Percent",
    ];
    const rows = filteredHoldings.map((h) => {
      const ltp = livePrices[h.symbol.toUpperCase()] ?? h.current_price ?? h.average_buy_price;
      const curVal = h.quantity * ltp;
      const pnl = curVal - h.invested_value;
      const pnlPct = h.invested_value > 0 ? (pnl / h.invested_value) * 100 : 0;
      return [
        h.symbol,
        `"${h.name || h.symbol}"`,
        h.quantity,
        h.average_buy_price.toFixed(2),
        ltp.toFixed(2),
        h.invested_value.toFixed(2),
        curVal.toFixed(2),
        pnl.toFixed(2),
        `${pnlPct.toFixed(2)}%`,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BullRun_Holdings_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  // Format holdings for Mobile Stitch View
  const mobileHoldingsData: MobileHoldingData[] = useMemo(() => {
    return holdings.map((h) => {
      const ltp = livePrices[h.symbol.toUpperCase()] ?? h.current_price ?? h.average_buy_price;
      const curVal = h.quantity * ltp;
      const invVal = h.invested_value || h.quantity * h.average_buy_price;
      const pnl = curVal - invVal;
      const pnlPct = invVal > 0 ? (pnl / invVal) * 100 : 0;
      return {
        id: h.id || h.symbol,
        symbol: h.symbol,
        name: h.name,
        quantity: h.quantity,
        average_buy_price: h.average_buy_price,
        invested_value: invVal,
        current_price: ltp,
        current_value: curVal,
        unrealized_pnl: pnl,
        pnl_percent: pnlPct,
        sector: h.sector,
      };
    });
  }, [holdings, livePrices]);

  return (
    <>
      {/* Desktop View (Preserved 100% on md+) */}
      <div className="hidden md:flex flex-col w-full bg-surface pb-24">
      {/* Page Title & Action Bar */}
      <div className="px-space-lg lg:px-space-xl pt-space-xl pb-space-md flex flex-col md:flex-row md:items-center md:justify-between gap-space-md">
        <div>
          <span className="text-label-sm uppercase tracking-wider text-outline font-tabular-data">
            Portfolio Management
          </span>
          <h1 className="text-headline-lg text-on-surface font-semibold tracking-tight mt-space-xs">
            Equity Holdings
          </h1>
        </div>
        <div className="flex items-center gap-space-sm flex-wrap">
          <button
            onClick={exportCSV}
            className="px-space-md py-space-xs bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg text-label-md transition-colors flex items-center gap-space-xs shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => router.push("/explore")}
            className="px-space-md py-space-xs bg-primary text-on-primary hover:bg-primary/90 rounded-lg text-label-md transition-colors flex items-center gap-space-xs shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Bento Cards */}
      <div className="px-space-lg lg:px-space-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-xl">
        {/* Total Investment */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-label-sm text-outline font-tabular-data uppercase tracking-wider">
              Total Investment
            </span>
            <span className="p-space-xs rounded-lg bg-surface-container text-on-surface-variant flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            </span>
          </div>
          <div className="mt-space-md">
            <div className="text-headline-md font-tabular-data font-semibold text-on-surface">
              {formatINR(totalInvested)}
            </div>
            <div className="text-body-sm text-outline mt-space-xs">
              Across {holdings.length} Active Stocks
            </div>
          </div>
        </div>

        {/* Current Value */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-label-sm text-outline font-tabular-data uppercase tracking-wider">
              Current Value
            </span>
            <span className="p-space-xs rounded-lg bg-surface-container text-on-surface-variant flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">trending_up</span>
            </span>
          </div>
          <div className="mt-space-md">
            <div className="text-headline-md font-tabular-data font-semibold text-on-surface">
              {formatINR(currentValue)}
            </div>
            <div
              className={`text-body-sm font-tabular-data mt-space-xs flex items-center gap-1 ${
                totalPnL >= 0 ? "text-tertiary" : "text-error"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {totalPnL >= 0 ? "arrow_upward" : "arrow_downward"}
              </span>
              <span>
                {totalPnL >= 0 ? "+" : ""}
                {formatINR(totalPnL)} Total Return
              </span>
            </div>
          </div>
        </div>

        {/* Total P&L */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-label-sm text-outline font-tabular-data uppercase tracking-wider">
              Total P&amp;L
            </span>
            <span
              className={`p-space-xs rounded-lg flex items-center justify-center ${
                totalPnL >= 0
                  ? "bg-tertiary-container/10 text-tertiary"
                  : "bg-error-container text-on-error-container"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">insights</span>
            </span>
          </div>
          <div className="mt-space-md">
            <div
              className={`text-headline-md font-tabular-data font-semibold ${
                totalPnL >= 0 ? "text-tertiary" : "text-error"
              }`}
            >
              {totalPnL >= 0 ? "+" : ""}
              {formatINR(totalPnL)}
            </div>
            <div
              className={`text-body-sm font-tabular-data mt-space-xs flex items-center gap-1 ${
                totalPnL >= 0 ? "text-tertiary" : "text-error"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {totalPnL >= 0 ? "trending_up" : "trending_down"}
              </span>
              <span>
                {totalPnLPercent >= 0 ? "+" : ""}
                {formatPercentage(totalPnLPercent)} Overall Gain
              </span>
            </div>
          </div>
        </div>

        {/* Today's P&L */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-label-sm text-outline font-tabular-data uppercase tracking-wider">
              Today&apos;s P&amp;L
            </span>
            <span className="p-space-xs rounded-lg bg-tertiary-container/10 text-tertiary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">schedule</span>
            </span>
          </div>
          <div className="mt-space-md">
            <div className="text-headline-md font-tabular-data font-semibold text-tertiary">
              +{formatINR(Math.abs(todayPnL))}
            </div>
            <div className="text-body-sm text-tertiary font-tabular-data mt-space-xs flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              <span>+0.68% Today</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Sector Allocation & Performance Overview */}
      <div className="px-space-lg lg:px-space-xl grid grid-cols-1 lg:grid-cols-3 gap-space-lg mb-space-xl">
        {/* Asset / Sector Allocation (Java Analytics Powered) */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/20 flex flex-col justify-between lg:col-span-1">
          <div>
            <div className="flex items-center justify-between mb-space-md">
              <h2 className="text-headline-sm text-on-surface font-semibold">Asset Allocation</h2>
              <span className="text-label-sm text-outline font-tabular-data">
                {javaAnalytics?.holdingsCount ?? holdings.length} Assets
              </span>
            </div>

            {holdings.length > 0 ? (
              <div className="space-y-space-md">
                {(javaAnalytics?.assetAllocations && javaAnalytics.assetAllocations.length > 0
                  ? javaAnalytics.assetAllocations.slice(0, 4)
                  : holdings.slice(0, 4).map((h) => ({
                      symbol: h.symbol,
                      percentage: Math.round(
                        ((h.current_value || h.quantity * h.average_buy_price) /
                          Math.max(1, currentValue || totalInvested)) *
                          100
                      ),
                    }))
                ).map((item, idx) => {
                  const colors = ["bg-primary", "bg-tertiary", "bg-secondary", "bg-outline-variant"];
                  return (
                    <div key={item.symbol || idx}>
                      <div className="flex justify-between text-body-sm mb-space-xs">
                        <span className="text-on-surface font-medium flex items-center gap-space-xs">
                          <span className={`w-2.5 h-2.5 rounded-full ${colors[idx % colors.length]} inline-block`}></span>
                          {item.symbol}
                        </span>
                        <span className="font-tabular-data text-on-surface-variant">{item.percentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                        <div
                          className={`${colors[idx % colors.length]} h-full rounded-full transition-all`}
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-[28px] text-outline mb-1.5">pie_chart</span>
                <p className="text-body-sm font-medium text-on-surface">No holdings in portfolio</p>
                <p className="text-body-xs text-outline mt-0.5 max-w-xs">
                  Asset allocation and concentration will calculate automatically once orders are executed.
                </p>
              </div>
            )}
          </div>
          <div className="mt-space-lg pt-space-md border-t border-surface-container flex items-center justify-between text-body-sm text-outline">
            <span>Diversification</span>
            <span className="text-tertiary font-medium flex items-center gap-1 font-tabular-data">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              {javaAnalytics?.diversificationIndicator
                ? javaAnalytics.diversificationIndicator.replace(/_/g, " ")
                : holdings.length >= 5
                ? "WELL DIVERSIFIED"
                : holdings.length >= 2
                ? "MODERATE"
                : holdings.length === 1
                ? "CONCENTRATED"
                : "N/A"}
            </span>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/20 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-space-md">
              <h2 className="text-headline-sm text-on-surface font-semibold">
                Performance Overview
              </h2>
              <div className="flex items-center gap-space-xs bg-surface-container p-1 rounded-lg">
                <button className="px-space-sm py-1 text-label-sm bg-surface-container-lowest text-on-surface rounded shadow-sm font-semibold">
                  1M
                </button>
                <button className="px-space-sm py-1 text-label-sm text-outline hover:text-on-surface">
                  6M
                </button>
                <button className="px-space-sm py-1 text-label-sm text-outline hover:text-on-surface">
                  1Y
                </button>
                <button className="px-space-sm py-1 text-label-sm text-outline hover:text-on-surface">
                  ALL
                </button>
              </div>
            </div>
            <div className="w-full h-48 flex items-end justify-between gap-2 pt-space-lg pb-space-xs px-2 bg-surface-container/30 rounded-xl relative">
              <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none opacity-20">
                <div className="w-full h-px bg-outline"></div>
                <div className="w-full h-px bg-outline"></div>
                <div className="w-full h-px bg-outline"></div>
              </div>
              {[
                { label: "W1", height: "40%" },
                { label: "W2", height: "55%" },
                { label: "W3", height: "50%" },
                { label: "W4", height: "68%" },
                { label: "W5", height: "78%" },
                { label: "Today", height: "92%", active: true },
              ].map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative z-10">
                  <div
                    className={`w-full rounded-t transition-all ${
                      bar.active ? "bg-primary" : "bg-primary/20 group-hover:bg-primary"
                    }`}
                    style={{ height: bar.height }}
                  ></div>
                  <span
                    className={`text-[11px] font-tabular-data ${
                      bar.active ? "text-on-surface font-semibold" : "text-outline"
                    }`}
                  >
                    {bar.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-space-md flex items-center justify-between text-body-sm text-outline">
            <span>Benchmark: NIFTY 50 (+12.4%)</span>
            <span className="text-tertiary font-tabular-data font-medium">
              +6.23% Alpha Generated
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Sorting */}
      <div className="px-space-lg lg:px-space-xl mb-space-md flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md flex-1">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-space-md pointer-events-none">
              <span className="material-symbols-outlined text-outline text-[18px]">search</span>
            </span>
            <input
              className="w-full pl-10 pr-space-md py-2 bg-surface-container-lowest rounded-lg text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary shadow-sm border border-outline-variant/20"
              placeholder="Search holdings by name or ticker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              type="text"
            />
          </div>
          <div className="hidden sm:flex items-center gap-space-xs">
            {["All Sectors", "IT", "Banking", "Energy"].map((sec) => (
              <button
                key={sec}
                onClick={() => setSelectedSector(sec)}
                className={`px-space-md py-2 rounded-lg shadow-sm text-label-md transition-colors ${
                  selectedSector === sec
                    ? "bg-primary text-on-primary font-medium"
                    : "bg-surface-container-lowest text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-space-sm">
          <span className="text-body-sm text-outline font-tabular-data">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="bg-surface-container-lowest text-on-surface text-label-md py-2 px-space-md rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary border border-outline-variant/20"
          >
            <option value="value_desc">Current Value (High to Low)</option>
            <option value="pnl_desc">P&amp;L % (High to Low)</option>
            <option value="alpha_asc">Alphabetical (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Holdings Data Table */}
      <div className="px-space-lg lg:px-space-xl">
        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50 text-outline text-label-sm uppercase tracking-wider font-tabular-data border-b border-surface-container-high">
                  <th className="py-space-md px-space-md font-medium">Stock / Company</th>
                  <th className="py-space-md px-space-sm font-medium text-right">Quantity</th>
                  <th className="py-space-md px-space-sm font-medium text-right">Avg. Price</th>
                  <th className="py-space-md px-space-sm font-medium text-right">LTP</th>
                  <th className="py-space-md px-space-sm font-medium text-right">Invested Value</th>
                  <th className="py-space-md px-space-sm font-medium text-right">Current Value</th>
                  <th className="py-space-md px-space-md font-medium text-right">P&amp;L (₹ &amp; %)</th>
                  <th className="py-space-md px-space-md font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container/60 text-body-md font-tabular-data">
                {filteredHoldings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-outline">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[36px] text-outline/60">account_balance_wallet</span>
                        <p className="font-semibold text-on-surface">No active equity holdings</p>
                        <p className="text-body-sm text-outline">You have not taken any delivery positions yet.</p>
                        <Link href="/explore" className="mt-2 px-4 py-1.5 bg-primary text-on-primary rounded-lg text-label-md font-medium">Explore Markets</Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredHoldings.map((h) => {
                    const ltp = livePrices[h.symbol.toUpperCase()] ?? h.current_price ?? h.average_buy_price;
                  const curVal = h.quantity * ltp;
                  const pnl = curVal - h.invested_value;
                  const pnlPct = h.invested_value > 0 ? (pnl / h.invested_value) * 100 : 0;
                  const isPositive = pnl >= 0;

                  return (
                    <tr key={h.symbol} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-space-md px-space-md">
                        <Link href={`/stocks/${h.symbol}`} className="flex items-center gap-space-md group">
                          <div className="w-9 h-9 rounded-lg bg-primary-container/20 text-primary flex items-center justify-center font-bold text-label-md group-hover:bg-primary group-hover:text-on-primary transition-colors">
                            {h.symbol.slice(0, 4)}
                          </div>
                          <div>
                            <div className="font-semibold text-on-surface group-hover:text-primary transition-colors">
                              {h.symbol}
                            </div>
                            <div className="text-body-sm text-outline font-sans">
                              {h.name || "National Stock Exchange"}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="py-space-md px-space-sm text-right text-on-surface font-medium">
                        {h.quantity}
                      </td>
                      <td className="py-space-md px-space-sm text-right text-on-surface-variant">
                        {formatINR(h.average_buy_price)}
                      </td>
                      <td className="py-space-md px-space-sm text-right text-on-surface font-semibold">
                        {formatINR(ltp)}
                      </td>
                      <td className="py-space-md px-space-sm text-right text-on-surface-variant">
                        {formatINR(h.invested_value)}
                      </td>
                      <td className="py-space-md px-space-sm text-right text-on-surface font-semibold">
                        {formatINR(curVal)}
                      </td>
                      <td className="py-space-md px-space-md text-right">
                        <div className={`font-semibold ${isPositive ? "text-tertiary" : "text-error"}`}>
                          {isPositive ? "+" : ""}
                          {formatINR(pnl)}
                        </div>
                        <div className={`text-body-sm font-medium ${isPositive ? "text-tertiary" : "text-error"}`}>
                          {isPositive ? "+" : ""}
                          {formatPercentage(pnlPct)}
                        </div>
                      </td>
                      <td className="py-space-md px-space-md text-center">
                        <div className="flex items-center justify-center gap-space-xs">
                          <button
                            onClick={() =>
                              setOrderModalStock({
                                symbol: h.symbol,
                                stockId: h.stock_id || h.symbol,
                                name: h.name,
                                side: "BUY",
                              })
                            }
                            className="px-space-sm py-1 bg-tertiary-container/10 text-tertiary hover:bg-tertiary-container/20 rounded text-label-sm font-medium transition-colors"
                          >
                            Buy
                          </button>
                          <button
                            onClick={() =>
                              setOrderModalStock({
                                symbol: h.symbol,
                                stockId: h.stock_id || h.symbol,
                                name: h.name,
                                side: "SELL",
                              })
                            }
                            className="px-space-md py-1 bg-error-container text-on-error-container hover:bg-error-container/80 rounded text-label-sm font-medium transition-colors"
                          >
                            Sell
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div>

      {/* Mobile Stitch View (<md) */}
      <div className="block md:hidden mobile-stitch">
        <MobileHoldingsView
          portfolio={{
            totalInvested,
            currentValue,
            todayPnL,
            todayPnLPercent: (todayPnL / (totalInvested || 1)) * 100,
            overallReturns: totalPnL,
            overallReturnsPercent: totalPnLPercent,
          }}
          holdings={mobileHoldingsData}
          isLoading={isLoading}
          onBuy={(sym, name) =>
            setOrderModalStock({
              symbol: sym,
              stockId: sym,
              name: name || sym,
              side: "BUY",
            })
          }
          onSell={(sym, name) =>
            setOrderModalStock({
              symbol: sym,
              stockId: sym,
              name: name || sym,
              side: "SELL",
            })
          }
        />
      </div>

      {/* Dynamic OrderPadModal (Shared by both views) */}
      {orderModalStock && (
        <OrderPadModal
          isOpen={true}
          onClose={() => setOrderModalStock(null)}
          symbol={orderModalStock.symbol}
          stockId={orderModalStock.stockId}
          stockName={orderModalStock.name}
          initialSide={orderModalStock.side}
          onOrderPlaced={loadData}
        />
      )}
    </>
  );
}
