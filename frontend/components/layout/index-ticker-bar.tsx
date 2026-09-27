"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import { marketWs, WsPriceUpdate, useMarketWebSocket } from "@/lib/market-ws";
import { formatStockPrice } from "@/lib/formatters";

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
  const [providerInfo, setProviderInfo] = useState<{ provider: string; is_fallback: boolean }>({
    provider: "UPSTOX",
    is_fallback: false,
  });
  const { connectionState } = useMarketWebSocket();

  // Load initial ticker data from API
  const loadTicker = useCallback(async () => {
    try {
      const res = await apiRequest<{
        indices: IndexItem[];
        provider_configured: boolean;
        provider?: string;
        is_fallback?: boolean;
      }>("/api/v1/market/ticker");
      if (res && res.indices && res.indices.length > 0) {
        setIndices(res.indices);
        if (res.provider) {
          setProviderInfo({
            provider: res.provider,
            is_fallback: Boolean(res.is_fallback || res.provider === "BHARATSTOCKAPI"),
          });
        }
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
    <div className="w-full bg-surface-container-low border-b border-outline-variant/30 py-2 px-4 sm:px-6 lg:px-8 overflow-x-auto no-scrollbar flex items-center gap-6 text-body-sm whitespace-nowrap select-none">
      {/* 1. Global Market Feed Indicator Badge */}
      <div className="flex items-center gap-1.5 font-medium text-outline shrink-0">
        <span className="material-symbols-outlined text-[16px] text-primary">trending_up</span>
        <span className="text-xs uppercase tracking-wider font-semibold">INDICES</span>
      </div>

      <div className="h-3.5 w-[1px] bg-outline-variant/40 shrink-0" />

      {/* 2. Horizontal Index Ribbons */}
      <div className="flex items-center gap-6 shrink-0">
        {indices.map((idx) => {
          const hasValue = idx.value !== null && idx.value !== undefined && idx.status !== "UNAVAILABLE";
          const isPos = idx.is_positive;

          return (
            <Link
              key={idx.symbol}
              href={`/stocks/${encodeURIComponent(idx.symbol)}`}
              className="flex items-center gap-2 group hover:opacity-80 transition-opacity"
            >
              <span className="font-medium text-on-surface text-xs sm:text-[13px] group-hover:text-primary transition-colors">
                {idx.name}
              </span>

              {hasValue ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="font-tabular-data font-semibold text-on-surface text-xs sm:text-[13px] tabular-nums">
                    {formatStockPrice(idx.value)}
                  </span>
                  <span
                    className={`font-tabular-data text-[11px] sm:text-xs font-medium tabular-nums flex items-center gap-0.5 ${
                      isPos ? "text-tertiary" : "text-error"
                    }`}
                  >
                    <span>{isPos ? "+" : ""}{idx.change !== null ? idx.change.toFixed(2) : "0.00"}</span>
                    <span>({isPos ? "+" : ""}{idx.change_percent !== null ? idx.change_percent.toFixed(2) : "0.00"}%)</span>
                  </span>
                </div>
              ) : idx.status === "LOADING" ? (
                <div className="flex items-center gap-1.5 animate-pulse">
                  <div className="w-12 h-3.5 bg-surface-container-high rounded" />
                  <div className="w-10 h-3 bg-surface-container rounded" />
                </div>
              ) : (
                <span className="text-outline text-[11px] font-normal">
                  Unavailable
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Provider badge at end */}
      <div className="ml-auto hidden xl:flex items-center gap-2 shrink-0">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
            isLive
              ? "bg-tertiary-container/15 text-tertiary"
              : providerInfo.is_fallback
              ? "bg-amber-100 text-amber-800"
              : "bg-surface-container text-outline"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-tertiary animate-pulse" : "bg-outline"}`} />
          <span>{isLive ? "LIVE FEED" : providerInfo.is_fallback ? "FALLBACK" : "OFFLINE"}</span>
        </span>
      </div>
    </div>
  );
}
