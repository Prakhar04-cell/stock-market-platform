"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { formatINR, formatStockPrice } from "@/lib/formatters";
import { MobilePortfolioCard } from "../mobile-portfolio-card";
import { MobileStockCard } from "../mobile-stock-card";
import { MobileLoadingState } from "../mobile-states";

export interface IndexItem {
  name: string;
  symbol: string;
  instrument_key: string | null;
  value: number | null;
  change: number | null;
  change_percent: number | null;
  is_positive: boolean;
  status: string;
}

export interface WatchlistStock {
  symbol: string;
  name: string;
  exchange: string;
  ltp: number;
  change: number;
  change_percent: number;
  volume?: string | number;
  shares?: number | string;
  category?: string;
}

export interface MoverStock {
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

interface MobileDashboardViewProps {
  userName?: string;
  portfolio: {
    totalValue: number;
    investedValue: number;
    availableBalance: number;
    todayPnL: number;
    todayPnLPercent: number;
  } | null;
  indices: IndexItem[];
  watchlist: WatchlistStock[];
  gainers: MoverStock[];
  losers: MoverStock[];
  isLoading?: boolean;
  onBuy: (symbol: string, name?: string) => void;
  onSell: (symbol: string, name?: string) => void;
  onAddFunds?: () => void;
}

export function MobileDashboardView({
  userName = "Rahul",
  portfolio,
  indices,
  watchlist,
  gainers,
  losers,
  isLoading = false,
  onBuy,
  onSell,
  onAddFunds,
}: MobileDashboardViewProps) {
  const [activeWatchlistTab, setActiveWatchlistTab] = useState("Banking");
  const [moverTab, setMoverTab] = useState<"gainers" | "losers">("gainers");
  const [timeframe, setTimeframe] = useState("1D");

  const userInitial = userName ? userName.trim()[0].toUpperCase() : "R";
  const firstName = userName ? userName.trim().split(" ")[0] : "Rahul";

  // Filter watchlist based on category or show all
  const filteredWatchlist = watchlist.filter((item) => {
    if (!item.category) return true;
    if (activeWatchlistTab === "Banking") {
      return (
        item.category === "Banking" ||
        item.symbol.includes("BANK") ||
        item.name.toLowerCase().includes("bank")
      );
    }
    if (activeWatchlistTab === "Tech") {
      return (
        item.category === "Tech" ||
        ["TCS", "INFY", "WIPRO", "HCLTECH", "TECHM"].includes(item.symbol)
      );
    }
    return true;
  });

  const displayWatchlist = filteredWatchlist.length > 0 ? filteredWatchlist : watchlist.slice(0, 4);
  const activeMovers = moverTab === "gainers" ? gainers : losers;

  if (isLoading && !portfolio) {
    return <MobileLoadingState message="Loading dashboard data..." />;
  }

  return (
    <div className="flex flex-col w-full pb-8">
      {/* 1. Welcome Greeting & Quick Actions Bar */}
      <div className="px-space-md py-space-md flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-headline-sm font-bold text-lg">
            {userInitial}
          </div>
          <div>
            <p className="text-body-sm text-on-surface-variant font-body-md">Good morning,</p>
            <h1 className="text-headline-md text-on-surface font-semibold">{firstName}</h1>
          </div>
        </div>
        <div className="flex items-center gap-space-sm">
          <button
            onClick={onAddFunds}
            className="px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface text-body-sm font-label-md flex items-center gap-1 hover:bg-surface-variant active:scale-95 transition-all shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">add_card</span>
            <span>Add Funds</span>
          </button>
        </div>
      </div>

      {/* 2. Horizontal Scrolling Market Ticker */}
      <div className="w-full overflow-x-auto no-scrollbar py-2 px-space-md flex gap-space-md select-none">
        {indices.length > 0 ? (
          indices.map((idx) => {
            const hasVal = idx.value !== null && idx.value !== undefined;
            const isPos = idx.is_positive;
            return (
              <Link
                key={idx.symbol}
                href={`/stocks/${encodeURIComponent(idx.symbol)}`}
                className="flex-shrink-0 bg-surface-container-low px-4 py-2.5 rounded-xl min-w-[160px] shadow-sm hover:bg-surface-container transition-colors block"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-body-sm font-headline-sm text-on-surface font-semibold">
                    {idx.name}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-tabular-data font-medium ${
                      isPos
                        ? "bg-secondary-container text-on-secondary-container"
                        : "bg-tertiary-fixed text-on-tertiary-fixed"
                    }`}
                  >
                    {isPos ? "+" : ""}
                    {idx.change_percent !== null ? idx.change_percent.toFixed(2) : "0.00"}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-tabular-data text-on-surface font-medium">
                    {hasVal ? formatStockPrice(idx.value!) : "—"}
                  </span>
                  <span
                    className={`text-body-sm font-tabular-data font-medium ${
                      isPos ? "text-secondary" : "text-error"
                    }`}
                  >
                    {isPos ? "+" : ""}
                    {idx.change !== null ? idx.change.toFixed(2) : "0.00"}
                  </span>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="flex gap-space-md">
            <div className="flex-shrink-0 bg-surface-container-low px-4 py-2.5 rounded-xl min-w-[160px] shadow-sm animate-pulse h-16" />
            <div className="flex-shrink-0 bg-surface-container-low px-4 py-2.5 rounded-xl min-w-[160px] shadow-sm animate-pulse h-16" />
          </div>
        )}
      </div>

      {/* 3. Portfolio Summary Card */}
      <MobilePortfolioCard
        totalValue={portfolio?.totalValue ?? 1245680.5}
        investedValue={portfolio?.investedValue ?? 1050000.0}
        availableBalance={portfolio?.availableBalance ?? 195680.5}
        todayPnL={portfolio?.todayPnL ?? 8420.25}
        todayPnLPercent={portfolio?.todayPnLPercent ?? 0.68}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        variant="dashboard"
      />

      {/* 4. Watchlist Section */}
      <div className="mt-space-lg px-space-md">
        <div className="flex justify-between items-center mb-space-sm">
          <h2 className="text-headline-sm text-on-surface font-semibold">Watchlist</h2>
          <Link
            href="/watchlist"
            className="text-body-sm text-primary font-label-md flex items-center gap-1 hover:underline"
          >
            <span>Manage</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </Link>
        </div>

        {/* Watchlist Tabs */}
        <div className="flex gap-2 mb-space-md overflow-x-auto no-scrollbar select-none">
          {["Banking", "Tech", "Favorites"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveWatchlistTab(tab)}
              className={`px-4 py-1.5 rounded-full text-body-sm font-label-md transition-colors ${
                activeWatchlistTab === tab
                  ? "bg-primary text-on-primary shadow-sm font-medium"
                  : "bg-surface-container-high text-on-surface-variant hover:bg-surface-variant"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Stock List Items */}
        <div className="flex flex-col gap-space-sm">
          {displayWatchlist.map((stock) => (
            <MobileStockCard
              key={stock.symbol}
              symbol={stock.symbol}
              name={stock.name}
              exchange={stock.exchange || "NSE"}
              price={stock.ltp}
              change={stock.change}
              changePercent={stock.change_percent}
              shares={stock.shares || "1 share"}
              variant="watchlist-row"
              onBuy={onBuy}
              onSell={onSell}
            />
          ))}
        </div>
      </div>

      {/* 5. Top Gainers & Losers Section */}
      <div className="mt-space-lg px-space-md">
        <div className="flex justify-between items-center mb-space-sm">
          <h2 className="text-headline-sm text-on-surface font-semibold">Market Movers</h2>
          <div className="flex gap-1 bg-surface-container-high p-1 rounded-lg select-none">
            <button
              onClick={() => setMoverTab("gainers")}
              className={`px-3 py-1 text-xs font-label-md rounded transition-colors ${
                moverTab === "gainers"
                  ? "bg-surface text-on-surface shadow-sm font-semibold"
                  : "text-on-surface-variant"
              }`}
            >
              Gainers
            </button>
            <button
              onClick={() => setMoverTab("losers")}
              className={`px-3 py-1 text-xs font-label-md rounded transition-colors ${
                moverTab === "losers"
                  ? "bg-surface text-on-surface shadow-sm font-semibold"
                  : "text-on-surface-variant"
              }`}
            >
              Losers
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-space-sm">
          {activeMovers.slice(0, 4).map((mover) => (
            <MobileStockCard
              key={mover.symbol}
              symbol={mover.symbol}
              name={mover.name}
              price={mover.price}
              changePercent={mover.change_percent}
              volume={mover.volume ? `${(mover.volume / 1000000).toFixed(1)}M` : undefined}
              variant="mover-card"
            />
          ))}
        </div>
      </div>

      {/* 6. Quick Insight Banner */}
      <div className="mx-space-md mt-space-lg bg-surface-container-low p-4 rounded-xl flex items-center gap-space-md border border-primary/10 shadow-sm">
        <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container shrink-0">
          <span className="material-symbols-outlined text-[22px]">trending_up</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-body-lg font-headline-sm text-on-surface font-semibold">
            BullRun AI Insight
          </h4>
          <p className="text-body-sm text-on-surface-variant line-clamp-2">
            Banking sector volume is up by 14% today. Consider reviewing your HDFC positions.
          </p>
        </div>
      </div>
    </div>
  );
}
