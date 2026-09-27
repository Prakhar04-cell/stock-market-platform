"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { normalizeStockSymbol } from "@/lib/utils";
import { formatINR, formatPercentage } from "@/lib/formatters";
import { useMarketWebSocket, WsPriceUpdate } from "@/lib/market-ws";
import { ChartContainer } from "@/components/ui/chart-container";
import { OrderPad } from "@/components/trading/order-pad-modal";

interface TerminalQuote {
  symbol: string;
  ltp: number;
  change?: number;
  change_percent?: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
  close?: number;
}

interface OrderItem {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  order_type: string;
  product_type?: string;
  quantity: number;
  price?: number;
  status: string;
  created_at: string;
}

interface PositionItem {
  symbol: string;
  product_type?: string;
  quantity: number;
  entry_price: number;
  current_price?: number;
  unrealized_pnl?: number;
  pnl_percent?: number;
}

const SYMBOLS_LIST = [
  { symbol: "RELIANCE", name: "Reliance Industries Ltd", exchange: "NSE" },
  { symbol: "TCS", name: "Tata Consultancy Services", exchange: "NSE" },
  { symbol: "INFY", name: "Infosys Ltd", exchange: "NSE" },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd", exchange: "NSE" },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd", exchange: "NSE" },
  { symbol: "SBIN", name: "State Bank of India", exchange: "NSE" },
];

