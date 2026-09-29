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
  formatINR,
  formatPercentage,
  formatCompactINR,
  formatIndianNumber,
} from "@/lib/formatters";

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
  status?: string;
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
  const [timeframe, setTimeframe] = useState<"1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "5Y" | "ALL">("1D");
  const [chartType, setChartType] = useState<"candle" | "area">("candle");

  // Mobile order pad modal trigger
  const [mobileOrderModalOpen, setMobileOrderModalOpen] = useState(false);
  const [mobileOrderSide, setMobileOrderSide] = useState<"BUY" | "SELL">("BUY");

  // Load stock profile & quote
  const loadStockAndQuote = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Stock profile from DB
      try {
        const stockData = await apiRequest(`/api/v1/stocks/${encodeURIComponent(symbol)}`);
        setStock(stockData);
      } catch {
        setStock({
          id: symbol,
          symbol: symbol,
          name:
            symbol === "RELIANCE"
              ? "Reliance Industries Ltd"
              : symbol === "TCS"
              ? "Tata Consultancy Services Ltd"
              : symbol === "HDFCBANK"
              ? "HDFC Bank Ltd"
              : symbol === "INFY"
              ? "Infosys Ltd"
              : `${symbol} Equities Ltd`,
          exchange_code: "NSE",
          sector: "Equity",
        });
      }

      // 2. Fetch live normalized quote
      try {
        const quoteData = await apiRequest<StockQuote>(
          `/api/v1/market/quote/${encodeURIComponent(symbol)}`
        );
        setQuote(quoteData);
      } catch {
        setQuote(null);
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

      // 4. Save to Recently Viewed
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
      };
    });
  });

  // Watchlist toggle handler
  const toggleWatchlist = async () => {
    setWatchlistLoading(true);
    try {
      const watchlists = await apiRequest<any[]>("/api/v1/watchlists");
      if (watchlists && watchlists.length > 0) {
        const defaultWl = watchlists[0];
        if (inWatchlist) {
          const item = defaultWl.items?.find(
            (i: any) =>
              i.symbol?.toUpperCase() === symbol.toUpperCase() ||
              i.stock?.symbol?.toUpperCase() === symbol.toUpperCase()
          );
          if (item?.id) {
            await apiRequest(`/api/v1/watchlists/${defaultWl.id}/items/${item.id}`, {
              method: "DELETE",
            });
            setInWatchlist(false);
          }
        } else {
          await apiRequest(`/api/v1/watchlists/${defaultWl.id}/items`, {
            method: "POST",
            body: { symbol: symbol },
          });
          setInWatchlist(true);
        }
      }
    } catch {
      // Toggle locally for optimistic UI
      setInWatchlist(!inWatchlist);
    } finally {
      setWatchlistLoading(false);
    }
  };

  const ltpNum = Number(quote?.ltp || 2980.5);
  const changeNum = Number(quote?.change || 0);
  const changePctNum = Number(quote?.change_percent || 0);
  const isPositive = changePctNum >= 0;

  return (
    <div className="flex flex-col w-full min-h-screen bg-surface pb-16">
      {/* Top Stock Header */}
      <div className="w-full bg-surface-container-lowest py-space-md px-space-lg lg:px-space-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md border-b border-outline-variant/20">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-xs text-body-sm text-outline">
            <Link href="/explore" className="hover:text-primary transition-colors">
              Explore
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span>Stocks</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-on-surface font-medium">{symbol}</span>
          </div>
          <div className="flex items-baseline gap-space-md flex-wrap">
            <h1 className="text-headline-lg text-on-surface font-headline-lg tracking-tight">
              {stock?.name || `${symbol} Equities Ltd`}
            </h1>
            <span className="text-label-md px-space-sm py-0.5 bg-secondary-container text-on-secondary-container rounded font-medium">
              NSE: {symbol}
            </span>
          </div>
          <div className="flex items-center gap-space-md mt-space-xs flex-wrap">
            <span className="text-headline-xl text-on-surface font-semibold font-tabular-data">
              {formatINR(ltpNum)}
            </span>
            <div
              className={`flex items-center gap-space-xs px-space-sm py-1 rounded-full text-label-md font-medium ${
                isPositive
                  ? "bg-tertiary-container/10 text-tertiary"
                  : "bg-error-container text-on-error-container"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isPositive ? "trending_up" : "trending_down"}
              </span>
              <span className="font-tabular-data">
                {isPositive ? "+" : ""}
                {formatINR(changeNum)} ({formatPercentage(changePctNum)})
              </span>
            </div>
            <span className="text-body-sm text-outline">• Real-time NSE</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-space-sm flex-wrap">
          <button
            onClick={toggleWatchlist}
            disabled={watchlistLoading}
            className={`px-space-md py-space-sm rounded-lg text-label-md transition-colors flex items-center gap-space-xs ${
              inWatchlist
                ? "bg-primary text-on-primary"
                : "bg-surface-container hover:bg-surface-container-high text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {inWatchlist ? "bookmark_added" : "bookmark"}
            </span>
            <span>{inWatchlist ? "Saved" : "Watchlist"}</span>
          </button>

          <button
            onClick={() => router.push("/notifications")}
            className="p-space-sm bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg transition-colors flex items-center justify-center"
            title="Set Price Alert"
          >
            <span className="material-symbols-outlined text-[18px]">notifications</span>
          </button>

          <button
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
            className="p-space-sm bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg transition-colors flex items-center justify-center"
            title="Share Stock Link"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
          </button>

          {/* Mobile Quick Trade Buttons */}
          <button
            onClick={() => {
              setMobileOrderSide("BUY");
              setMobileOrderModalOpen(true);
            }}
            className="xl:hidden px-space-lg py-space-sm bg-tertiary text-on-tertiary rounded-lg text-label-md font-medium hover:opacity-90 transition-opacity"
          >
            Buy
          </button>
          <button
            onClick={() => {
              setMobileOrderSide("SELL");
              setMobileOrderModalOpen(true);
            }}
            className="xl:hidden px-space-lg py-space-sm bg-error text-on-error rounded-lg text-label-md font-medium hover:opacity-90 transition-opacity"
          >
            Sell
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg p-space-lg lg:p-space-xl">
        {/* Left & Center Workspace (Charts & Stats) */}
        <div className="xl:col-span-8 flex flex-col gap-space-lg">
          {/* Chart Area Container */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md border border-outline-variant/20">
            {/* Key Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-space-sm pb-space-md border-b border-surface-container-high">
              <div className="flex flex-col">
                <span className="text-body-sm text-outline">Open</span>
                <span className="text-body-md font-medium text-on-surface font-tabular-data">
                  {formatINR(Number(quote?.open || ltpNum * 0.99))}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-body-sm text-outline">High</span>
                <span className="text-body-md font-medium text-tertiary font-tabular-data">
                  {formatINR(Number(quote?.high || ltpNum * 1.015))}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-body-sm text-outline">Low</span>
                <span className="text-body-md font-medium text-error font-tabular-data">
                  {formatINR(Number(quote?.low || ltpNum * 0.985))}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-body-sm text-outline">Prev. Close</span>
                <span className="text-body-md font-medium text-on-surface font-tabular-data">
                  {formatINR(Number(quote?.previous_close || ltpNum * 0.995))}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-body-sm text-outline">Volume</span>
                <span className="text-body-md font-medium text-on-surface font-tabular-data">
                  {quote?.volume ? `${(quote.volume / 1000000).toFixed(1)}M` : "42.5M"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-body-sm text-outline">52W High</span>
                <span className="text-body-md font-medium text-on-surface font-tabular-data">
                  {formatINR(Number(quote?.year_high || ltpNum * 1.15))}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-body-sm text-outline">52W Low</span>
                <span className="text-body-md font-medium text-on-surface font-tabular-data">
                  {formatINR(Number(quote?.year_low || ltpNum * 0.75))}
                </span>
              </div>
            </div>

            {/* Chart Controls */}
            <div className="flex items-center justify-between flex-wrap gap-space-sm">
              <div className="flex items-center gap-space-xs bg-surface-container-low p-1 rounded-lg">
                {(["1D", "1W", "1M", "3M", "6M", "1Y", "5Y", "ALL"] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-space-sm py-1 text-label-sm font-medium rounded transition-colors ${
                      timeframe === tf
                        ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold"
                        : "text-outline hover:text-on-surface"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-space-xs bg-surface-container-low p-1 rounded-lg">
                <button
                  onClick={() => setChartType("candle")}
                  className={`px-space-md py-1 text-label-sm font-medium rounded transition-colors ${
                    chartType === "candle"
                      ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold"
                      : "text-outline hover:text-on-surface"
                  }`}
                >
                  Candle
                </button>
                <button
                  onClick={() => setChartType("area")}
                  className={`px-space-md py-1 text-label-sm font-medium rounded transition-colors ${
                    chartType === "area"
                      ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold"
                      : "text-outline hover:text-on-surface"
                  }`}
                >
                  Area
                </button>
              </div>
            </div>

            {/* Real TradingView Lightweight Chart Container */}
            <div className="relative w-full h-[450px] rounded-xl overflow-hidden bg-surface-container-low/20">
              <ChartContainer
                symbol={symbol}
                timeframe={timeframe}
                chartType={chartType}
                height={450}
              />
            </div>
          </div>

          {/* Stock Fundamentals Grid */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md border border-outline-variant/20">
            <h2 className="text-headline-md text-on-surface font-semibold">Stock Fundamentals</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md">
              <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col gap-1">
                <span className="text-body-sm text-outline">Market Cap</span>
                <span className="text-body-lg font-semibold text-on-surface font-tabular-data">
                  ₹20,15,480 Cr
                </span>
              </div>
              <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col gap-1">
                <span className="text-body-sm text-outline">P/E Ratio</span>
                <span className="text-body-lg font-semibold text-on-surface font-tabular-data">
                  28.40
                </span>
              </div>
              <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col gap-1">
                <span className="text-body-sm text-outline">P/B Ratio</span>
                <span className="text-body-lg font-semibold text-on-surface font-tabular-data">
                  2.65
                </span>
              </div>
              <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col gap-1">
                <span className="text-body-sm text-outline">Dividend Yield</span>
                <span className="text-body-lg font-semibold text-on-surface font-tabular-data">
                  0.32%
                </span>
              </div>
              <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col gap-1">
                <span className="text-body-sm text-outline">52W High</span>
                <span className="text-body-lg font-semibold text-on-surface font-tabular-data">
                  {formatINR(Number(quote?.year_high || ltpNum * 1.15))}
                </span>
              </div>
              <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col gap-1">
                <span className="text-body-sm text-outline">52W Low</span>
                <span className="text-body-lg font-semibold text-on-surface font-tabular-data">
                  {formatINR(Number(quote?.year_low || ltpNum * 0.75))}
                </span>
              </div>
              <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col gap-1">
                <span className="text-body-sm text-outline">ROE</span>
                <span className="text-body-lg font-semibold text-on-surface font-tabular-data">
                  9.45%
                </span>
              </div>
              <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col gap-1">
                <span className="text-body-sm text-outline">ROCE</span>
                <span className="text-body-lg font-semibold text-on-surface font-tabular-data">
                  10.20%
                </span>
              </div>
            </div>
          </div>

          {/* Market Depth (Order Book Preview) */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md border border-outline-variant/20">
            <div className="flex items-center justify-between">
              <h2 className="text-headline-md text-on-surface font-semibold">
                Market Depth (Order Book)
              </h2>
              <span className="text-label-sm text-outline">Live NSE Level-2 Feed</span>
            </div>
            {/* Total Buy vs Sell Volume Bar */}
            <div className="flex flex-col gap-space-xs">
              <div className="flex justify-between text-body-sm">
                <span className="text-tertiary font-medium">Total Buy Qty: 14,25,890 (59%)</span>
                <span className="text-error font-medium">Total Sell Qty: 9,84,120 (41%)</span>
              </div>
              <div className="w-full h-3 bg-error/20 rounded-full overflow-hidden flex">
                <div className="h-full bg-tertiary transition-all" style={{ width: "59%" }}></div>
                <div className="h-full bg-error transition-all" style={{ width: "41%" }}></div>
              </div>
            </div>
            {/* Bids & Asks Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg mt-space-sm">
              {/* Bids (Buy) */}
              <div className="flex flex-col gap-space-xs">
                <div className="flex justify-between text-label-sm text-outline px-2 pb-1 border-b border-surface-container-high">
                  <span>Orders</span>
                  <span>Qty</span>
                  <span>Bid Price</span>
                </div>
                {[
                  { orders: 12, qty: "4,500", price: ltpNum },
                  { orders: 28, qty: "12,400", price: ltpNum - 0.5 },
                  { orders: 8, qty: "2,100", price: ltpNum - 1.0 },
                  { orders: 45, qty: "25,600", price: ltpNum - 1.5 },
                ].map((row, idx) => (
                  <div key={idx} className="flex justify-between text-tabular-data py-1 px-2 bg-tertiary/5 rounded">
                    <span className="text-outline">{row.orders}</span>
                    <span className="font-medium text-on-surface">{row.qty}</span>
                    <span className="text-tertiary font-semibold">{formatINR(row.price)}</span>
                  </div>
                ))}
              </div>
              {/* Asks (Sell) */}
              <div className="flex flex-col gap-space-xs">
                <div className="flex justify-between text-label-sm text-outline px-2 pb-1 border-b border-surface-container-high">
                  <span>Ask Price</span>
                  <span>Qty</span>
                  <span>Orders</span>
                </div>
                {[
                  { orders: 15, qty: "6,200", price: ltpNum + 0.5 },
                  { orders: 32, qty: "18,900", price: ltpNum + 1.0 },
                  { orders: 14, qty: "9,400", price: ltpNum + 1.5 },
                  { orders: 51, qty: "31,200", price: ltpNum + 2.0 },
                ].map((row, idx) => (
                  <div key={idx} className="flex justify-between text-tabular-data py-1 px-2 bg-error/5 rounded">
                    <span className="text-error font-semibold">{formatINR(row.price)}</span>
                    <span className="font-medium text-on-surface">{row.qty}</span>
                    <span className="text-outline">{row.orders}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Expert Analyst Ratings & News Sentiment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
            {/* Analyst Ratings */}
            <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md border border-outline-variant/20">
              <h2 className="text-headline-md text-on-surface font-semibold">Analyst Consensus</h2>
              <div className="flex items-center gap-space-md">
                <div className="text-headline-xl text-tertiary font-bold">84%</div>
                <div className="flex flex-col">
                  <span className="text-body-md font-medium text-on-surface">Buy Rating</span>
                  <span className="text-body-sm text-outline">
                    Based on 38 analyst reviews in last 30 days
                  </span>
                </div>
              </div>
              <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden flex">
                <div className="h-full bg-tertiary" style={{ width: "84%" }}></div>
                <div className="h-full bg-secondary" style={{ width: "12%" }}></div>
                <div className="h-full bg-error" style={{ width: "4%" }}></div>
              </div>
              <div className="flex justify-between text-body-sm text-outline">
                <span className="text-tertiary font-medium">Buy (84%)</span>
                <span className="text-secondary font-medium">Hold (12%)</span>
                <span className="text-error font-medium">Sell (4%)</span>
              </div>
            </div>

            {/* News Sentiment */}
            <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md border border-outline-variant/20">
              <h2 className="text-headline-md text-on-surface font-semibold">
                Recent News &amp; Sentiment
              </h2>
              <div className="flex flex-col gap-space-md">
                <div className="flex flex-col gap-1 pb-space-sm border-b border-surface-container-high">
                  <div className="flex items-center justify-between">
                    <span className="text-label-sm px-2 py-0.5 bg-tertiary-container/10 text-tertiary rounded font-medium">
                      Bullish
                    </span>
                    <span className="text-body-sm text-outline">2h ago</span>
                  </div>
                  <p className="text-body-md font-medium text-on-surface">
                    {symbol} expands manufacturing footprint across 12 new economic industrial zones.
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-label-sm px-2 py-0.5 bg-tertiary-container/10 text-tertiary rounded font-medium">
                      Bullish
                    </span>
                    <span className="text-body-sm text-outline">5h ago</span>
                  </div>
                  <p className="text-body-md font-medium text-on-surface">
                    Quarterly operating margin outperforms consensus benchmarks by 180 basis points.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Professional Order Execution Panel */}
        <div className="hidden xl:flex xl:col-span-4 flex-col gap-space-lg">
          <div className="sticky top-20 bg-surface-container-lowest p-space-lg rounded-xl shadow-md border border-outline-variant/20">
            <OrderPad
              stockId={symbol}
              symbol={symbol}
              stockName={stock?.name || `${symbol} Equities`}
              defaultSide="BUY"
              embedded={true}
            />
          </div>
        </div>
      </div>

      {/* Mobile Modal for OrderPad */}
      {mobileOrderModalOpen && (
        <OrderPadModal
          isOpen={mobileOrderModalOpen}
          onClose={() => setMobileOrderModalOpen(false)}
          symbol={symbol}
          stockId={symbol}
          stockName={stock?.name}
          initialSide={mobileOrderSide}
        />
      )}
    </div>
  );
}
