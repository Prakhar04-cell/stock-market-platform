"use client";

import React from "react";
import Link from "next/link";
import { formatStockPrice } from "@/lib/formatters";

interface MobileStockRowProps {
  symbol: string;
  name?: string;
  price: number;
  changePercent: number;
  volume?: string | number;
  onBuy?: (symbol: string, name?: string) => void;
  onSell?: (symbol: string, name?: string) => void;
}

export function MobileStockRow({
  symbol,
  name,
  price,
  changePercent,
  volume,
  onBuy,
  onSell,
}: MobileStockRowProps) {
  const isPos = changePercent >= 0;

  return (
    <div className="flex items-center justify-between p-space-md rounded-xl bg-surface-container-low shadow-sm hover:bg-surface-container transition-colors">
      <Link
        href={`/stocks/${encodeURIComponent(symbol)}`}
        className="flex items-center gap-space-md min-w-0 flex-1 mr-2 group"
      >
        <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-headline-sm text-body-md font-bold shrink-0">
          {symbol.slice(0, 4)}
        </div>
        <div className="flex flex-col min-w-0 truncate">
          <span className="font-headline-sm text-on-surface text-body-md font-semibold truncate group-hover:text-primary transition-colors">
            {name || symbol}
          </span>
          <span className="font-body-sm text-on-surface-variant truncate">
            {volume ? `Vol: ${typeof volume === "number" ? volume.toLocaleString("en-IN") : volume}` : symbol}
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-2 sm:gap-space-md shrink-0">
        <div className="flex flex-col items-end">
          <span className="font-tabular-data-lg text-on-surface font-semibold">
            {formatStockPrice(price)}
          </span>
          <span
            className={`inline-flex items-center font-tabular-data text-body-sm font-medium ${
              isPos ? "text-secondary" : "text-error"
            }`}
          >
            {isPos ? "+" : ""}
            {changePercent.toFixed(2)}%
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onBuy?.(symbol, name)}
            className="px-3 py-1.5 rounded-lg bg-secondary text-on-secondary font-label-md text-body-sm hover:opacity-90 active:scale-95 transition-all shadow-sm"
          >
            Buy
          </button>
          <button
            onClick={() => onSell?.(symbol, name)}
            className="px-3 py-1.5 rounded-lg bg-error text-on-error font-label-md text-body-sm hover:opacity-90 active:scale-95 transition-all shadow-sm"
          >
            Sell
          </button>
        </div>
      </div>
    </div>
  );
}
