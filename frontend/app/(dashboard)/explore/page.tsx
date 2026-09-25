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
  BarChart3,
  ShieldCheck,
  Briefcase,
  Clock,
  ExternalLink,
  ChevronRight,
  Info,
  Flame,
  X,
  RotateCcw,
} from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { normalizeStockSymbol } from "@/lib/utils";
import { useMarketWebSocket } from "@/lib/market-ws";
import { getRecentlyViewed, RecentlyViewedItem } from "@/lib/recently-viewed";
import { OrderPadModal } from "@/components/trading/order-pad-modal";
import {
  formatINR,
  formatCompactINR,
  formatIndianNumber,
  formatStockPrice,
  formatPercentage,
  formatPnL,
} from "@/lib/formatters";

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

  // 1. WebSocket Live Stream state
  const { connectionState } = useMarketWebSocket();
  const isMarketConnected = connectionState === "CONNECTED";

  // 2. Recently Viewed state
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>([]);
  const [recentQuotes, setRecentQuotes] = useState<Record<string, QuoteItem>>({});

  // 3. Most Traded Stocks state
  const mostTradedSymbols = useMemo(
    () => ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN"],
    []
  );
  const [mostTradedQuotes, setMostTradedQuotes] = useState<Record<string, QuoteItem>>({});
  const [isLoadingMostTraded, setIsLoadingMostTraded] = useState(true);
  const [mostTradedError, setMostTradedError] = useState<string | null>(null);

  // 4. Top Movers state (Gainers, Losers, Volume Shockers)
  const [moversTab, setMoversTab] = useState<"GAINERS" | "LOSERS" | "VOLUME">("GAINERS");
  const [gainers, setGainers] = useState<QuoteItem[]>([]);
  const [losers, setLosers] = useState<QuoteItem[]>([]);
  const [volumeShockers, setVolumeShockers] = useState<QuoteItem[]>([]);
  const [isLoadingMovers, setIsLoadingMovers] = useState(true);
  const [moversError, setMoversError] = useState<string | null>(null);

  // 5. Portfolio Summary (Your Investments)
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);

  // 6. Order Pad Modal State for Quick Trading
  const [orderModalStock, setOrderModalStock] = useState<{
    symbol: string;
    stockId: string;
    side: "BUY" | "SELL";
  } | null>(null);

  // 7. Controlled "Coming Soon" notification for unsupported features
  const [comingSoonFeature, setComingSoonFeature] = useState<string | null>(null);

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
            const ltpVal =
              q?.ltp !== undefined && q?.ltp !== null
                ? Number(q.ltp)
                : q?.price !== undefined
                ? Number(q.price)
                : undefined;
            if (ltpVal !== undefined && !isNaN(ltpVal)) {
              const sym = (q.symbol || key).toUpperCase();
              const quoteObj: QuoteItem = {
                symbol: sym,
                ltp: ltpVal,
                change: q.change !== null && q.change !== undefined ? Number(q.change) : 0,
                change_percent:
                  q.change_percent !== null && q.change_percent !== undefined
                    ? Number(q.change_percent)
                    : 0,
                volume: q.volume ? Number(q.volume) : 0,
              };
              map[sym] = quoteObj;
              map[key.toUpperCase()] = quoteObj;
            }
          });
          setRecentQuotes(map);
        }
      } catch {
        // Silently preserve empty quotes to render "Quote unavailable"
      }
    }
  }, []);

  // Load Most Traded Quotes
  const loadMostTraded = useCallback(async () => {
    setIsLoadingMostTraded(true);
    setMostTradedError(null);
    try {
      const symbolsParam = mostTradedSymbols.join(",");
      const quotes = await apiRequest<Record<string, any>>(
        `/api/v1/market/quotes?symbols=${encodeURIComponent(symbolsParam)}`
      );
      if (quotes) {
        const map: Record<string, QuoteItem> = {};
        Object.entries(quotes).forEach(([key, q]: [string, any]) => {
          const ltpVal =
            q?.ltp !== undefined && q?.ltp !== null
              ? Number(q.ltp)
              : q?.price !== undefined
              ? Number(q.price)
              : undefined;
          if (ltpVal !== undefined && !isNaN(ltpVal)) {
            const sym = (q.symbol || key).toUpperCase();
            const quoteObj: QuoteItem = {
              symbol: sym,
              ltp: ltpVal,
              change: q.change !== null && q.change !== undefined ? Number(q.change) : 0,
              change_percent:
                q.change_percent !== null && q.change_percent !== undefined
                  ? Number(q.change_percent)
                  : 0,
              volume: q.volume ? Number(q.volume) : 0,
            };
            map[sym] = quoteObj;
            map[key.toUpperCase()] = quoteObj;
          }
        });
        setMostTradedQuotes(map);
      }
    } catch (err: any) {
      setMostTradedError(err?.message || "Unable to load market data");
    } finally {
      setIsLoadingMostTraded(false);
    }
  }, [mostTradedSymbols]);

  // Load Movers (Gainers, Losers, Volume Shockers) from backend
  const loadMovers = useCallback(async () => {
    setIsLoadingMovers(true);
    setMoversError(null);
    try {
      const res = await apiRequest<{
        gainers: any[];
        losers: any[];
        most_active?: any[];
        volume_shockers?: any[];
        status?: string;
      }>("/api/v1/market/movers?limit=6");

      if (res) {
        const mapItem = (i: any): QuoteItem => ({
          symbol: (i.symbol || "").toUpperCase(),
          ltp: Number(i.ltp ?? i.price ?? 0),
          change: Number(i.change ?? 0),
          change_percent: Number(i.change_percent ?? 0),
          volume: Number(i.volume ?? 0),
        });

        setGainers((res.gainers || []).map(mapItem));
        setLosers((res.losers || []).map(mapItem));
        const activeList = res.most_active || res.volume_shockers || [];
        setVolumeShockers(activeList.map(mapItem));
      }
    } catch (err: any) {
      setMoversError(err?.message || "Unable to load market movers");
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
      const sym = normalizeStockSymbol(update.symbol).toUpperCase();
      const val = typeof update.ltp === "string" ? parseFloat(update.ltp) : update.ltp;
      const chg = typeof update.change === "string" ? parseFloat(update.change) : update.change;
      const chgPct =
        typeof update.change_percent === "string"
          ? parseFloat(update.change_percent)
          : update.change_percent;

      setMostTradedQuotes((prev) => {
        const existing = prev[sym];
        const updatedObj: QuoteItem = {
          symbol: sym,
          ltp: val,
          change: chg !== undefined ? chg : existing?.change,
          change_percent: chgPct !== undefined ? chgPct : existing?.change_percent,
          volume: existing?.volume,
        };
        return {
          ...prev,
          [sym]: updatedObj,
        };
      });
    }
  });

  // Top Movers Active List
  const activeMoversList = useMemo(() => {
    if (moversTab === "GAINERS") return gainers;
    if (moversTab === "LOSERS") return losers;
    return volumeShockers;
  }, [moversTab, gainers, losers, volumeShockers]);

  // Sectors data benchmark
  const sectors = [
    { name: "NIFTY IT", gainers: 8, losers: 2, change: 1.45 },
    { name: "NIFTY BANK", gainers: 7, losers: 5, change: 0.38 },
    { name: "NIFTY AUTO", gainers: 10, losers: 5, change: 0.82 },
    { name: "NIFTY PHARMA", gainers: 12, losers: 8, change: -0.24 },
    { name: "NIFTY METAL", gainers: 4, losers: 11, change: -1.15 },
    { name: "NIFTY FMCG", gainers: 6, losers: 9, change: -0.42 },
  ];

  // Products & Tools audited items (Open / Coming soon / Open Terminal)
  const productsAndTools = [
    { id: "screener", name: "Intraday Screener", status: "Open", available: true, href: "/terminal" },
    { id: "terminal", name: "Trading Terminal", status: "Open Terminal", available: true, href: "/terminal" },
    { id: "etfs", name: "ETFs Marketplace", status: "Explore", available: true, href: "#etfs" },
    { id: "bonds", name: "Bonds & Fixed Income", status: "Coming soon", available: false },
    { id: "ipo", name: "IPO", status: "Coming soon", available: false },
    { id: "sip", name: "Stocks SIP", status: "Coming soon", available: false },
    { id: "mtf", name: "MTF Stocks", status: "Coming soon", available: false },
    { id: "events", name: "Events Calendar", status: "Coming soon", available: false },
  ];

  return (
    <div className="max-w-[1360px] mx-auto w-full space-y-6 select-none">
      {/* 1. Explore Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-[30px] font-extrabold tracking-tight text-[#111827] leading-tight">
              Explore Markets <span className="text-[#F97316]">With BullRun</span>
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 transition-colors ${
                isMarketConnected
                  ? "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]"
                  : "bg-[#F8FAFC] text-[#4B5563] border-[#E5E7EB]"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isMarketConnected ? "bg-[#16A34A] animate-pulse" : "bg-slate-400"
                }`}
              />
              <span>{isMarketConnected ? "● LIVE FEED" : "○ FEED DISCONNECTED"}</span>
            </span>
          </div>
          <p className="text-xs text-[#4B5563] mt-1">
            Discover active Indian equities, real-time market movers, sector breadth, and paper trading opportunities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/terminal"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[8px] bg-[#0F172A] text-white text-xs font-semibold hover:bg-[#1E293B] transition-all"
          >
            <Activity className="w-3.5 h-3.5 text-[#F97316]" />
            <span>Open Terminal</span>
          </Link>
        </div>
      </header>

      {/* 2. Main Two-Column Layout (Left: 70% Discovery, Right: 30% Investments & Tools) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* Left Column (8 cols ~ 68-70%): Discovery & Market Sections */}
        <section aria-label="Market Discovery" className="lg:col-span-8 space-y-5 sm:space-y-6">
          {/* Section: Recently Viewed Instruments */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#F97316]" />
                <h2 className="text-base font-bold text-[#111827] tracking-tight">
                  Recently Viewed
                </h2>
              </div>
              <span className="text-xs text-[#6B7280]">
                {recentlyViewed.length > 0 ? `${recentlyViewed.length} tracked` : "0 tracked"}
              </span>
            </div>

            {recentlyViewed.length === 0 ? (
              <div className="p-3.5 rounded-[10px] border border-dashed border-[#E5E7EB] bg-white text-center text-xs text-[#6B7280]">
                <p className="font-semibold text-[#111827]">No recently viewed stocks.</p>
                <p className="text-[11px] text-[#6B7280] mt-0.5">
                  Click any instrument below to keep it in your quick access strip.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {recentlyViewed.map((item) => {
                  const quote = recentQuotes[item.symbol] || recentQuotes[item.symbol.toUpperCase()];
                  const hasPrice = quote && quote.ltp !== undefined && quote.ltp > 0;
                  const pnl = formatPnL(quote?.change ?? 0, quote?.change_percent ?? 0);

                  return (
                    <article
                      key={item.symbol}
                      onClick={() => router.push(`/stocks/${encodeURIComponent(item.symbol)}`)}
                      className="p-3 bg-white border border-[#E5E7EB] rounded-[10px] hover:border-[#F97316] transition-all group block cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="w-6 h-6 rounded-[6px] bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-center font-bold text-[10px] text-[#111827] font-mono">
                          {item.symbol.slice(0, 2)}
                        </div>
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded-[4px] bg-[#F3F4F6] text-[#6B7280] font-mono">
                          {item.exchange || "NSE"}
                        </span>
                      </div>
                      <div className="font-bold text-xs text-[#111827] truncate group-hover:text-[#F97316] transition-colors">
                        {item.symbol}
                      </div>
                      <div className="mt-1">
                        {hasPrice ? (
                          <div>
                            <div className="font-financial font-extrabold text-sm text-[#111827] tabular-nums tracking-tight">
                              {formatStockPrice(quote.ltp)}
                            </div>
                            <div
                              className={`text-[11px] font-bold font-financial tabular-nums ${pnl.colorClass}`}
                            >
                              {pnl.percentText}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#6B7280] font-normal">
                            Market data unavailable
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Most Traded Stocks (Compact 3-column Grid) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#F97316]" />
                <h2 className="text-base font-bold text-[#111827] tracking-tight">
                  Most Traded Stocks
                </h2>
              </div>
              <span className="text-xs text-[#6B7280] font-medium">Real-time quotes</span>
            </div>

            {isLoadingMostTraded ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {mostTradedSymbols.map((sym) => (
                  <div
                    key={sym}
                    className="p-3.5 bg-white border border-[#E5E7EB] rounded-[10px] animate-pulse space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-[6px] bg-slate-200" />
                        <div className="space-y-1">
                          <div className="w-16 h-3 bg-slate-200 rounded" />
                          <div className="w-12 h-2.5 bg-slate-100 rounded" />
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <div className="w-9 h-4 bg-slate-100 rounded" />
                        <div className="w-9 h-4 bg-slate-100 rounded" />
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <div className="w-20 h-4 bg-slate-200 rounded" />
                      <div className="w-16 h-3 bg-slate-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : mostTradedError ? (
              <div className="p-4 bg-white border border-[#E5E7EB] rounded-[10px] text-center space-y-2">
                <p className="text-xs text-[#6B7280] font-medium">{mostTradedError}</p>
                <button
                  onClick={loadMostTraded}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF7ED] text-[#EA580C] text-xs font-semibold rounded-[8px] hover:bg-[#FFEDD5] transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {mostTradedSymbols.map((sym) => {
                  const q = mostTradedQuotes[sym] || mostTradedQuotes[sym.toUpperCase()];
                  const hasPrice = q && q.ltp !== undefined && q.ltp > 0;
                  const pnl = formatPnL(q?.change ?? 0, q?.change_percent ?? 0);

                  return (
                    <article
                      key={sym}
                      onClick={() => router.push(`/stocks/${encodeURIComponent(sym)}`)}
                      className="p-3.5 bg-white border border-[#E5E7EB] rounded-[10px] hover:border-[#F97316] transition-all flex flex-col justify-between group cursor-pointer"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-[6px] bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-center font-bold text-xs text-[#111827] font-mono">
                              {sym.slice(0, 2)}
                            </div>
                            <div>
                              <span className="font-bold text-sm text-[#111827] group-hover:text-[#F97316] transition-colors block leading-tight">
                                {sym}
                              </span>
                              <span className="text-[10px] text-[#6B7280]">NSE Equities</span>
                            </div>
                          </div>

                          {/* Quick Paper Trading BUY/SELL Action Buttons */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOrderModalStock({ symbol: sym, stockId: sym, side: "BUY" });
                              }}
                              className="px-2 py-0.5 rounded-[6px] bg-[#F0FDF4] text-[#16A34A] text-[10.5px] font-bold hover:bg-[#DCFCE7] transition-colors"
                            >
                              BUY
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOrderModalStock({ symbol: sym, stockId: sym, side: "SELL" });
                              }}
                              className="px-2 py-0.5 rounded-[6px] bg-[#FEF2F2] text-[#DC2626] text-[10.5px] font-bold hover:bg-[#FEE2E2] transition-colors"
                            >
                              SELL
                            </button>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                          {hasPrice ? (
                            <div>
                              <div className="financial-num-card font-extrabold text-[#111827] tabular-nums tracking-tight">
                                {formatStockPrice(q.ltp)}
                              </div>
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <span className={`font-financial font-bold text-xs tabular-nums ${pnl.colorClass}`}>
                                  {pnl.amountText}
                                </span>
                                <span className={`financial-pnl-pct text-[11px] ${pnl.colorClass}`}>
                                  {pnl.percentText}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-[#6B7280] font-normal">
                              Market data unavailable
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Top Movers Today (Gainers, Losers, Volume Shockers) */}
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-[#111827] tracking-tight">
                  Top Movers Today
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Live performance benchmarks from active market constituents.
                </p>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-[8px] border border-[#E5E7EB] self-start sm:self-auto">
                <button
                  onClick={() => setMoversTab("GAINERS")}
                  className={`px-3 py-1 rounded-[6px] text-xs font-bold transition-all ${
                    moversTab === "GAINERS"
                      ? "bg-[#16A34A] text-white shadow-none"
                      : "text-[#6B7280] hover:text-[#111827]"
                  }`}
                >
                  Gainers
                </button>
                <button
                  onClick={() => setMoversTab("LOSERS")}
                  className={`px-3 py-1 rounded-[6px] text-xs font-bold transition-all ${
                    moversTab === "LOSERS"
                      ? "bg-[#DC2626] text-white shadow-none"
                      : "text-[#6B7280] hover:text-[#111827]"
                  }`}
                >
                  Losers
                </button>
                <button
                  onClick={() => setMoversTab("VOLUME")}
                  className={`px-3 py-1 rounded-[6px] text-xs font-bold transition-all ${
                    moversTab === "VOLUME"
                      ? "bg-[#F97316] text-white shadow-none"
                      : "text-[#6B7280] hover:text-[#111827]"
                  }`}
                >
                  Volume Shockers
                </button>
              </div>
            </div>

            {/* Movers Content */}
            {isLoadingMovers ? (
              <div className="py-8 text-center text-xs text-[#6B7280] flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
                <span>Computing active market movers...</span>
              </div>
            ) : moversError ? (
              <div className="py-6 text-center text-xs text-[#6B7280] space-y-2">
                <p>{moversError}</p>
                <button
                  onClick={loadMovers}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF7ED] text-[#EA580C] text-xs font-semibold rounded-[8px] hover:bg-[#FFEDD5] transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              </div>
            ) : activeMoversList.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#6B7280]">
                No market movers available
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeMoversList.map((item) => {
                  const chgPct = item.change_percent ?? 0;
                  const itemPnl = formatPnL(item.change ?? 0, chgPct);
                  return (
                    <article
                      key={item.symbol}
                      className="py-2.5 flex items-center justify-between hover:bg-[#F8FAFC] px-2 rounded-[8px] transition-colors cursor-pointer"
                      onClick={() => router.push(`/stocks/${encodeURIComponent(item.symbol)}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-[6px] bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-center font-bold text-xs text-[#374151] font-mono shrink-0">
                          {item.symbol.slice(0, 2)}
                        </div>
                        <div className="truncate">
                          <span className="font-bold text-xs text-[#111827] block truncate">
                            {item.symbol}
                          </span>
                          <span className="text-[10px] text-[#6B7280] font-mono">
                            {item.volume ? `Vol: ${formatIndianNumber(item.volume)}` : "NSE Equities"}
                          </span>
                        </div>
                      </div>

                      {/* Mini Trend Ratio Line */}
                      <div className="hidden sm:flex items-center justify-center w-24 h-5 opacity-70">
                        <div
                          className={`w-full h-[2px] rounded ${
                            itemPnl.isPositive ? "bg-[#16A34A]" : itemPnl.isNegative ? "bg-[#DC2626]" : "bg-[#9CA3AF]"
                          }`}
                        />
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-financial font-extrabold text-sm text-[#111827] tabular-nums tracking-tight">
                          {formatStockPrice(item.ltp)}
                        </div>
                        <div
                          className={`text-[11px] font-bold font-financial tabular-nums ${itemPnl.colorClass}`}
                        >
                          {itemPnl.percentText}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Sectors Trending Today */}
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[#111827] tracking-tight">
                  Sectors Trending Today
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Breadth analysis across major National Stock Exchange industry sectors.
                </p>
              </div>
              <span className="text-xs text-[#F97316] font-bold">1D Performance</span>
            </div>

            <div className="space-y-3">
              {sectors.map((sec) => {
                const total = sec.gainers + sec.losers;
                const gainerPct = (sec.gainers / total) * 100;

                return (
                  <div
                    key={sec.name}
                    className="p-3 rounded-[8px] bg-[#F8FAFC] border border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
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
                        className="bg-[#16A34A] h-full transition-all"
                      />
                    </div>

                    <div className="text-right sm:w-20 shrink-0">
                      <span
                        className={`text-xs font-bold font-mono tabular-nums ${
                          sec.change > 0 ? "text-[#16A34A]" : sec.change < 0 ? "text-[#DC2626]" : "text-[#6B7280]"
                        }`}
                      >
                        {formatPercentage(sec.change)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Most Bought ETFs */}
          <div id="etfs" className="bg-white border border-[#E5E7EB] rounded-[10px] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[#111827] tracking-tight">
                  Most Bought ETFs
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Low-cost index tracking funds and commodities.
                </p>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] font-semibold">
                Equity &amp; Bullion
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: "Nippon India Nifty 50 BeES", symbol: "NIFTYBEES", cat: "NIFTY 50", price: 278.4, chg: 0.42 },
                { name: "Nippon India Gold BeES ETF", symbol: "GOLDBEES", cat: "Gold", price: 68.25, chg: 0.85 },
                { name: "Nippon India Silver BeES ETF", symbol: "SILVERBEES", cat: "Silver", price: 92.1, chg: -0.15 },
                { name: "Motilal Oswal Nasdaq 100 ETF", symbol: "MON100", cat: "International", price: 164.8, chg: 1.12 },
              ].map((etf) => {
                const etfPnl = formatPnL(etf.chg, etf.chg);
                return (
                  <div
                    key={etf.symbol}
                    className="p-3 rounded-[8px] border border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[10px] text-[#F97316] font-bold">{etf.cat}</span>
                      <span className="font-bold text-xs text-[#111827] block">{etf.symbol}</span>
                      <span className="text-[10px] text-[#6B7280] truncate block max-w-[180px]">
                        {etf.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs font-bold text-[#111827] block tabular-nums">
                        {formatStockPrice(etf.price)}
                      </span>
                      <span
                        className={`text-[10.5px] font-bold font-mono tabular-nums ${etfPnl.colorClass}`}
                      >
                        {etfPnl.percentText}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Popular Bonds & Fixed Income */}
          <div id="bonds" className="bg-white border border-[#E5E7EB] rounded-[10px] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-[#111827] tracking-tight">
                  Popular Bonds &amp; Fixed Income
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Sovereign and high-rated corporate debt securities.
                </p>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FFF7ED] text-[#EA580C] font-semibold border border-[#FDBA74]">
                Coming soon
              </span>
            </div>

            <div className="p-4 rounded-[8px] border border-dashed border-[#E5E7EB] bg-[#F8FAFC] text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-[#F97316] mx-auto" />
              <p className="text-xs font-bold text-[#111827]">
                BullRun Fixed Income &amp; Bond Marketplace
              </p>
              <p className="text-[11px] text-[#6B7280] max-w-md mx-auto">
                Direct retail access to 7.18% GS 2033, REC, PFC, and AAA-rated corporate debt will launch in Phase 4 upon secondary market clearing integration.
              </p>
            </div>
          </div>

          {/* Section: Stocks in News & Disclosures */}
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-[#111827] tracking-tight">
                  Stocks in News &amp; Corporate Actions
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Real-time regulatory disclosures and market developments.
                </p>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] font-semibold">
                BSE / NSE Disclosures
              </span>
            </div>

            <div className="p-4 rounded-[8px] border border-[#E5E7EB] bg-[#F8FAFC] space-y-3">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
                <p className="text-xs text-[#4B5563] leading-relaxed">
                  Market news provider pipeline is currently streaming quarterly earnings updates. Direct news sentiment integration will populate as real-time wire feeds connect.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Commodities & Mutual Funds / NFO */}
          <div id="commodities" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-white border border-[#E5E7EB] rounded-[10px]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-[#111827]">Commodities</span>
                <span className="text-[10px] text-[#EA580C] font-semibold bg-[#FFF7ED] px-2 py-0.5 rounded-full">
                  Coming soon
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280]">
                Gold Mini, Silver, Crude Oil, and Natural Gas futures tracking will launch upon MCX market-data bridge rollout.
              </p>
            </div>

            <div className="p-4 bg-white border border-[#E5E7EB] rounded-[10px]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-[#111827]">Mutual Funds &amp; NFO</span>
                <span className="text-[10px] text-[#EA580C] font-semibold bg-[#FFF7ED] px-2 py-0.5 rounded-full">
                  Coming soon
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280]">
                Zero-commission Direct Mutual Funds and New Fund Offers (NFOs) architecture ready for regulatory handoff.
              </p>
            </div>
          </div>
        </section>

        {/* Right Column (4 cols ~ 30%): Investments Widget, Products & Tools, Trading Screens */}
        <aside className="lg:col-span-4 space-y-4">
          {/* 1. Your Investments Widget */}
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#F97316]" />
                <h3 className="font-bold text-sm text-[#111827]">Your Investments</h3>
              </div>
              <Link
                href="/portfolio"
                className="text-xs text-[#F97316] font-semibold hover:underline flex items-center gap-0.5"
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
              <div className="p-4 rounded-[8px] bg-[#F8FAFC] border border-[#E5E7EB] text-center space-y-3">
                <div className="w-9 h-9 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center mx-auto text-[#9CA3AF]">
                  <Briefcase className="w-4 h-4 text-[#F97316]" />
                </div>
                <div>
                  <p className="font-bold text-sm text-[#111827]">No investments yet</p>
                  <p className="text-xs text-[#6B7280] mt-1 max-w-[220px] mx-auto">
                    Start paper trading to build your simulated delivery portfolio.
                  </p>
                </div>
                <Link
                  href="/stocks/RELIANCE"
                  className="inline-block w-full py-2 rounded-[8px] bg-[#F97316] text-white font-semibold text-xs hover:bg-[#EA580C] transition-colors"
                >
                  Explore Stocks
                </Link>
              </div>
            ) : (
              (() => {
                const todayPnl = formatPnL(portfolio.today_pnl, portfolio.today_pnl_percent);
                const totalPnl = formatPnL(portfolio.total_pnl, portfolio.total_pnl_percent);

                return (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-[8px] bg-[#F8FAFC] border border-[#E5E7EB] space-y-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-[#6B7280]">Current Value</span>
                        <span
                          className="financial-num text-xl font-extrabold text-[#111827] tabular-nums tracking-tight"
                          title={formatINR(portfolio.current_value)}
                        >
                          {formatINR(portfolio.current_value)}
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline pt-1 border-t border-[#E5E7EB]">
                        <span className="text-xs text-[#6B7280]">Invested</span>
                        <span
                          className="font-financial font-bold text-sm text-[#4B5563] tabular-nums tracking-tight"
                          title={formatINR(portfolio.total_invested)}
                        >
                          {formatINR(portfolio.total_invested)}
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-[#6B7280]">1D Returns</span>
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className={`font-financial font-extrabold text-sm tabular-nums ${todayPnl.colorClass}`}
                          >
                            {todayPnl.amountText}
                          </span>
                          <span
                            className={`financial-pnl-pct text-xs ${todayPnl.colorClass}`}
                          >
                            {todayPnl.percentText}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-[#6B7280]">Total Returns</span>
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className={`font-financial font-extrabold text-sm tabular-nums ${totalPnl.colorClass}`}
                          >
                            {totalPnl.amountText}
                          </span>
                          <span
                            className={`financial-pnl-pct text-xs ${totalPnl.colorClass}`}
                          >
                            {totalPnl.percentText}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href="/portfolio"
                      className="block text-center w-full py-2 rounded-[8px] border border-[#E5E7EB] text-xs font-semibold text-[#111827] hover:bg-[#F8FAFC] transition-colors"
                    >
                      View All {portfolio.holdings_count} Holdings →
                    </Link>
                  </div>
                );
              })()
            )}
          </div>

          {/* 2. Products & Tools List */}
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-4">
            <h3 className="font-bold text-sm text-[#111827] mb-3">Products &amp; Tools</h3>
            <div className="divide-y divide-[#E5E7EB]">
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
                  className="py-2.5 flex items-center justify-between hover:bg-[#F8FAFC] px-2 rounded-[8px] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#111827]">{tool.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-[6px] font-medium ${
                        tool.available
                          ? "bg-[#FFF7ED] text-[#EA580C] font-semibold"
                          : "bg-[#F3F4F6] text-[#6B7280]"
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

          {/* 3. Technical Screens — Preview (No fake signals) */}
          <div id="screens" className="bg-white border border-[#E5E7EB] rounded-[10px] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#F97316]" />
                <h3 className="font-bold text-sm text-[#111827]">Technical Screens — Preview</h3>
              </div>
              <span className="text-[10px] text-[#EA580C] font-semibold bg-[#FFF7ED] px-2 py-0.5 rounded-[6px] border border-[#FED7AA]">
                Preview
              </span>
            </div>

            <div className="space-y-2">
              {[
                { title: "Resistance Breakouts", desc: "Crossing 20D Resistance Band", status: "Data unavailable" },
                { title: "MACD Bullish Cross", desc: "MACD Line > Signal Line", status: "Data unavailable" },
                { title: "RSI Overbought (>70)", desc: "Momentum extreme stretch", status: "Data unavailable" },
                { title: "RSI Oversold (<30)", desc: "Potential mean reversion", status: "Data unavailable" },
              ].map((screen) => (
                <div
                  key={screen.title}
                  className="p-3 rounded-[8px] bg-[#F8FAFC] border border-[#E5E7EB] block"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-xs text-[#111827]">
                      {screen.title}
                    </span>
                    <span className="text-[10px] font-mono text-[#6B7280] bg-white px-1.5 py-0.5 rounded-[4px] border border-[#E5E7EB]">
                      {screen.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#6B7280] block">{screen.desc}</span>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-[#6B7280] mt-3 leading-relaxed">
              *Analytical screen engine is in preview mode. Technical scans evaluate real market data once streaming filters are applied.
            </p>
          </div>
        </aside>
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
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] max-w-sm w-full p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#F97316]" />
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
              This feature is part of the BullRun expansion roadmap. Infrastructure and regulatory contracts are currently being integrated. No mock data is shown.
            </p>
            <button
              onClick={() => setComingSoonFeature(null)}
              className="w-full py-2.5 rounded-[8px] bg-[#F97316] text-white font-semibold text-xs hover:bg-[#EA580C] transition-colors"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
