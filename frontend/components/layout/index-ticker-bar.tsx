"use client";

import React from "react";

interface IndexTickerItem {
  name: string;
  value: string;
  change: string;
  changePercent: string;
  isPositive: boolean;
  expiryBadge?: string;
  expiryVariant?: "default" | "alert";
}

export function IndexTickerBar() {
  const tickerItems: IndexTickerItem[] = [
    {
      name: "NIFTY 50",
      value: "23,282.95",
      change: "+65.35",
      changePercent: "+0.28%",
      isPositive: true,
      expiryBadge: "Exp. 22 Sep",
      expiryVariant: "default",
    },
    {
      name: "SENSEX",
      value: "74,387.41",
      change: "+50.96",
      changePercent: "+0.07%",
      isPositive: true,
      expiryBadge: "Exp. Today",
      expiryVariant: "alert",
    },
    {
      name: "BANKNIFTY",
      value: "56,118.30",
      change: "-174.15",
      changePercent: "-0.31%",
      isPositive: false,
      expiryBadge: "Exp. 29 Sep",
      expiryVariant: "default",
    },
    {
      name: "MIDCPNIFTY",
      value: "14,411.80",
      change: "+123.35",
      changePercent: "+0.86%",
      isPositive: true,
    },
    {
      name: "FINNIFTY",
      value: "25,331.10",
      change: "+68.70",
      changePercent: "+0.27%",
      isPositive: true,
    },
  ];

  return (
    <div className="w-full bg-white border-b border-slate-200/90 px-4 sm:px-6 py-1.5 flex items-center gap-4 text-xs overflow-x-auto select-none no-scrollbar shadow-[0_1px_1px_rgba(0,0,0,0.02)]">
      {/* 1. Live Indicator Badge */}
      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>LIVE</span>
      </div>

      {/* 2. Horizontal Index List */}
      <div className="flex items-center gap-6 sm:gap-8 shrink-0">
        {tickerItems.map((item) => (
          <div key={item.name} className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity">
            <span className="font-bold text-slate-800 text-[11px] tracking-tight">
              {item.name}
            </span>
            <span className="font-semibold text-slate-900 text-xs font-mono">
              {item.value}
            </span>
            <span
              className={`font-semibold text-[11px] font-mono ${
                item.isPositive ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {item.change} ({item.changePercent})
            </span>

            {item.expiryBadge && (
              <span
                className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${
                  item.expiryVariant === "alert"
                    ? "bg-rose-50 text-rose-600 border-rose-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                }`}
              >
                {item.expiryBadge}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