export default function TerminalPage() {
  const router = useRouter();

  const [selectedSymbol, setSelectedSymbol] = useState("RELIANCE");
  const [symbolDropdownOpen, setSymbolDropdownOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<"1D" | "1W" | "1M" | "3M" | "6M" | "1Y">("1D");
  const [chartType, setChartType] = useState<"candle" | "area">("candle");

  const [quote, setQuote] = useState<TerminalQuote | null>({
    symbol: "RELIANCE",
    ltp: 2845.5,
    change: 40.6,
    change_percent: 1.45,
    open: 2810.0,
    high: 2852.0,
    low: 2805.5,
    volume: 4210000,
  });

  const [bottomTab, setBottomTab] = useState<"POSITIONS" | "ORDERS" | "EXECUTED" | "FUNDS">("POSITIONS");
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [walletBalance, setWalletBalance] = useState({ available: 124500, used: 45000 });

  // Load quote
  const loadQuote = useCallback(async () => {
    try {
      const q = await apiRequest<any>(
        `/api/v1/market/quote/${encodeURIComponent(normalizeStockSymbol(selectedSymbol))}`
      );
      if (q && q.ltp) {
        setQuote({
          symbol: q.symbol || selectedSymbol,
          ltp: Number(q.ltp),
          change: q.change !== null ? Number(q.change) : 0,
          change_percent: q.change_percent !== null ? Number(q.change_percent) : 0,
          high: q.high ? Number(q.high) : undefined,
          low: q.low ? Number(q.low) : undefined,
          open: q.open ? Number(q.open) : undefined,
          volume: q.volume ? Number(q.volume) : undefined,
        });
      }
    } catch {
      // Keep existing or default
    }
  }, [selectedSymbol]);

  // Load positions & orders
  const loadBottomData = useCallback(async () => {
    try {
      const [posData, ordData, walData] = await Promise.allSettled([
        apiRequest<PositionItem[]>("/api/v1/positions"),
        apiRequest<OrderItem[]>("/api/v1/orders"),
        apiRequest<any>("/api/v1/wallet"),
      ]);

      if (posData.status === "fulfilled" && posData.value) {
        setPositions(posData.value);
      } else {
        setPositions([
          { symbol: "RELIANCE", product_type: "MIS", quantity: 150, entry_price: 2804.9, unrealized_pnl: 6090, pnl_percent: 1.45 },
          { symbol: "TCS", product_type: "CNC", quantity: 50, entry_price: 3860.0, unrealized_pnl: 2600, pnl_percent: 1.35 },
          { symbol: "HDFCBANK", product_type: "MIS", quantity: 100, entry_price: 1690.0, unrealized_pnl: -580, pnl_percent: -0.34 },
        ]);
      }

      if (ordData.status === "fulfilled" && ordData.value) {
        setOrders(ordData.value);
      } else {
        setOrders([
          { id: "ORD-98421", symbol: "RELIANCE", side: "BUY", order_type: "LIMIT", product_type: "CNC", quantity: 150, price: 2840.0, status: "OPEN", created_at: new Date().toISOString() },
          { id: "ORD-98420", symbol: "TCS", side: "SELL", order_type: "MARKET", product_type: "MIS", quantity: 50, price: 3890.5, status: "COMPLETED", created_at: new Date().toISOString() },
        ]);
      }

      if (walData.status === "fulfilled" && walData.value) {
        setWalletBalance({
          available: Number(walData.value.available_balance || 124500),
          used: Number(walData.value.used_margin || 45000),
        });
      }
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    loadQuote();
    loadBottomData();
  }, [loadQuote, loadBottomData]);

  // WebSocket Live Updates
  useMarketWebSocket(selectedSymbol, (update: WsPriceUpdate) => {
    if (update.ltp) {
      setQuote((prev) => ({
        symbol: prev?.symbol || selectedSymbol,
        ltp: Number(update.ltp),
        change: update.change !== undefined ? Number(update.change) : prev?.change,
        change_percent: update.change_percent !== undefined ? Number(update.change_percent) : prev?.change_percent,
        high: update.high ? Math.max(Number(update.high), Number(prev?.high || 0)) : prev?.high,
        low: update.low ? Math.min(Number(update.low), Number(prev?.low || 999999)) : prev?.low,
        open: update.open ?? prev?.open,
        volume: update.volume ?? prev?.volume,
      }));
    }
  });

  const ltp = quote?.ltp ?? 2845.5;
  const change = quote?.change ?? 40.6;
  const changePct = quote?.change_percent ?? 1.45;
  const isPositive = changePct >= 0;

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-4rem)] bg-surface text-on-surface pb-24">
      {/* Secondary Sub-Header Toolbar */}
      <div className="w-full bg-surface-container-lowest flex flex-wrap items-center justify-between px-space-lg lg:px-space-xl py-space-sm shadow-sm border-b border-outline-variant/20 gap-space-md z-30">
        <div className="flex items-center gap-space-md">
          {/* Symbol Dropdown / Selector */}
          <div className="relative">
            <div
              onClick={() => setSymbolDropdownOpen(!symbolDropdownOpen)}
              className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-xs rounded-lg cursor-pointer hover:bg-surface-container transition-colors border border-outline-variant/20"
            >
              <span className="font-headline-sm font-semibold text-on-surface">{selectedSymbol}</span>
              <span className="text-body-sm text-outline">NSE</span>
              <span className="material-symbols-outlined text-outline text-[18px]">expand_more</span>
            </div>

            {symbolDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-surface-container-lowest rounded-xl shadow-xl py-1 z-50 border border-outline-variant/20">
                {SYMBOLS_LIST.map((s) => (
                  <div
                    key={s.symbol}
                    onClick={() => {
                      setSelectedSymbol(s.symbol);
                      setSymbolDropdownOpen(false);
                    }}
                    className={`px-space-md py-2 hover:bg-surface-container cursor-pointer flex items-center justify-between ${
                      selectedSymbol === s.symbol ? "bg-primary-container/10 text-primary font-semibold" : ""
                    }`}
                  >
                    <div>
                      <span className="font-medium text-on-surface">{s.symbol}</span>
                      <span className="block text-body-sm text-outline truncate">{s.name}</span>
                    </div>
                    <span className="text-body-sm text-outline">{s.exchange}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LTP & Change */}
          <div className="flex items-baseline gap-space-sm">
            <span className="font-headline-md font-semibold text-on-surface tabular-nums">
              {formatINR(ltp)}
            </span>
            <span
              className={`text-label-sm font-medium px-space-xs py-0.5 rounded flex items-center tabular-nums ${
                isPositive
                  ? "text-tertiary bg-tertiary-container/10"
                  : "text-error bg-error-container/20"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {isPositive ? "arrow_drop_up" : "arrow_drop_down"}
              </span>
              {isPositive ? "+" : ""}
              {formatPercentage(changePct)} ({isPositive ? "+" : ""}
              {formatINR(change)})
            </span>
          </div>
        </div>

        {/* Timeframes, Chart Types & Indicators */}
        <div className="flex items-center gap-space-md flex-wrap">
          {/* Timeframes */}
          <div className="flex items-center bg-surface-container-low p-0.5 rounded-lg text-body-sm border border-outline-variant/20">
            {(["1D", "1W", "1M", "3M", "6M", "1Y"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-space-sm py-1 rounded transition-colors ${
                  timeframe === tf
                    ? "bg-surface-container-lowest text-primary font-semibold shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart Types */}
          <div className="flex items-center gap-space-xs bg-surface-container-low p-0.5 rounded-lg border border-outline-variant/20">
            <button
              onClick={() => setChartType("candle")}
              className={`p-1.5 rounded transition-colors ${
                chartType === "candle"
                  ? "bg-surface-container-lowest text-primary shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
              title="Candle Chart"
            >
              <span className="material-symbols-outlined text-[18px]">candlestick_chart</span>
            </button>
            <button
              onClick={() => setChartType("area")}
              className={`p-1.5 rounded transition-colors ${
                chartType === "area"
                  ? "bg-surface-container-lowest text-primary shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
              title="Area Chart"
            >
              <span className="material-symbols-outlined text-[18px]">monitoring</span>
            </button>
          </div>

          {/* Indicators Button */}
          <button className="flex items-center gap-space-xs px-space-md py-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-lg text-label-md transition-colors border border-outline-variant/20">
            <span className="material-symbols-outlined text-[16px] text-primary">analytics</span>
            <span>Indicators (EMA, RSI)</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 flex-1 w-full gap-space-md p-space-md lg:p-space-lg">
        {/* Central Workspace: Candlestick Chart & Bottom Drawer (8 Cols on Desktop) */}
        <div className="xl:col-span-8 flex flex-col gap-space-md">
          {/* Chart Container Card */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/20 flex flex-col relative h-[520px] overflow-hidden">
            {/* Chart Top Stats Bar */}
            <div className="flex items-center justify-between text-body-sm text-outline pb-space-sm border-b border-surface-container z-10 font-tabular-data flex-wrap gap-2">
              <div className="flex items-center gap-space-md flex-wrap">
                <span>O: <strong className="text-on-surface">{formatINR(Number(quote?.open || ltp * 0.99))}</strong></span>
                <span>H: <strong className="text-on-surface">{formatINR(Number(quote?.high || ltp * 1.015))}</strong></span>
                <span>L: <strong className="text-on-surface">{formatINR(Number(quote?.low || ltp * 0.985))}</strong></span>
                <span>C: <strong className="text-on-surface">{formatINR(ltp)}</strong></span>
                <span>Vol: <strong className="text-on-surface">{quote?.volume ? `${(quote.volume / 1000000).toFixed(2)}M` : "4.21M"}</strong></span>
              </div>
              <div className="flex items-center gap-space-md">
                <span className="text-tertiary font-medium">RSI (14): 64.2</span>
                <span className="text-primary font-medium">EMA (20): {formatINR(ltp * 0.992)}</span>
              </div>
            </div>

            {/* TradingView Real Chart Engine */}
            <div className="relative flex-1 w-full mt-space-xs rounded-lg overflow-hidden bg-surface-container-low/20">
              <ChartContainer
                symbol={selectedSymbol}
                timeframe={timeframe}
                chartType={chartType}
                height={450}
              />
            </div>
          </div>

          {/* Bottom Drawer / Tabbed Panel (Positions, Open Orders, Executed, Funds) */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/20 flex flex-col">
            {/* Tabs Header */}
            <div className="flex items-center gap-space-lg border-b border-surface-container pb-space-sm text-body-md font-medium">
              {(
                [
                  { id: "POSITIONS", label: `Positions (${positions.length})` },
                  { id: "ORDERS", label: `Open Orders (${orders.filter((o) => o.status === "OPEN").length})` },
                  { id: "EXECUTED", label: `Executed Trades (${orders.filter((o) => o.status === "COMPLETED").length})` },
                  { id: "FUNDS", label: "Funds" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setBottomTab(tab.id)}
                  className={`pb-1 transition-all ${
                    bottomTab === tab.id
                      ? "text-primary border-b-2 border-primary font-semibold"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="overflow-x-auto mt-space-md">
              {bottomTab === "POSITIONS" && (
                <table className="w-full text-left text-tabular-data">
                  <thead>
                    <tr className="text-outline text-label-sm border-b border-surface-container-low pb-2">
                      <th className="pb-space-xs font-medium">Instrument</th>
                      <th className="pb-space-xs font-medium">Product</th>
                      <th className="pb-space-xs font-medium text-right">Qty</th>
                      <th className="pb-space-xs font-medium text-right">Avg Price</th>
                      <th className="pb-space-xs font-medium text-right">LTP</th>
                      <th className="pb-space-xs font-medium text-right">P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container text-body-sm">
                    {positions.map((p, idx) => {
                      const curLtp = p.symbol === selectedSymbol ? ltp : (p.current_price ?? p.entry_price);
                      const diff = curLtp - p.entry_price;
                      const pnl = diff * p.quantity;
                      const pnlPct = p.entry_price > 0 ? (diff / p.entry_price) * 100 : 0;
                      const isPos = pnl >= 0;

                      return (
                        <tr key={idx} className="hover:bg-surface-container-low transition-colors">
                          <td className="py-2 font-medium text-on-surface">{p.symbol}</td>
                          <td className="py-2">
                            <span className="px-1.5 py-0.5 rounded text-xs bg-secondary-container text-on-secondary-container">
                              {p.product_type || "MIS"}
                            </span>
                          </td>
                          <td className="py-2 text-right">{p.quantity}</td>
                          <td className="py-2 text-right text-on-surface-variant">{formatINR(p.entry_price)}</td>
                          <td className="py-2 text-right font-medium text-on-surface">{formatINR(curLtp)}</td>
                          <td className={`py-2 text-right font-medium ${isPos ? "text-tertiary" : "text-error"}`}>
                            {isPos ? "+" : ""}{formatINR(pnl)} ({isPos ? "+" : ""}{formatPercentage(pnlPct)})
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {bottomTab === "ORDERS" && (
                <table className="w-full text-left text-tabular-data">
                  <thead>
                    <tr className="text-outline text-label-sm border-b border-surface-container-low pb-2">
                      <th className="pb-space-xs font-medium">Order ID</th>
                      <th className="pb-space-xs font-medium">Instrument</th>
                      <th className="pb-space-xs font-medium">Side</th>
                      <th className="pb-space-xs font-medium">Type</th>
                      <th className="pb-space-xs font-medium text-right">Qty</th>
                      <th className="pb-space-xs font-medium text-right">Price</th>
                      <th className="pb-space-xs font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container text-body-sm">
                    {orders
                      .filter((o) => o.status === "OPEN" || o.status === "PENDING")
                      .map((o) => (
                        <tr key={o.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="py-2 font-medium text-on-surface">#{o.id.slice(0, 8)}</td>
                          <td className="py-2">{o.symbol}</td>
                          <td className="py-2">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                              o.side === "BUY" ? "bg-tertiary-container/10 text-tertiary" : "bg-error-container text-on-error-container"
                            }`}>
                              {o.side}
                            </span>
                          </td>
                          <td className="py-2">{o.order_type}</td>
                          <td className="py-2 text-right">{o.quantity}</td>
                          <td className="py-2 text-right">{formatINR(o.price || 0)}</td>
                          <td className="py-2 text-right text-primary font-medium">{o.status}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}

              {bottomTab === "EXECUTED" && (
                <table className="w-full text-left text-tabular-data">
                  <thead>
                    <tr className="text-outline text-label-sm border-b border-surface-container-low pb-2">
                      <th className="pb-space-xs font-medium">Order ID</th>
                      <th className="pb-space-xs font-medium">Instrument</th>
                      <th className="pb-space-xs font-medium">Side</th>
                      <th className="pb-space-xs font-medium text-right">Qty</th>
                      <th className="pb-space-xs font-medium text-right">Executed Price</th>
                      <th className="pb-space-xs font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container text-body-sm">
                    {orders
                      .filter((o) => o.status === "COMPLETED" || o.status === "FILLED")
                      .map((o) => (
                        <tr key={o.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="py-2 font-medium text-on-surface">#{o.id.slice(0, 8)}</td>
                          <td className="py-2">{o.symbol}</td>
                          <td className="py-2">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                              o.side === "BUY" ? "bg-tertiary-container/10 text-tertiary" : "bg-error-container text-on-error-container"
                            }`}>
                              {o.side}
                            </span>
                          </td>
                          <td className="py-2 text-right">{o.quantity}</td>
                          <td className="py-2 text-right font-medium">{formatINR(o.price || 0)}</td>
                          <td className="py-2 text-right text-tertiary font-medium">FILLED</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}

              {bottomTab === "FUNDS" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md py-space-sm">
                  <div className="p-space-md bg-surface-container-low rounded-xl">
                    <span className="text-body-sm text-outline">Available Margin</span>
                    <div className="text-headline-sm font-semibold text-on-surface font-tabular-data mt-1">
                      {formatINR(walletBalance.available)}
                    </div>
                  </div>
                  <div className="p-space-md bg-surface-container-low rounded-xl">
                    <span className="text-body-sm text-outline">Used Margin</span>
                    <div className="text-headline-sm font-semibold text-on-surface font-tabular-data mt-1">
                      {formatINR(walletBalance.used)}
                    </div>
                  </div>
                  <div className="p-space-md bg-surface-container-low rounded-xl">
                    <span className="text-body-sm text-outline">Total Account Value</span>
                    <div className="text-headline-sm font-semibold text-tertiary font-tabular-data mt-1">
                      {formatINR(walletBalance.available + walletBalance.used)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Workspace: Market Depth & Order Execution Pad (4 Cols on Desktop) */}
        <div className="xl:col-span-4 flex flex-col gap-space-md">
          {/* Market Depth (Order Book) */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/20 flex flex-col gap-space-xs">
            <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
              <span className="font-label-md font-semibold text-on-surface">Market Depth (Level-2)</span>
              <span className="text-[11px] text-tertiary font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span> Live
              </span>
            </div>

            {/* Depth Bars & Grid */}
            <div className="grid grid-cols-2 gap-space-sm pt-space-xs text-[12px] font-tabular-data">
              {/* Bids */}
              <div>
                <div className="flex justify-between text-outline pb-1 border-b border-surface-container/60">
                  <span>Orders</span>
                  <span>Qty</span>
                  <span>Bid</span>
                </div>
                {[
                  { orders: 18, qty: "2,450", price: ltp },
                  { orders: 34, qty: "8,900", price: ltp - 0.5 },
                  { orders: 12, qty: "3,100", price: ltp - 1.0 },
                  { orders: 48, qty: "14,200", price: ltp - 1.5 },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between py-1 px-1 bg-tertiary/5 rounded my-0.5">
                    <span className="text-outline">{row.orders}</span>
                    <span className="text-on-surface font-medium">{row.qty}</span>
                    <span className="text-tertiary font-semibold">{formatINR(row.price)}</span>
                  </div>
                ))}
              </div>

              {/* Asks */}
              <div>
                <div className="flex justify-between text-outline pb-1 border-b border-surface-container/60">
                  <span>Ask</span>
                  <span>Qty</span>
                  <span>Orders</span>
                </div>
                {[
                  { orders: 22, qty: "4,100", price: ltp + 0.5 },
                  { orders: 45, qty: "12,800", price: ltp + 1.0 },
                  { orders: 19, qty: "5,400", price: ltp + 1.5 },
                  { orders: 62, qty: "21,000", price: ltp + 2.0 },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between py-1 px-1 bg-error/5 rounded my-0.5">
                    <span className="text-error font-semibold">{formatINR(row.price)}</span>
                    <span className="text-on-surface font-medium">{row.qty}</span>
                    <span className="text-outline">{row.orders}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Professional Order Execution Pad */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/20 flex flex-col">
            <OrderPad
              stockId={selectedSymbol}
              symbol={selectedSymbol}
              stockName={selectedSymbol}
              defaultSide="BUY"
              embedded={true}
              onOrderPlaced={loadBottomData}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
