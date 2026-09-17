"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { LineChart, AlertCircle } from "lucide-react";
import { Badge } from "./badge";

export interface ChartContainerProps {
  symbol: string;
  isConfigured?: boolean;
  className?: string;
  isPortfolio?: boolean;
}

export function ChartContainer({
  symbol,
  isConfigured = false,
  className,
  isPortfolio = false,
}: ChartContainerProps) {
  const [activeInterval, setActiveInterval] = useState("1D");
  const intervals = ["1D", "1W", "1M", "3M", "1Y", "5Y"];

  return (
    <div className={cn("rounded-xl border border-slate-200/90 bg-white p-5 flex flex-col shadow-card", className)}>
      {/* Chart Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
            <LineChart className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-semibold text-slate-900 block leading-tight">
              {isPortfolio ? "Portfolio Performance" : `${symbol} Chart`}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              TradingView Lightweight Engine Ready
            </span>
          </div>
          <Badge variant="unconfigured">NOT CONFIGURED</Badge>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/70">
          {intervals.map((intvl) => (
            <button
              key={intvl}
              onClick={() => setActiveInterval(intvl)}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-md transition-all select-none",
                activeInterval === intvl
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {intvl}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas Area with Elegant Empty State */}
      <div className="relative min-h-[320px] flex-1 flex items-center justify-center bg-slate-50/80 rounded-xl mt-4 border border-slate-200/80 p-6">
        {/* Subtle grid lines background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f080_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f080_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none rounded-xl" />

        <div className="relative z-10 max-w-md text-center flex flex-col items-center">
          <div className="p-3 rounded-full bg-amber-50 border border-amber-200 text-amber-600 mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">
            {isPortfolio ? "Portfolio data will appear here" : "Market Data Provider Not Connected"}
          </h4>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            {isPortfolio
              ? "Historical equity valuations and real-time P&L performance trajectories will render here once live quotes stream."
              : "Phase 1 architecture is running in simulation mode. Live market price candles will render once the market data stream is configured."}
          </p>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span>Status: Phase 1 Sandbox</span>
            <span>•</span>
            <span>Live Stream: Offline</span>
          </div>
        </div>
      </div>
    </div>
  );
}
