"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import { marketWs, WsPriceUpdate, useMarketWebSocket } from "@/lib/market-ws";
import { formatCurrency } from "@/lib/utils";

interface IndexItem {
  name: string;
  symbol: string;
  instrument_key: string | null;
  value: number | null;
  change: number | null;
  change_percent: number | null;
  is_positive: boolean;
  status: string;
}

export function IndexTickerBar() {
  const [indices, setIndices] = useState<IndexItem[]>([
    { name: "NIFTY 50", symbol: "NIFTY 50", instrument_key: "NSE_INDEX|Nifty 50", value: null, change: null, change_percent: null, is_positive: true, status: "LOADING" },
    { name: "SENSEX", symbol: "SENSEX", instrument_key: "BSE_INDEX|SENSEX", value: null, change: null, change_percent: null, is_positive: true, status: "LOADING" },
    { name: "BANKNIFTY", symbol: "BANKNIFTY", instrument_key: "NSE_INDEX|Nifty Bank", value: null, change: null, change_percent: null, is_positive: true, status: "LOADING" },
    { name: "MIDCPNIFTY", symbol: "MIDCPNIFTY", instrument_key: "NSE_INDEX|NIFTY MIDCAP 50", value: null, change: null, change_percent: null, is_positive: true, status: "LOADING" },
    { name: "FINNIFTY", symbol: "FINNIFTY", instrument_key: "NSE_INDEX|Nifty Fin Service", value: null, change: null, change_percent: null, is_positive: true, status: "LOADING" },
  ]);

  const [providerConfigured, setProviderConfigured] = useState<boolean>(true);
  const { connectionState } = useMarketWebSocket();

  const loadTicker = useCallback(async () => {
    try {
      const res = await apiRequest<{ indices: IndexItem[]; provider_configured: boolean }>("/api/v1/market/ticker");
      if (res && res.indices && res.indices.length > 0) {
        setIndices(res.indices);
        setProviderConfigured(res.provider_configured ?? true);
      }
    } catch {
      // Mark as unavailable if request fails
      setIndices((prev) =>
        prev.map((item) => ({ ...item, status: "UNAVAILABLE" }))
      );
    }
  }, []);

  useEffect(() => {
    loadTicker();
    const interval = setInterval(loadTicker, 20000); // Polling fallback
    return () => clearInterval(interval);
  }, [loadTicker]);

  // Subscribe to live websocket updates for each index
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    indices.forEach((idx) => {
      const targetKey = idx.instrument_key || idx.symbol;
      const unsub = marketWs.subscribe(targetKey, (update: WsPriceUpdate) => {
        setIndices((prev) =>
          prev.map((item) => {
            if (
              item.symbol === update.symbol ||
              item.instrument_key === update.instrument_key ||
              item.name === update.symbol
            ) {
              const ltp = typeof update.ltp === "string" ? parseFloat(update.ltp) : update.ltp;
              const chg = typeof update.change === "string" ? parseFloat(update.change) : update.change;
              const chgPct = typeof update.change_percent === "string" ? parseFloat(update.change_percent) : update.change_percent;
              return {
                ...item,
                value: ltp ?? item.value,
                change: chg ?? item.change,
                change_percent: chgPct ?? item.change_percent,
                is_positive: (chg ?? 0) >= 0,
                status: "LIVE",
              };
            }
            return item;
          })
        );
      });
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [indices]);

  const isLive = connectionState === "CONNECTED";

  return (
    <div className="w-full bg-white border-b border-slate-200/90 px-4 sm:px-6 py-1.5 flex items-center gap-4 text-xs overflow-x-auto select-none no-scrollbar shadow-[0_1px_1px_rgba(0,0,0,0.02)]">
      {/* 1. Live Indicator Badge */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 border transition-colors ${
          isLive
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-slate-100 border-slate-200 text-slate-500"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isLive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
          }`}
        />
        <span>{isLive ? "LIVE NSE" : "FEED OFFLINE"}</span>
      </div>

      {/* 2. Horizontal Index List */}
      <div className="flex items-center gap-6 sm:gap-8 shrink-0">
        {indices.map((item) => {
          const hasValue = item.value !== null && item.value !== undefined;
          const displayVal = hasValue
            ? item.value!.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : null;
          const displayChg = item.change !== null && item.change !== undefined
            ? `${item.is_positive ? "+" : ""}${item.change.toFixed(2)}`
            : null;
          const displayChgPct = item.change_percent !== null && item.change_percent !== undefined
            ? `${item.is_positive ? "+" : ""}${item.change_percent.toFixed(2)}%`
            : null;

          return (
            <Link
              key={item.name}
              href={`/stocks/${encodeURIComponent(item.symbol)}`}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <span className="font-bold text-slate-800 text-[11px] tracking-tight">
                {item.name}
              </span>

              {hasValue ? (
                <>
                  <span className="font-semibold text-slate-900 text-xs font-mono">
                    {displayVal}
                  </span>
                  <span
                    className={`font-semibold text-[11px] font-mono ${
                      item.is_positive ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {displayChg} ({displayChgPct})
                  </span>
                </>
              ) : (
                <span className="text-[11px] text-slate-400 font-mono italic">
                  {item.status === "LOADING" ? "Loading..." : "Market data unavailable"}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
