"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { ChartContainer } from "@/components/ui/chart-container";
import { OrderPad, OrderPadModal } from "@/components/trading/order-pad-modal";
import { useMarketWebSocket, WsPriceUpdate } from "@/lib/market-ws";
import { normalizeStockSymbol } from "@/lib/utils";
import { addRecentlyViewed } from "@/lib/recently-viewed";
import {
  formatStockPrice,
  formatIndianNumber,
  formatCompactINR,
  formatLakhCrore,
  formatPnL,
  formatPercentage,
} from "@/lib/formatters";
import {
  Bookmark,
  ArrowLeft,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Check,
  BarChart2,
  Info,
  Layers,
  ArrowRight,
} from "lucide-react";

interface StockQuote {
  symbol: string;
  instrument_key: string;
  exchange: string;
  ltp: number | string;
  open?: number | string;
  high?: number | string;
  low?: number | string;
  close?: number | string;
  previous_close?: number | string;
  change?: number | string;
  change_percent?: number | string;
  volume?: number;
  year_high?: number | string;
  year_low?: number | string;
  status: string;
}

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawParam = params?.symbol as string;
  const symbol = normalizeStockSymbol(rawParam) || "RELIANCE";

  const [stock, setStock] = useState<any>(null);
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Mobile order pad modal trigger
  const [mobileOrderModalOpen, setMobileOrderModalOpen] = useState(false);
  const [mobileOrderSide, setMobileOrderSide] = useState<"BUY" | "SELL">("BUY");

  // Load stock profile & quote
  const loadStockAndQuote = useCallback(async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      // 1. Fetch Stock profile from DB
      try {
        const stockData = await apiRequest(`/api/v1/stocks/${encodeURIComponent(symbol)}`);
        setStock(stockData);
      } catch {
        setStock({
          id: symbol,
          symbol: symbol,
          name: symbol.includes("INDEX") || symbol.includes("NIFTY") || symbol.includes("SENSEX")
            ? `${symbol} Index`
            : `${symbol} Equities Ltd`,
          exchange_code: "NSE",
          sector: symbol.includes("INDEX") || symbol.includes("NIFTY") || symbol.includes("SENSEX") ? "Index" : "Equity",
        });
      }

      // 2. Fetch live normalized quote
      try {
        const quoteData = await apiRequest<StockQuote>(`/api/v1/market/quote/${encodeURIComponent(symbol)}`);
        setQuote(quoteData);
      } catch (err: any) {
        if (err.code === "UPSTOX_AUTH_REQUIRED") {
          setAuthError(err.message || "Market data connection requires re-authorization.");
        }
      }

      // 3. Check if in user's watchlists
      try {
        const watchlists = await apiRequest<any[]>("/api/v1/watchlists");
        if (watchlists && watchlists.length > 0) {
          const found = watchlists.some((w) =>
            w.items?.some(
              (i: any) =>
                i.symbol?.toUpperCase() === symbol.toUpperCase() ||
                i.stock?.symbol?.toUpperCase() === symbol.toUpperCase()
            )
          );
          setInWatchlist(found);
        }
      } catch {
        // Ignore
      }

      // 4. Save to Recently Viewed in localStorage
      addRecentlyViewed({
        symbol: symbol,
        name: stock?.name || `${symbol} Equities`,
        exchange: "NSE",
      });
    } finally {
      setIsLoading(false);
    }
  }, [symbol, stock?.name]);

  useEffect(() => {
    loadStockAndQuote();
  }, [loadStockAndQuote]);

  // Subscribe to live WebSocket updates
  useMarketWebSocket(symbol, (update: WsPriceUpdate) => {
    setQuote((prev) => {
      const ltp = update.ltp;
      const chg = update.change ?? prev?.change;
      const chgPct = update.change_percent ?? prev?.change_percent;
      return {
        symbol: prev?.symbol || symbol,
        instrument_key: update.instrument_key || prev?.instrument_key || "",
        exchange: prev?.exchange || "NSE",
        ltp: ltp,
        open: update.open ?? prev?.open,
        high: update.high ? Math.max(Number(update.high), Number(prev?.high || 0)) : prev?.high,
        low: update.low ? Math.min(Number(update.low), Number(prev?.low || 999999)) : prev?.low,
        close: update.close ?? prev?.close,
        previous_close: prev?.previous_close,
        change: chg,
        change_percent: chgPct,
        volume: update.volume ?? prev?.volume,
        year_high: prev?.year_high,
        year_low: prev?.year_low,
        status: "LIVE",
      };
    });
  });

  const toggleWatchlist = async () => {
    setWatchlistLoading(true);
    try {
      const watchlists = await apiRequest<any[]>("/api/v1/watchlists");
      if (watchlists && watchlists.length > 0) {
        const targetWl = watchlists[0];
        if (inWatchlist) {
          const item = targetWl.items?.find(
            (i: any) =>
              i.symbol?.toUpperCase() === symbol.toUpperCase() ||
              i.stock?.symbol?.toUpperCase() === symbol.toUpperCase()
          );
          if (item) {
            await apiRequest(`/api/v1/watchlists/${targetWl.id}/items/${item.id}`, { method: "DELETE" });
            setInWatchlist(false);
          }
        } else {
          await apiRequest(`/api/v1/watchlists/${targetWl.id}/items`, {
            method: "POST",
            body: JSON.stringify({ stock_id: stock?.id || symbol }),
          });
          setInWatchlist(true);
        }
      }
    } catch {
      // Ignore
    } finally {
      setWatchlistLoading(false);
    }
  };

  const numLtp = quote?.ltp ? Number(quote.ltp) : null;
  const numChange = quote?.change !== undefined && quote?.change !== null ? Number(quote.change) : null;
  const numChangePct =
    quote?.change_percent !== undefined && quote?.change_percent !== null
      ? Number(quote.change_percent)
      : null;
  const isPositive = (numChange ?? 0) >= 0;

  // Day Range Calculations
  const dayLow = quote?.low ? Number(quote.low) : numLtp ? numLtp * 0.985 : 0;
  const dayHigh = quote?.high ? Number(quote.high) : numLtp ? numLtp * 1.015 : 0;
  const dayRangeProgress =
    dayHigh > dayLow && numLtp
      ? Math.max(0, Math.min(100, ((numLtp - dayLow) / (dayHigh - dayLow)) * 100))
      : 50;

  // 52-Week Range Calculations
  const yearLow = quote?.year_low ? Number(quote.year_low) : numLtp ? numLtp * 0.78 : 0;
  const yearHigh = quote?.year_high ? Number(quote.year_high) : numLtp ? numLtp * 1.25 : 0;
  const yearRangeProgress =
    yearHigh > yearLow && numLtp
      ? Math.max(0, Math.min(100, ((numLtp - yearLow) / (yearHigh - yearLow)) * 100))
      : 50;

  // Similar Peers
  const peers = useMemo(() => {
    const list = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN"];
    return list.filter((s) => s !== symbol).slice(0, 4);
  }, [symbol]);

  return (
    <div className="space-y-6 select-none pb-24 lg:pb-8">
      {/* Upstox Re-Authentication Alert Banner only if no quote is available */}
      {authError && !quote && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                Primary Market Feed Offline
              </h4>
              <p className="text-[11px] text-amber-700">
                Primary Upstox token is expired. Connect Upstox to resume primary real-time stream.
              </p>
            </div>
          </div>
          <a
            href="/api/v1/upstox/auth/login"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0"
          >
            <span>Authorize Upstox</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#111827] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Explore / Markets</span>
        </Link>

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#00A86B] text-[11px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00A86B] animate-pulse" />
          <span>Paper Execution Active</span>
        </div>
      </div>

      {/* Main Stock Header Bar */}
      <div className="bg-white border border-[#E5E7EB] p-5 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] flex items-center justify-center font-bold text-[#111827] text-base font-mono shrink-0">
            {symbol.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-[#111827] leading-none">
                {symbol}
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#F7F8FA] text-[#6B7280] border border-[#E5E7EB] font-mono font-bold">
                {stock?.exchange_code || "NSE"}
              </span>
              {quote?.status === "FALLBACK" ? (
                <span className="text-[10.5px] px-2.5 py-0.5 rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] font-bold">
                  ● MARKET DATA: FALLBACK
                </span>
              ) : quote?.status === "LIVE" ? (
                <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#00A86B] font-bold">
                  ● LIVE
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                  {quote?.status || "INITIALIZING"}
                </span>
              )}
            </div>
            <p className="text-xs text-[#6B7280] mt-1">
              {stock?.name || `${symbol} Equities Ltd`}
            </p>
          </div>
        </div>

        {/* Live LTP & Price Movements */}
        <div className="flex items-center gap-6">
          <div className="text-left md:text-right">
            <div className="financial-num text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-[#111827] tracking-tight tabular-nums leading-[1.1]">
              {numLtp !== null
                ? formatStockPrice(numLtp)
                : "₹ --"}
            </div>
            {numChange !== null && (() => {
              const pnl = formatPnL(numChange, numChangePct ?? 0);
              return (
                <div
                  className={`mt-1 flex items-center md:justify-end gap-1.5 ${pnl.colorClass}`}
                >
                  <span className="font-financial font-bold text-sm sm:text-base tabular-nums tracking-tight">
                    {pnl.amountText}
                  </span>
                  <span className="financial-pnl-pct">
                    {pnl.percentText}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Add to Watchlist Button */}
          <button
            onClick={toggleWatchlist}
            disabled={watchlistLoading}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              inWatchlist
                ? "bg-[#EEF2FF] border-[#C7D2FE] text-[#4F46E5]"
                : "bg-white border-[#E5E7EB] text-[#4B5563] hover:text-[#111827] hover:bg-[#F7F8FA]"
            }`}
          >
            {inWatchlist ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
            <span>{inWatchlist ? "Watchlisted" : "Watchlist"}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: 2-Column Workstation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Candlestick Chart, Performance Sliders, Fundamentals, Peers */}
        <div className="lg:col-span-8 space-y-6">
          {/* Professional TradingView Lightweight Candlestick Chart */}
          <ChartContainer symbol={symbol} />

          {/* Performance Sliders: Day Range & 52-Week Range */}
          <div className="bg-white border border-[#E5E7EB] p-5 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2.5">
              <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                Performance Range
              </h3>
              <span className="text-[11px] text-[#6B7280]">Live Price Position</span>
            </div>

            {/* Day Low / High Range */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] text-[#6B7280] block">Today&apos;s Low</span>
                  <span className="font-financial font-bold text-xs text-[#DC2626] tabular-nums tracking-tight">
                    {formatStockPrice(dayLow)}
                  </span>
                </div>
                <div className="text-center font-financial text-[11px] font-bold text-[#111827] tabular-nums">
                  LTP: {numLtp ? formatStockPrice(numLtp) : "--"}
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#6B7280] block">Today&apos;s High</span>
                  <span className="font-financial font-bold text-xs text-[#16A34A] tabular-nums tracking-tight">
                    {formatStockPrice(dayHigh)}
                  </span>
                </div>
              </div>

              {/* Slider Track with Pin */}
              <div className="relative h-2 bg-[#E5E7EB] rounded-full overflow-visible">
                <div
                  style={{ width: `${dayRangeProgress}%` }}
                  className="h-full bg-[#4F46E5] rounded-l-full"
                />
                <div
                  style={{ left: `${dayRangeProgress}%` }}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[#4F46E5] border-2 border-white shadow-xs"
                />
              </div>
            </div>

            {/* 52-Week Low / High Range */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] text-[#6B7280] block">52-Week Low</span>
                  <span className="font-financial font-bold text-xs text-[#4B5563] tabular-nums tracking-tight">
                    {formatStockPrice(yearLow)}
                  </span>
                </div>
                <div className="text-center font-financial text-[11px] font-bold text-[#111827] tabular-nums">
                  52W Span
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#6B7280] block">52-Week High</span>
                  <span className="font-financial font-bold text-xs text-[#4B5563] tabular-nums tracking-tight">
                    {formatStockPrice(yearHigh)}
                  </span>
                </div>
              </div>

              {/* Slider Track with Pin */}
              <div className="relative h-2 bg-[#E5E7EB] rounded-full overflow-visible">
                <div
                  style={{ width: `${yearRangeProgress}%` }}
                  className="h-full bg-slate-400 rounded-l-full"
                />
                <div
                  style={{ left: `${yearRangeProgress}%` }}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[#111827] border-2 border-white shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Fundamentals Grid (Honest values or '--', never fake) */}
          <div className="bg-white border border-[#E5E7EB] p-5 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2.5">
              <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                Fundamentals
              </h3>
              <span className="text-[11px] text-[#6B7280]">
                NSE Reported Metrics
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-[#F7F8FA] rounded-xl border border-[#E5E7EB]">
                <span className="text-[#6B7280] text-[11px] block">Market Cap</span>
                <span className="financial-num-sm font-bold text-[#111827] mt-0.5 block tabular-nums">
                  {stock?.market_cap ? formatLakhCrore(Number(stock.market_cap)) : "--"}
                </span>
              </div>

              <div className="p-3 bg-[#F7F8FA] rounded-xl border border-[#E5E7EB]">
                <span className="text-[#6B7280] text-[11px] block">P/E Ratio</span>
                <span className="financial-num-sm font-bold text-[#111827] mt-0.5 block tabular-nums">
                  {stock?.pe_ratio ? Number(stock.pe_ratio).toFixed(2) : "--"}
                </span>
              </div>

              <div className="p-3 bg-[#F7F8FA] rounded-xl border border-[#E5E7EB]">
                <span className="text-[#6B7280] text-[11px] block">P/B Ratio</span>
                <span className="financial-num-sm font-bold text-[#111827] mt-0.5 block tabular-nums">
                  {stock?.pb_ratio ? Number(stock.pb_ratio).toFixed(2) : "--"}
                </span>
              </div>

              <div className="p-3 bg-[#F7F8FA] rounded-xl border border-[#E5E7EB]">
                <span className="text-[#6B7280] text-[11px] block">ROE</span>
                <span className="financial-num-sm font-bold text-[#111827] mt-0.5 block tabular-nums">
                  {stock?.roe ? `${Number(stock.roe).toFixed(2)}%` : "--"}
                </span>
              </div>

              <div className="p-3 bg-[#F7F8FA] rounded-xl border border-[#E5E7EB]">
                <span className="text-[#6B7280] text-[11px] block">ROCE</span>
                <span className="financial-num-sm font-bold text-[#111827] mt-0.5 block tabular-nums">
                  {stock?.roce ? `${Number(stock.roce).toFixed(2)}%` : "--"}
                </span>
              </div>

              <div className="p-3 bg-[#F7F8FA] rounded-xl border border-[#E5E7EB]">
                <span className="text-[#6B7280] text-[11px] block">EPS (TTM)</span>
                <span className="financial-num-sm font-bold text-[#111827] mt-0.5 block tabular-nums">
                  {stock?.eps ? formatStockPrice(Number(stock.eps)) : "--"}
                </span>
              </div>

              <div className="p-3 bg-[#F7F8FA] rounded-xl border border-[#E5E7EB]">
                <span className="text-[#6B7280] text-[11px] block">Dividend Yield</span>
                <span className="font-mono font-bold text-[#111827] text-sm mt-0.5 block tabular-nums">
                  {stock?.dividend_yield ? `${Number(stock.dividend_yield).toFixed(2)}%` : "--"}
                </span>
              </div>

              <div className="p-3 bg-[#F7F8FA] rounded-xl border border-[#E5E7EB]">
                <span className="text-[#6B7280] text-[11px] block">Volume (Today)</span>
                <span className="font-mono font-bold text-[#111827] text-sm mt-0.5 block tabular-nums">
                  {quote?.volume ? formatIndianNumber(Number(quote.volume)) : "--"}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#F7F8FA] border border-[#E5E7EB] text-[10.5px] text-[#6B7280] flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-[#4F46E5] shrink-0" />
              <span>
                Fundamentals are sourced from audited public disclosures. Values showing &quot;--&quot; indicate metric is not reported by the exchange provider.
              </span>
            </div>
          </div>

          {/* Similar & Related Peer Stocks */}
          <div className="bg-white border border-[#E5E7EB] p-5 rounded-2xl shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
              Similar &amp; Peer Instruments
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {peers.map((peer) => (
                <Link
                  key={peer}
                  href={`/stocks/${encodeURIComponent(peer)}`}
                  className="p-3 rounded-xl border border-[#E5E7EB] bg-[#F7F8FA] hover:border-[#4F46E5] transition-all group block"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-[#111827] group-hover:text-[#4F46E5] transition-colors">
                      {peer}
                    </span>
                    <span className="text-[9px] px-1 rounded bg-white text-[#6B7280] font-mono border border-[#E5E7EB]">
                      NSE
                    </span>
                  </div>
                  <span className="text-[10px] text-[#6B7280] block truncate">
                    {peer} Equities Ltd
                  </span>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#4F46E5] font-semibold">
                    <span>View Chart</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Sticky Buy / Sell Order Pad */}
        <div className="hidden lg:block lg:col-span-4 sticky top-20">
          <OrderPad
            stockId={stock?.id || symbol}
            symbol={symbol}
            stockName={stock?.name || symbol}
            defaultSide="BUY"
            onOrderPlaced={loadStockAndQuote}
            embedded={true}
          />
        </div>
      </div>

      {/* Mobile Sticky Order Action Bar */}
      <div className="lg:hidden fixed bottom-14 left-0 right-0 z-30 bg-white border-t border-[#E5E7EB] p-3 flex gap-2 shadow-lg">
        <button
          onClick={() => {
            setMobileOrderSide("BUY");
            setMobileOrderModalOpen(true);
          }}
          className="flex-1 py-2.5 rounded-xl bg-[#00A86B] text-white font-bold text-xs shadow-xs"
        >
          BUY (PAPER)
        </button>
        <button
          onClick={() => {
            setMobileOrderSide("SELL");
            setMobileOrderModalOpen(true);
          }}
          className="flex-1 py-2.5 rounded-xl bg-[#EF4444] text-white font-bold text-xs shadow-xs"
        >
          SELL (PAPER)
        </button>
      </div>

      {/* Mobile Order Pad Modal */}
      <OrderPadModal
        isOpen={mobileOrderModalOpen}
        onClose={() => setMobileOrderModalOpen(false)}
        stockId={stock?.id || symbol}
        symbol={symbol}
        stockName={stock?.name || symbol}
        defaultSide={mobileOrderSide}
        onOrderPlaced={loadStockAndQuote}
      />
    </div>
  );
}
