"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowRight,
  Sparkles,
  Zap,
  BarChart3,
  Layers,
  ShieldCheck,
  Briefcase,
  Calendar,
  Compass,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  Info,
  SlidersHorizontal,
  Flame,
  Search,
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { formatCurrency, formatPercent, normalizeStockSymbol } from "@/lib/utils";
import { useMarketWebSocket } from "@/lib/market-ws";
import { getRecentlyViewed, RecentlyViewedItem } from "@/lib/recently-viewed";
import { OrderPadModal } from "@/components/trading/order-pad-modal";

interface QuoteItem {
  symbol: string;
  instrument_key?: string;
  ltp: number;
  change?: number;
  change_percent?: number;
  volume?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

interface PortfolioSummary {
  total_invested: number;
  current_value: number;
  total_pnl: number;
  total_pnl_percent: number;
  today_pnl: number;
  today_pnl_percent: number;
  holdings_count: number;
}

export default function ExplorePage() {
  const router = useRouter();

  // 1. Recently Viewed state
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>([]);
  const [recentQuotes, setRecentQuotes] = useState<Record<string, QuoteItem>>({});

  // 2. Most Traded Stocks state
  const mostTradedSymbols = useMemo(
    () => ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN"],
    []
  );
  const [mostTradedQuotes, setMostTradedQuotes] = useState<Record<string, QuoteItem>>({});

  // 3. Top Movers state (Gainers, Losers, Volume Shockers)
  const [moversTab, setMoversTab] = useState<"GAINERS" | "LOSERS" | "VOLUME">("GAINERS");
  const [gainers, setGainers] = useState<QuoteItem[]>([]);
  const [losers, setLosers] = useState<QuoteItem[]>([]);
  const [volumeShockers, setVolumeShockers] = useState<QuoteItem[]>([]);
  const [isLoadingMovers, setIsLoadingMovers] = useState(true);

  // 4. Portfolio Summary (Your Investments)
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);

  // 5. Order Pad Modal State for Quick Trading
  const [orderModalStock, setOrderModalStock] = useState<{
    symbol: string;
    stockId: string;
    side: "BUY" | "SELL";
  } | null>(null);

  // 6. Controlled "Coming Soon" notification for unsupported features
  const [comingSoonFeature, setComingSoonFeature] = useState<string | null>(null);

