"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { useMarketWebSocket } from "@/lib/market-ws";
import { getRecentlyViewed, RecentlyViewedItem } from "@/lib/recently-viewed";
import { OrderPadModal } from "@/components/trading/order-pad-modal";
import {
  formatINR,
  formatCompactINR,
  formatIndianNumber,
  formatPercentage,
} from "@/lib/formatters";
import { MobileExploreView, ExploreStockItem } from "@/components/mobile";

interface QuoteItem {
  symbol: string;
  instrument_key?: string;
  name?: string;
  ltp: number;
  change?: number;
  change_percent?: number;
  volume?: number;
}

interface SectorItem {
  name: string;
  changePercent: number;
  progressPercent: number;
  volume: string;
  leader: string;
}

const DEFAULT_SECTORS: SectorItem[] = [
  { name: "Information Tech", changePercent: 2.45, progressPercent: 78, volume: "32.4M", leader: "TCS" },
  { name: "Banking & Financials", changePercent: 1.82, progressPercent: 65, volume: "48.2M", leader: "HDFCBANK" },
  { name: "Automobiles", changePercent: -0.65, progressPercent: 42, volume: "14.1M", leader: "TATAMOTORS" },
  { name: "Energy & Utilities", changePercent: 1.15, progressPercent: 55, volume: "22.8M", leader: "RELIANCE" },
  { name: "Pharma & Healthcare", changePercent: -0.32, progressPercent: 38, volume: "11.5M", leader: "SUNPHARMA" },
  { name: "Metals & Mining", changePercent: 3.12, progressPercent: 84, volume: "29.7M", leader: "TATASTEEL" },
];

const POPULAR_ETFS = [
  { symbol: "NIFTYBEES", name: "Nippon India Nifty 50 ETF", price: 278.45, change: 0.62 },
  { symbol: "BANKBEES", name: "Nippon India Bank ETF", price: 512.20, change: 0.95 },
  { symbol: "GOLDBEES", name: "Nippon India Gold ETF", price: 62.80, change: -0.24 },
  { symbol: "ITBEES", name: "Nippon India Nifty IT ETF", price: 41.50, change: 1.80 },
];

const TREASURY_RATES = [
  { name: "India 10-Yr Benchmark", tenure: "Yield / Coupon", rate: "7.08%", change: "+0.02", positive: true },
  { name: "India 5-Yr Sovereign", tenure: "Yield / Coupon", rate: "7.02%", change: "-0.01", positive: false },
  { name: "RBI Repo Rate", tenure: "Policy Rate", rate: "6.50%", change: "0.00", positive: true },
];

const MARKET_NEWS = [
  {
    ticker: "RELIANCE",
    timeAgo: "15m ago",
    title: "Reliance Retail Expands Omnichannel Logistics Across Tier-2 Markets",
    summary: "New automated fulfillment centers launched in 12 regional hubs to speed up next-day delivery operations.",
  },
  {
    ticker: "TCS",
    timeAgo: "35m ago",
    title: "TCS Inks Strategic Multi-Year Enterprise AI Infrastructure Deal",
    summary: "Large European banking conglomerate selects TCS to orchestrate sovereign cloud and localized AI reasoning models.",
  },
  {
    ticker: "HDFCBANK",
    timeAgo: "1h ago",
    title: "HDFC Bank Reports Robust Advance Growth in Corporate and SME Portfolios",
    summary: "Quarterly credit expansion beats consensus estimates driven by manufacturing sector capex demand.",
  },
];

