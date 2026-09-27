"use client";

import React, { useState, useMemo } from "react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { formatIndianNumber } from "@/lib/formatters";
import {
  TrendingUp,
  TrendingDown,
  BarChart2,
  SlidersHorizontal,
  Zap,
  Maximize2,
  Layers,
  ChevronDown,
  Crosshair,
  ShoppingBag,
  Info,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TerminalViewProps {
  symbol: string;
  name: string;
  price?: number | string;
  change?: number | string;
  changePercent?: number | string;
  onTrade: (side: "BUY" | "SELL") => void;
}

export function TerminalView({
  symbol,
  name,
  price = "--",
  change = "--",
  changePercent = "--",
  onTrade,
}: TerminalViewProps) {
  const [timeframe, setTimeframe] = useState("5m");
  const [chartType, setChartType] = useState<"candle" | "line">("candle");
  const [activeBottomTab, setActiveBottomTab] = useState<"ORDERS" | "POSITIONS" | "HOLDINGS">("ORDERS");
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);

  // Clean simulated candlestick sample sequence for visual charting demonstration
  const candles: CandleData[] = useMemo(() => {
    const list: CandleData[] = [];
    let current = 2920;
    const count = 42;

    for (let i = 0; i < count; i++) {
      const volatility = current * 0.003;
      const changeDelta = (Math.sin(i / 2.8) + (Math.random() - 0.49)) * volatility;
      const open = current;
      const close = current + changeDelta;
      const high = Math.max(open, close) + Math.random() * (volatility * 0.7);
      const low = Math.min(open, close) - Math.random() * (volatility * 0.7);
      const volume = Math.round(15000 + Math.random() * 45000);

      list.push({
        time: `${10 + Math.floor(i / 12)}:${String((i * 5) % 60).padStart(2, "0")}`,
        open: +open.toFixed(2),
        high: +high.toFixed(2),
        low: +low.toFixed(2),
        close: +close.toFixed(2),
        volume,
      });

      current = close;
    }
    return list;
  }, []);

  const activeOHLC = hoveredCandle || candles[candles.length - 1];

  // Mathematical scaling for SVG Candlestick layout
  const { minPrice, maxPrice, priceRange } = useMemo(() => {
    const lows = candles.map((c) => c.low);
    const highs = candles.map((c) => c.high);
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    return { minPrice: min, maxPrice: max, priceRange: max - min || 1 };
  }, [candles]);

  const maxVol = useMemo(() => Math.max(...candles.map((c) => c.volume)), [candles]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none overflow-hidden">
      {/* 1. Header Toolbar & Real-Time OHLC HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-slate-900 tracking-tight">{symbol}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono font-medium">
              NSE EQ
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-slate-900 tracking-tight tabular-nums">{price}</span>
            <span className="text-xs text-slate-500 font-medium tabular-nums">
              ({changePercent})
            </span>
          </div>
        </div>

        {/* OHLC Banner */}
        {activeOHLC && (
          <div className="hidden xl:flex items-center gap-4 text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200/80">
            <span>O: <strong className="text-slate-800 font-medium">{activeOHLC.open.toFixed(2)}</strong></span>
            <span>H: <strong className="text-emerald-700 font-medium">{activeOHLC.high.toFixed(2)}</strong></span>
            <span>L: <strong className="text-rose-700 font-medium">{activeOHLC.low.toFixed(2)}</strong></span>
            <span>C: <strong className="text-slate-800 font-medium">{activeOHLC.close.toFixed(2)}</strong></span>
            <span>Vol: <strong className="text-slate-700 font-medium">{formatIndianNumber(activeOHLC.volume)}</strong></span>
          </div>
        )}

        {/* Chart Controls & Quick Order Triggers */}
        <div className="flex items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            {["1m", "5m", "15m", "1h", "1D", "1W"].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                  timeframe === tf
                    ? "bg-white text-indigo-600 shadow-2xs font-semibold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Quick Buy/Sell Buttons */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <Button
              size="sm"
              onClick={() => onTrade("BUY")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-7 px-3 shadow-xs"
            >
              BUY
            </Button>
            <Button
              size="sm"
              onClick={() => onTrade("SELL")}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-7 px-3 shadow-xs"
            >
              SELL
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Candlestick Chart Viewport */}
      <div className="flex-1 relative bg-slate-50/40 p-3 min-h-[300px] flex flex-col justify-between overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f060_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f060_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

        {/* SVG Candlestick Rendering */}
        <div className="flex-1 relative w-full h-full flex items-center">
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
            {/* Horizontal Price Grid Lines */}
            {[0.2, 0.4, 0.6, 0.8].map((pct) => {
              const pVal = maxPrice - pct * priceRange;
              return (
                <g key={pct}>
                  <line
                    x1="0"
                    y1={`${pct * 75}%`}
                    x2="100%"
                    y2={`${pct * 75}%`}
                    stroke="#E2E8F0"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x="98%"
                    y={`${pct * 75 - 1.5}%`}
                    fill="#94A3B8"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    {pVal.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* Render Candlesticks and Volume Bars */}
            {candles.map((c, i) => {
              const isBull = c.close >= c.open;
              const xPct = (i / candles.length) * 94 + 2;
              const candleWidth = 7;

              // Price height mapping (0% to 75% height)
              const highY = ((maxPrice - c.high) / priceRange) * 70;
              const lowY = ((maxPrice - c.low) / priceRange) * 70;
              const openY = ((maxPrice - c.open) / priceRange) * 70;
              const closeY = ((maxPrice - c.close) / priceRange) * 70;
              const bodyTop = Math.min(openY, closeY);
              const bodyHeight = Math.max(2.5, Math.abs(openY - closeY));

              // Volume height mapping (80% to 98% height)
              const volHeight = (c.volume / maxVol) * 20;

              return (
                <g
                  key={c.time}
                  onMouseEnter={() => setHoveredCandle(c)}
                  onMouseLeave={() => setHoveredCandle(null)}
                  className="cursor-crosshair group"
                >
                  {/* High-Low Wick */}
                  <line
                    x1={`${xPct}%`}
                    y1={`${highY}%`}
                    x2={`${xPct}%`}
                    y2={`${lowY}%`}
                    stroke={isBull ? "#16A34A" : "#DC2626"}
                    strokeWidth="1.2"
                  />

                  {/* Candle Body */}
                  <rect
                    x={`calc(${xPct}% - ${candleWidth / 2}px)`}
                    y={`${bodyTop}%`}
                    width={candleWidth}
                    height={`${bodyHeight}%`}
                    fill={isBull ? "#16A34A" : "#DC2626"}
                    rx="1"
                  />

                  {/* Volume Histogram Bar */}
                  <rect
                    x={`calc(${xPct}% - ${candleWidth / 2}px)`}
                    y={`${98 - volHeight}%`}
                    width={candleWidth}
                    height={`${volHeight}%`}
                    fill={isBull ? "#BBF7D0" : "#FECDD3"}
                    rx="0.5"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Chart Watermark / Information Banner */}
        <div className="absolute bottom-3 left-4 text-[11px] text-slate-400 font-mono pointer-events-none flex items-center gap-3">
          <span>Simulation Engine Active</span>
          <span>•</span>
          <span>OHLC Interval: {timeframe}</span>
        </div>
      </div>

      {/* 3. Bottom Dock for Orders, Positions, Holdings */}
      <div className="border-t border-slate-200 bg-white h-44 flex flex-col shrink-0">
        {/* Bottom Tab Bar */}
        <div className="flex items-center justify-between px-3 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-1">
            {(
              [
                { id: "ORDERS", label: "Orders (0)" },
                { id: "POSITIONS", label: "Positions (0)" },
                { id: "HOLDINGS", label: "Holdings (0)" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveBottomTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-all ${
                  activeBottomTab === tab.id
                    ? "text-indigo-600 border-b-2 border-indigo-600 bg-white font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500 text-[11px]">Realized P&amp;L:</span>
            <span className="font-semibold text-slate-900 tracking-tight tabular-nums">₹0.00</span>
          </div>
        </div>

        {/* Empty State Table View */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-xs text-slate-400">
          <Layers className="w-5 h-5 text-slate-300 mb-1.5" />
          <p className="font-medium text-slate-600">No active {activeBottomTab.toLowerCase()} in simulation mode</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Executed simulated trades will appear here. Real broker connectivity is offline for Phase 1.
          </p>
        </div>
      </div>
    </div>
  );
}