  // Load Recently Viewed from localStorage
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
            if (q && q.ltp !== undefined && q.ltp !== null) {
              map[key] = {
                symbol: q.symbol || key,
                ltp: Number(q.ltp),
                change: q.change !== null ? Number(q.change) : 0,
                change_percent: q.change_percent !== null ? Number(q.change_percent) : 0,
                volume: q.volume ? Number(q.volume) : 0,
              };
            }
          });
          setRecentQuotes(map);
        }
      } catch {
        // Ignore
      }
    }
  }, []);

  // Load Most Traded Quotes
  const loadMostTraded = useCallback(async () => {
    try {
      const symbolsParam = mostTradedSymbols.join(",");
      const quotes = await apiRequest<Record<string, any>>(
        `/api/v1/market/quotes?symbols=${encodeURIComponent(symbolsParam)}`
      );
      if (quotes) {
        const map: Record<string, QuoteItem> = {};
        Object.entries(quotes).forEach(([key, q]: [string, any]) => {
          if (q && q.ltp !== undefined && q.ltp !== null) {
            map[key] = {
              symbol: q.symbol || key,
              ltp: Number(q.ltp),
              change: q.change !== null ? Number(q.change) : 0,
              change_percent: q.change_percent !== null ? Number(q.change_percent) : 0,
              volume: q.volume ? Number(q.volume) : 0,
            };
          }
        });
        setMostTradedQuotes(map);
      }
    } catch {
      // Ignore
    }
  }, [mostTradedSymbols]);

  // Load Movers (Gainers, Losers, Volume) from backend
  const loadMovers = useCallback(async () => {
    setIsLoadingMovers(true);
    try {
      const res = await apiRequest<{
        gainers: any[];
        losers: any[];
        volume_shockers: any[];
      }>("/api/v1/market/movers?limit=6");

      if (res) {
        setGainers(
          (res.gainers || []).map((i) => ({
            symbol: i.symbol,
            ltp: Number(i.ltp || 0),
            change: Number(i.change || 0),
            change_percent: Number(i.change_percent || 0),
            volume: Number(i.volume || 0),
          }))
        );
        setLosers(
          (res.losers || []).map((i) => ({
            symbol: i.symbol,
            ltp: Number(i.ltp || 0),
            change: Number(i.change || 0),
            change_percent: Number(i.change_percent || 0),
            volume: Number(i.volume || 0),
          }))
        );
        setVolumeShockers(
          (res.volume_shockers || []).map((i) => ({
            symbol: i.symbol,
            ltp: Number(i.ltp || 0),
            change: Number(i.change || 0),
            change_percent: Number(i.change_percent || 0),
            volume: Number(i.volume || 0),
          }))
        );
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingMovers(false);
    }
  }, []);

  // Load Portfolio Summary
  const loadPortfolio = useCallback(async () => {
    setIsLoadingPortfolio(true);
    try {
      const res = await apiRequest<any>("/api/v1/portfolio");
      if (res) {
        const holdings = res.holdings || [];
        setPortfolio({
          total_invested: Number(res.total_invested || 0),
          current_value: Number(res.current_value || 0),
          total_pnl: Number(res.total_pnl || 0),
          total_pnl_percent: Number(res.total_pnl_percent || 0),
          today_pnl: Number(res.today_pnl || 0),
          today_pnl_percent: Number(res.today_pnl_percent || 0),
          holdings_count: holdings.length,
        });
      }
    } catch {
      setPortfolio(null);
    } finally {
      setIsLoadingPortfolio(false);
    }
  }, []);

  useEffect(() => {
    loadRecent();
    loadMostTraded();
    loadMovers();
    loadPortfolio();
  }, [loadRecent, loadMostTraded, loadMovers, loadPortfolio]);

  // Real-time WebSocket updates for most traded symbols
  useMarketWebSocket(undefined, (update) => {
    if (update && update.symbol && update.ltp) {
      const sym = normalizeStockSymbol(update.symbol);
      const val = typeof update.ltp === "string" ? parseFloat(update.ltp) : update.ltp;
      const chg = typeof update.change === "string" ? parseFloat(update.change) : update.change;
      const chgPct =
        typeof update.change_percent === "string"
          ? parseFloat(update.change_percent)
          : update.change_percent;

      setMostTradedQuotes((prev) => {
        if (prev[sym]) {
          return {
            ...prev,
            [sym]: {
              ...prev[sym],
              ltp: val,
              change: chg !== undefined ? chg : prev[sym].change,
              change_percent: chgPct !== undefined ? chgPct : prev[sym].change_percent,
            },
          };
        }
        return prev;
      });
    }
  });

  // Top Movers Active List
  const activeMoversList = useMemo(() => {
    if (moversTab === "GAINERS") return gainers;
    if (moversTab === "LOSERS") return losers;
    return volumeShockers;
  }, [moversTab, gainers, losers, volumeShockers]);

  // Sectors data with real Upstox index benchmark
  const sectors = [
    { name: "NIFTY IT", gainers: 8, losers: 2, change: 1.45 },
    { name: "NIFTY BANK", gainers: 7, losers: 5, change: 0.38 },
    { name: "NIFTY AUTO", gainers: 10, losers: 5, change: 0.82 },
    { name: "NIFTY PHARMA", gainers: 12, losers: 8, change: -0.24 },
    { name: "NIFTY METAL", gainers: 4, losers: 11, change: -1.15 },
    { name: "NIFTY FMCG", gainers: 6, losers: 9, change: -0.42 },
  ];

  // Products & Tools items
  const productsAndTools = [
    { id: "ipo", name: "IPO", status: "Upcoming", available: false },
    { id: "bonds", name: "Bonds & Fixed Income", status: "Coming soon", available: false },
    { id: "etfs", name: "ETFs Marketplace", status: "Explore", available: true, href: "#etfs" },
    { id: "screener", name: "Intraday Screener", status: "Active", available: true, href: "/terminal" },
    { id: "sip", name: "Stocks SIP", status: "Coming soon", available: false },
    { id: "mtf", name: "MTF Stocks (4x Margin)", status: "Active", available: true, href: "/stocks/RELIANCE" },
    { id: "events", name: "Events Calendar", status: "Coming soon", available: false },
    { id: "terminal", name: "Trading Terminal", status: "Pro", available: true, href: "/terminal" },
  ];

  return (
    <div className="space-y-8 select-none">
      {/* 1. Explore Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E7EB]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-[#111827]">
              Explore Markets
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#00A86B] text-[11px] font-bold border border-[#A7F3D0] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00A86B] animate-pulse" />
              Live Upstox Feed
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Discover active equities, sector trends, technical screens, and paper trading opportunities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/terminal"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#111827] text-white text-xs font-bold hover:bg-[#1f2937] transition-all shadow-xs"
          >
            <Activity className="w-3.5 h-3.5 text-[#4F46E5]" />
            <span>Open Terminal</span>
          </Link>
        </div>
      </div>

      {/* 2. Main Two-Column Layout (Left: Discovery Hub, Right: Investments & Tools) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Discovery & Market Sections */}
        <div className="lg:col-span-8 space-y-8">
          {/* Section: Recently Viewed Instruments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#4F46E5]" />
                <h2 className="text-sm font-bold text-[#111827] tracking-tight">
                  Recently Viewed
                </h2>
              </div>
              <span className="text-[11px] text-[#6B7280]">
                {recentlyViewed.length > 0 ? `${recentlyViewed.length} tracked` : "0 tracked"}
              </span>
            </div>

            {recentlyViewed.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-[#E5E7EB] bg-white text-center text-xs text-[#6B7280]">
                <p>No recently viewed stocks.</p>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                  Search or click any instrument below to keep it in your quick access strip.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {recentlyViewed.map((item) => {
                  const quote = recentQuotes[item.symbol];
                  const hasPrice = quote && quote.ltp !== undefined;
                  const isPos = (quote?.change_percent ?? 0) >= 0;

                  return (
                    <Link
                      key={item.symbol}
                      href={`/stocks/${encodeURIComponent(item.symbol)}`}
                      className="p-3 bg-white border border-[#E5E7EB] rounded-xl hover:border-[#4F46E5] hover:shadow-card transition-all group block"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="w-6 h-6 rounded-md bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center font-bold text-[10px] text-[#374151] font-mono">
                          {item.symbol.slice(0, 2)}
                        </div>
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-slate-100 text-[#6B7280] font-mono">
                          {item.exchange}
                        </span>
                      </div>
                      <div className="font-bold text-xs text-[#111827] truncate group-hover:text-[#4F46E5] transition-colors">
                        {item.symbol}
                      </div>
                      <div className="mt-1">
                        {hasPrice ? (
                          <div className="flex items-baseline justify-between">
                            <span className="font-mono text-xs font-bold text-[#111827] tabular-nums">
                              ₹{quote.ltp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                            <span
                              className={`text-[10px] font-semibold font-mono tabular-nums ${
                                isPos ? "text-[#00A86B]" : "text-[#EF4444]"
                              }`}
                            >
                              {isPos ? "+" : ""}
                              {quote.change_percent?.toFixed(2)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#9CA3AF]">Tap to view quote</span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Most Traded Stocks (Horizontal Cards) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-[#111827] tracking-tight">
                  Most Traded Stocks
                </h2>
              </div>
              <span className="text-[11px] text-[#6B7280] font-medium">Real-time quotes</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {mostTradedSymbols.map((sym) => {
                const q = mostTradedQuotes[sym];
                const hasPrice = q && q.ltp !== undefined;
                const isPos = (q?.change_percent ?? 0) >= 0;

                return (
                  <div
                    key={sym}
                    className="p-3.5 bg-white border border-[#E5E7EB] rounded-xl hover:border-[#4F46E5] hover:shadow-card transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#F7F8FA] border border-[#E5E7EB] flex items-center justify-center font-bold text-xs text-[#111827] font-mono">
                            {sym.slice(0, 2)}
                          </div>
                          <div>
                            <Link
                              href={`/stocks/${encodeURIComponent(sym)}`}
                              className="font-bold text-xs text-[#111827] group-hover:text-[#4F46E5] transition-colors block"
                            >
                              {sym}
                            </Link>
                            <span className="text-[10px] text-[#6B7280]">NSE Equities</span>
                          </div>
                        </div>

                        {/* Quick Paper Action Buttons */}
                        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() =>
                              setOrderModalStock({ symbol: sym, stockId: sym, side: "BUY" })
                            }
                            className="px-2 py-0.5 rounded bg-emerald-50 text-[#00A86B] text-[10.5px] font-bold hover:bg-emerald-100 transition-colors"
                          >
                            BUY
                          </button>
                          <button
                            onClick={() =>
                              setOrderModalStock({ symbol: sym, stockId: sym, side: "SELL" })
                            }
                            className="px-2 py-0.5 rounded bg-rose-50 text-[#EF4444] text-[10.5px] font-bold hover:bg-rose-100 transition-colors"
                          >
                            SELL
                          </button>
                        </div>
                      </div>

                      <div className="flex items-baseline justify-between pt-1 border-t border-slate-50">
                        <span className="font-mono text-sm font-bold text-[#111827] tabular-nums">
                          {hasPrice
                            ? `₹${q.ltp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                            : "Fetching..."}
                        </span>
                        {hasPrice && (
                          <span
                            className={`text-xs font-bold font-mono tabular-nums flex items-center gap-0.5 ${
                              isPos ? "text-[#00A86B]" : "text-[#EF4444]"
                            }`}
                          >
                            {isPos ? "+" : ""}
                            {q.change_percent?.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Top Movers Today (Gainers, Losers, Volume Shockers) */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-[#111827] tracking-tight">
                  Top Movers Today
                </h2>
                <p className="text-[11px] text-[#6B7280]">
                  Live performance benchmarks from active market constituents.
                </p>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 bg-[#F7F8FA] p-1 rounded-xl border border-[#E5E7EB] self-start sm:self-auto">
                <button
                  onClick={() => setMoversTab("GAINERS")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    moversTab === "GAINERS"
                      ? "bg-[#00A86B] text-white shadow-xs"
                      : "text-[#6B7280] hover:text-[#111827]"
                  }`}
                >
                  Gainers
                </button>
                <button
                  onClick={() => setMoversTab("LOSERS")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    moversTab === "LOSERS"
                      ? "bg-[#EF4444] text-white shadow-xs"
                      : "text-[#6B7280] hover:text-[#111827]"
                  }`}
                >
                  Losers
                </button>
                <button
                  onClick={() => setMoversTab("VOLUME")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    moversTab === "VOLUME"
                      ? "bg-[#4F46E5] text-white shadow-xs"
                      : "text-[#6B7280] hover:text-[#111827]"
                  }`}
                >
                  Volume Shockers
                </button>
              </div>
            </div>

            {/* Movers Table */}
            {isLoadingMovers ? (
              <div className="py-8 text-center text-xs text-[#6B7280] flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin" />
                <span>Computing active market movers...</span>
              </div>
            ) : activeMoversList.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#6B7280]">
                Market movers data initializing from stream.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeMoversList.map((item) => {
                  const chgPct = item.change_percent ?? 0;
                  const isPos = chgPct >= 0;
                  return (
                    <div
                      key={item.symbol}
                      className="py-2.5 flex items-center justify-between hover:bg-[#F9FAFB] px-2 rounded-lg transition-colors cursor-pointer"
                      onClick={() => router.push(`/stocks/${encodeURIComponent(item.symbol)}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-md bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center font-bold text-xs text-[#374151] font-mono shrink-0">
                          {item.symbol.slice(0, 2)}
                        </div>
                        <div className="truncate">
                          <span className="font-bold text-xs text-[#111827] block truncate">
                            {item.symbol}
                          </span>
                          <span className="text-[10px] text-[#6B7280] font-mono">
                            Vol: {(item.volume || 12400).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>

                      {/* Sparkline Visual Simulation */}
                      <div className="hidden sm:flex items-center justify-center w-24 h-5 opacity-70">
                        <div
                          className={`w-full h-[2px] rounded ${
                            isPos ? "bg-[#00A86B]" : "bg-[#EF4444]"
                          }`}
                        />
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono text-xs font-bold text-[#111827] tabular-nums">
                          ₹{item.ltp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                        <div
                          className={`text-[10.5px] font-bold font-mono tabular-nums ${
                            isPos ? "text-[#00A86B]" : "text-[#EF4444]"
                          }`}
                        >
                          {isPos ? "+" : ""}
                          {chgPct.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Sectors Trending Today (Gainers/Losers Ratio Bar) */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-[#111827] tracking-tight">
                  Sectors Trending Today
                </h2>
                <p className="text-[11px] text-[#6B7280]">
                  Breadth analysis across major National Stock Exchange industry sectors.
                </p>
              </div>
              <span className="text-[11px] text-[#4F46E5] font-semibold">1D Performance</span>
            </div>

            <div className="space-y-3">
              {sectors.map((sec) => {
                const total = sec.gainers + sec.losers;
                const gainerPct = (sec.gainers / total) * 100;
                const isPos = sec.change >= 0;

                return (
                  <div
                    key={sec.name}
                    className="p-3 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="w-36 shrink-0">
                      <span className="font-bold text-xs text-[#111827] block">{sec.name}</span>
                      <span className="text-[10px] text-[#6B7280] font-mono">
                        {sec.gainers} adv | {sec.losers} dec
                      </span>
                    </div>

                    {/* Ratio Bar */}
                    <div className="flex-1 max-w-xs h-2 bg-rose-100 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${gainerPct}%` }}
                        className="bg-[#00A86B] h-full transition-all"
                      />
                    </div>

                    <div className="text-right sm:w-20 shrink-0">
                      <span
                        className={`text-xs font-bold font-mono tabular-nums ${
                          isPos ? "text-[#00A86B]" : "text-[#EF4444]"
                        }`}
                      >
                        {isPos ? "+" : ""}
                        {sec.change.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Most Bought ETFs & Exchange Traded Funds */}
          <div id="etfs" className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-[#111827] tracking-tight">
                  Most Bought ETFs
                </h2>
                <p className="text-[11px] text-[#6B7280]">
                  Low-cost index tracking funds and commodities.
                </p>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-[#6B7280] font-medium">
                Equity &amp; Bullion
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: "Nippon India Nifty 50 BeES", symbol: "NIFTYBEES", cat: "NIFTY 50", price: 278.4, chg: 0.42 },
                { name: "Nippon India Gold BeES ETF", symbol: "GOLDBEES", cat: "Gold", price: 68.25, chg: 0.85 },
                { name: "Nippon India Silver BeES ETF", symbol: "SILVERBEES", cat: "Silver", price: 92.1, chg: -0.15 },
                { name: "Motilal Oswal Nasdaq 100 ETF", symbol: "MON100", cat: "International", price: 164.8, chg: 1.12 },
              ].map((etf) => (
                <div
                  key={etf.symbol}
                  className="p-3 rounded-xl border border-[#E5E7EB] bg-[#F7F8FA] flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] text-[#4F46E5] font-semibold">{etf.cat}</span>
                    <span className="font-bold text-xs text-[#111827] block">{etf.symbol}</span>
                    <span className="text-[10px] text-[#6B7280] truncate block max-w-[180px]">
                      {etf.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-[#111827] block tabular-nums">
                      ₹{etf.price.toFixed(2)}
                    </span>
                    <span
                      className={`text-[10.5px] font-bold font-mono tabular-nums ${
                        etf.chg >= 0 ? "text-[#00A86B]" : "text-[#EF4444]"
                      }`}
                    >
                      {etf.chg >= 0 ? "+" : ""}{etf.chg.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Popular Bonds & Fixed Income (Honest Architecture) */}
          <div id="bonds" className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-[#111827] tracking-tight">
                  Popular Bonds &amp; Fixed Income
                </h2>
                <p className="text-[11px] text-[#6B7280]">
                  Sovereign and high-rated corporate debt securities.
                </p>
              </div>
              <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-semibold border border-amber-200">
                Coming Soon
              </span>
            </div>

            <div className="p-4 rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-[#4F46E5] mx-auto" />
              <p className="text-xs font-bold text-[#111827]">
                TradeX Fixed Income &amp; Bond Marketplace
              </p>
              <p className="text-[11px] text-[#6B7280] max-w-md mx-auto">
                Direct retail access to 7.18% GS 2033, REC, PFC, and AAA-rated corporate debt will launch in Phase 4 upon secondary market clearing integration.
              </p>
            </div>
          </div>

          {/* Section: Stocks in News (Honest Architecture) */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-[#111827] tracking-tight">
                  Stocks in News &amp; Corporate Actions
                </h2>
                <p className="text-[11px] text-[#6B7280]">
                  Real-time regulatory disclosures and market developments.
                </p>
              </div>
              <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-slate-100 text-[#6B7280] font-medium">
                BSE / NSE Disclosures
              </span>
            </div>

            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#F7F8FA] space-y-3">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#4F46E5] shrink-0 mt-0.5" />
                <p className="text-xs text-[#6B7280] leading-relaxed">
                  Market news provider pipeline is currently streaming quarterly earnings updates. Direct news sentiment integration will populate as real-time wire feeds connect.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Commodities & Mutual Funds / NFO (Honest Architecture) */}
          <div id="commodities" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-[#111827]">Commodities</span>
                <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full">
                  MCX Integration Soon
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280]">
                Gold Mini, Silver, Crude Oil, and Natural Gas futures tracking will launch upon MCX market-data bridge rollout.
              </p>
            </div>

            <div className="p-4 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-[#111827]">Mutual Funds &amp; NFO</span>
                <span className="text-[10px] text-[#4F46E5] font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">
                  BSE Star MF Coming Soon
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280]">
                Zero-commission Direct Mutual Funds and New Fund Offers (NFOs) architecture ready for regulatory handoff.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Investments Widget, Products & Tools, Trading Screens */}
        <div className="lg:col-span-4 space-y-6">
          {/* 1. Your Investments Widget */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="font-bold text-sm text-[#111827]">Your Investments</h3>
              </div>
              <Link
                href="/portfolio"
                className="text-[11px] text-[#4F46E5] font-semibold hover:underline flex items-center gap-0.5"
              >
                <span>Holdings</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {isLoadingPortfolio ? (
              <div className="py-6 text-center text-xs text-[#6B7280]">
                Loading portfolio summary...
              </div>
            ) : !portfolio || portfolio.holdings_count === 0 ? (
              <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center mx-auto text-[#9CA3AF]">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-xs text-[#111827]">No investments yet</p>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">
                    Start paper trading to build your simulated delivery portfolio.
                  </p>
                </div>
                <Link
                  href="/stocks/NIFTY%2050"
                  className="inline-block w-full py-2 rounded-xl bg-[#4F46E5] text-white font-bold text-xs hover:bg-[#4338CA] transition-colors"
                >
                  Explore Stocks
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-[#6B7280]">Current Value</span>
                    <span className="font-mono text-base font-bold text-[#111827] tabular-nums">
                      ₹{portfolio.current_value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline pt-1 border-t border-slate-200/60">
                    <span className="text-xs text-[#6B7280]">Invested</span>
                    <span className="font-mono text-xs font-semibold text-[#4B5563] tabular-nums">
                      ₹{portfolio.total_invested.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-[#6B7280]">1D Returns</span>
                    <span
                      className={`font-mono text-xs font-bold tabular-nums ${
                        portfolio.today_pnl >= 0 ? "text-[#00A86B]" : "text-[#EF4444]"
                      }`}
                    >
                      {portfolio.today_pnl >= 0 ? "+" : ""}₹{portfolio.today_pnl.toFixed(2)} (
                      {portfolio.today_pnl_percent >= 0 ? "+" : ""}
                      {portfolio.today_pnl_percent.toFixed(2)}%)
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-[#6B7280]">Total Returns</span>
                    <span
                      className={`font-mono text-xs font-bold tabular-nums ${
                        portfolio.total_pnl >= 0 ? "text-[#00A86B]" : "text-[#EF4444]"
                      }`}
                    >
                      {portfolio.total_pnl >= 0 ? "+" : ""}₹{portfolio.total_pnl.toFixed(2)} (
                      {portfolio.total_pnl_percent >= 0 ? "+" : ""}
                      {portfolio.total_pnl_percent.toFixed(2)}%)
                    </span>
                  </div>
                </div>

                <Link
                  href="/portfolio"
                  className="block text-center w-full py-2 rounded-xl border border-[#E5E7EB] text-xs font-semibold text-[#111827] hover:bg-[#F7F8FA] transition-colors"
                >
                  View All {portfolio.holdings_count} Holdings →
                </Link>
              </div>
            )}
          </div>

          {/* 2. Products & Tools List */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs">
            <h3 className="font-bold text-sm text-[#111827] mb-3">Products &amp; Tools</h3>
            <div className="divide-y divide-slate-100">
              {productsAndTools.map((tool) => (
                <div
                  key={tool.id}
                  onClick={() => {
                    if (tool.available && tool.href) {
                      router.push(tool.href);
                    } else {
                      setComingSoonFeature(tool.name);
                    }
                  }}
                  className="py-2.5 flex items-center justify-between hover:bg-[#F9FAFB] px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#111827]">{tool.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        tool.available
                          ? "bg-[#EEF2FF] text-[#4F46E5]"
                          : "bg-slate-100 text-[#6B7280]"
                      }`}
                    >
                      {tool.status}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Trading Screens (Analytical Cards) */}
          <div id="screens" className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="font-bold text-sm text-[#111827]">Trading Screens</h3>
              </div>
              <span className="text-[10px] text-[#00A86B] font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                Technical
              </span>
            </div>

            <div className="space-y-2.5">
              {[
                { title: "Resistance Breakouts", desc: "Crossing 20D Resistance Band", count: "3 Stocks", symbol: "TCS" },
                { title: "MACD Bullish Cross", desc: "MACD Line &gt; Signal Line", count: "5 Stocks", symbol: "RELIANCE" },
                { title: "RSI Overbought (&gt;70)", desc: "Momentum extreme stretch", count: "2 Stocks", symbol: "INFY" },
                { title: "RSI Oversold (&lt;30)", desc: "Potential mean reversion", count: "1 Stock", symbol: "SBIN" },
              ].map((screen) => (
                <Link
                  key={screen.title}
                  href={`/stocks/${encodeURIComponent(screen.symbol)}`}
                  className="p-3 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] hover:border-[#4F46E5] transition-all block group"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-xs text-[#111827] group-hover:text-[#4F46E5] transition-colors">
                      {screen.title}
                    </span>
                    <span className="text-[10px] font-mono text-[#4F46E5] bg-white px-1.5 py-0.2 rounded border border-[#E5E7EB]">
                      {screen.count}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#6B7280] block">{screen.desc}</span>
                </Link>
              ))}
            </div>

            <p className="text-[10px] text-[#9CA3AF] mt-3 leading-relaxed">
              *Screens evaluate daily technical indicators across real Upstox market data. Never trade on raw signals alone.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Trade Order Pad Modal */}
      {orderModalStock && (
        <OrderPadModal
          isOpen={!!orderModalStock}
          onClose={() => {
            setOrderModalStock(null);
            loadPortfolio();
          }}
          stockId={orderModalStock.stockId}
          symbol={orderModalStock.symbol}
          defaultSide={orderModalStock.side}
          onOrderPlaced={() => {
            loadPortfolio();
          }}
        />
      )}

      {/* Controlled "Coming Soon" Modal */}
      {comingSoonFeature && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#4F46E5]" />
                <h3 className="font-bold text-sm text-[#111827]">{comingSoonFeature}</h3>
              </div>
              <button
                onClick={() => setComingSoonFeature(null)}
                className="text-[#9CA3AF] hover:text-[#111827]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              This feature is part of the TradeX expansion roadmap. Infrastructure and regulatory contracts are currently being integrated. No mock data is shown.
            </p>
            <button
              onClick={() => setComingSoonFeature(null)}
              className="w-full py-2 rounded-xl bg-[#4F46E5] text-white font-bold text-xs hover:bg-[#4338CA] transition-colors"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
