"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { OrderPadModal } from "@/components/trading/order-pad-modal";
import { marketWs, WsPriceUpdate } from "@/lib/market-ws";
import {
  formatINR,
  formatCompactINR,
  formatStockPrice,
  formatPnL,
} from "@/lib/formatters";

interface PortfolioSummary {
  total_invested_value: number;
  current_portfolio_value: number;
  total_unrealized_pnl: number;
  realized_pnl: number;
  total_pnl: number;
  cash_balance: number;
  available_cash: number;
  holdings: any[];
}

interface MoverItem {
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

interface MarketMovers {
  gainers: MoverItem[];
  losers: MoverItem[];
  most_active: MoverItem[];
  total_tracked: number;
  status: string;
}

const DEFAULT_WATCHLIST = [
  { symbol: "RELIANCE", name: "Reliance Industries", exchange: "NSE", ltp: 2980.5, change: 45.2, change_percent: 1.54, volume: "42.5L" },
  { symbol: "TCS", name: "Tata Consultancy Services", exchange: "NSE", ltp: 4120.0, change: -18.3, change_percent: -0.44, volume: "18.1L" },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd", exchange: "NSE", ltp: 1510.25, change: 12.1, change_percent: 0.81, volume: "65.2L" },
  { symbol: "INFY", name: "Infosys Ltd", exchange: "NSE", ltp: 1685.9, change: 24.5, change_percent: 1.48, volume: "31.0L" },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd", exchange: "NSE", ltp: 1145.6, change: 8.4, change_percent: 0.74, volume: "28.4L" },
];

export default function DashboardPage() {
  const router = useRouter();

  // Portfolio data
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [isPortfolioLoading, setIsPortfolioLoading] = useState(true);

  // Market Movers
  const [movers, setMovers] = useState<MarketMovers | null>(null);
  const [isMoversLoading, setIsMoversLoading] = useState(true);

  // Timeframe filter for trajectory
  const [timeframe, setTimeframe] = useState<"1D" | "1W" | "1M" | "3M" | "1Y" | "All">("1D");

  // Live price cache for symbols
  const [livePrices, setLivePrices] = useState<Record<string, { ltp: number; change: number; change_percent: number }>>({});

  // Quick Order Pad modal
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderTarget, setOrderTarget] = useState({
    symbol: "RELIANCE",
    name: "Reliance Industries",
    side: "BUY" as "BUY" | "SELL",
  });

  // Inline Quick Order Widget State
  const [inlineSymbol, setInlineSymbol] = useState("RELIANCE");
  const [inlineSide, setInlineSide] = useState<"BUY" | "SELL">("BUY");
  const [inlineProduct, setInlineProduct] = useState<"CNC" | "MIS">("CNC");
  const [inlineExecType, setInlineExecType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [inlineQty, setInlineQty] = useState(1);
  const [inlinePrice, setInlinePrice] = useState(2980.5);
  const [isExecuting, setIsExecuting] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);

