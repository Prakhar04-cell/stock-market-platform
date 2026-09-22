"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { ChartContainer } from "@/components/ui/chart-container";
import { OrderPad, OrderPadModal } from "@/components/trading/order-pad-modal";
import { useMarketWebSocket, WsPriceUpdate } from "@/lib/market-ws";
import { normalizeStockSymbol } from "@/lib/utils";
import {
  Bookmark,
  ArrowLeft,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Check,
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
            w.items?.some((i: any) => i.symbol?.toUpperCase() === symbol.toUpperCase() || i.stock?.symbol?.toUpperCase() === symbol.toUpperCase())
          );
          setInWatchlist(found);
        }
      } catch {
        // Ignore
      }
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

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
          const item = targetWl.items?.find((i: any) => i.symbol?.toUpperCase() === symbol.toUpperCase() || i.stock?.symbol?.toUpperCase() === symbol.toUpperCase());
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
  const numChangePct = quote?.change_percent !== undefined && quote?.change_percent !== null ? Number(quote.change_percent) : null;
  const isPositive = (numChange ?? 0) >= 0;

  return (
    <div className="space-y-5 select-none pb-24 lg:pb-8">
      {/* Upstox Re-Authentication Alert Banner if Token Expired */}
      {authError && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                Market Data Authorization Required
              </h4>
              <p className="text-[11px] text-amber-700">
                Upstox market tick stream token has expired. Connect Upstox to resume real-time feeds.
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
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#111827] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Markets / Instruments</span>
        </button>

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#00A86B] text-[11px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00A86B] animate-pulse" />
          <span>Paper Execution Active</span>
        </div>
      </div>

      {/* Main Stock Header Bar */}
      <div className="bg-white border border-[#E5E7EB] p-5 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] flex items-center justify-center font-bold text-[#111827] text-base font-mono shrink-0">
            {symbol.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[#111827] leading-none">
                {symbol}
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#F7F8FA] text-[#6B7280] border border-[#E5E7EB] font-mono font-bold">
                {stock?.exchange_code || "NSE"}
              </span>
              <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#00A86B] font-bold">
                ● LIVE
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-1">
              {stock?.name || `${symbol} Equities Ltd`}
            </p>
          </div>
        </div>

        {/* Live LTP & Price Movements */}
        <div className="flex items-center gap-6">
          <div className="text-left md:text-right font-mono">
            <div className="text-2xl font-black text-[#111827] tracking-tight tabular-nums">
              {numLtp !== null
                ? `₹${numLtp.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "₹ --"}
            </div>
            {numChange !== null && (
              <div
                className={`text-xs font-bold tabular-nums flex items-center md:justify-end gap-1 ${
                  isPositive ? "text-[#00A86B]" : "text-[#EF4444]"
                }`}
              >
                <span>
                  {isPositive ? "+" : ""}
                  {numChange.toFixed(2)} ({isPositive ? "+" : ""}
                  {numChangePct?.toFixed(2)}%)
                </span>
              </div>
            )}
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

      {/* Main Trading Area: 2-Column Workstation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Candlestick Chart & Key Statistics */}
        <div className="lg:col-span-8 space-y-6">
          {/* Professional TradingView Lightweight Chart */}
          <ChartContainer symbol={symbol} />

          {/* Key Trading Statistics & Fundamentals */}
          <div className="bg-white border border-[#E5E7EB] p-5 rounded-xl shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2.5">
              <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                Trading Statistics
              </h3>
              <span className="text-[11px] text-[#6B7280] font-mono">
                Normalized Real Market Data
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-[#F7F8FA] rounded-lg border border-[#E5E7EB]">
                <span className="text-[#6B7280] text-[11px] block">Open</span>
                <span className="font-mono font-bold text-[#111827] text-sm mt-0.5 block tabular-nums">
                  {quote?.open ? `₹${Number(quote.open).toFixed(2)}` : "₹ --"}
                </span>
              </div>

              <div className="p-3 bg-[#F7F8FA] rounded-lg border border-[#E5E7EB]">
                <span className="text-[#6B7280] text-[11px] block">Previous Close</span>
                <span className="font-mono font-bold text-[#111827] text-sm mt-0.5 block tabular-nums">
                  {quote?.previous_close ? `₹${Number(quote.previous_close).toFixed(2)}` : "₹ --"}
                </span>
              </div>

              <div className="p-3 bg-[#F7F8FA] rounded-lg border border-[#E5E7EB]">
                <span className="text-[#6B7280] text-[11px] block">Day High</span>
                <span className="font-mono font-bold text-[#00A86B] text-sm mt-0.5 block tabular-nums">
                  {quote?.high ? `₹${Number(quote.high).toFixed(2)}` : "₹ --"}
                </span>
              </div>

              <div className="p-3 bg-[#F7F8FA] rounded-lg border border-[#E5E7EB]">
                <span className="text-[#6B7280] text-[11px] block">Day Low</span>
                <span className="font-mono font-bold text-[#EF4444] text-sm mt-0.5 block tabular-nums">
                  {quote?.low ? `₹${Number(quote.low).toFixed(2)}` : "₹ --"}
                </span>
              </div>

              <div className="p-3 bg-[#F7F8FA] rounded-lg border border-[#E5E7EB]">
                <span className="text-[#6B7280] text-[11px] block">52-Week High</span>
                <span className="font-mono font-bold text-[#111827] text-sm mt-0.5 block tabular-nums">
                  {quote?.year_high ? `₹${Number(quote.year_high).toFixed(2)}` : "₹ --"}
                </span>
              </div>

              <div className="p-3 bg-[#F7F8FA] rounded-lg border border-[#E5E7EB]">
                <span className="text-[#6B7280] text-[11px] block">52-Week Low</span>
                <span className="font-mono font-bold text-[#111827] text-sm mt-0.5 block tabular-nums">
                  {quote?.year_low ? `₹${Number(quote.year_low).toFixed(2)}` : "₹ --"}
                </span>
              </div>

              <div className="p-3 bg-[#F7F8FA] rounded-lg border border-[#E5E7EB]">
                <span className="text-[#6B7280] text-[11px] block">Volume</span>
                <span className="font-mono font-bold text-[#111827] text-sm mt-0.5 block tabular-nums">
                  {quote?.volume ? Number(quote.volume).toLocaleString("en-IN") : "--"}
                </span>
              </div>

              <div className="p-3 bg-[#F7F8FA] rounded-lg border border-[#E5E7EB]">
                <span className="text-[#6B7280] text-[11px] block">Instrument Key</span>
                <span className="font-mono font-semibold text-[#4B5563] text-[11px] mt-0.5 block truncate">
                  {quote?.instrument_key || stock?.instrument_key || "NSE"}
                </span>
              </div>
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
