"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChartContainer } from "@/components/ui/chart-container";
import { OrderPadModal } from "@/components/trading/order-pad-modal";
import { useMarketWebSocket, WsPriceUpdate } from "@/lib/market-ws";
import { normalizeStockSymbol } from "@/lib/utils";
import {
  Bookmark,
  TrendingUp,
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
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
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [inWatchlist, setInWatchlist] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadStockAndQuote = useCallback(async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      // 1. Fetch Stock metadata from DB using normalized symbol
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
        if (err.code === "UPSTOX_AUTH_REQUIRED" || err.code === "UNAUTHORIZED") {
          setAuthError(err.message || "Market data connection requires re-authentication.");
        }
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

  const handleOrder = (side: "BUY" | "SELL") => {
    setOrderSide(side);
    setOrderModalOpen(true);
  };

  const numLtp = quote?.ltp ? Number(quote.ltp) : null;
  const numChange = quote?.change !== undefined && quote?.change !== null ? Number(quote.change) : null;
  const numChangePct = quote?.change_percent !== undefined && quote?.change_percent !== null ? Number(quote.change_percent) : null;
  const isPositive = (numChange ?? 0) >= 0;

  return (
    <div className="space-y-5 select-none">
      {/* Upstox Re-Authentication Alert Banner if Token Expired */}
      {authError && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                Market Data Connection Requires Authorization
              </h4>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Upstox API token is missing or expired. Connect your Upstox account to stream live real-time feeds.
              </p>
            </div>
          </div>
          <a
            href="/api/v1/upstox/auth/login"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <span>Authorize Upstox</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Navigation Breadcrumb & Back */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Markets</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Paper Trading Active
          </span>
        </div>
      </div>

      {/* Stock Main Header */}
      <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-extrabold text-slate-700 text-lg font-mono shrink-0 shadow-xs">
            {symbol.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">{symbol}</h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono font-bold">
                {stock?.exchange_code || "NSE EQ"}
              </span>
              <Badge variant={quote?.status === "LIVE" ? "success" : "unconfigured"}>
                {quote?.status === "LIVE" ? "MARKET LIVE" : (quote?.status || "CONNECTED")}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{stock?.name || `${symbol} Equities Ltd`}</p>

            {/* Price Section */}
            <div className="flex items-baseline gap-3 mt-3 font-mono">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {numLtp !== null
                  ? `₹${numLtp.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "₹ --"}
              </span>
              {numChange !== null && (
                <span
                  className={`text-sm font-bold flex items-center gap-1 ${
                    isPositive ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  <span>
                    {isPositive ? "+" : ""}
                    {numChange.toFixed(2)} ({isPositive ? "+" : ""}
                    {numChangePct?.toFixed(2)}%)
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons: Order Pad Triggers */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInWatchlist(!inWatchlist)}
            className={`text-xs font-semibold border-slate-200 ${
              inWatchlist ? "text-indigo-600 bg-indigo-50 border-indigo-200" : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 mr-1.5" />
            {inWatchlist ? "In Watchlist" : "Watchlist"}
          </Button>

          <Button
            size="sm"
            onClick={() => handleOrder("BUY")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 shadow-xs transition-colors"
          >
            BUY (PAPER)
          </Button>

          <Button
            size="sm"
            onClick={() => handleOrder("SELL")}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 shadow-xs transition-colors"
          >
            SELL (PAPER)
          </Button>
        </div>
      </div>

      {/* Interactive TradingView Lightweight Chart */}
      <ChartContainer symbol={symbol} />

      {/* Stock Statistics Grid */}
      <div className="bg-white border border-slate-200/90 p-5 rounded-2xl space-y-4 shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900">Key Trading Statistics &amp; Fundamentals</h3>
          <span className="text-xs text-slate-400 font-mono">Real-time Upstox Normalized Feed</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-[11px] block">Open Price</span>
            <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">
              {quote?.open ? `₹${Number(quote.open).toFixed(2)}` : "₹ --"}
            </span>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-[11px] block">Previous Close</span>
            <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">
              {quote?.previous_close ? `₹${Number(quote.previous_close).toFixed(2)}` : "₹ --"}
            </span>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-[11px] block">Day High</span>
            <span className="font-mono font-bold text-emerald-700 text-sm mt-0.5 block">
              {quote?.high ? `₹${Number(quote.high).toFixed(2)}` : "₹ --"}
            </span>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-[11px] block">Day Low</span>
            <span className="font-mono font-bold text-rose-700 text-sm mt-0.5 block">
              {quote?.low ? `₹${Number(quote.low).toFixed(2)}` : "₹ --"}
            </span>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-[11px] block">52-Week High</span>
            <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">
              {quote?.year_high ? `₹${Number(quote.year_high).toFixed(2)}` : "₹ --"}
            </span>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-[11px] block">52-Week Low</span>
            <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">
              {quote?.year_low ? `₹${Number(quote.year_low).toFixed(2)}` : "₹ --"}
            </span>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-[11px] block">Volume</span>
            <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">
              {quote?.volume ? Number(quote.volume).toLocaleString("en-IN") : "--"}
            </span>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-[11px] block">Instrument Key</span>
            <span className="font-mono font-semibold text-slate-700 text-[11px] mt-0.5 block truncate">
              {quote?.instrument_key || stock?.instrument_key || "NSE_EQ"}
            </span>
          </div>
        </div>
      </div>

      {/* Order Pad Modal */}
      <OrderPadModal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        stockId={stock?.id || symbol}
        symbol={symbol}
        stockName={stock?.name || symbol}
        defaultSide={orderSide}
        onOrderPlaced={loadStockAndQuote}
      />
    </div>
  );
}
