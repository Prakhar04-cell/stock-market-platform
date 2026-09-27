"use client";

import React, { useState } from "react";
import { cn, normalizeStockSymbol } from "@/lib/utils";
import { LineChart } from "lucide-react";
import { TradingViewChart } from "./tradingview-chart";
import { useMarketWebSocket } from "@/lib/market-ws";

export interface ChartContainerProps {
  symbol: string;
  isConfigured?: boolean;
  className?: string;
  isPortfolio?: boolean;
  height?: number;
}

export function ChartContainer({
  symbol,
  className,
  isPortfolio = false,
  height = 380,
}: ChartContainerProps) {
  const cleanSymbol = normalizeStockSymbol(symbol);
  const [activeInterval, setActiveInterval] = useState("1D");
  const intervals = [
    { label: "1m", value: "1m" },
    { label: "5m", value: "5m" },
    { label: "15m", value: "15m" },
    { label: "1h", value: "1h" },
    { label: "1D", value: "1D" },
    { label: "1W", value: "1W" },
    { label: "1M", value: "1M" },
  ];

  const { connectionState } = useMarketWebSocket(cleanSymbol);

  return (
    <div className={cn("rounded-2xl border border-slate-200/90 bg-white p-5 flex flex-col shadow-card", className)}>
      {/* Chart Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <LineChart className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900 leading-tight">
                {isPortfolio ? "Portfolio Trajectory" : `${cleanSymbol} Real-Time Chart`}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                NSE
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              TradingView Lightweight Charts v4
            </span>
          </div>
          <div className="flex items-center gap-1.5 ml-2" title={
            connectionState === "CONNECTED"
              ? "Live Upstox market tick stream active"
              : "Backend market feed healthy, frontend stream disconnected"
          }>
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                connectionState === "CONNECTED"
                  ? "bg-emerald-500 animate-pulse"
                  : connectionState === "CONNECTING"
                  ? "bg-amber-500 animate-ping"
                  : connectionState === "ERROR"
                  ? "bg-rose-500"
                  : "bg-slate-300"
              )}
            />
            <span className="text-[10px] font-medium text-slate-500">
              {connectionState === "CONNECTED"
                ? "LIVE STREAM"
                : connectionState === "CONNECTING"
                ? "CONNECTING"
                : connectionState === "ERROR"
                ? "STREAM ERROR"
                : "FEED DISCONNECTED"}
            </span>
          </div>
        </div>

        {/* Timeframe Selectors */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/70">
          {intervals.map((intvl) => (
            <button
              key={intvl.value}
              onClick={() => setActiveInterval(intvl.value)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-lg transition-all select-none",
                activeInterval === intvl.value
                  ? "bg-white text-indigo-600 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              )}
            >
              {intvl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="relative mt-3 rounded-xl overflow-hidden border border-slate-100">
        <TradingViewChart
          symbol={cleanSymbol}
          interval={activeInterval}
          height={height}
        />
      </div>
    </div>
  );
}
