"use client";

import React from "react";
import Link from "next/link";
import { formatINR, formatStockPrice } from "@/lib/formatters";

interface MobileHoldingRowProps {
  symbol: string;
  name?: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  investedValue: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  onBuy?: (symbol: string, name?: string) => void;
  onSell?: (symbol: string, name?: string) => void;
}

export function MobileHoldingRow({
  symbol,
  name,
  quantity,
  avgPrice,
  currentPrice,
  investedValue,
  currentValue,
  pnl,
  pnlPercent,
  onBuy,
  onSell,
}: MobileHoldingRowProps) {
  const isPos = pnl >= 0;
  const initials = symbol.slice(0, 2).toUpperCase();

  return (
    <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-md shadow-sm transition-all hover:bg-surface-container">
      <div className="flex justify-between items-start">
        <Link
          href={`/stocks/${encodeURIComponent(symbol)}`}
          className="flex items-center gap-3 min-w-0 flex-1 group"
        >
          <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-headline-sm text-body-lg font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-2">
              <h4 className="text-headline-sm font-headline-sm text-on-surface font-semibold truncate group-hover:text-primary transition-colors">
                {symbol}
              </h4>
              <span className="px-1.5 py-0.5 rounded bg-surface-variant text-on-surface-variant text-[10px] font-medium shrink-0">
                EQ
              </span>
            </div>
            <p className="text-body-sm text-on-surface-variant truncate">
              {quantity} Qty • Avg. {formatINR(avgPrice)}
            </p>
          </div>
        </Link>

        <div className="text-right shrink-0">
          <p className="text-tabular-data font-tabular-data font-bold text-on-surface">
            {formatINR(currentValue)}
          </p>
          <p
            className={`text-body-sm font-tabular-data flex items-center justify-end gap-0.5 ${
              isPos ? "text-secondary" : "text-error"
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">
              {isPos ? "arrow_drop_up" : "arrow_drop_down"}
            </span>
            {isPos ? "+" : ""}
            {formatINR(pnl)} ({isPos ? "+" : ""}
            {pnlPercent.toFixed(1)}%)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-space-sm pt-2 border-t border-outline-variant/20 text-body-sm">
        <div>
          <span className="text-on-surface-variant">Invested: </span>
          <span className="font-tabular-data text-on-surface font-medium">
            {formatINR(investedValue)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-on-surface-variant">LTP: </span>
          <span className="font-tabular-data font-medium text-on-surface">
            {formatStockPrice(currentPrice)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onBuy?.(symbol, name)}
          className="flex-1 bg-secondary text-on-secondary py-2 rounded-lg text-body-sm font-medium hover:bg-secondary/90 active:scale-95 transition-all flex items-center justify-center gap-1 shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px]">add</span> Buy
        </button>
        <button
          onClick={() => onSell?.(symbol, name)}
          className="flex-1 bg-tertiary-container text-on-tertiary-container py-2 rounded-lg text-body-sm font-medium hover:bg-tertiary-container/90 active:scale-95 transition-all flex items-center justify-center gap-1 shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px]">remove</span> Sell
        </button>
      </div>
    </div>
  );
}
