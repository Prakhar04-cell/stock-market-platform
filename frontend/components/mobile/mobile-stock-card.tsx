"use client";

import React from "react";
import Link from "next/link";
import { formatStockPrice } from "@/lib/formatters";

interface MobileStockCardProps {
  symbol: string;
  name?: string;
  exchange?: string;
  price: number;
  change?: number;
  changePercent: number;
  volume?: string | number;
  shares?: number | string;
  variant?: "watchlist-row" | "mover-card";
  onBuy?: (symbol: string, name?: string) => void;
  onSell?: (symbol: string, name?: string) => void;
}

export function MobileStockCard({
  symbol,
  name,
  exchange = "NSE",
  price,
  change = 0,
  changePercent,
  volume,
  shares,
  variant = "watchlist-row",
  onBuy,
  onSell,
}: MobileStockCardProps) {
  const isPos = changePercent >= 0;
  const initials = symbol.slice(0, 2).toUpperCase();

  if (variant === "mover-card") {
    return (
      <Link
        href={`/stocks/${encodeURIComponent(symbol)}`}
        className="bg-surface-container-low p-3.5 rounded-xl shadow-sm block hover:bg-surface-container transition-colors"
      >
        <div className="flex justify-between items-start mb-2">
          <span className="font-headline-sm text-body-lg text-on-surface font-semibold truncate mr-1">
            {symbol}
          </span>
          <span
            className={`text-body-sm font-tabular-data font-medium shrink-0 ${
              isPos ? "text-secondary" : "text-error"
            }`}
          >
            {isPos ? "+" : ""}
            {changePercent.toFixed(2)}%
          </span>
        </div>
        <p className="text-tabular-data text-on-surface font-semibold">
          {formatStockPrice(price)}
        </p>
        {volume !== undefined && (
          <p className="text-body-sm text-on-surface-variant mt-1 truncate">
            Vol: {typeof volume === "number" ? volume.toLocaleString("en-IN") : volume}
          </p>
        )}
      </Link>
    );
  }

  return (
    <div className="bg-surface-container-low p-3.5 rounded-xl flex items-center justify-between shadow-sm">
      <Link
        href={`/stocks/${encodeURIComponent(symbol)}`}
        className="flex items-center gap-3 min-w-0 flex-1 group"
      >
        <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center font-headline-sm text-primary font-bold shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1 pr-2">
          <h3 className="text-body-lg text-on-surface font-headline-sm font-semibold truncate group-hover:text-primary transition-colors">
            {name || symbol}
          </h3>
          <p className="text-body-sm text-on-surface-variant truncate">
            {exchange} {shares ? `• ${shares}` : ""}
          </p>
        </div>
      </Link>

      <div className="text-right shrink-0 mr-2">
        <p className="text-tabular-data text-on-surface font-semibold">
          {formatStockPrice(price)}
        </p>
        <p
          className={`text-body-sm font-tabular-data font-medium ${
            isPos ? "text-secondary" : "text-error"
          }`}
        >
          {isPos ? "+" : ""}
          {changePercent.toFixed(2)}% ({isPos ? "+₹" : "-₹"}
          {Math.abs(change).toFixed(2)})
        </p>
      </div>

      <div className="flex gap-1.5 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBuy?.(symbol, name);
          }}
          className="px-3 py-1.5 rounded bg-secondary text-on-secondary text-body-sm font-label-md shadow-sm hover:opacity-95 active:scale-95 transition-all"
        >
          Buy
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSell?.(symbol, name);
          }}
          className="px-3 py-1.5 rounded bg-error-container text-on-error-container text-body-sm font-label-md hover:opacity-95 active:scale-95 transition-all"
        >
          Sell
        </button>
      </div>
    </div>
  );
}
