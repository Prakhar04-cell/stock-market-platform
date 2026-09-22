"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import { marketWs, WsPriceUpdate, useMarketWebSocket } from "@/lib/market-ws";

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

const DEFAULT_INDICES: IndexItem[] = [
  { name: "NIFTY 50", symbol: "NIFTY 50", instrument_key: "NSE_INDEX|Nifty 50", value: null, change: null, change_percent: null, is_positive: true, status: "LOADING" },
  { name: "SENSEX", symbol: "SENSEX", instrument_key: "BSE_INDEX|SENSEX", value: null, change: null, change_percent: null, is_positive: true, status: "LOADING" },
  { name: "BANKNIFTY", symbol: "BANKNIFTY", instrument_key: "NSE_INDEX|Nifty Bank", value: null, change: null, change_percent: null, is_positive: true, status: "LOADING" },
  { name: "FINNIFTY", symbol: "FINNIFTY", instrument_key: "NSE_INDEX|Nifty Fin Service", value: null, change: null, change_percent: null, is_positive: true, status: "LOADING" },
  { name: "MIDCPNIFTY", symbol: "MIDCPNIFTY", instrument_key: "NSE_INDEX|NIFTY MID SELECT", value: null, change: null, change_percent: null, is_positive: true, status: "LOADING" },
];

export function IndexTickerBar() {
  const [indices, setIndices] = useState<IndexItem[]>(DEFAULT_INDICES);
  const { connectionState } = useMarketWebSocket();

  // Load initial ticker data from API
  const loadTicker = useCallback(async () => {
    try {
      const res = await apiRequest<{ indices: IndexItem[]; provider_configured: boolean }>("/api/v1/market/ticker");
      if (res && res.indices && res.indices.length > 0) {
        setIndices(res.indices);
      }
    } catch {
      setIndices((prev) =>
        prev.map((item) => ({ ...item, status: "UNAVAILABLE" }))
      );
    }
  }, []);

  useEffect(() => {
    loadTicker();
    const interval = setInterval(loadTicker, 20000);
    return () => clearInterval(interval);
  }, [loadTicker]);

  // Subscribe to live websocket updates using stable key subscription (NO resubscribe thrashing)
  useEffect(() => {
    const keysToSubscribe = [
      "NSE_INDEX|Nifty 50",
      "BSE_INDEX|SENSEX",
      "NSE_INDEX|Nifty Bank",
      "NSE_INDEX|Nifty Fin Service",
      "NSE_INDEX|NIFTY MID SELECT",
      "NIFTY 50",
      "SENSEX",
      "BANKNIFTY",
      "FINNIFTY",
      "MIDCPNIFTY",
    ];

    const unsubs = keysToSubscribe.map((key) =>
      marketWs.subscribe(key, (update: WsPriceUpdate) => {
        setIndices((prev) =>
          prev.map((item) => {
            const matches =
              item.symbol === update.symbol ||
              item.instrument_key === update.instrument_key ||
              item.name === update.symbol;

            if (matches) {
              const ltp = typeof update.ltp === "string" ? parseFloat(update.ltp) : update.ltp;
              const chg = typeof update.change === "string" ? parseFloat(update.change) : update.change;
              const chgPct = typeof update.change_percent === "string" ? parseFloat(update.change_percent) : update.change_percent;

              return {
                ...item,
                value: ltp ?? item.value,
                change: chg ?? item.change,
                change_percent: chgPct ?? item.change_percent,
                is_positive: (chg ?? item.change ?? 0) >= 0,
                status: "LIVE",
              };
            }
            return item;
          })
        );
      })
    );

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, []); // Empty dependencies ensures single stable subscription lifecycle

  const isLive = connectionState === "CONNECTED";

  return (
    <div className="w-full bg-white border-b border-[#E5E7EB] px-4 sm:px-6 py-1.5 flex items-center gap-3 sm:gap-6 text-xs overflow-x-auto select-none no-scrollbar shadow-[0_1px_1px_rgba(0,0,0,0.01)]">
      {/* 1. Live Indicator Badge */}
      <div
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold shrink-0 border transition-colors ${
          isLive
            ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#00A86B]"
            : "bg-[#F7F8FA] border-[#E5E7EB] text-[#6B7280]"
        }`}
        title={isLive ? "Market WebSocket stream connected" : "Market WebSocket feed disconnected"}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isLive ? "bg-[#00A86B] animate-pulse" : "bg-[#9CA3AF]"
          }`}
        />
        <span>{isLive ? "● LIVE" : "○ FEED DISCONNECTED"}</span>
      </div>

      <div className="h-3.5 w-[1px] bg-[#E5E7EB] shrink-0" />

      {/* 2. Horizontal Index Ribbons */}
      <div className="flex items-center gap-4 sm:gap-7 shrink-0 font-mono">
        {indices.map((idx) => {
          const hasValue = idx.value !== null && idx.value !== undefined;
          const isPos = idx.is_positive;

          return (
            <Link
              key={idx.symbol}
              href={`/stocks/${encodeURIComponent(idx.symbol)}`}
              className="flex items-center gap-2 group hover:opacity-80 transition-opacity"
            >
              <span className="font-sans font-semibold text-[#374151] text-xs group-hover:text-[#111827]">
                {idx.name}
              </span>

              {hasValue ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold text-[#111827] text-xs tabular-nums">
                    ₹{idx.value?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span
                    className={`text-[11px] font-semibold tabular-nums ${
                      isPos ? "text-[#00A86B]" : "text-[#EF4444]"
                    }`}
                  >
                    {isPos ? "+" : ""}
                    {idx.change !== null ? idx.change.toFixed(2) : "0.00"}{" "}
                    ({isPos ? "+" : ""}
                    {idx.change_percent !== null ? idx.change_percent.toFixed(2) : "0.00"}%)
                  </span>
                </div>
              ) : (
                <span className="text-[#9CA3AF] text-[11px] font-sans">
                  {idx.status === "LOADING" ? "Connecting..." : "Unavailable"}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
