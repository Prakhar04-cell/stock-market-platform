"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, Plus, LineChart, Layers, ArrowUpRight, ArrowDownRight, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { formatStockPrice, formatPnL } from "@/lib/formatters";
import { apiRequest } from "@/lib/api-client";
import { marketWs, WsPriceUpdate } from "@/lib/market-ws";

export interface WatchlistStockItem {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  price?: number | string;
  change?: number | string;
  changePercent?: number | string;
  isPositive?: boolean;
}

export interface WatchlistDockProps {
  activeSymbol: string;
  onSelectStock: (stock: WatchlistStockItem) => void;
  onQuickTrade: (stock: WatchlistStockItem, side: "BUY" | "SELL") => void;
  className?: string;
}

export function WatchlistDock({
  activeSymbol,
  onSelectStock,
  onQuickTrade,
  className = "",
}: WatchlistDockProps) {
  const [activeListTab, setActiveListTab] = useState(1);
  const [searchFilter, setSearchFilter] = useState("");

  const [stocks, setStocks] = useState<WatchlistStockItem[]>([
    { id: "s-1", symbol: "RELIANCE", name: "Reliance Industries Ltd", exchange: "NSE EQ", price: "--", change: "--", changePercent: "--" },
    { id: "s-2", symbol: "TCS", name: "Tata Consultancy Services", exchange: "NSE EQ", price: "--", change: "--", changePercent: "--" },
    { id: "s-3", symbol: "INFY", name: "Infosys Ltd", exchange: "NSE EQ", price: "--", change: "--", changePercent: "--" },
    { id: "s-4", symbol: "HDFCBANK", name: "HDFC Bank Ltd", exchange: "NSE EQ", price: "--", change: "--", changePercent: "--" },
    { id: "s-5", symbol: "BHARTIARTL", name: "Bharti Airtel Ltd", exchange: "NSE EQ", price: "--", change: "--", changePercent: "--" },
    { id: "s-6", symbol: "ICICIBANK", name: "ICICI Bank Ltd", exchange: "NSE EQ", price: "--", change: "--", changePercent: "--" },
    { id: "s-7", symbol: "SBIN", name: "State Bank of India", exchange: "NSE EQ", price: "--", change: "--", changePercent: "--" },
    { id: "s-8", symbol: "LT", name: "Larsen & Toubro Ltd", exchange: "NSE EQ", price: "--", change: "--", changePercent: "--" },
    { id: "s-9", symbol: "BAJFINANCE", name: "Bajaj Finance Ltd", exchange: "NSE EQ", price: "--", change: "--", changePercent: "--" },
    { id: "s-10", symbol: "TATAMOTORS", name: "Tata Motors Ltd", exchange: "NSE EQ", price: "--", change: "--", changePercent: "--" },
  ]);

  // Batch fetch quotes
  useEffect(() => {
    async function loadBatchQuotes() {
      try {
        const syms = stocks.map((s) => s.symbol).join(",");
        const batchQuotes = await apiRequest<Record<string, any>>(`/api/v1/market/quotes?symbols=${syms}`);
        if (batchQuotes) {
          setStocks((prev) =>
            prev.map((s) => {
              const q = batchQuotes[s.symbol];
              if (q && q.ltp) {
                const numLtp = Number(q.ltp);
                const chg = q.change !== undefined && q.change !== null ? Number(q.change) : null;
                const chgPct = q.change_percent !== undefined && q.change_percent !== null ? Number(q.change_percent) : null;
                const pnl = chg !== null ? formatPnL(chg, chgPct ?? 0) : null;
                return {
                  ...s,
                  price: formatStockPrice(numLtp),
                  change: pnl ? `${pnl.amountText} (${pnl.percentText})` : "--",
                  isPositive: pnl ? pnl.isPositive : false,
                };
              }
              return s;
            })
          );
        }
      } catch {
        // Fallback
      }
    }
    loadBatchQuotes();
  }, []);

  // Subscribe to live websocket updates for each stock
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    stocks.forEach((s) => {
      const unsub = marketWs.subscribe(s.symbol, (update: WsPriceUpdate) => {
        setStocks((prev) =>
          prev.map((item) => {
            if (item.symbol === update.symbol) {
              const ltp = Number(update.ltp);
              const chg = update.change !== undefined && update.change !== null ? Number(update.change) : null;
              const chgPct = update.change_percent !== undefined && update.change_percent !== null ? Number(update.change_percent) : null;
              const pnl = chg !== null ? formatPnL(chg, chgPct ?? 0) : null;
              return {
                ...item,
                price: formatStockPrice(ltp),
                change: pnl ? `${pnl.amountText} (${pnl.percentText})` : item.change,
                isPositive: pnl ? pnl.isPositive : (chg ?? 0) >= 0,
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
  }, []);

  const filteredStocks = stocks.filter((s) =>
    s.symbol.toLowerCase().includes(searchFilter.toLowerCase()) ||
    s.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className={`w-80 border-r border-slate-200/90 bg-white flex flex-col shrink-0 h-full select-none ${className}`}>
      {/* Top Watchlist Selector Tabs */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((num) => (
            <button
              key={num}
              onClick={() => setActiveListTab(num)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                activeListTab === num
                  ? "bg-white text-indigo-600 shadow-xs border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              List {num}
            </button>
          ))}
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          {filteredStocks.length} Stocks
        </span>
      </div>

      {/* Search Filter Box */}
      <div className="p-2 border-b border-slate-100">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter stocks in watchlist..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Stock Rows List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {filteredStocks.map((stock) => {
          const isSelected = activeSymbol === stock.symbol;

          return (
            <div
              key={stock.id}
              onClick={() => onSelectStock(stock)}
              className={`group relative px-3 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                isSelected
                  ? "bg-indigo-50/60 border-l-2 border-indigo-600"
                  : "hover:bg-slate-50"
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold ${isSelected ? "text-indigo-600" : "text-slate-900"}`}>
                    {stock.symbol}
                  </span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-500 border border-slate-200 font-mono">
                    {stock.exchange}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate max-w-[130px]" title={stock.name}>
                  {stock.name}
                </p>
              </div>

              {/* Price & Change */}
              <div className="text-right font-financial shrink-0">
                <span className="text-sm font-bold text-[#111827] block tabular-nums tracking-tight">
                  {stock.price}
                </span>
                <span
                  className={`text-[10.5px] font-bold tabular-nums ${
                    stock.isPositive === undefined
                      ? "text-slate-400"
                      : stock.isPositive
                      ? "text-[#16A34A]"
                      : "text-[#DC2626]"
                  }`}
                >
                  {stock.change}
                </span>
              </div>

              {/* Hover Quick Action Buttons */}
              <div className="absolute inset-y-0 right-2 hidden group-hover:flex items-center gap-1 bg-white/95 pl-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickTrade(stock, "BUY");
                  }}
                  className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  title="Buy"
                >
                  B
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickTrade(stock, "SELL");
                  }}
                  className="px-2 py-1 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                  title="Sell"
                >
                  S
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectStock(stock);
                  }}
                  className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                  title="Chart"
                >
                  <LineChart className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
