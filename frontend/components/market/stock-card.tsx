"use client";

import React from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Eye, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeStockSymbol } from "@/lib/utils";
import { formatStockPrice } from "@/lib/formatters";

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
    <div className="flex flex-col justify-between p-3.5 rounded-[10px] border border-[#E5E7EB] bg-white hover:border-[#CBD5E1] transition-all h-[142px] group select-none">
      {/* Top row: Logo/Monogram + Ticker & Name */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-[6px] bg-[#F8FAFC] text-[#111827] font-bold text-xs flex items-center justify-center shrink-0 border border-[#E5E7EB] font-mono">
            {cleanSymbol.slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={`/stocks/${encodeURIComponent(cleanSymbol)}`}
              className="text-xs font-bold text-[#111827] group-hover:text-[#F97316] transition-colors block truncate"
            >
              {cleanSymbol}
            </Link>
            <p className="text-[11px] text-[#6B7280] truncate line-clamp-1" title={name}>
              {name}
            </p>
          </div>
        </div>

        {/* Mini Sparkline */}
        <div className="shrink-0">{renderSparkline(sparkline)}</div>
      </div>

      {/* Middle row: Price & Change */}
      <div className="flex items-baseline justify-between pt-1 font-mono">
        <span className="text-sm font-bold text-[#111827] tabular-nums">
          {formatStockPrice(price)}
        </span>
        <span
          className={`text-[11px] font-semibold flex items-center gap-0.5 tabular-nums ${
            isUp ? "text-[#16A34A]" : isDown ? "text-[#DC2626]" : "text-[#6B7280]"
          }`}
        >
          {isUp && "+"}
          {typeof changePercent === "number" ? changePercent.toFixed(2) : changePercent}
          {typeof changePercent === "number" && "%"}
        </span>
      </div>

      {/* Bottom row: Compact Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB] text-xs">
        <Link
          href={`/stocks/${encodeURIComponent(cleanSymbol)}`}
          className="text-[11px] font-semibold text-[#6B7280] hover:text-[#111827] transition-colors flex items-center gap-1"
        >
          <Eye className="w-3 h-3 text-[#9CA3AF]" />
          <span>Details</span>
        </Link>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onTrade ? onTrade(cleanSymbol, "BUY") : null}
            className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] hover:bg-[#DCFCE7] transition-colors"
          >
            BUY
          </button>
          <button
            onClick={() => onTrade ? onTrade(cleanSymbol, "SELL") : null}
            className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] hover:bg-[#FEE2E2] transition-colors"
          >
            SELL
          </button>
        </div>
      </div>
    </div>
  );
}

