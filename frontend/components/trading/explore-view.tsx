"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowUpRight,
  Sparkles,
  ChevronRight,
  Layers,
  Search,
  PieChart,
  Zap,
  Flame,
  Newspaper,
  Compass,
  Briefcase,
  BarChart2,
  AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StockCard } from "@/components/market/stock-card";

export interface ExploreViewProps {
  onSelectStock: (symbol: string) => void;
  onQuickTrade: (symbol: string, side: "BUY" | "SELL") => void;
  onOpenOI: () => void;
  onOpenTerminal: () => void;
}

interface TrendingStock {
  symbol: string;
  name: string;
  price: string;
  change: string;
  changePercent: string;
  isPositive?: boolean;
  sparkline: number[];
}

export function ExploreView({
  onSelectStock,
  onQuickTrade,
  onOpenOI,
  onOpenTerminal,
}: ExploreViewProps) {
  const [trendingTab, setTrendingTab] = useState<"active" | "gainers" | "losers">("active");

  // Sample stocks for market discovery
  const mostActiveStocks: TrendingStock[] = [
    { symbol: "RELIANCE", name: "Reliance Industries Ltd", price: "--", change: "--", changePercent: "--", sparkline: [2900, 2915, 2920, 2918, 2927.3] },
    { symbol: "HDFCBANK", name: "HDFC Bank Ltd", price: "--", change: "--", changePercent: "--", sparkline: [1660, 1658, 1655, 1652, 1650.4] },
    { symbol: "TATAMOTORS", name: "Tata Motors Ltd", price: "--", change: "--", changePercent: "--", sparkline: [960, 965, 970, 974, 978.5] },
    { symbol: "INFY", name: "Infosys Ltd", price: "--", change: "--", changePercent: "--", sparkline: [1850, 1852, 1855, 1856, 1858.3] },
  ];

  const topGainers: TrendingStock[] = [
    { symbol: "TATAMOTORS", name: "Tata Motors Ltd", price: "--", change: "--", changePercent: "--", isPositive: true, sparkline: [960, 965, 970, 974, 978.5] },
    { symbol: "LT", name: "Larsen & Toubro Ltd", price: "--", change: "--", changePercent: "--", isPositive: true, sparkline: [3800, 3810, 3825, 3840, 3850.8] },
    { symbol: "BAJFINANCE", name: "Bajaj Finance Ltd", price: "--", change: "--", changePercent: "--", isPositive: true, sparkline: [7320, 7340, 7370, 7390, 7412.9] },
    { symbol: "DIXON", name: "Dixon Technologies Ltd", price: "--", change: "--", changePercent: "--", isPositive: true, sparkline: [11100, 11200, 11300, 11450] },
  ];

  const topLosers: TrendingStock[] = [
    { symbol: "HDFCBANK", name: "HDFC Bank Ltd", price: "--", change: "--", changePercent: "--", isPositive: false, sparkline: [1660, 1658, 1655, 1652, 1650.4] },
    { symbol: "TITAN", name: "Titan Company Ltd", price: "--", change: "--", changePercent: "--", isPositive: false, sparkline: [3480, 3470, 3460, 3445] },
    { symbol: "ICICIBANK", name: "ICICI Bank Ltd", price: "--", change: "--", changePercent: "--", isPositive: false, sparkline: [1365, 1360, 1355, 1350.3] },
    { symbol: "INDUSINDBK", name: "IndusInd Bank Ltd", price: "--", change: "--", changePercent: "--", isPositive: false, sparkline: [1435, 1425, 1418, 1410.2] },
  ];

  const activeStockList =
    trendingTab === "active" ? mostActiveStocks : trendingTab === "gainers" ? topGainers : topLosers;

  return (
    <div className="w-full space-y-6 pb-12 select-none">
      {/* 1. Portfolio Overview & Market Hours Status Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Your Investments Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Paper Portfolio Capital
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                  Phase 1 Paper
                </span>
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="financial-num text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  ₹1,00,000.00
                </span>
                <span className="text-xs font-semibold text-slate-500 flex items-center font-financial">
                  Today&apos;s P&amp;L: ₹ -- (Waiting for API)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenTerminal}
                className="text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <BarChart2 className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                Open Pro Terminal
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 text-xs">
            <div>
              <span className="text-slate-500 text-[11px] block">Invested Capital</span>
              <span className="font-financial font-extrabold text-slate-900 text-sm">₹0.00</span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Total Returns</span>
              <span className="font-financial font-bold text-slate-500 text-sm">₹ -- (--%)</span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Available Margin</span>
              <span className="font-financial font-extrabold text-emerald-700 text-sm">₹1,00,000.00</span>
            </div>
          </div>
        </div>

        {/* Market Status Alert Banner */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between shadow-card">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-800">
                  Market Hours
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                09:15 - 15:30 IST
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Standard Indian equity trading sessions operate between 09:15 and 15:30 IST. Market prices update when the broker data stream is configured.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
            <Button
              size="sm"
              onClick={onOpenOI}
              className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold"
            >
              <Zap className="w-3.5 h-3.5 mr-1" />
              OI Analysis
            </Button>
            <Button
              size="sm"
              onClick={onOpenTerminal}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
            >
              Terminal
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Trending Stocks with Tabs */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Trending Stocks
            </h2>
          </div>

          {/* Trending Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs">
            {(
              [
                { id: "active", label: "Most Active" },
                { id: "gainers", label: "Top Gainers" },
                { id: "losers", label: "Top Losers" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTrendingTab(tab.id)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  trendingTab === tab.id
                    ? "bg-white text-indigo-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reusable StockCards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {activeStockList.map((stk) => (
            <StockCard
              key={stk.symbol}
              symbol={stk.symbol}
              name={stk.name}
              price={stk.price}
              change={stk.change}
              changePercent={stk.changePercent}
              isPositive={stk.isPositive}
              sparkline={stk.sparkline}
              onTrade={(symbol, side) => onQuickTrade(symbol, side)}
              onView={(symbol) => onSelectStock(symbol)}
            />
          ))}
        </div>
      </div>

      {/* 3. Popular ETFs & Baskets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Popular Index ETFs
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">NSE Cash</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { symbol: "NIFTYBEES", name: "Nippon India Nifty 50 ETF" },
            { symbol: "BANKBEES", name: "Nippon India Nifty Bank ETF" },
            { symbol: "GOLDBEES", name: "Nippon India Gold BeES ETF" },
            { symbol: "ITBEES", name: "Nippon India Nifty IT ETF" },
          ].map((etf) => (
            <StockCard
              key={etf.symbol}
              symbol={etf.symbol}
              name={etf.name}
              price="--"
              change="--"
              changePercent="--"
              onTrade={(symbol, side) => onQuickTrade(symbol, side)}
              onView={(symbol) => onSelectStock(symbol)}
            />
          ))}
        </div>
      </div>

      {/* 4. Sectors Trending Today & Trading Screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sectors Trending Today with Clean Advance/Decline Split Bars */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-card">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Sectors Trending Today
              </h3>
              <p className="text-xs text-slate-500">
                Advance vs Decline market breadth across benchmark indices
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">NSE Sectoral</span>
          </div>

          <div className="space-y-3">
            {[
              { name: "Nifty IT", advances: 8, declines: 2 },
              { name: "Nifty Auto", advances: 11, declines: 4 },
              { name: "Nifty Metal", advances: 12, declines: 3 },
              { name: "Nifty Pharma", advances: 12, declines: 8 },
              { name: "Nifty Bank", advances: 4, declines: 8 },
              { name: "Nifty Energy", advances: 5, declines: 5 },
            ].map((sector) => {
              const total = sector.advances + sector.declines;
              const advWidth = (sector.advances / total) * 100;
              const decWidth = 100 - advWidth;

              return (
                <div key={sector.name} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>{sector.name}</span>
                    <span className="font-mono text-slate-500">Quotes pending</span>
                  </div>

                  {/* Clean split ratio progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-100 flex overflow-hidden border border-slate-200/60">
                    <div
                      style={{ width: `${advWidth}%` }}
                      className="bg-emerald-500 transition-all"
                      title={`${sector.advances} Advances`}
                    />
                    <div
                      style={{ width: `${decWidth}%` }}
                      className="bg-rose-500 transition-all"
                      title={`${sector.declines} Declines`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span className="text-emerald-700 font-medium">{sector.advances} Advances</span>
                    <span className="text-rose-700 font-medium">{sector.declines} Declines</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quantitative Trading Screens & Ideas */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-card">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Technical Trading Ideas
              </h3>
              <p className="text-xs text-slate-500">
                Rule-based scanning criteria for swing and intraday setups
              </p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
              Scans
            </span>
          </div>

          <div className="space-y-2.5">
            {[
              {
                title: "Short-Term Momentum Breakout",
                desc: "Stocks crossing 20-day high with volume > 2x 10-day average",
                count: "14 Setups",
                tag: "BULLISH",
                color: "text-emerald-700 border-emerald-200 bg-emerald-50",
              },
              {
                title: "RSI Oversold Bounce (< 30)",
                desc: "Blue-chip equities rebounding from standard daily oversold threshold",
                count: "6 Setups",
                tag: "REVERSAL",
                color: "text-indigo-700 border-indigo-200 bg-indigo-50",
              },
              {
                title: "Bullish MACD Golden Cross",
                desc: "MACD line crossed signal line upward on 1-hour interval",
                count: "9 Setups",
                tag: "TREND",
                color: "text-sky-700 border-sky-200 bg-sky-50",
              },
              {
                title: "High Delivery Accumulation",
                desc: "Institutional delivery percentage > 60% with constructive price action",
                count: "8 Setups",
                tag: "DELIVERY",
                color: "text-amber-800 border-amber-200 bg-amber-50",
              },
            ].map((screen) => (
              <div
                key={screen.title}
                onClick={onOpenTerminal}
                className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:border-slate-300 hover:shadow-cardHover cursor-pointer transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {screen.title}
                    </h4>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${screen.color}`}>
                      {screen.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {screen.desc}
                  </p>
                </div>
                <div className="text-right shrink-0 pl-3">
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 font-mono">
                    {screen.count}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 ml-auto mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Stocks in the News Today */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Stocks in the News Today
            </h3>
          </div>
          <span className="text-xs text-slate-400">Curated Indian Markets</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              headline: "Tata Motors initiates construction of next-gen gigafactory battery facility",
              symbol: "TATAMOTORS",
              sentiment: "Positive",
              time: "25m ago",
            },
            {
              headline: "Infosys secures $450M multi-year cloud transformation contract in Europe",
              symbol: "INFY",
              sentiment: "Positive",
              time: "1h ago",
            },
            {
              headline: "RBI monetary policy committee retains repo rate at 6.5%, cites inflation vigilance",
              symbol: "BANKNIFTY",
              sentiment: "Neutral",
              time: "2h ago",
            },
            {
              headline: "Reliance Retail expands regional supply chain logistics hubs in tier-2 cities",
              symbol: "RELIANCE",
              sentiment: "Positive",
              time: "3h ago",
            },
          ].map((news) => (
            <div
              key={news.headline}
              onClick={() => onSelectStock(news.symbol)}
              className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:border-slate-300 hover:shadow-cardHover cursor-pointer transition-all flex flex-col justify-between group"
            >
              <h4 className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 leading-snug">
                {news.headline}
              </h4>

              <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-700 group-hover:text-indigo-600">
                    {news.symbol}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      news.sentiment === "Positive"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {news.sentiment}
                  </span>
                </div>
                <span className="text-slate-400 text-[10px]">{news.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
