"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  Maximize2,
  ChevronDown,
  Layers,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { formatCurrency, normalizeStockSymbol } from "@/lib/utils";
import { useMarketWebSocket } from "@/lib/market-ws";
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
  stock_symbol?: string;
  side: "BUY" | "SELL";
  order_type: "MARKET" | "LIMIT";
  quantity: number;
  price?: number;
  status: string;
  average_execution_price?: number;
  created_at: string;
}

interface PositionItem {
  stock_symbol: string;
  quantity: number;
  average_buy_price: number;
  current_price: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
}

export default function TerminalPage() {
  const terminalInstruments = useMemo(
    () => [
      { symbol: "NIFTY 50", name: "NIFTY 50 Index", type: "INDEX" },
      { symbol: "BANKNIFTY", name: "NIFTY Bank Index", type: "INDEX" },
      { symbol: "RELIANCE", name: "Reliance Industries Ltd", type: "EQUITY" },
      { symbol: "TCS", name: "Tata Consultancy Services Ltd", type: "EQUITY" },
      { symbol: "INFY", name: "Infosys Ltd", type: "EQUITY" },
      { symbol: "HDFCBANK", name: "HDFC Bank Ltd", type: "EQUITY" },
      { symbol: "ICICIBANK", name: "ICICI Bank Ltd", type: "EQUITY" },
      { symbol: "SBIN", name: "State Bank of India", type: "EQUITY" },
    ],
    []
  );

  const [selectedSymbol, setSelectedSymbol] = useState("RELIANCE");
  const [activeTab, setActiveTab] = useState<"POSITIONS" | "ORDERS" | "TRADES">("POSITIONS");
  const [quote, setQuote] = useState<TerminalQuote | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Load quote for selected symbol
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
      // Ignore
    }
  }, [selectedSymbol]);

  // Load Orders & Positions
  const loadOrdersAndPositions = useCallback(async () => {
    setIsLoadingOrders(true);
    try {
      // Orders
      try {
        const orderData = await apiRequest<any[]>("/api/v1/orders?limit=15");
        if (orderData) {
          setOrders(
            orderData.map((o) => ({
              id: o.id,
              stock_symbol: o.stock?.symbol || o.stock_id,
              side: o.side,
              order_type: o.order_type,
              quantity: o.quantity,
              price: o.price ? Number(o.price) : undefined,
              status: o.status,
              average_execution_price: o.average_execution_price
                ? Number(o.average_execution_price)
                : undefined,
              created_at: o.created_at,
            }))
          );
        }
      } catch {
        // Fallback
      }

      // Positions / Portfolio
      try {
        const port = await apiRequest<any>("/api/v1/portfolio");
        if (port && port.holdings) {
          setPositions(
            port.holdings.map((h: any) => ({
              stock_symbol: h.stock?.symbol || h.stock_id || "EQUITY",
              quantity: h.quantity,
              average_buy_price: Number(h.average_buy_price || 0),
              current_price: Number(h.current_price || h.average_buy_price || 0),
              unrealized_pnl: Number(h.pnl || 0),
              unrealized_pnl_percent: Number(h.pnl_percent || 0),
            }))
          );
        }
      } catch {
        // Fallback
      }
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    loadQuote();
    loadOrdersAndPositions();
  }, [loadQuote, loadOrdersAndPositions]);

  // Live WebSocket updates
  useMarketWebSocket(selectedSymbol, (update) => {
    if (update && update.ltp) {
      const val = typeof update.ltp === "string" ? parseFloat(update.ltp) : update.ltp;
      const chg = typeof update.change === "string" ? parseFloat(update.change) : update.change;
      const chgPct =
        typeof update.change_percent === "string"
          ? parseFloat(update.change_percent)
          : update.change_percent;

      setQuote((prev) => ({
        symbol: selectedSymbol,
        ltp: val,
        change: chg !== undefined ? chg : prev?.change,
        change_percent: chgPct !== undefined ? chgPct : prev?.change_percent,
        high: update.high ? Math.max(Number(update.high), prev?.high || 0) : prev?.high,
        low: update.low ? Math.min(Number(update.low), prev?.low || 999999) : prev?.low,
        volume: update.volume ? Number(update.volume) : prev?.volume,
      }));
    }
  });

  const isPos = (quote?.change_percent ?? 0) >= 0;

  return (
    <div className="space-y-4 select-none pb-12">
      {/* 1. Terminal Top Ribbon / Instrument Selector */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 overflow-x-auto py-1">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111827] text-white text-xs font-bold shrink-0">
            <Activity className="w-3.5 h-3.5 text-[#4F46E5]" />
            <span>TERMINAL</span>
          </div>

          {/* Quick Instrument Pills */}
          <div className="flex items-center gap-1.5">
            {terminalInstruments.map((inst) => (
              <button
                key={inst.symbol}
                onClick={() => setSelectedSymbol(inst.symbol)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedSymbol === inst.symbol
                    ? "bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] shadow-2xs font-bold"
                    : "bg-[#F7F8FA] text-[#4B5563] border border-[#E5E7EB] hover:text-[#111827] hover:bg-[#E5E7EB]"
                }`}
              >
                {inst.symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Instrument Live Quote Display */}
        <div className="flex items-center gap-4 shrink-0 font-mono">
          <div>
            <div className="text-xs text-[#6B7280]">Real-Time LTP</div>
            <div className="text-base font-bold text-[#111827] tabular-nums">
              {quote ? `₹${quote.ltp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "Fetching..."}
            </div>
          </div>

          {quote && quote.change_percent !== undefined && (
            <div className="text-right">
              <div className="text-xs text-[#6B7280]">1D Movement</div>
              <div
                className={`text-xs font-bold tabular-nums flex items-center justify-end gap-0.5 ${
                  isPos ? "text-[#00A86B]" : "text-[#EF4444]"
                }`}
              >
                {isPos ? "+" : ""}
                {quote.change_percent.toFixed(2)}%
              </div>
            </div>
          )}

          <div className="h-6 w-[1px] bg-[#E5E7EB]" />

          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#00A86B] bg-[#ECFDF5] px-2.5 py-1 rounded-full border border-[#A7F3D0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00A86B] animate-pulse" />
            <span>PAPER MODE</span>
          </div>
        </div>
      </div>

      {/* 2. Main Workstation Area: Chart + Integrated Order Pad */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column (8 cols): TradingView Lightweight Candlestick Chart */}
        <div className="lg:col-span-8 space-y-4">
          <ChartContainer symbol={selectedSymbol} />

          {/* Quick HUD Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white border border-[#E5E7EB] rounded-xl p-3 shadow-xs">
            <div>
              <span className="text-[#6B7280] text-[11px] block">Day High</span>
              <span className="font-mono font-bold text-[#00A86B] block">
                {quote?.high ? `₹${quote.high.toFixed(2)}` : "--"}
              </span>
            </div>
            <div>
              <span className="text-[#6B7280] text-[11px] block">Day Low</span>
              <span className="font-mono font-bold text-[#EF4444] block">
                {quote?.low ? `₹${quote.low.toFixed(2)}` : "--"}
              </span>
            </div>
            <div>
              <span className="text-[#6B7280] text-[11px] block">Volume</span>
              <span className="font-mono font-bold text-[#111827] block">
                {quote?.volume ? quote.volume.toLocaleString("en-IN") : "--"}
              </span>
            </div>
            <div>
              <span className="text-[#6B7280] text-[11px] block">Execution Engine</span>
              <span className="font-mono font-bold text-[#4F46E5] block">
                TradeX Paper v3
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Sticky Embedded Order Pad */}
        <div className="lg:col-span-4 sticky top-20">
          <OrderPad
            stockId={selectedSymbol}
            symbol={selectedSymbol}
            stockName={`${selectedSymbol} Equities`}
            defaultSide="BUY"
            onOrderPlaced={() => {
              loadOrdersAndPositions();
            }}
            embedded={true}
          />
        </div>
      </div>

      {/* 3. Bottom Terminal Dock: Open Orders & Active Positions */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden">
        {/* Dock Header Tabs */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E5E7EB] bg-[#F7F8FA]">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("POSITIONS")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === "POSITIONS"
                  ? "bg-white text-[#111827] shadow-xs"
                  : "text-[#6B7280] hover:text-[#111827]"
              }`}
            >
              Active Positions ({positions.length})
            </button>
            <button
              onClick={() => setActiveTab("ORDERS")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === "ORDERS"
                  ? "bg-white text-[#111827] shadow-xs"
                  : "text-[#6B7280] hover:text-[#111827]"
              }`}
            >
              Order Book ({orders.length})
            </button>
          </div>

          <button
            onClick={loadOrdersAndPositions}
            className="flex items-center gap-1 text-[11px] text-[#4F46E5] font-semibold hover:underline"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Dock Content */}
        <div className="p-4 overflow-x-auto min-h-[160px]">
          {activeTab === "POSITIONS" && (
            <div>
              {positions.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#6B7280] space-y-1">
                  <p className="font-semibold text-[#111827]">No active positions in paper account</p>
                  <p className="text-[11px] text-[#9CA3AF]">
                    Use the Order Pad on the right to simulate BUY or SELL trades.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] text-[#6B7280] uppercase text-[10px]">
                      <th className="pb-2 font-semibold">Instrument</th>
                      <th className="pb-2 font-semibold">Qty</th>
                      <th className="pb-2 font-semibold">Avg Price</th>
                      <th className="pb-2 font-semibold">LTP</th>
                      <th className="pb-2 font-semibold text-right">Unrealized P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {positions.map((pos) => {
                      const isProfit = pos.unrealized_pnl >= 0;
                      return (
                        <tr key={pos.stock_symbol} className="hover:bg-[#F9FAFB] transition-colors">
                          <td className="py-2.5 font-bold text-[#111827] font-mono">
                            {pos.stock_symbol}
                          </td>
                          <td className="py-2.5 font-mono text-[#111827]">{pos.quantity}</td>
                          <td className="py-2.5 font-mono text-[#4B5563]">
                            ₹{pos.average_buy_price.toFixed(2)}
                          </td>
                          <td className="py-2.5 font-mono text-[#111827]">
                            ₹{pos.current_price.toFixed(2)}
                          </td>
                          <td
                            className={`py-2.5 font-mono font-bold text-right tabular-nums ${
                              isProfit ? "text-[#00A86B]" : "text-[#EF4444]"
                            }`}
                          >
                            {isProfit ? "+" : ""}₹{pos.unrealized_pnl.toFixed(2)} (
                            {isProfit ? "+" : ""}
                            {pos.unrealized_pnl_percent.toFixed(2)}%)
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "ORDERS" && (
            <div>
              {orders.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#6B7280] space-y-1">
                  <p className="font-semibold text-[#111827]">No recent orders executed</p>
                  <p className="text-[11px] text-[#9CA3AF]">
                    Simulated paper orders will appear in this book immediately upon placement.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] text-[#6B7280] uppercase text-[10px]">
                      <th className="pb-2 font-semibold">Time</th>
                      <th className="pb-2 font-semibold">Instrument</th>
                      <th className="pb-2 font-semibold">Side</th>
                      <th className="pb-2 font-semibold">Type</th>
                      <th className="pb-2 font-semibold">Qty</th>
                      <th className="pb-2 font-semibold">Exec Price</th>
                      <th className="pb-2 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {orders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="py-2 text-[#6B7280] text-[11px]">
                          {new Date(ord.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="py-2 font-bold text-[#111827]">{ord.stock_symbol}</td>
                        <td className="py-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              ord.side === "BUY"
                                ? "bg-emerald-50 text-[#00A86B]"
                                : "bg-rose-50 text-[#EF4444]"
                            }`}
                          >
                            {ord.side}
                          </span>
                        </td>
                        <td className="py-2 text-[#4B5563] text-[11px]">{ord.order_type}</td>
                        <td className="py-2 text-[#111827]">{ord.quantity}</td>
                        <td className="py-2 text-[#111827]">
                          ₹{ord.average_execution_price ? ord.average_execution_price.toFixed(2) : (ord.price ? ord.price.toFixed(2) : "--")}
                        </td>
                        <td className="py-2 text-right">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#00A86B] font-bold">
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
