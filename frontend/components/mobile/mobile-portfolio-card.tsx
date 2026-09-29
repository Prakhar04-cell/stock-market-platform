"use client";

import React, { useState } from "react";
import { formatINR } from "@/lib/formatters";

interface MobilePortfolioCardProps {
  totalValue: number;
  investedValue: number;
  availableBalance: number;
  todayPnL: number;
  todayPnLPercent: number;
  timeframe?: string;
  onTimeframeChange?: (tf: string) => void;
  variant?: "dashboard" | "holdings";
  overallReturns?: number;
  overallReturnsPercent?: number;
}

export function MobilePortfolioCard({
  totalValue,
  investedValue,
  availableBalance,
  todayPnL,
  todayPnLPercent,
  timeframe = "1D",
  onTimeframeChange,
  variant = "dashboard",
  overallReturns = 0,
  overallReturnsPercent = 0,
}: MobilePortfolioCardProps) {
  const [isVisible, setIsVisible] = useState(true);
  const isPos = todayPnL >= 0;
  const isOverallPos = overallReturns >= 0;

  const timeframes = ["1D", "1W", "1M", "1Y", "All"];

  if (variant === "holdings") {
    return (
      <div className="bg-primary text-on-primary rounded-xl p-space-lg flex flex-col gap-space-md shadow-md relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex justify-between items-start">
          <div>
            <span className="text-body-sm font-label-md uppercase tracking-wider text-on-primary/80">
              Current Portfolio Value
            </span>
            <h1 className="text-display-lg-mobile font-display-lg-mobile text-on-primary mt-1 font-tabular-data">
              {isVisible ? formatINR(totalValue) : "••••••••"}
            </h1>
          </div>
          <button
            onClick={() => setIsVisible(!isVisible)}
            className="bg-white/20 hover:bg-white/30 text-on-primary p-2 rounded-lg transition-colors flex items-center justify-center"
            aria-label="Toggle visibility"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isVisible ? "visibility" : "visibility_off"}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-space-md pt-2 border-t border-white/10">
          <div>
            <span className="text-body-sm text-on-primary/70">Total Investment</span>
            <p className="text-tabular-data font-tabular-data text-on-primary mt-0.5">
              {isVisible ? formatINR(investedValue) : "••••••••"}
            </p>
          </div>
          <div>
            <span className="text-body-sm text-on-primary/70">Today&apos;s P&amp;L</span>
            <p
              className={`text-tabular-data font-tabular-data mt-0.5 flex items-center gap-1 ${
                isPos ? "text-secondary-container" : "text-error-container"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isPos ? "trending_up" : "trending_down"}
              </span>
              {isVisible
                ? `${isPos ? "+" : ""}${formatINR(todayPnL)}`
                : "••••••••"}
            </p>
          </div>
        </div>

        <div className="bg-white/10 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary-container text-[20px]">
              verified
            </span>
            <span className="text-body-sm font-medium text-on-primary">
              Overall Returns
            </span>
          </div>
          <span
            className={`text-tabular-data font-tabular-data font-bold ${
              isOverallPos ? "text-secondary-container" : "text-error-container"
            }`}
          >
            {isVisible
              ? `${isOverallPos ? "+" : ""}${formatINR(overallReturns)} (${
                  isOverallPos ? "+" : ""
                }${overallReturnsPercent.toFixed(2)}%)`
              : "••••••••"}
          </span>
        </div>
      </div>
    );
  }

  // Dashboard variant
  return (
    <div className="mx-space-md mt-space-sm bg-primary-container text-on-primary-container p-space-lg rounded-xl shadow-lg relative overflow-hidden">
      {/* Decorative circle glow */}
      <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-body-sm text-on-primary-container/80">Total Portfolio Value</p>
          <h2 className="text-display-lg-mobile text-on-primary font-tabular-data-lg mt-0.5">
            {isVisible ? formatINR(totalValue) : "••••••••"}
          </h2>
        </div>
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-on-primary hover:bg-white/20 transition-colors"
          aria-label="Toggle visibility"
        >
          <span className="material-symbols-outlined text-[20px]">
            {isVisible ? "visibility" : "visibility_off"}
          </span>
        </button>
      </div>

      <div className="flex items-center gap-2 mb-space-md">
        <span
          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-body-sm font-tabular-data ${
            isPos
              ? "bg-secondary-container text-on-secondary-container"
              : "bg-tertiary-fixed text-on-tertiary-fixed"
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">
            {isPos ? "arrow_upward" : "arrow_downward"}
          </span>
          {isVisible
            ? `${isPos ? "+" : ""}${formatINR(todayPnL)} (${
                isPos ? "+" : ""
              }${todayPnLPercent.toFixed(2)}%)`
            : "••••••••"}
        </span>
        <span className="text-body-sm text-on-primary-container/70">Today&apos;s P&amp;L</span>
      </div>

      {/* Micro Chart / Sparkline bars */}
      <div className="w-full h-12 mb-space-md flex items-end gap-1 opacity-80">
        <div className="flex-1 bg-white/20 rounded-t h-[40%]" />
        <div className="flex-1 bg-white/20 rounded-t h-[30%]" />
        <div className="flex-1 bg-white/20 rounded-t h-[55%]" />
        <div className="flex-1 bg-white/30 rounded-t h-[50%]" />
        <div className="flex-1 bg-white/30 rounded-t h-[65%]" />
        <div className="flex-1 bg-white/40 rounded-t h-[60%]" />
        <div className="flex-1 bg-white/50 rounded-t h-[80%]" />
        <div className="flex-1 bg-white/70 rounded-t h-[75%]" />
        <div className="flex-1 bg-white/80 rounded-t h-[90%]" />
        <div className="flex-1 bg-white rounded-t h-[100%]" />
      </div>

      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/10">
        <div>
          <p className="text-body-sm text-on-primary-container/70">Invested Value</p>
          <p className="text-tabular-data text-on-primary mt-0.5">
            {isVisible ? formatINR(investedValue) : "••••••••"}
          </p>
        </div>
        <div>
          <p className="text-body-sm text-on-primary-container/70">Available Balance</p>
          <p className="text-tabular-data text-on-primary mt-0.5">
            {isVisible ? formatINR(availableBalance) : "••••••••"}
          </p>
        </div>
      </div>

      {/* Time Filters */}
      <div className="flex justify-between items-center mt-space-md pt-2 bg-black/10 rounded-lg p-1">
        {timeframes.map((tf) => (
          <button
            key={tf}
            onClick={() => onTimeframeChange?.(tf)}
            className={`flex-1 py-1 text-center text-body-sm font-label-md rounded transition-colors ${
              timeframe === tf
                ? "text-on-primary bg-white/20 shadow-sm"
                : "text-on-primary/70 hover:text-on-primary"
            }`}
          >
            {tf}
          </button>
        ))}
      </div>
    </div>
  );
}
