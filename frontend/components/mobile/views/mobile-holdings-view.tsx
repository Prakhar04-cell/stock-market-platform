"use client";

import React, { useState, useMemo } from "react";
import { formatINR } from "@/lib/formatters";
import { MobilePortfolioCard } from "../mobile-portfolio-card";
import { MobileSearch } from "../mobile-search";
import { MobileHoldingRow } from "../mobile-holding-row";
import { MobileEmptyState, MobileLoadingState } from "../mobile-states";

export interface MobileHoldingData {
  id: string;
  symbol: string;
  name?: string;
  quantity: number;
  average_buy_price: number;
  invested_value: number;
  current_price: number;
  current_value: number;
  unrealized_pnl: number;
  pnl_percent: number;
  sector?: string;
}

interface MobileHoldingsViewProps {
  portfolio: {
    totalInvested: number;
    currentValue: number;
    todayPnL: number;
    todayPnLPercent: number;
    overallReturns: number;
    overallReturnsPercent: number;
  } | null;
  holdings: MobileHoldingData[];
  isLoading?: boolean;
  onBuy: (symbol: string, name?: string) => void;
  onSell: (symbol: string, name?: string) => void;
}

export function MobileHoldingsView({
  portfolio,
  holdings,
  isLoading = false,
  onBuy,
  onSell,
}: MobileHoldingsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredHoldings = useMemo(() => {
    if (!searchQuery.trim()) return holdings;
    const q = searchQuery.toLowerCase().trim();
    return holdings.filter(
      (h) => h.symbol.toLowerCase().includes(q) || (h.name && h.name.toLowerCase().includes(q))
    );
  }, [holdings, searchQuery]);

  // Compute sector allocation dynamically from holdings
  const sectorBreakdown = useMemo(() => {
    if (!holdings.length) {
      return [
        { name: "Tech", percent: 42, color: "bg-primary" },
        { name: "Banking", percent: 28, color: "bg-secondary" },
        { name: "Energy", percent: 18, color: "bg-tertiary" },
        { name: "Others", percent: 12, color: "bg-outline-variant" },
      ];
    }
    const sectorMap: Record<string, number> = {};
    let total = 0;
    holdings.forEach((h) => {
      const sec = h.sector || "Others";
      sectorMap[sec] = (sectorMap[sec] || 0) + h.current_value;
      total += h.current_value;
    });

    const colors = ["bg-primary", "bg-secondary", "bg-tertiary", "bg-outline-variant"];
    const entries = Object.entries(sectorMap).sort((a, b) => b[1] - a[1]);
    return entries.map(([name, val], idx) => ({
      name,
      percent: Math.round((val / total) * 100),
      color: colors[idx % colors.length],
    }));
  }, [holdings]);

  return (
    <div className="flex flex-col w-full p-space-md gap-space-lg pb-24">
      {/* 1. Header & Live Market Badge */}
      <section className="flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-body-sm text-on-surface-variant font-body-md">Portfolio Overview</p>
            <h2 className="text-headline-md font-headline-md text-on-surface font-semibold">
              My Holdings
            </h2>
          </div>
          <div className="flex items-center gap-space-xs bg-surface-container px-3 py-1.5 rounded-full select-none">
            <span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
            <span className="text-body-sm font-tabular-data text-on-surface">Live Market</span>
          </div>
        </div>

        {/* 2. Main Bento Hero Card */}
        <MobilePortfolioCard
          totalValue={portfolio?.currentValue ?? 1245680.5}
          investedValue={portfolio?.totalInvested ?? 1050000.0}
          availableBalance={195680.5}
          todayPnL={portfolio?.todayPnL ?? 8420.25}
          todayPnLPercent={portfolio?.todayPnLPercent ?? 0.68}
          overallReturns={portfolio?.overallReturns ?? 195680.5}
          overallReturnsPercent={portfolio?.overallReturnsPercent ?? 18.63}
          variant="holdings"
        />

        {/* 3. Sector Allocation Progress */}
        <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-sm shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-label-md text-on-surface-variant uppercase font-semibold">
              Sector Allocation
            </span>
            <span className="text-body-sm text-primary font-medium cursor-pointer hover:underline">
              View Breakdown
            </span>
          </div>

          <div className="w-full h-3 bg-surface-variant rounded-full overflow-hidden flex">
            {sectorBreakdown.map((s) => (
              <div
                key={s.name}
                className={`${s.color} h-full transition-all`}
                style={{ width: `${s.percent}%` }}
                title={`${s.name} ${s.percent}%`}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-body-sm text-on-surface-variant">
            {sectorBreakdown.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${s.color}`} />
                <span>
                  {s.name} {s.percent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Search & Filter Bar */}
      <section>
        <MobileSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search holdings (e.g. TCS, RELIANCE)..."
        />
      </section>

      {/* 5. Holdings List / Cards */}
      <section className="flex flex-col gap-space-md">
        <div className="flex justify-between items-center">
          <h3 className="text-headline-sm font-headline-sm text-on-surface font-semibold">
            Holdings ({filteredHoldings.length})
          </h3>
          <span className="text-body-sm text-on-surface-variant">Sorted by Value</span>
        </div>

        {isLoading && filteredHoldings.length === 0 ? (
          <MobileLoadingState message="Fetching portfolio holdings..." />
        ) : filteredHoldings.length === 0 ? (
          <MobileEmptyState
            icon="account_balance_wallet"
            title="No holdings found"
            description={
              searchQuery
                ? `No holdings matching "${searchQuery}".`
                : "You don't have any open equity holdings. Buy shares to build your portfolio."
            }
          />
        ) : (
          <div className="flex flex-col gap-space-md">
            {filteredHoldings.map((h) => (
              <MobileHoldingRow
                key={h.id || h.symbol}
                symbol={h.symbol}
                name={h.name}
                quantity={h.quantity}
                avgPrice={h.average_buy_price}
                currentPrice={h.current_price}
                investedValue={h.invested_value}
                currentValue={h.current_value}
                pnl={h.unrealized_pnl}
                pnlPercent={h.pnl_percent}
                onBuy={onBuy}
                onSell={onSell}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
