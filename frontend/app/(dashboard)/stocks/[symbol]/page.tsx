"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChartContainer } from "@/components/ui/chart-container";
import { OrderPadModal } from "@/components/trading/order-pad-modal";
import { ProviderStatusBanner } from "@/components/trading/provider-status-banner";
import {
  Bookmark,
  ShoppingBag,
  TrendingUp,
  Building2,
  BarChart2,
  Info,
  Layers,
  ArrowLeft,
} from "lucide-react";

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = (params?.symbol as string)?.toUpperCase() || "RELIANCE";

  const [stock, setStock] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [inWatchlist, setInWatchlist] = useState(false);

  useEffect(() => {
    async function loadStock() {
      setIsLoading(true);
      try {
        const data = await apiRequest(`/api/v1/stocks/${symbol}`);
        setStock(data);
      } catch {
        setStock({
          id: "default-stock-id",
          symbol: symbol,
          name: `${symbol} Equities Ltd`,
          exchange_code: "NSE EQ",
          sector: "Equity",
          isin: "INE000000000",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadStock();
  }, [symbol]);

  const handleOrder = (side: "BUY" | "SELL") => {
    setOrderSide(side);
    setOrderModalOpen(true);
  };

  return (
    <div className="space-y-5 select-none">
      <ProviderStatusBanner />

      {/* Navigation Breadcrumb & Back */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Market</span>
      </button>

      {/* Stock Main Header (Section 12) */}
      <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-base font-mono shrink-0">
            {symbol.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">{symbol}</h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono font-medium">
                {stock?.exchange_code || "NSE EQ"}
              </span>
              <Badge variant="unconfigured">MARKET OFFLINE</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{stock?.name || `${symbol} Equities`}</p>

            {/* Price section: ₹ -- and --% */}
            <div className="flex items-baseline gap-3 mt-3 font-mono">
              <span className="text-2xl font-extrabold text-slate-900">₹ --</span>
              <span className="text-xs font-semibold text-slate-400">
                -- (--%)
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInWatchlist(!inWatchlist)}
            className={`text-xs font-semibold border-slate-200 ${inWatchlist ? "text-indigo-600 bg-indigo-50" : "text-slate-700"}`}
          >
            <Bookmark className="w-3.5 h-3.5 mr-1" />
            {inWatchlist ? "In Watchlist" : "Add to Watchlist"}
          </Button>

          <Button
            size="sm"
            onClick={() => handleOrder("BUY")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
          >
            BUY
          </Button>

          <Button
            size="sm"
            onClick={() => handleOrder("SELL")}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm"
          >
            SELL
          </Button>
        </div>
      </div>

      {/* Chart Section with 1D to 5Y intervals */}
      <ChartContainer symbol={symbol} />

      {/* Stock Statistics Grid (Section 12) */}
      <div className="bg-white border border-slate-200/90 p-5 rounded-2xl space-y-4 shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900">Key Statistics &amp; Fundamentals</h3>
          <span className="text-xs text-slate-400 font-mono">NSE Live Quotes Required</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-[11px] block">Open Price</span>
            <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">₹ --</span>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-[11px] block">Previous Close</span>
            <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">₹ --</span>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-[11px] block">Day High</span>
            <span className="font-mono font-bold text-emerald-700 text-sm mt-0.5 block">₹ --</span>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-[11px] block">Day Low</span>
            <span className="font-mono font-bold text-rose-700 text-sm mt-0.5 block">₹ --</span>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-[11px] block">52-Week High</span>
            <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">₹ --</span>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-[11px] block">52-Week Low</span>
            <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">₹ --</span>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-[11px] block">Volume</span>
            <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">--</span>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-[11px] block">Market Cap</span>
            <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">₹ -- Cr</span>
          </div>
        </div>
      </div>

      {/* Order Pad Modal */}
      <OrderPadModal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        stockId={stock?.id || "default"}
        symbol={symbol}
        stockName={stock?.name || symbol}
        defaultSide={orderSide}
      />
    </div>
  );
}