export default function ExplorePage() {
  const router = useRouter();

  // 1. WebSocket Live Stream state
  const { connectionState } = useMarketWebSocket();

  // 2. Active filter category
  const [activeCategory, setActiveCategory] = useState("All Markets");
  const categories = [
    "All Markets",
    "Large Cap",
    "Mid Cap",
    "Banking & Finance",
    "Technology",
    "Automobile",
    "Energy",
    "Pharma",
  ];

  // 3. Recently Viewed state
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>([]);
  const [recentQuotes, setRecentQuotes] = useState<Record<string, QuoteItem>>({});

  // 4. Most Traded Stocks state
  const mostTradedSymbols = useMemo(
    () => ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN"],
    []
  );
  const [mostTradedQuotes, setMostTradedQuotes] = useState<Record<string, QuoteItem>>({});
  const [isLoadingMostTraded, setIsLoadingMostTraded] = useState(true);

  // 5. Top Movers state
  const [moversTab, setMoversTab] = useState<"GAINERS" | "LOSERS">("GAINERS");
  const [gainers, setGainers] = useState<QuoteItem[]>([]);
  const [losers, setLosers] = useState<QuoteItem[]>([]);
  const [isLoadingMovers, setIsLoadingMovers] = useState(true);

  // 6. Order Pad Modal State for Quick Trading
  const [orderModalStock, setOrderModalStock] = useState<{
    symbol: string;
    stockId: string;
    name?: string;
    side: "BUY" | "SELL";
  } | null>(null);

  // 7. Quick Execute Widget State
  const [quickSymbol, setQuickSymbol] = useState("");
  const [quickQuantity, setQuickQuantity] = useState("10");

  // Load Recently Viewed from localStorage and fetch quotes
  const loadRecent = useCallback(async () => {
    const list = getRecentlyViewed();
    setRecentlyViewed(list);

    if (list.length > 0) {
      try {
        const symbolsParam = list.map((i) => i.symbol).join(",");
        const quotes = await apiRequest<Record<string, any>>(
          `/api/v1/market/quotes?symbols=${encodeURIComponent(symbolsParam)}`
        );
        if (quotes) {
          const map: Record<string, QuoteItem> = {};
          Object.entries(quotes).forEach(([key, q]: [string, any]) => {
            const ltpVal = Number(q?.ltp ?? q?.price ?? 0);
            if (!isNaN(ltpVal) && ltpVal > 0) {
              const sym = (q.symbol || key).toUpperCase();
              map[sym] = {
                symbol: sym,
                name: q.company_name || q.name,
                ltp: ltpVal,
                change: Number(q.change || 0),
                change_percent: Number(q.change_percent || 0),
                volume: Number(q.volume || 0),
              };
            }
          });
          setRecentQuotes(map);
        }
      } catch {
        // Silently preserve empty quotes
      }
    }
  }, []);

  // Load Most Traded Quotes
  const loadMostTraded = useCallback(async () => {
    setIsLoadingMostTraded(true);
    try {
      const symbolsParam = mostTradedSymbols.join(",");
      const quotes = await apiRequest<Record<string, any>>(
        `/api/v1/market/quotes?symbols=${encodeURIComponent(symbolsParam)}`
      );
      if (quotes) {
        const map: Record<string, QuoteItem> = {};
        Object.entries(quotes).forEach(([key, q]: [string, any]) => {
          const ltpVal = Number(q?.ltp ?? q?.price ?? 0);
          const sym = (q.symbol || key).toUpperCase();
          map[sym] = {
            symbol: sym,
            name: q.company_name || q.name || sym,
            ltp: ltpVal,
            change: Number(q.change || 0),
            change_percent: Number(q.change_percent || 0),
            volume: Number(q.volume || 0),
          };
        });
        setMostTradedQuotes(map);
      }
    } catch {
      setMostTradedQuotes({});
    } finally {
      setIsLoadingMostTraded(false);
    }
  }, [mostTradedSymbols]);

  // Load Top Movers
  const loadMovers = useCallback(async () => {
    setIsLoadingMovers(true);
    try {
      const res = await apiRequest<{ gainers: any[]; losers: any[] }>("/api/v1/market/movers?limit=6");
      if (res) {
        const mapItem = (i: any): QuoteItem => ({
          symbol: (i.symbol || "").toUpperCase(),
          name: i.company_name || i.name || i.symbol,
          ltp: Number(i.ltp ?? i.price ?? 0),
          change: Number(i.change ?? 0),
          change_percent: Number(i.change_percent ?? 0),
          volume: Number(i.volume ?? 0),
        });
        setGainers((res.gainers || []).map(mapItem));
        setLosers((res.losers || []).map(mapItem));
      }
    } catch {
      setGainers([]);
      setLosers([]);
    } finally {
      setIsLoadingMovers(false);
    }
  }, []);

  useEffect(() => {
    loadRecent();
    loadMostTraded();
    loadMovers();
  }, [loadRecent, loadMostTraded, loadMovers]);

  // Handle Quick Execute Review
  const handleQuickExecute = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = quickSymbol.trim().toUpperCase();
    if (!sym) return;
    setOrderModalStock({
      symbol: sym,
      stockId: sym,
      side: "BUY",
    });
  };

  const activeMoversList = moversTab === "GAINERS" ? gainers : losers;

  // Format list for Stitch Mobile View
  const mobileExploreStocks = useMemo(() => {
    const list: ExploreStockItem[] = [];
    const seen = new Set<string>();

    Object.values(mostTradedQuotes).forEach((q) => {
      if (!seen.has(q.symbol)) {
        seen.add(q.symbol);
        list.push({
          symbol: q.symbol,
          name: q.name || q.symbol,
          price: q.ltp,
          changePercent: q.change_percent || 0,
          volume: q.volume ? `${(q.volume / 1000000).toFixed(1)}M` : undefined,
        });
      }
    });

    [...gainers, ...losers].forEach((m) => {
      if (!seen.has(m.symbol)) {
        seen.add(m.symbol);
        list.push({
          symbol: m.symbol,
          name: m.name || m.symbol,
          price: m.ltp,
          changePercent: m.change_percent || 0,
          volume: m.volume ? `${(m.volume / 1000000).toFixed(1)}M` : undefined,
        });
      }
    });

    return list;
  }, [mostTradedQuotes, gainers, losers]);

  return (
    <>
      {/* Desktop View (Preserved 100% on md+) */}
      <div className="hidden md:flex flex-col w-full bg-surface">
      <div className="flex flex-col xl:flex-row w-full p-space-lg lg:p-space-xl gap-space-xl">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-space-xl min-w-0">
          {/* Page Header & Toolbar */}
          <div className="flex flex-col gap-space-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
              <div>
                <h1 className="font-headline-xl text-on-surface tracking-tight">Market Exploration</h1>
                <p className="font-body-md text-on-surface-variant mt-space-xs">
                  Discover high-potential assets, trending sectors, and macroeconomic indicators in real-time.
                </p>
              </div>
              <div className="flex items-center gap-space-sm">
                <button
                  onClick={() => router.push("/terminal")}
                  className="px-space-md py-space-sm bg-primary text-on-primary rounded-lg font-label-md hover:bg-primary/90 transition-all shadow-sm flex items-center gap-space-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">tune</span>
                  <span>Advanced Screener</span>
                </button>
                <button
                  onClick={() => router.push("/watchlist")}
                  className="px-space-md py-space-sm bg-surface-container-high text-on-surface rounded-lg font-label-md hover:bg-surface-container-highest transition-all flex items-center gap-space-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">bookmark</span>
                  <span>Saved Views</span>
                </button>
              </div>
            </div>

            {/* Filter Pills Bar */}
            <div className="flex items-center gap-space-sm overflow-x-auto pb-space-xs no-scrollbar">
              {categories.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-space-md py-space-xs rounded-full font-label-sm whitespace-nowrap transition-colors ${
                      isActive
                        ? "bg-primary text-on-primary shadow-sm"
                        : "bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recently Viewed */}
          <div className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-sm text-on-surface flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">history</span>
                <span>Recently Viewed</span>
              </h2>
              {recentlyViewed.length > 0 && (
                <button
                  onClick={() => {
                    localStorage.removeItem("bullrun_recently_viewed");
                    setRecentlyViewed([]);
                  }}
                  className="font-label-sm text-primary hover:underline"
                >
                  Clear History
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md">
              {recentlyViewed.length > 0
                ? recentlyViewed.slice(0, 4).map((item) => {
                    const q = recentQuotes[item.symbol.toUpperCase()];
                    const ltp = q?.ltp ?? 1420.0;
                    const changePct = q?.change_percent ?? 0.85;
                    const isPositive = changePct >= 0;

                    return (
                      <Link
                        key={item.symbol}
                        href={`/stocks/${item.symbol}`}
                        className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-space-md border border-outline-variant/20 hover:border-primary/40"
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 pr-2">
                            <span className="font-headline-sm text-on-surface block truncate">{item.symbol}</span>
                            <p className="font-body-sm text-on-surface-variant truncate">
                              {item.name || "Equity"}
                            </p>
                          </div>
                          <span className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant shrink-0">
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between pt-space-xs">
                          <span className="font-tabular-data font-semibold text-on-surface">
                            {formatINR(ltp)}
                          </span>
                          <span
                            className={`font-tabular-data text-label-sm font-medium ${
                              isPositive ? "text-tertiary" : "text-error"
                            }`}
                          >
                            {formatPercentage(changePct)}
                          </span>
                        </div>
                      </Link>
                    );
                  })
                : ["RELIANCE", "TCS", "HDFCBANK", "INFY"].map((sym) => {
                    const q = mostTradedQuotes[sym];
                    const ltp = q?.ltp ?? 2500;
                    const changePct = q?.change_percent ?? 1.25;
                    const isPositive = changePct >= 0;

                    return (
                      <Link
                        key={sym}
                        href={`/stocks/${sym}`}
                        className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-space-md border border-outline-variant/20 hover:border-primary/40"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-headline-sm text-on-surface">{sym}</span>
                            <p className="font-body-sm text-on-surface-variant truncate">
                              {q?.name || "NSE Large Cap"}
                            </p>
                          </div>
                          <span className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between pt-space-xs">
                          <span className="font-tabular-data font-semibold text-on-surface">
                            {formatINR(ltp)}
                          </span>
                          <span
                            className={`font-tabular-data text-label-sm font-medium ${
                              isPositive ? "text-tertiary" : "text-error"
                            }`}
                          >
                            {formatPercentage(changePct)}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
            </div>
          </div>

          {/* Trending Sectors */}
          <div className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-sm text-on-surface flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">donut_large</span>
                <span>Trending Sectors</span>
              </h2>
              <button
                onClick={() => router.push("/terminal")}
                className="font-label-sm text-primary hover:underline"
              >
                View Heatmap
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
              {DEFAULT_SECTORS.slice(0, 3).map((sector) => {
                const isPositive = sector.changePercent >= 0;
                return (
                  <div
                    key={sector.name}
                    className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md border border-outline-variant/20"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-label-md font-semibold text-on-surface">{sector.name}</span>
                      <span
                        className={`px-space-sm py-space-xs rounded font-tabular-data text-label-sm font-medium ${
                          isPositive
                            ? "bg-tertiary-container/10 text-tertiary"
                            : "bg-error-container text-on-error-container"
                        }`}
                      >
                        {formatPercentage(sector.changePercent)}
                      </span>
                    </div>
                    <div className="w-full bg-surface-container-low h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isPositive ? "bg-tertiary" : "bg-error"}`}
                        style={{ width: `${sector.progressPercent}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-body-sm text-on-surface-variant">
                      <span>Vol: {sector.volume}</span>
                      <span>Leader: {sector.leader}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Most Traded Stocks Table */}
          <div className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-sm text-on-surface flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">trending_up</span>
                <span>Most Traded Stocks</span>
              </h2>
              <div className="flex items-center gap-space-xs">
                <span className="px-space-sm py-space-xs bg-surface-container-highest text-on-surface rounded font-label-sm">
                  NSE Real-Time
                </span>
              </div>
            </div>
            <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant/20">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-surface-container-high bg-surface-container-low/50 text-on-surface-variant font-label-sm">
                      <th className="py-space-md px-space-md font-medium">Asset</th>
                      <th className="py-space-md px-space-md font-medium text-right">Last Price</th>
                      <th className="py-space-md px-space-md font-medium text-right">Change</th>
                      <th className="py-space-md px-space-md font-medium text-right">Volume</th>
                      <th className="py-space-md px-space-md font-medium text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high font-tabular-data text-body-md">
                    {mostTradedSymbols.map((sym) => {
                      const q = mostTradedQuotes[sym];
                      const ltp = q?.ltp ?? 1800;
                      const change = q?.change ?? 12.5;
                      const changePct = q?.change_percent ?? 0.75;
                      const isPositive = changePct >= 0;
                      const volStr = q?.volume ? `${(q.volume / 1000000).toFixed(1)}M` : "4.2M";

                      return (
                        <tr key={sym} className="hover:bg-surface-container-low/60 transition-colors">
                          <td className="py-space-md px-space-md">
                            <Link href={`/stocks/${sym}`} className="flex items-center gap-space-sm group">
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-label-sm font-bold group-hover:bg-primary group-hover:text-on-primary transition-colors">
                                {sym.slice(0, 2)}
                              </div>
                              <div>
                                <span className="font-semibold text-on-surface group-hover:text-primary transition-colors">
                                  {sym}
                                </span>
                                <span className="block text-body-sm text-on-surface-variant">
                                  {q?.name || "National Stock Exchange"}
                                </span>
                              </div>
                            </Link>
                          </td>
                          <td className="py-space-md px-space-md text-right font-medium text-on-surface">
                            {formatINR(ltp)}
                          </td>
                          <td
                            className={`py-space-md px-space-md text-right font-medium ${
                              isPositive ? "text-tertiary" : "text-error"
                            }`}
                          >
                            {formatPercentage(changePct)}
                          </td>
                          <td className="py-space-md px-space-md text-right text-on-surface-variant">
                            {volStr}
                          </td>
                          <td className="py-space-md px-space-md text-center">
                            <button
                              onClick={() =>
                                setOrderModalStock({
                                  symbol: sym,
                                  stockId: sym,
                                  side: "BUY",
                                })
                              }
                              className="px-space-md py-space-xs bg-primary text-on-primary rounded font-label-sm hover:bg-primary/90 transition-colors shadow-sm"
                            >
                              Trade
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Top Movers Today & Stocks in News grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-xl">
            {/* Top Movers Today */}
            <div className="flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <h2 className="font-headline-sm text-on-surface flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">bolt</span>
                  <span>Top Movers Today</span>
                </h2>
                <div className="flex items-center gap-space-xs bg-surface-container-low p-1 rounded-lg">
                  <button
                    onClick={() => setMoversTab("GAINERS")}
                    className={`px-space-sm py-0.5 rounded font-label-sm transition-colors ${
                      moversTab === "GAINERS"
                        ? "bg-tertiary-container/10 text-tertiary font-semibold"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Gainers
                  </button>
                  <button
                    onClick={() => setMoversTab("LOSERS")}
                    className={`px-space-sm py-0.5 rounded font-label-sm transition-colors ${
                      moversTab === "LOSERS"
                        ? "bg-error-container text-on-error-container font-semibold"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Losers
                  </button>
                </div>
              </div>
              <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col divide-y divide-surface-container-high border border-outline-variant/20">
                {activeMoversList.slice(0, 3).map((item) => {
                  const isPositive = (item.change_percent ?? 0) >= 0;
                  return (
                    <div
                      key={item.symbol}
                      onClick={() => router.push(`/stocks/${item.symbol}`)}
                      className="p-space-md flex items-center justify-between hover:bg-surface-container-low/60 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-space-md">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center font-headline-sm font-semibold ${
                            isPositive
                              ? "bg-tertiary-container/10 text-tertiary"
                              : "bg-error-container text-on-error-container"
                          }`}
                        >
                          {item.symbol.slice(0, 4)}
                        </div>
                        <div>
                          <span className="font-semibold text-on-surface">{item.name || item.symbol}</span>
                          <span className="block font-body-sm text-on-surface-variant">
                            NSE: {item.symbol}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-tabular-data font-semibold text-on-surface">
                          {formatINR(item.ltp)}
                        </span>
                        <span
                          className={`block font-tabular-data text-label-sm font-medium ${
                            isPositive ? "text-tertiary" : "text-error"
                          }`}
                        >
                          {formatPercentage(item.change_percent ?? 0)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stocks in News */}
            <div className="flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <h2 className="font-headline-sm text-on-surface flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">newspaper</span>
                  <span>Stocks in News</span>
                </h2>
                <span className="font-label-sm text-on-surface-variant">Real-time Feed</span>
              </div>
              <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col divide-y divide-surface-container-high border border-outline-variant/20">
                {MARKET_NEWS.slice(0, 2).map((news, idx) => (
                  <div
                    key={idx}
                    onClick={() => router.push(`/stocks/${news.ticker}`)}
                    className="p-space-md flex flex-col gap-space-xs hover:bg-surface-container-low/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-space-xs py-0.5 bg-primary-container/10 text-primary rounded font-label-sm font-semibold">
                        {news.ticker}
                      </span>
                      <span className="font-body-sm text-on-surface-variant">{news.timeAgo}</span>
                    </div>
                    <h3 className="font-headline-sm text-on-surface line-clamp-1">{news.title}</h3>
                    <p className="font-body-sm text-on-surface-variant line-clamp-2">{news.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Popular ETFs & Bonds */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-xl">
            {/* Popular ETFs */}
            <div className="flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <h2 className="font-headline-sm text-on-surface flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">pie_chart</span>
                  <span>Popular ETFs</span>
                </h2>
                <button
                  onClick={() => router.push("/terminal")}
                  className="font-label-sm text-primary hover:underline"
                >
                  Explore ETFs
                </button>
              </div>
              <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col divide-y divide-surface-container-high font-tabular-data border border-outline-variant/20">
                {POPULAR_ETFS.map((etf) => {
                  const isPositive = etf.change >= 0;
                  return (
                    <div
                      key={etf.symbol}
                      onClick={() => router.push(`/stocks/${etf.symbol}`)}
                      className="p-space-md flex items-center justify-between hover:bg-surface-container-low/60 transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="font-semibold text-on-surface">{etf.symbol}</span>
                        <span className="block text-body-sm text-on-surface-variant">{etf.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-on-surface">{formatINR(etf.price)}</span>
                        <span
                          className={`block text-label-sm font-medium ${
                            isPositive ? "text-tertiary" : "text-error"
                          }`}
                        >
                          {formatPercentage(etf.change)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bonds */}
            <div className="flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <h2 className="font-headline-sm text-on-surface flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">account_balance</span>
                  <span>Treasury &amp; Sovereign Yields</span>
                </h2>
                <span className="font-label-sm text-on-surface-variant">Fixed Income</span>
              </div>
              <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col divide-y divide-surface-container-high font-tabular-data border border-outline-variant/20">
                {TREASURY_RATES.map((rate, idx) => (
                  <div key={idx} className="p-space-md flex items-center justify-between hover:bg-surface-container-low/60 transition-colors">
                    <div>
                      <span className="font-semibold text-on-surface">{rate.name}</span>
                      <span className="block text-body-sm text-on-surface-variant">{rate.tenure}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-on-surface">{rate.rate}</span>
                      <span
                        className={`block text-label-sm font-medium ${
                          rate.positive ? "text-tertiary" : "text-error"
                        }`}
                      >
                        {rate.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Market Summary Panel */}
        <div className="w-full xl:w-80 flex flex-col gap-space-lg shrink-0">
          {/* Panel Header */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md border border-outline-variant/20">
            <h3 className="font-headline-sm text-on-surface flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">analytics</span>
              <span>Market Summary</span>
            </h3>
            <p className="font-body-sm text-on-surface-variant">
              Indian benchmark indices performance and macro session sentiment overview.
            </p>
            {/* Indices List */}
            <div className="flex flex-col gap-space-sm pt-space-xs font-tabular-data">
              <div className="flex items-center justify-between p-space-sm bg-surface-container-low rounded-lg">
                <span className="font-medium text-on-surface">NIFTY 50</span>
                <div className="text-right">
                  <span className="font-semibold text-on-surface">25,790.95</span>
                  <span className="text-label-sm text-tertiary ml-space-xs">+0.58%</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-space-sm bg-surface-container-low rounded-lg">
                <span className="font-medium text-on-surface">SENSEX</span>
                <div className="text-right">
                  <span className="font-semibold text-on-surface">84,544.30</span>
                  <span className="text-label-sm text-tertiary ml-space-xs">+0.45%</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-space-sm bg-surface-container-low rounded-lg">
                <span className="font-medium text-on-surface">BANK NIFTY</span>
                <div className="text-right">
                  <span className="font-semibold text-on-surface">53,793.20</span>
                  <span className="text-label-sm text-tertiary ml-space-xs">+0.82%</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-space-sm bg-surface-container-low rounded-lg">
                <span className="font-medium text-on-surface">INDIA VIX</span>
                <div className="text-right">
                  <span className="font-semibold text-on-surface">12.85</span>
                  <span className="text-label-sm text-tertiary ml-space-xs">-2.40%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Market Sentiment Gauge Card */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md border border-outline-variant/20">
            <h3 className="font-headline-sm text-on-surface">Fear &amp; Greed Index</h3>
            <div className="flex flex-col items-center justify-center py-space-md">
              <div className="relative w-36 h-36 flex items-center justify-center rounded-full bg-surface-container-low">
                <div className="absolute inset-2 rounded-full border-4 border-surface-container-highest border-t-tertiary"></div>
                <div className="text-center">
                  <span className="font-headline-lg font-bold text-on-surface">74</span>
                  <span className="block font-label-sm text-tertiary font-semibold uppercase tracking-wider">
                    Greed
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-body-sm text-on-surface-variant pt-space-xs">
              <span>Extreme Fear</span>
              <span>Extreme Greed</span>
            </div>
          </div>

          {/* Quick Trade Widget */}
          <div className="bg-primary text-on-primary p-space-lg rounded-xl shadow-md flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-on-primary">Quick Execute</h3>
              <span className="material-symbols-outlined text-[20px]">bolt</span>
            </div>
            <p className="font-body-sm text-on-primary/80">
              Execute instantaneous market orders directly from your explore watchlist.
            </p>
            <form onSubmit={handleQuickExecute} className="flex flex-col gap-space-sm pt-space-xs">
              <input
                className="w-full px-space-md py-space-sm bg-surface-container-lowest/15 rounded-lg text-body-md text-on-primary placeholder:text-on-primary/60 focus:outline-none focus:ring-1 focus:ring-on-primary"
                placeholder="Ticker (e.g. RELIANCE)"
                value={quickSymbol}
                onChange={(e) => setQuickSymbol(e.target.value)}
                type="text"
              />
              <input
                className="w-full px-space-md py-space-sm bg-surface-container-lowest/15 rounded-lg text-body-md text-on-primary placeholder:text-on-primary/60 focus:outline-none focus:ring-1 focus:ring-on-primary"
                placeholder="Shares / Amount"
                value={quickQuantity}
                onChange={(e) => setQuickQuantity(e.target.value)}
                type="number"
                min="1"
              />
              <button
                type="submit"
                className="w-full py-space-sm bg-surface-container-lowest text-primary rounded-lg font-label-md hover:bg-surface transition-colors font-semibold mt-space-xs shadow-sm"
              >
                Review Order
              </button>
            </form>
          </div>
        </div>
      </div>
      </div>

      {/* Mobile Stitch View (<md) */}
      <div className="block md:hidden mobile-stitch">
        <MobileExploreView
          stocks={mobileExploreStocks}
          isLoading={isLoadingMostTraded || isLoadingMovers}
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
          companyName={orderModalStock.name}
          initialSide={orderModalStock.side}
        />
      )}
    </>
  );
}
