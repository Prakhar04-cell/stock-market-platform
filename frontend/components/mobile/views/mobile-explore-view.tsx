"use client";

import React, { useState, useMemo } from "react";
import { formatINR, formatStockPrice } from "@/lib/formatters";
import { MobileSearch } from "../mobile-search";
import { MobileFilter } from "../mobile-filter";
import { MobileMetricCard } from "../mobile-metric-card";
import { MobileTabBar } from "../mobile-tab-bar";
import { MobileStockRow } from "../mobile-stock-row";
import { MobileEmptyState, MobileLoadingState } from "../mobile-states";

export interface ExploreStockItem {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  volume?: string | number;
  category?: string;
  sector?: string;
}

interface SectorInfo {
  name: string;
  marketCap: string;
  changePercent: number;
  icon: string;
}

interface MobileExploreViewProps {
  stocks: ExploreStockItem[];
  sectors?: SectorInfo[];
  isLoading?: boolean;
  onBuy: (symbol: string, name?: string) => void;
  onSell: (symbol: string, name?: string) => void;
}

export function MobileExploreView({
  stocks,
  sectors,
  isLoading = false,
  onBuy,
  onSell,
}: MobileExploreViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Markets");
  const [activeTab, setActiveTab] = useState<"most_traded" | "gainers" | "losers">("most_traded");

  const categories = ["All Markets", "Large Cap", "Mid Cap", "High Yield", "Sectors"];

  const defaultSectors: SectorInfo[] = [
    { name: "IT & Tech", marketCap: "₹34.8T", changePercent: 2.4, icon: "trending_up" },
    { name: "Banking", marketCap: "₹28.4T", changePercent: 1.8, icon: "account_balance" },
    { name: "Automotive", marketCap: "₹14.2T", changePercent: -0.5, icon: "directions_car" },
  ];

  const displaySectors = sectors && sectors.length > 0 ? sectors : defaultSectors;

  // Filter stocks based on search query, category, and tabs
  const filteredStocks = useMemo(() => {
    let list = [...stocks];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      );
    }

    if (activeCategory === "Large Cap") {
      list = list.filter((s) => ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN"].includes(s.symbol));
    } else if (activeCategory === "Mid Cap") {
      list = list.filter((s) => !["RELIANCE", "TCS", "HDFCBANK", "INFY"].includes(s.symbol));
    }

    if (activeTab === "gainers") {
      list = list.filter((s) => s.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent);
    } else if (activeTab === "losers") {
      list = list.filter((s) => s.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent);
    }

    return list;
  }, [stocks, searchQuery, activeCategory, activeTab]);

  return (
    <div className="flex flex-col w-full px-space-md py-space-md gap-space-lg">
      {/* 1. Search and Filter Header */}
      <div className="flex flex-col gap-space-md">
        <MobileSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search symbols, assets, or keywords..."
        />
        <MobileFilter
          categories={categories}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
        />
      </div>

      {/* 2. Trending Sectors Section */}
      <div className="flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <h2 className="font-headline-sm text-on-surface font-semibold">Trending Sectors</h2>
          <span className="text-primary font-label-md text-body-sm hover:underline cursor-pointer">
            View All
          </span>
        </div>
        <div className="grid grid-cols-3 gap-space-sm">
          {displaySectors.map((sector) => (
            <MobileMetricCard
              key={sector.name}
              title={sector.name}
              value={sector.marketCap}
              change={`${sector.changePercent >= 0 ? "+" : ""}${sector.changePercent}%`}
              isPositive={sector.changePercent >= 0}
              icon={sector.icon}
            />
          ))}
        </div>
      </div>

      {/* 3. Tabs: Most Traded / Top Gainers / Top Losers */}
      <div className="flex flex-col gap-space-md">
        <MobileTabBar
          tabs={[
            { id: "most_traded", label: "Most Traded" },
            { id: "gainers", label: "Top Gainers" },
            { id: "losers", label: "Top Losers" },
          ]}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as any)}
          variant="underline"
        />

        {/* 4. Stock List */}
        {isLoading && filteredStocks.length === 0 ? (
          <MobileLoadingState message="Discovering market instruments..." />
        ) : filteredStocks.length === 0 ? (
          <MobileEmptyState
            icon="search_off"
            title="No symbols found"
            description={`No results matching "${searchQuery}".`}
          />
        ) : (
          <div className="flex flex-col gap-space-sm">
            {filteredStocks.map((stock) => (
              <MobileStockRow
                key={stock.symbol}
                symbol={stock.symbol}
                name={stock.name}
                price={stock.price}
                changePercent={stock.changePercent}
                volume={stock.volume}
                onBuy={onBuy}
                onSell={onSell}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
