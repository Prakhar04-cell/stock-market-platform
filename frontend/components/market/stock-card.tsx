"use client";

import React from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Eye, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeStockSymbol } from "@/lib/utils";

export interface StockCardProps {
  symbol: string;
  name: string;
  price?: number | string;
  change?: number | string;
  changePercent?: number | string;
  isPositive?: boolean;
  sparkline?: number[];
  onTrade?: (symbol: string, side: "BUY" | "SELL") => void;
  onView?: (symbol: string) => void;
}

export function StockCard({
  symbol,
  name,
  price = "--",
  change = "--",
  changePercent = "--",
  isPositive,
  sparkline = [],
  onTrade,
  onView,
}: StockCardProps) {
  const cleanSymbol = normalizeStockSymbol(symbol);
  const isUp = isPositive !== undefined ? isPositive : (typeof change === "number" ? change >= 0 : true);
  const isDown = isPositive === false;

  // Render smooth mini SVG sparkline
  const renderSparkline = (points?: number[]) => {
    if (!points || points.length < 2) {
      return (
        <div className="w-16 h-6 border-b border-dashed border-slate-200 flex items-center justify-center">
          <span className="text-[9px] text-slate-400 font-mono">--</span>
        </div>
      );
    }
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 64;
    const height = 24;

    const pathD = points
      .map((val, idx) => {
        const x = (idx / (points.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");

    return (
      <svg width={width} height={height} className="overflow-visible">
        <path
          d={pathD}
          fill="none"
          stroke={isUp ? "#16A34A" : isDown ? "#DC2626" : "#94A3B8"}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div className="flex flex-col justify-between p-4 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-cardHover transition-all h-[142px] group select-none">
      {/* Top row: Logo/Monogram + Ticker & Name */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200/60 font-mono">
            {cleanSymbol.slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={`/stocks/${encodeURIComponent(cleanSymbol)}`}
              className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors block truncate"
            >
              {cleanSymbol}
            </Link>
            <p className="text-[11px] text-slate-500 truncate line-clamp-1" title={name}>
              {name}
            </p>
          </div>
        </div>

        {/* Mini Sparkline */}
        <div className="shrink-0">{renderSparkline(sparkline)}</div>
      </div>

      {/* Middle row: Price & Change */}
      <div className="flex items-baseline justify-between pt-1 font-mono">
        <span className="text-sm font-bold text-slate-900">
          {typeof price === "number" ? `₹${price.toFixed(2)}` : price}
        </span>
        <span
          className={`text-[11px] font-semibold flex items-center gap-0.5 ${
            isUp ? "text-emerald-600" : isDown ? "text-rose-600" : "text-slate-500"
          }`}
        >
          {isUp && "+"}
          {changePercent}
          {typeof changePercent === "number" && "%"}
        </span>
      </div>

      {/* Bottom row: Compact Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
        <Link
          href={`/stocks/${encodeURIComponent(cleanSymbol)}`}
          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1"
        >
          <Eye className="w-3 h-3 text-slate-400" />
          <span>Details</span>
        </Link>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onTrade ? onTrade(cleanSymbol, "BUY") : null}
            className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
          >
            BUY
          </button>
          <button
            onClick={() => onTrade ? onTrade(cleanSymbol, "SELL") : null}
            className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
          >
            SELL
          </button>
        </div>
      </div>
    </div>
  );
}