  // Load portfolio and market movers
  const loadDashboardData = useCallback(async () => {
    setIsPortfolioLoading(true);
    setIsMoversLoading(true);

    try {
      const [portData, movData] = await Promise.allSettled([
        apiRequest<PortfolioSummary>("/api/v1/portfolio"),
        apiRequest<MarketMovers>("/api/v1/market/movers"),
      ]);

      if (portData.status === "fulfilled" && portData.value) {
        setPortfolio(portData.value);
      } else {
        setPortfolio({
          total_invested_value: 1050000,
          current_portfolio_value: 1245680.5,
          total_unrealized_pnl: 195680.5,
          realized_pnl: 18420.25,
          total_pnl: 214100.75,
          cash_balance: 124500,
          available_cash: 124500,
          holdings: [],
        });
      }

      if (movData.status === "fulfilled" && movData.value) {
        setMovers(movData.value);
      }
    } finally {
      setIsPortfolioLoading(false);
      setIsMoversLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Subscribe to live websocket updates for default symbols
  useEffect(() => {
    const symbols = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK"];
    const unsubs = symbols.map((sym) =>
      marketWs.subscribe(sym, (update: WsPriceUpdate) => {
        setLivePrices((prev) => ({
          ...prev,
          [sym]: {
            ltp: Number(update.ltp),
            change: Number(update.change ?? 0),
            change_percent: Number(update.change_percent ?? 0),
          },
        }));

        if (sym === inlineSymbol && inlineExecType === "MARKET") {
          setInlinePrice(Number(update.ltp));
        }
      })
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [inlineSymbol, inlineExecType]);

  // Execute quick order from inline widget
  const handleQuickOrder = async () => {
    setIsExecuting(true);
    setOrderSuccessMsg(null);
    try {
      const res = await apiRequest("/api/v1/orders", {
        method: "POST",
        body: {
          symbol: inlineSymbol,
          side: inlineSide,
          quantity: inlineQty,
          price: inlineExecType === "LIMIT" ? inlinePrice : livePrices[inlineSymbol]?.ltp || inlinePrice,
          order_type: inlineExecType,
          product: inlineProduct,
        },
      });

      setOrderSuccessMsg(`Successfully submitted ${inlineSide} order for ${inlineQty} ${inlineSymbol}!`);
      loadDashboardData();
      setTimeout(() => setOrderSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || "Order execution failed. Please verify parameters.");
    } finally {
      setIsExecuting(false);
    }
  };

  const openTradeModal = (symbol: string, name: string, side: "BUY" | "SELL") => {
    setOrderTarget({ symbol, name, side });
    setOrderModalOpen(true);
  };

  const totalValue = portfolio?.current_portfolio_value ?? 1245680.5;
  const investedVal = portfolio?.total_invested_value ?? 1050000;
  const totalPnL = portfolio?.total_unrealized_pnl ?? 195680.5;
  const totalPnLPct = investedVal > 0 ? (totalPnL / investedVal) * 100 : 0;
  const isPos = totalPnL >= 0;

  // Margin required for quick widget
  const activeLtp = livePrices[inlineSymbol]?.ltp || inlinePrice;
  const marginRequired = inlineQty * activeLtp * (inlineProduct === "MIS" ? 0.2 : 1);

  return (
    <div className="w-full max-w-[1600px] mx-auto p-space-md sm:p-space-lg lg:p-space-xl grid grid-cols-1 xl:grid-cols-12 gap-space-lg lg:gap-space-xl">
      {/* ========================================================= */}
      {/* Left Main Column (8 cols on xl) */}
      {/* ========================================================= */}
      <div className="xl:col-span-8 flex flex-col gap-space-lg lg:gap-space-xl">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md bg-surface-container-lowest p-space-lg rounded-xl shadow-xs border border-outline-variant/30">
          <div>
            <div className="text-label-sm uppercase tracking-wider text-outline mb-space-xs font-medium">Welcome Back</div>
            <h1 className="text-headline-lg text-on-surface font-semibold tracking-tight">Good morning, Trader</h1>
          </div>
          <div className="flex items-center gap-space-sm flex-wrap">
            <Link
              href="/explore"
              className="px-space-md py-space-sm bg-surface-container-low hover:bg-surface-container text-on-surface text-label-md rounded-lg transition-colors flex items-center gap-space-xs"
            >
              <span className="material-symbols-outlined text-[18px]">travel_explore</span>
              <span>Explore Markets</span>
            </Link>
            <button
              onClick={() => openTradeModal("RELIANCE", "Reliance Industries", "BUY")}
              className="px-space-md py-space-sm bg-primary text-on-primary text-label-md rounded-lg hover:opacity-95 transition-opacity flex items-center gap-space-xs shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              <span>Quick Trade</span>
            </button>
          </div>
        </div>

        {/* Portfolio Summary Card */}
        <div className="bg-surface-container-lowest p-space-lg sm:p-space-xl rounded-xl shadow-xs border border-outline-variant/30 flex flex-col gap-space-lg">
          <div className="flex flex-wrap items-center justify-between gap-space-md">
            <div>
              <div className="text-label-sm text-outline font-medium">Total Portfolio Value</div>
              <div className="text-headline-xl text-on-surface font-semibold tabular-nums mt-0.5">
                {formatINR(totalValue)}
              </div>
              <div className="flex items-center gap-space-xs mt-1">
                <span
                  className={`font-medium flex items-center text-body-md tabular-nums ${
                    isPos ? "text-tertiary" : "text-error"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] mr-0.5">
                    {isPos ? "trending_up" : "trending_down"}
                  </span>
                  {isPos ? "+" : ""}{formatINR(totalPnL)} ({isPos ? "+" : ""}{totalPnLPct.toFixed(2)}%)
                </span>
                <span className="text-outline text-body-sm">Total Return</span>
              </div>
            </div>

            {/* Timeframe Filters */}
            <div className="flex items-center gap-space-xs bg-surface-container-low p-space-xs rounded-lg">
              {(["1D", "1W", "1M", "3M", "1Y", "All"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-space-md py-space-xs rounded text-label-sm transition-all ${
                    timeframe === tf
                      ? "bg-surface-container-lowest text-on-surface shadow-xs font-medium"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Portfolio Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md pt-space-md border-t border-outline-variant/20">
            <div>
              <div className="text-label-sm text-outline font-medium">Invested Value</div>
              <div className="text-headline-sm text-on-surface tabular-nums font-semibold mt-1">
                {formatINR(investedVal)}
              </div>
            </div>
            <div>
              <div className="text-label-sm text-outline font-medium">Current P&amp;L</div>
              <div
                className={`text-headline-sm tabular-nums font-semibold mt-1 ${
                  isPos ? "text-tertiary" : "text-error"
                }`}
              >
                {isPos ? "+" : ""}{formatINR(totalPnL)}
              </div>
            </div>
            <div>
              <div className="text-label-sm text-outline font-medium">Available Cash</div>
              <div className="text-headline-sm text-on-surface tabular-nums font-semibold mt-1">
                {formatINR(portfolio?.available_cash ?? 124500)}
              </div>
            </div>
            <div>
              <div className="text-label-sm text-outline font-medium">Locked Margin</div>
              <div className="text-headline-sm text-on-surface tabular-nums font-semibold mt-1">
                {formatINR(portfolio?.cash_balance ? Math.max(0, portfolio.cash_balance - portfolio.available_cash) : 0)}
              </div>
            </div>
          </div>

          {/* Portfolio Performance SVG Chart */}
          <div className="w-full h-44 mt-space-md relative">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 800 160">
              <defs>
                <linearGradient id="portfolio-gradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 120 Q 100 100 200 110 T 400 70 T 600 40 T 800 20 L 800 160 L 0 160 Z"
                fill="url(#portfolio-gradient)"
              />
              <path
                d="M 0 120 Q 100 100 200 110 T 400 70 T 600 40 T 800 20"
                fill="none"
                stroke="#4f46e5"
                strokeWidth="2.5"
              />
            </svg>
            <div className="flex justify-between text-body-sm text-outline pt-2">
              <span>09:15 AM</span>
              <span>11:00 AM</span>
              <span>01:00 PM</span>
              <span>03:00 PM</span>
              <span>03:30 PM</span>
            </div>
          </div>
        </div>

        {/* Quick Watchlist Preview Section */}
        <div className="bg-surface-container-lowest p-space-lg sm:p-space-xl rounded-xl shadow-xs border border-outline-variant/30 flex flex-col gap-space-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
            <div>
              <h2 className="text-headline-md text-on-surface font-semibold tracking-tight">Active Watchlist</h2>
              <p className="text-body-sm text-outline">Real-time market quotes and rapid order execution</p>
            </div>
            <Link
              href="/watchlist"
              className="text-primary text-label-md hover:underline flex items-center gap-space-xs"
            >
              <span>Manage Watchlists</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

          <div className="w-full overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-label-sm text-outline border-b border-outline-variant/20">
                  <th className="py-space-sm px-space-md font-medium">Instrument</th>
                  <th className="py-space-sm px-space-md font-medium text-right">LTP (₹)</th>
                  <th className="py-space-sm px-space-md font-medium text-right">Change</th>
                  <th className="py-space-sm px-space-md font-medium text-right">Volume</th>
                  <th className="py-space-sm px-space-md font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-body-md">
                {DEFAULT_WATCHLIST.map((item) => {
                  const live = livePrices[item.symbol];
                  const price = live?.ltp ?? item.ltp;
                  const change = live?.change ?? item.change;
                  const changePct = live?.change_percent ?? item.change_percent;
                  const itemIsPos = change >= 0;

                  return (
                    <tr key={item.symbol} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-space-md px-space-md">
                        <Link href={`/stocks/${encodeURIComponent(item.symbol)}`} className="group">
                          <div className="font-semibold text-on-surface group-hover:text-primary transition-colors">
                            {item.symbol}
                          </div>
                          <div className="text-body-sm text-outline">{item.name}</div>
                        </Link>
                      </td>
                      <td className="py-space-md px-space-md text-right font-semibold tabular-nums text-on-surface">
                        {formatStockPrice(price)}
                      </td>
                      <td
                        className={`py-space-md px-space-md text-right font-medium tabular-nums ${
                          itemIsPos ? "text-tertiary" : "text-error"
                        }`}
                      >
                        {itemIsPos ? "+" : ""}{change.toFixed(2)} ({itemIsPos ? "+" : ""}{changePct.toFixed(2)}%)
                      </td>
                      <td className="py-space-md px-space-md text-right font-normal tabular-nums text-outline">
                        {item.volume}
                      </td>
                      <td className="py-space-md px-space-md text-center">
                        <div className="flex items-center justify-center gap-space-xs">
                          <button
                            onClick={() => openTradeModal(item.symbol, item.name, "BUY")}
                            className="px-space-sm py-space-xs bg-tertiary-container/10 text-tertiary hover:bg-tertiary-container/20 rounded text-label-sm font-semibold transition-colors"
                          >
                            BUY
                          </button>
                          <button
                            onClick={() => openTradeModal(item.symbol, item.name, "SELL")}
                            className="px-space-sm py-space-xs bg-error-container text-error hover:opacity-90 rounded text-label-sm font-semibold transition-opacity"
                          >
                            SELL
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Most Traded Stocks and Top Gainers/Losers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
          {/* Top Gainers */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs border border-outline-variant/30 flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/20">
              <h3 className="text-headline-sm text-on-surface font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-tertiary">trending_up</span>
                <span>Top Gainers Today</span>
              </h3>
              <Link href="/explore" className="text-primary text-label-sm hover:underline">
                View All
              </Link>
            </div>
            <div className="flex flex-col gap-space-sm">
              {(movers?.gainers && movers.gainers.length > 0
                ? movers.gainers.slice(0, 4)
                : [
                    { symbol: "TATASTEEL", price: 154.2, change_percent: 3.45, change: 5.15 },
                    { symbol: "BHARTIARTL", price: 1290.5, change_percent: 2.8, change: 35.2 },
                    { symbol: "RELIANCE", price: 2980.5, change_percent: 1.54, change: 45.2 },
                    { symbol: "HDFCBANK", price: 1510.25, change_percent: 0.81, change: 12.1 },
                  ]
              ).map((g) => (
                <Link
                  key={g.symbol}
                  href={`/stocks/${encodeURIComponent(g.symbol)}`}
                  className="flex items-center justify-between p-space-sm bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors"
                >
                  <div>
                    <div className="font-semibold text-on-surface text-sm">{g.symbol}</div>
                    <div className="text-body-sm text-outline">{formatStockPrice(g.price)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-tertiary font-semibold tabular-nums text-sm">
                      +{g.change_percent.toFixed(2)}%
                    </div>
                    <div className="text-body-sm text-outline tabular-nums">+{g.change?.toFixed(2) || "0.00"}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Top Losers */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs border border-outline-variant/30 flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/20">
              <h3 className="text-headline-sm text-on-surface font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-error">trending_down</span>
                <span>Top Losers Today</span>
              </h3>
              <Link href="/explore" className="text-primary text-label-sm hover:underline">
                View All
              </Link>
            </div>
            <div className="flex flex-col gap-space-sm">
              {(movers?.losers && movers.losers.length > 0
                ? movers.losers.slice(0, 4)
                : [
                    { symbol: "WIPRO", price: 472.1, change_percent: -2.8, change: -13.6 },
                    { symbol: "AXISBANK", price: 1050.4, change_percent: -1.95, change: -20.9 },
                    { symbol: "BAJFINANCE", price: 6890.0, change_percent: -1.45, change: -101.2 },
                    { symbol: "TCS", price: 4120.0, change_percent: -0.44, change: -18.3 },
                  ]
              ).map((l) => (
                <Link
                  key={l.symbol}
                  href={`/stocks/${encodeURIComponent(l.symbol)}`}
                  className="flex items-center justify-between p-space-sm bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors"
                >
                  <div>
                    <div className="font-semibold text-on-surface text-sm">{l.symbol}</div>
                    <div className="text-body-sm text-outline">{formatStockPrice(l.price)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-error font-semibold tabular-nums text-sm">
                      {l.change_percent.toFixed(2)}%
                    </div>
                    <div className="text-body-sm text-outline tabular-nums">{l.change?.toFixed(2) || "0.00"}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Right Sidebar Column (4 cols on xl) */}
      {/* ========================================================= */}
      <div className="xl:col-span-4 flex flex-col gap-space-lg lg:gap-space-xl">
        {/* Quick Buy/Sell Order Execution Widget */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs border border-outline-variant/30 flex flex-col gap-space-md">
          <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/20">
            <div className="flex items-center gap-space-xs">
              <select
                value={inlineSymbol}
                onChange={(e) => setInlineSymbol(e.target.value)}
                className="font-semibold text-on-surface bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="RELIANCE">RELIANCE</option>
                <option value="TCS">TCS</option>
                <option value="HDFCBANK">HDFCBANK</option>
                <option value="INFY">INFY</option>
                <option value="ICICIBANK">ICICIBANK</option>
              </select>
              <span className="text-label-sm px-1.5 py-0.5 bg-surface-container text-outline rounded font-mono">NSE</span>
            </div>
            <div className="text-right">
              <div className="text-headline-sm text-on-surface tabular-nums font-semibold">
                {formatStockPrice(activeLtp)}
              </div>
              <div
                className={`text-body-sm tabular-nums font-medium ${
                  (livePrices[inlineSymbol]?.change ?? 1.54) >= 0 ? "text-tertiary" : "text-error"
                }`}
              >
                {(livePrices[inlineSymbol]?.change ?? 1.54) >= 0 ? "+" : ""}
                {(livePrices[inlineSymbol]?.change_percent ?? 1.54).toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Buy/Sell Toggle Tabs */}
          <div className="grid grid-cols-2 gap-space-xs p-1 bg-surface-container-low rounded-lg">
            <button
              onClick={() => setInlineSide("BUY")}
              className={`py-space-xs font-semibold rounded text-label-md transition-all shadow-xs ${
                inlineSide === "BUY"
                  ? "bg-tertiary-container text-on-tertiary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              BUY
            </button>
            <button
              onClick={() => setInlineSide("SELL")}
              className={`py-space-xs font-semibold rounded text-label-md transition-all shadow-xs ${
                inlineSide === "SELL"
                  ? "bg-error text-on-error"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              SELL
            </button>
          </div>

          {/* Product Type Toggle (CNC vs MIS) */}
          <div className="flex flex-col gap-space-xs">
            <label className="text-label-sm text-outline font-medium">Product Type</label>
            <div className="grid grid-cols-2 gap-space-sm">
              <label
                onClick={() => setInlineProduct("CNC")}
                className={`flex items-center gap-space-xs p-space-sm rounded-lg cursor-pointer border transition-colors ${
                  inlineProduct === "CNC"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-outline-variant/30 text-on-surface"
                }`}
              >
                <input
                  type="radio"
                  checked={inlineProduct === "CNC"}
                  onChange={() => setInlineProduct("CNC")}
                  className="accent-primary"
                />
                <span className="text-label-md font-medium">Delivery (CNC)</span>
              </label>

              <label
                onClick={() => setInlineProduct("MIS")}
                className={`flex items-center gap-space-xs p-space-sm rounded-lg cursor-pointer border transition-colors ${
                  inlineProduct === "MIS"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-outline-variant/30 text-on-surface"
                }`}
              >
                <input
                  type="radio"
                  checked={inlineProduct === "MIS"}
                  onChange={() => setInlineProduct("MIS")}
                  className="accent-primary"
                />
                <span className="text-label-md font-medium">Intraday (MIS)</span>
              </label>
            </div>
          </div>

          {/* Quantity & Price Inputs */}
          <div className="grid grid-cols-2 gap-space-md">
            <div className="flex flex-col gap-space-xs">
              <label className="text-label-sm text-outline font-medium">Quantity (Shares)</label>
              <input
                type="number"
                min="1"
                value={inlineQty}
                onChange={(e) => setInlineQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-space-md py-space-xs bg-surface-container-low rounded-lg border-0 text-on-surface focus:ring-1 focus:ring-primary font-medium tabular-nums"
              />
            </div>
            <div className="flex flex-col gap-space-xs">
              <label className="text-label-sm text-outline font-medium">Price (₹)</label>
              <input
                type="number"
                step="0.05"
                disabled={inlineExecType === "MARKET"}
                value={inlinePrice}
                onChange={(e) => setInlinePrice(parseFloat(e.target.value) || activeLtp)}
                className="w-full px-space-md py-space-xs bg-surface-container-low rounded-lg border-0 text-on-surface focus:ring-1 focus:ring-primary font-medium tabular-nums disabled:opacity-60"
              />
            </div>
          </div>

          {/* Order Subtype Market/Limit */}
          <div className="flex items-center gap-space-md text-body-md pt-space-xs">
            <label className="flex items-center gap-space-xs cursor-pointer text-sm font-medium">
              <input
                type="radio"
                name="exec_type"
                checked={inlineExecType === "MARKET"}
                onChange={() => setInlineExecType("MARKET")}
                className="accent-primary"
              />
              <span>Market</span>
            </label>
            <label className="flex items-center gap-space-xs cursor-pointer text-sm font-medium">
              <input
                type="radio"
                name="exec_type"
                checked={inlineExecType === "LIMIT"}
                onChange={() => setInlineExecType("LIMIT")}
                className="accent-primary"
              />
              <span>Limit</span>
            </label>
          </div>

          {/* Margin Required Summary */}
          <div className="flex items-center justify-between p-space-sm bg-surface-container-low rounded-lg text-body-sm">
            <span className="text-outline font-normal">Margin Required</span>
            <span className="font-semibold text-on-surface tabular-nums">
              {formatINR(marginRequired)}
            </span>
          </div>

          {orderSuccessMsg && (
            <div className="p-2.5 rounded-lg bg-tertiary-container/15 text-tertiary text-xs font-medium text-center">
              {orderSuccessMsg}
            </div>
          )}

          {/* Execute Action Button */}
          <button
            onClick={handleQuickOrder}
            disabled={isExecuting}
            className={`w-full py-space-md rounded-lg font-semibold transition-opacity shadow-xs flex items-center justify-center gap-space-xs text-on-primary ${
              inlineSide === "BUY" ? "bg-tertiary hover:opacity-95" : "bg-error hover:opacity-95"
            } ${isExecuting ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>
              {isExecuting
                ? "Submitting Order..."
                : `${inlineSide === "BUY" ? "Buy" : "Sell"} ${inlineQty} ${inlineSymbol}`}
            </span>
          </button>
        </div>

        {/* Market Mood Index Widget */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs border border-outline-variant/30 flex flex-col gap-space-md">
          <h3 className="text-headline-sm text-on-surface font-semibold">Market Mood Index</h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-headline-md text-tertiary font-semibold">68 / 100</div>
              <div className="text-body-sm text-outline">Greed Zone</div>
            </div>
            <div className="w-14 h-14 rounded-full bg-tertiary-container/15 flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[28px]">sentiment_satisfied</span>
            </div>
          </div>
          <div className="w-full bg-surface-container-low h-2 rounded-full overflow-hidden">
            <div className="bg-tertiary h-full rounded-full" style={{ width: "68%" }} />
          </div>
          <div className="flex justify-between text-body-sm text-outline text-xs">
            <span>Extreme Fear</span>
            <span>Neutral</span>
            <span>Extreme Greed</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Market News Feed Section */}
      {/* ========================================================= */}
      <div className="xl:col-span-12 mt-space-md">
        <div className="bg-surface-container-lowest p-space-lg sm:p-space-xl rounded-xl shadow-xs border border-outline-variant/30 flex flex-col gap-space-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface font-semibold flex items-center gap-space-xs tracking-tight">
              <span className="material-symbols-outlined text-primary">feed</span>
              <span>Market News &amp; Insights</span>
            </h2>
            <Link href="/explore" className="text-primary text-label-md hover:underline flex items-center gap-space-xs">
              <span>View All Stories</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
            {/* News Card 1 */}
            <div className="flex flex-col gap-space-sm group cursor-pointer">
              <div className="w-full h-40 rounded-lg overflow-hidden bg-surface-container-low relative">
                <div
                  className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-300"
                  style={{
                    backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCqu0of__u826pWFljfFXJV7UinbAk3WeneEaC_BVc4ugF-04cObZffR3D0yiHrcED5IpVmeJzqad-GjvLp7G5BOPiyvrHBT2oix7Hjj_k0VcVQRwufwYPdR56cFrs1Aa0sVCJP8J4yiGScOOmnu40-QZ3zZ8-muPKfzOuxRvr8LpX8QnN8qZ1K2XanaNOjtokw3AotVAjLlyg6IfbgWMOWOGEjgyc7TcPR2TCwb64pLcME25soRnmF')",
                  }}
                />
                <span className="absolute top-space-xs left-space-xs px-space-sm py-0.5 bg-primary text-on-primary text-label-sm rounded font-medium">
                  Economy
                </span>
              </div>
              <div className="text-body-sm text-outline">10 mins ago • Monetary Policy</div>
              <h3 className="text-headline-sm text-on-surface group-hover:text-primary transition-colors line-clamp-2 font-semibold">
                RBI keeps repo rate steady, outlines liquidity roadmap for banking system
              </h3>
            </div>

            {/* News Card 2 */}
            <div className="flex flex-col gap-space-sm group cursor-pointer">
              <div className="w-full h-40 rounded-lg overflow-hidden bg-surface-container-low relative">
                <div
                  className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-300"
                  style={{
                    backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC02GbC4DCVZgbq_EFHwjg5f-QC5b-RmkSB6KuEyWywcRr2nSKJvhEdC7TSk8wuopmSypuX5uzxV_TWgH5_HyNuOROYGMgkgIju-46Y13hllLIQHnPVj5J5HsRE-GsH8WPB70qSf5HFCu0L3S9MvgLjRqw9k61HWqim9M80kjdqRDs5rlPy1YW0pkCog35szmRMELMj99euBs3Qlcz0-H7S2OWI8BtwEAY_PLHQ1Djb94pNiaZV01J-')",
                  }}
                />
                <span className="absolute top-space-xs left-space-xs px-space-sm py-0.5 bg-secondary text-on-secondary text-label-sm rounded font-medium">
                  Technology
                </span>
              </div>
              <div className="text-body-sm text-outline">45 mins ago • Tech Earnings</div>
              <h3 className="text-headline-sm text-on-surface group-hover:text-primary transition-colors line-clamp-2 font-semibold">
                Indian IT firms post resilient Q2 deals pipeline amid global cloud spend rebound
              </h3>
            </div>

            {/* News Card 3 */}
            <div className="flex flex-col gap-space-sm group cursor-pointer">
              <div className="w-full h-40 rounded-lg overflow-hidden bg-surface-container-low relative">
                <div
                  className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-300"
                  style={{
                    backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCsF8PdCkpCRvgAObtFTcpe5OfYGf5pv50-ROzS4d2E8y4SIThekKQdiWiT6Weqxd9btru6EqGfVfQ9oL7suDp1BRqHLI7pqDls0wzOiP3PVN2-WErHMMM0nxxp5cpdQHoYMqAYSKM98XYf0JC7ptnaoZ2gmKQAWeQFNBDZvmj_Ju1L6Z6q7XCOL63dyySoKfZj2xnw7s4AYt0smEmsSZflXGhYM3X6_a7gGpUF-DnAF-T7oLPSV7Hj')",
                  }}
                />
                <span className="absolute top-space-xs left-space-xs px-space-sm py-0.5 bg-tertiary text-on-tertiary text-label-sm rounded font-medium">
                  Energy
                </span>
              </div>
              <div className="text-body-sm text-outline">1 hour ago • Infrastructure</div>
              <h3 className="text-headline-sm text-on-surface group-hover:text-primary transition-colors line-clamp-2 font-semibold">
                Renewable power capex surges 28% YoY across primary green hydrogen initiatives
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Real Order Pad for trading */}
      <OrderPadModal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        stockId={orderTarget.symbol}
        symbol={orderTarget.symbol}
        companyName={orderTarget.name}
        defaultSide={orderTarget.side}
        onOrderSuccess={() => {
          loadDashboardData();
        }}
      />
    </div>
  );
}
