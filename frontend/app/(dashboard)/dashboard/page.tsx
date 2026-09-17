"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  BarChart2,
  Wallet,
  Receipt,
  Plus,
  MoreHorizontal,
  ChevronDown,
  Maximize2,
  Sliders,
  Flame,
  Zap,
  Bot,
  PieChart,
  Link as LinkIcon,
  Ruler,
  Crosshair,
  Wheat,
  Briefcase,
  Users,
  ChevronRight,
  TrendingUp,
  FileText,
  Calendar,
  Layers,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { OrderPadModal } from "@/components/trading/order-pad-modal";
import { OIAnalysisWidget } from "@/components/trading/oi-analysis-widget";

export default function DashboardPage() {
  const [showBalance, setShowBalance] = useState(true);
  const [activeWatchlistTab, setActiveWatchlistTab] = useState("My List");
  const [activeTimeframe, setActiveTimeframe] = useState("D");
  const [activeTrendingTab, setActiveTrendingTab] = useState("Most Bought");
  const [activeMoversTab, setActiveMoversTab] = useState("Gainers");
  const [activeNewsTab, setActiveNewsTab] = useState("All");

  // Interactive modal triggers
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderStock, setOrderStock] = useState({ symbol: "RELIANCE", name: "Reliance Industries Ltd" });
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [oiModalOpen, setOiModalOpen] = useState(false);

  const handleOpenTrade = (symbol: string, name: string, side: "BUY" | "SELL" = "BUY") => {
    setOrderStock({ symbol, name });
    setOrderSide(side);
    setOrderModalOpen(true);
  };

  // Watchlist items from reference screenshot
  const watchlistItems = [
    {
      symbol: "RELIANCE",
      exchange: "NSE EQ",
      price: "1,244.00",
      change: "+4.00 (+0.32%)",
      isPositive: true,
      sparkline: "M0 14 Q 15 2, 30 10 T 60 4",
      logoBg: "bg-blue-600 text-white",
      logoText: "R",
    },
    {
      symbol: "BHARTIARTL",
      exchange: "NSE EQ",
      price: "1,833.40",
      change: "-1.60 (-0.09%)",
      isPositive: false,
      sparkline: "M0 4 Q 15 14, 30 6 T 60 14",
      logoBg: "bg-red-600 text-white",
      logoText: "b",
    },
    {
      symbol: "HDFCBANK",
      exchange: "NSE EQ",
      price: "715.35",
      change: "-6.15 (-0.85%)",
      isPositive: false,
      sparkline: "M0 2 Q 15 16, 30 8 T 60 15",
      logoBg: "bg-blue-900 text-white",
      logoText: "H",
    },
    {
      symbol: "ICICIBANK",
      exchange: "NSE EQ",
      price: "1,350.60",
      change: "-8.20 (-0.60%)",
      isPositive: false,
      sparkline: "M0 5 Q 15 15, 30 10 T 60 16",
      logoBg: "bg-orange-600 text-white",
      logoText: "I",
    },
    {
      symbol: "SBIN",
      exchange: "NSE EQ",
      price: "986.10",
      change: "-4.50 (-0.45%)",
      isPositive: false,
      sparkline: "M0 3 Q 15 12, 30 8 T 60 14",
      logoBg: "bg-sky-500 text-white",
      logoText: "S",
    },
    {
      symbol: "TCS",
      exchange: "NSE EQ",
      price: "2,192.80",
      change: "+4.00 (+0.18%)",
      isPositive: true,
      sparkline: "M0 15 Q 15 4, 30 8 T 60 2",
      logoBg: "bg-blue-700 text-white",
      logoText: "T",
    },
    {
      symbol: "BAJFINANCE",
      exchange: "NSE EQ",
      price: "1,013.10",
      change: "+6.90 (+0.69%)",
      isPositive: true,
      sparkline: "M0 12 Q 15 3, 30 9 T 60 1",
      logoBg: "bg-teal-600 text-white",
      logoText: "B",
    },
    {
      symbol: "INFY",
      exchange: "NSE EQ",
      price: "1,059.00",
      change: "-1.00 (-0.09%)",
      isPositive: false,
      sparkline: "M0 4 Q 15 15, 30 9 T 60 13",
      logoBg: "bg-slate-900 text-white",
      logoText: "A",
    },
  ];

  // Trending Stocks from reference screenshot
  const trendingStocks = [
    { symbol: "IRFC", price: "79.24", change: "+0.24 (0.30%)", isPositive: true, logoBg: "bg-red-500 text-white", logoText: "A" },
    { symbol: "GOLDBEES", price: "124.44", change: "-0.47 (0.38%)", isPositive: false, logoBg: "bg-amber-500 text-white", logoText: "G" },
    { symbol: "TATAGOLD", price: "14.63", change: "-0.05 (0.34%)", isPositive: false, logoBg: "bg-blue-600 text-white", logoText: "T" },
    { symbol: "SILVERBEES", price: "216.50", change: "-0.75 (0.45%)", isPositive: false, logoBg: "bg-slate-800 text-white", logoText: "S" },
    { symbol: "WIPRO", price: "165.95", change: "-0.75 (0.45%)", isPositive: false, logoBg: "bg-indigo-600 text-white", logoText: "W" },
  ];

  // Top Movers today table from reference screenshot
  const topMovers = [
    { company: "Tata Motors", symbol: "TATAMOTORS", price: "₹316.50", change: "+15.50 (5.15%)", volume: "1,07,14,672", logoBg: "bg-blue-600", logoText: "T" },
    { company: "HDFC Life", symbol: "HDFCLIFE", price: "₹556.90", change: "+26.70 (5.04%)", volume: "88,98,801", logoBg: "bg-red-600", logoText: "D" },
    { company: "SBI Life", symbol: "SBILIFE", price: "₹1,765.00", change: "+67.10 (3.95%)", volume: "16,15,739", logoBg: "bg-sky-500", logoText: "S" },
    { company: "CG Power", symbol: "CGPOWER", price: "₹881.60", change: "+30.05 (3.53%)", volume: "22,27,996", logoBg: "bg-emerald-600", logoText: "G" },
    { company: "Siemens Energy", symbol: "SIEMENS", price: "₹3,111.00", change: "+97.60 (3.24%)", volume: "2,08,197", logoBg: "bg-teal-600", logoText: "S" },
  ];

  // Most traded stocks on Groww
  const mostTraded = [
    { name: "Tata Chemicals", symbol: "TATACHEM", price: "₹778.10", change: "46.30 (6.33%)", logoBg: "bg-blue-600", logoText: "T" },
    { name: "RIR Power", symbol: "RIR", price: "₹195.26", change: "15.49 (8.62%)", logoBg: "bg-indigo-900", logoText: "V" },
    { name: "Antony Waste", symbol: "AWHCL", price: "₹378.65", change: "33.15 (9.59%)", logoBg: "bg-amber-600", logoText: "A" },
    { name: "Share India", symbol: "SHAREINDIA", price: "₹217.83", change: "21.78 (11.11%)", logoBg: "bg-blue-500", logoText: "S" },
  ];

  // Top intraday stocks
  const topIntraday = [
    { name: "Kanohar Electricals", symbol: "KANOHAR", price: "₹816.60", change: "65.10 (8.66%)", logoBg: "bg-red-500", logoText: "—" },
    { name: "IFCI", symbol: "IFCI", price: "₹77.00", change: "1.94 (2.58%)", logoBg: "bg-blue-800", logoText: "IFCI" },
    { name: "RIR Power", symbol: "RIR", price: "₹195.26", change: "15.49 (8.62%)", logoBg: "bg-emerald-600", logoText: "V" },
    { name: "Share India", symbol: "SHAREINDIA", price: "₹217.83", change: "21.78 (11.11%)", logoBg: "bg-blue-500", logoText: "S" },
  ];

  // Products & Tools grid
  const productsToolsCol1 = [
    { title: "IPO", badge: "10 open", badgeColor: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: Layers },
    { title: "Bonds", badge: "1 new", badgeColor: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: FileText },
    { title: "ETFs", icon: PieChart },
    { title: "Intraday Screener", icon: Sliders },
  ];

  const productsToolsCol2 = [
    { title: "Stocks SIP", icon: TrendingUp },
    { title: "MTF stocks", icon: Briefcase },
    { title: "Events calendar", icon: Calendar },
    { title: "All Stocks screener", icon: Sliders },
  ];

  // Market News
  const newsItems = [
    {
      company: "Purple Wave Infocom",
      change: "-0.32%",
      isPositive: false,
      text: "Purple Wave Infocom secures ₹5.03 cr work order for LED, AV solutions...",
      logoBg: "bg-indigo-600 text-white",
      logoText: "PW",
    },
    {
      company: "Skipper",
      change: "+2.44%",
      isPositive: true,
      text: "Skipper Ltd received an ESG score of 60 from ESG Risk Assessments...",
      logoBg: "bg-blue-600 text-white",
      logoText: "Skipper",
    },
    {
      company: "Jana Small Fin. Bank",
      change: "+2.25%",
      isPositive: true,
      text: "RBI approves re-appointment of M.K. S. Raman as ED of Jana Small Finance...",
      logoBg: "bg-rose-600 text-white",
      logoText: "J",
    },
    {
      company: "Action Const Equip",
      change: "+4.80%",
      isPositive: true,
      text: "Action Construction Equipment reports Q2 total income ₹742.2 Cr...",
      logoBg: "bg-amber-600 text-white",
      logoText: "ACE",
    },
  ];

  return (
    <div className="space-y-4 select-none pb-12">
      {/* ============================================================ */}
      {/* ROW 1: TOP 4 METRIC CARDS */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Portfolio Value */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Portfolio Value</span>
            <div className="absolute right-4 top-3.5 w-24 h-8">
              <svg className="w-full h-full" viewBox="0 0 100 35">
                <path
                  d="M0 25 Q 25 15, 50 20 T 100 5"
                  fill="none"
                  stroke="#22C55E"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {showBalance ? "₹99" : "••••"}
            </span>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <div className="mt-1 text-xs font-semibold text-emerald-600">
            +₹0.00 (0.00%) <span className="font-normal text-slate-400">Today</span>
          </div>
        </div>

        {/* Card 2: Invested Amount */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">Invested Amount</span>
            <span className="text-2xl font-bold font-mono text-slate-900">₹92</span>
            <span className="text-xs text-slate-400 block mt-1">Total investment</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <BarChart2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Available Balance */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">Available Balance</span>
            <span className="text-2xl font-bold font-mono text-slate-900">₹7</span>
            <span className="text-xs text-slate-400 block mt-1">For trading</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Today's P&L */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">Today&apos;s P&amp;L</span>
            <span className="text-2xl font-bold font-mono text-emerald-600">+₹0.00 (0.00%)</span>
            <span className="text-xs text-slate-400 block mt-1">Realized + Unrealized</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ROW 2: TWO COLUMNS (WATCHLIST 1 + INTERACTIVE CHART) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Watchlist 1 (4 cols in lg) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Watchlist 1</h3>
              <div className="flex items-center gap-1">
                <button
                  title="Add Watchlist"
                  className="w-6 h-6 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  title="More Options"
                  className="w-6 h-6 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 mb-3 border-b border-slate-100 pb-2.5 overflow-x-auto no-scrollbar">
              {["My List", "Nifty 50", "Banking", "IT"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveWatchlistTab(tab)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
                    activeWatchlistTab === tab
                      ? "bg-[#EEF2FF] text-[#4F46E5]"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {tab}
                </button>
              ))}
              <button className="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Table Header */}
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1">
              <span>Symbol</span>
              <div className="flex items-center gap-8">
                <span>Price</span>
                <span>Change %</span>
              </div>
            </div>

            {/* Stock Rows */}
            <div className="divide-y divide-slate-100/80">
              {watchlistItems.map((stk) => (
                <div
                  key={stk.symbol}
                  onClick={() => handleOpenTrade(stk.symbol, `${stk.symbol} Equities`)}
                  className="py-2 px-2 rounded-xl flex items-center justify-between hover:bg-slate-50/80 cursor-pointer transition-colors group"
                >
                  {/* Left info: Icon & Name */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full ${stk.logoBg} flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}
                    >
                      {stk.logoText}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                        {stk.symbol}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">{stk.exchange}</span>
                    </div>
                  </div>

                  {/* Sparkline in middle */}
                  <div className="hidden sm:block w-14 h-4 mx-2">
                    <svg className="w-full h-full" viewBox="0 0 60 20">
                      <path
                        d={stk.sparkline}
                        fill="none"
                        stroke={stk.isPositive ? "#22C55E" : "#EF4444"}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  {/* Price & Change on right */}
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold font-mono text-slate-900">{stk.price}</div>
                    <div
                      className={`text-[11px] font-mono font-semibold ${
                        stk.isPositive ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {stk.change}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Action */}
          <div className="pt-3 mt-2 border-t border-slate-100">
            <button
              onClick={() => handleOpenTrade("RELIANCE", "Add stock to watchlist")}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add stock</span>
            </button>
          </div>
        </div>

        {/* Right: Candlestick Chart Area (8 cols in lg) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            {/* Chart Header Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-slate-900">Nifty 50</h2>
                <span className="text-base font-bold font-mono text-slate-900">23,282.95</span>
                <span className="text-xs font-bold font-mono text-emerald-600">
                  +65.35 (0.28%)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                  <span>NSE</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <button
                  title="Fullscreen"
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Toolbar Row */}
            <div className="flex items-center justify-between py-2 border-b border-slate-100/90 text-xs overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1">
                {["1m", "5m", "15m", "1h", "D", "W", "M"].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setActiveTimeframe(tf)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                      activeTimeframe === tf
                        ? "bg-slate-100 text-slate-900 border border-slate-300 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
                <div className="h-4 w-[1px] bg-slate-200 mx-1.5" />
                <button
                  title="Candlestick View"
                  className="p-1 rounded hover:bg-slate-100 text-slate-600"
                >
                  <BarChart2 className="w-4 h-4" />
                </button>
                <button className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-slate-600 hover:bg-slate-100">
                  <span className="font-serif italic font-bold">fx</span>
                  <span>Indicators</span>
                </button>
              </div>
            </div>

            {/* Candlestick Canvas & Grid */}
            <div className="relative h-[290px] w-full bg-white mt-2 overflow-hidden flex">
              {/* Main SVG Candlestick Graphic */}
              <div className="flex-1 relative h-full">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 700 280">
                  {/* Horizontal Grid lines */}
                  <line x1="0" y1="35" x2="700" y2="35" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="0" y1="70" x2="700" y2="70" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="0" y1="105" x2="700" y2="105" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="0" y1="140" x2="700" y2="140" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="0" y1="175" x2="700" y2="175" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="0" y1="210" x2="700" y2="210" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="0" y1="245" x2="700" y2="245" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3,3" />

                  {/* Vertical Grid lines */}
                  <line x1="90" y1="0" x2="90" y2="260" stroke="#F8FAFC" strokeWidth="1" />
                  <line x1="180" y1="0" x2="180" y2="260" stroke="#F8FAFC" strokeWidth="1" />
                  <line x1="270" y1="0" x2="270" y2="260" stroke="#F8FAFC" strokeWidth="1" />
                  <line x1="360" y1="0" x2="360" y2="260" stroke="#F8FAFC" strokeWidth="1" />
                  <line x1="450" y1="0" x2="450" y2="260" stroke="#F8FAFC" strokeWidth="1" />
                  <line x1="540" y1="0" x2="540" y2="260" stroke="#F8FAFC" strokeWidth="1" />
                  <line x1="630" y1="0" x2="630" y2="260" stroke="#F8FAFC" strokeWidth="1" />

                  {/* Candlesticks Cluster: Bearish down leg, consolidation, Bullish surge */}
                  {/* Day 1: Descending red candles */}
                  <line x1="20" y1="40" x2="20" y2="90" stroke="#EF4444" strokeWidth="1" />
                  <rect x="17" y="48" width="6" height="34" fill="#EF4444" rx="0.5" />

                  <line x1="32" y1="65" x2="32" y2="105" stroke="#EF4444" strokeWidth="1" />
                  <rect x="29" y="70" width="6" height="28" fill="#EF4444" rx="0.5" />

                  <line x1="44" y1="85" x2="44" y2="120" stroke="#22C55E" strokeWidth="1" />
                  <rect x="41" y="88" width="6" height="22" fill="#22C55E" rx="0.5" />

                  <line x1="56" y1="92" x2="56" y2="135" stroke="#EF4444" strokeWidth="1" />
                  <rect x="53" y="98" width="6" height="30" fill="#EF4444" rx="0.5" />

                  <line x1="68" y1="110" x2="68" y2="148" stroke="#EF4444" strokeWidth="1" />
                  <rect x="65" y="115" width="6" height="25" fill="#EF4444" rx="0.5" />

                  <line x1="80" y1="125" x2="80" y2="152" stroke="#22C55E" strokeWidth="1" />
                  <rect x="77" y="128" width="6" height="18" fill="#22C55E" rx="0.5" />

                  <line x1="92" y1="130" x2="92" y2="165" stroke="#EF4444" strokeWidth="1" />
                  <rect x="89" y="135" width="6" height="24" fill="#EF4444" rx="0.5" />

                  <line x1="104" y1="140" x2="104" y2="175" stroke="#EF4444" strokeWidth="1" />
                  <rect x="101" y="145" width="6" height="22" fill="#EF4444" rx="0.5" />

                  <line x1="116" y1="150" x2="116" y2="185" stroke="#22C55E" strokeWidth="1" />
                  <rect x="113" y="152" width="6" height="20" fill="#22C55E" rx="0.5" />

                  <line x1="128" y1="155" x2="128" y2="195" stroke="#EF4444" strokeWidth="1" />
                  <rect x="125" y="160" width="6" height="26" fill="#EF4444" rx="0.5" />

                  {/* Day 2: Bottom trough & base */}
                  <line x1="140" y1="170" x2="140" y2="215" stroke="#EF4444" strokeWidth="1" />
                  <rect x="137" y="175" width="6" height="32" fill="#EF4444" rx="0.5" />

                  <line x1="152" y1="190" x2="152" y2="230" stroke="#EF4444" strokeWidth="1" />
                  <rect x="149" y="195" width="6" height="25" fill="#EF4444" rx="0.5" />

                  <line x1="164" y1="185" x2="164" y2="225" stroke="#22C55E" strokeWidth="1" />
                  <rect x="161" y="188" width="6" height="28" fill="#22C55E" rx="0.5" />

                  <line x1="176" y1="175" x2="176" y2="210" stroke="#22C55E" strokeWidth="1" />
                  <rect x="173" y="178" width="6" height="25" fill="#22C55E" rx="0.5" />

                  <line x1="188" y1="165" x2="188" y2="200" stroke="#EF4444" strokeWidth="1" />
                  <rect x="185" y="170" width="6" height="20" fill="#EF4444" rx="0.5" />

                  <line x1="200" y1="160" x2="200" y2="190" stroke="#22C55E" strokeWidth="1" />
                  <rect x="197" y="162" width="6" height="22" fill="#22C55E" rx="0.5" />

                  {/* Upward Rebound */}
                  <line x1="212" y1="155" x2="212" y2="188" stroke="#EF4444" strokeWidth="1" />
                  <rect x="209" y="160" width="6" height="18" fill="#EF4444" rx="0.5" />

                  <line x1="224" y1="145" x2="224" y2="180" stroke="#22C55E" strokeWidth="1" />
                  <rect x="221" y="148" width="6" height="26" fill="#22C55E" rx="0.5" />

                  <line x1="236" y1="135" x2="236" y2="170" stroke="#22C55E" strokeWidth="1" />
                  <rect x="233" y="138" width="6" height="24" fill="#22C55E" rx="0.5" />

                  <line x1="248" y1="140" x2="248" y2="175" stroke="#EF4444" strokeWidth="1" />
                  <rect x="245" y="145" width="6" height="22" fill="#EF4444" rx="0.5" />

                  <line x1="260" y1="135" x2="260" y2="165" stroke="#22C55E" strokeWidth="1" />
                  <rect x="257" y="138" width="6" height="20" fill="#22C55E" rx="0.5" />

                  {/* Continuing candles to the right */}
                  <line x1="280" y1="130" x2="280" y2="160" stroke="#22C55E" strokeWidth="1" />
                  <rect x="277" y="132" width="6" height="22" fill="#22C55E" rx="0.5" />

                  <line x1="300" y1="125" x2="300" y2="155" stroke="#EF4444" strokeWidth="1" />
                  <rect x="297" y="130" width="6" height="18" fill="#EF4444" rx="0.5" />

                  <line x1="320" y1="120" x2="320" y2="150" stroke="#22C55E" strokeWidth="1" />
                  <rect x="317" y="122" width="6" height="20" fill="#22C55E" rx="0.5" />

                  <line x1="340" y1="115" x2="340" y2="145" stroke="#22C55E" strokeWidth="1" />
                  <rect x="337" y="118" width="6" height="20" fill="#22C55E" rx="0.5" />

                  <line x1="360" y1="110" x2="360" y2="140" stroke="#EF4444" strokeWidth="1" />
                  <rect x="357" y="115" width="6" height="18" fill="#EF4444" rx="0.5" />

                  <line x1="380" y1="105" x2="380" y2="135" stroke="#22C55E" strokeWidth="1" />
                  <rect x="377" y="108" width="6" height="20" fill="#22C55E" rx="0.5" />

                  <line x1="400" y1="100" x2="400" y2="130" stroke="#22C55E" strokeWidth="1" />
                  <rect x="397" y="102" width="6" height="22" fill="#22C55E" rx="0.5" />

                  <line x1="420" y1="95" x2="420" y2="125" stroke="#EF4444" strokeWidth="1" />
                  <rect x="417" y="100" width="6" height="18" fill="#EF4444" rx="0.5" />

                  <line x1="440" y1="90" x2="440" y2="120" stroke="#22C55E" strokeWidth="1" />
                  <rect x="437" y="92" width="6" height="22" fill="#22C55E" rx="0.5" />

                  <line x1="460" y1="85" x2="460" y2="115" stroke="#22C55E" strokeWidth="1" />
                  <rect x="457" y="88" width="6" height="20" fill="#22C55E" rx="0.5" />

                  <line x1="480" y1="95" x2="480" y2="130" stroke="#EF4444" strokeWidth="1" />
                  <rect x="477" y="100" width="6" height="25" fill="#EF4444" rx="0.5" />

                  <line x1="500" y1="110" x2="500" y2="145" stroke="#EF4444" strokeWidth="1" />
                  <rect x="497" y="115" width="6" height="24" fill="#EF4444" rx="0.5" />

                  <line x1="520" y1="105" x2="520" y2="140" stroke="#22C55E" strokeWidth="1" />
                  <rect x="517" y="108" width="6" height="26" fill="#22C55E" rx="0.5" />

                  <line x1="540" y1="95" x2="540" y2="130" stroke="#22C55E" strokeWidth="1" />
                  <rect x="537" y="98" width="6" height="24" fill="#22C55E" rx="0.5" />

                  <line x1="560" y1="90" x2="560" y2="125" stroke="#22C55E" strokeWidth="1" />
                  <rect x="557" y="92" width="6" height="26" fill="#22C55E" rx="0.5" />

                  <line x1="580" y1="80" x2="580" y2="115" stroke="#22C55E" strokeWidth="1" />
                  <rect x="577" y="82" width="6" height="28" fill="#22C55E" rx="0.5" />

                  <line x1="600" y1="90" x2="600" y2="135" stroke="#EF4444" strokeWidth="1" />
                  <rect x="597" y="96" width="6" height="32" fill="#EF4444" rx="0.5" />

                  <line x1="620" y1="105" x2="620" y2="145" stroke="#EF4444" strokeWidth="1" />
                  <rect x="617" y="110" width="6" height="28" fill="#EF4444" rx="0.5" />

                  <line x1="640" y1="95" x2="640" y2="130" stroke="#22C55E" strokeWidth="1" />
                  <rect x="637" y="98" width="6" height="25" fill="#22C55E" rx="0.5" />

                  {/* Horizontal Crosshair Line */}
                  <line x1="0" y1="110" x2="700" y2="110" stroke="#94A3B8" strokeWidth="1" strokeDasharray="2,2" />
                </svg>

                {/* TradingView Watermark Badge */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1 opacity-70">
                  <div className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-[9px]">
                    17
                  </div>
                </div>
              </div>

              {/* Right Y-Axis Price Column */}
              <div className="w-16 border-l border-slate-100 flex flex-col justify-between py-1 px-1.5 text-[10px] font-mono text-slate-400 select-none shrink-0">
                <span>23,500</span>
                <span>23,450</span>
                <span>23,400</span>
                <span>23,350</span>
                <span>23,300</span>
                {/* Red Price Tag Badge */}
                <div className="bg-[#DC2626] text-white font-bold px-1.5 py-0.5 rounded text-[10px] text-center shadow-xs -mr-1">
                  23,282.95
                </div>
                <span>23,250</span>
                <span>23,200</span>
                <span>23,150</span>
                <span>23,100</span>
              </div>
            </div>

            {/* Bottom X-Axis Time Labels & Status */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
              <div className="flex items-center gap-10 pl-6">
                <span>10:30</span>
                <span>12:00</span>
                <span>14:00</span>
                <span>16</span>
                <span>10:30</span>
                <span>12:00</span>
                <span>14:00</span>
                <span>18</span>
              </div>
              <div className="flex items-center gap-2 pr-2">
                <span>15:09:51 (UTC+5:30)</span>
                <span className="cursor-pointer hover:text-slate-600">%</span>
                <span className="cursor-pointer hover:text-slate-600">log</span>
                <span className="text-[#4F46E5] font-semibold cursor-pointer">auto</span>
              </div>
            </div>
          </div>

          {/* Bottom Pro Tools Ribbon */}
          <div className="pt-3 mt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[
              { label: "Scalper", icon: Zap },
              { label: "Algoverse", icon: Bot },
              { label: "Chart 360", icon: PieChart },
              { label: "Option Chain", icon: LinkIcon, onClick: () => setOiModalOpen(true) },
              { label: "Strategy Builder", icon: Ruler },
              { label: "OI Analysis", icon: Crosshair, onClick: () => setOiModalOpen(true) },
              { label: "Commodities", icon: Wheat },
              { label: "MTF", icon: Briefcase },
              { label: "FII/DII", icon: Users },
            ].map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.label}
                  onClick={tool.onClick || (() => alert(`${tool.label} tool activated!`))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shrink-0 cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5 text-slate-500" />
                  <span>{tool.label}</span>
                </button>
              );
            })}
            <button
              title="Next Tools"
              className="w-7 h-7 rounded-full border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ROW 3: TRENDING STOCKS & TOP MOVERS TODAY */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Trending Stocks (~7 cols in lg) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            {/* Header with Flame icon */}
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-[#4F46E5]" />
              <h3 className="text-sm font-bold text-slate-900">Trending Stocks</h3>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar">
              {["Most Bought", "Trending under ₹500", "Top Gainers", "Top Losers"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTrendingTab(tab)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
                    activeTrendingTab === tab
                      ? "bg-[#EEF2FF] text-[#4F46E5]"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* 5 Stock Cards in Horizontal Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {trendingStocks.map((stock) => (
                <div
                  key={stock.symbol}
                  onClick={() => handleOpenTrade(stock.symbol, stock.symbol)}
                  className="border border-slate-200/80 rounded-xl p-3 hover:shadow-sm hover:border-indigo-200 transition-all cursor-pointer bg-white group flex flex-col justify-between"
                >
                  <div
                    className={`w-6 h-6 rounded-md ${stock.logoBg} flex items-center justify-center font-bold text-[11px] mb-2 shadow-2xs`}
                  >
                    {stock.logoText}
                  </div>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                    {stock.symbol}
                  </span>
                  <div className="mt-1">
                    <span className="text-xs font-bold font-mono text-slate-900 block">
                      {stock.price}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-semibold block ${
                        stock.isPositive ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {stock.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* See more link */}
          <div className="pt-3 text-right">
            <Link
              href="/watchlist"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors inline-flex items-center gap-1"
            >
              <span>See more</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right: Top Movers Today (~5 cols in lg) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            {/* Header */}
            <h3 className="text-sm font-bold text-slate-900 mb-3">Top movers today</h3>

            {/* Sub-tabs & Dropdown */}
            <div className="flex items-center justify-between gap-2 mb-3 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-1">
                {["Gainers", "Losers", "Volume shockers"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveMoversTab(tab)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                      activeMoversTab === tab
                        ? "bg-[#EEF2FF] text-[#4F46E5]"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 text-[11px] font-semibold text-slate-600 cursor-pointer">
                <span>NIFTY 100</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
              <span className="col-span-5">Company</span>
              <span className="col-span-2 text-right">Price</span>
              <span className="col-span-3 text-right">Change</span>
              <span className="col-span-2 text-right">Volume</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-100">
              {topMovers.map((mover) => (
                <div
                  key={mover.company}
                  onClick={() => handleOpenTrade(mover.symbol, mover.company)}
                  className="grid grid-cols-12 items-center py-2 px-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="col-span-5 flex items-center gap-2 min-w-0">
                    <div
                      className={`w-5 h-5 rounded ${mover.logoBg} text-white flex items-center justify-center font-bold text-[10px] shrink-0`}
                    >
                      {mover.logoText}
                    </div>
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {mover.company}
                    </span>
                  </div>
                  <span className="col-span-2 text-right text-xs font-bold font-mono text-slate-900">
                    {mover.price}
                  </span>
                  <span className="col-span-3 text-right text-[11px] font-mono font-semibold text-emerald-600">
                    {mover.change}
                  </span>
                  <span className="col-span-2 text-right text-[11px] font-mono text-slate-500 truncate">
                    {mover.volume}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* See more link */}
          <div className="pt-3 text-left">
            <Link
              href="/stocks/RELIANCE"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors inline-flex items-center gap-1"
            >
              <span>See more</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ROW 4: THREE CARDS (MOST TRADED, INTRADAY, PRODUCTS & TOOLS) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Most traded stocks on Groww */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 mb-3">
              Most traded stocks on Groww
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {mostTraded.map((item) => (
                <div
                  key={item.name}
                  onClick={() => handleOpenTrade(item.symbol, item.name)}
                  className="border border-slate-100 rounded-xl p-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div
                    className={`w-5 h-5 rounded ${item.logoBg} text-white flex items-center justify-center font-bold text-[9px] mb-2`}
                  >
                    {item.logoText}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-800 block truncate">
                    {item.name}
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-900 block mt-0.5">
                    {item.price}
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-emerald-600 block">
                    {item.change}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Top intraday stocks */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 mb-3">Top intraday stocks</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {topIntraday.map((item) => (
                <div
                  key={item.name}
                  onClick={() => handleOpenTrade(item.symbol, item.name)}
                  className="border border-slate-100 rounded-xl p-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div
                    className={`w-5 h-5 rounded ${item.logoBg} text-white flex items-center justify-center font-bold text-[9px] mb-2`}
                  >
                    {item.logoText}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-800 block truncate">
                    {item.name}
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-900 block mt-0.5">
                    {item.price}
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-emerald-600 block">
                    {item.change}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-2 text-right">
            <Link
              href="/stocks/RELIANCE"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
            >
              <span>See more</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 3: Products & Tools */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h3 className="text-xs font-bold text-slate-900 mb-3">Products &amp; Tools</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {/* Column 1 */}
            <div className="space-y-2">
              {productsToolsCol1.map((tool) => {
                const Icon = tool.icon;
                return (
                  <div
                    key={tool.title}
                    className="flex items-center justify-between py-1 px-1 rounded hover:bg-slate-50 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-teal-600" />
                      <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900">
                        {tool.title}
                      </span>
                    </div>
                    {tool.badge && (
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${tool.badgeColor}`}
                      >
                        {tool.badge}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Column 2 */}
            <div className="space-y-2">
              {productsToolsCol2.map((tool) => {
                const Icon = tool.icon;
                return (
                  <div
                    key={tool.title}
                    className="flex items-center justify-between py-1 px-1 rounded hover:bg-slate-50 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-teal-600" />
                      <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900">
                        {tool.title}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ROW 5: MARKET NEWS */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {/* Header & Tabs */}
        <div className="flex flex-wrap items-center gap-4 mb-3 border-b border-slate-100 pb-2.5">
          <h3 className="text-sm font-bold text-slate-900">Market News</h3>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {["All", "Stocks", "Economy", "Currency", "Commodities"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveNewsTab(tab)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  activeNewsTab === tab
                    ? "bg-[#EEF2FF] text-[#4F46E5]"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* 4 News Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {newsItems.map((news) => (
            <div
              key={news.company}
              className="border border-slate-100 rounded-xl p-3 hover:bg-slate-50 cursor-pointer transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className={`w-5 h-5 rounded ${news.logoBg} flex items-center justify-center font-bold text-[9px] shrink-0`}
                    >
                      {news.logoText}
                    </div>
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {news.company}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-semibold shrink-0 ${
                      news.isPositive ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {news.change}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                  {news.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Modals */}
      <OrderPadModal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        stockId="stk-demo"
        symbol={orderStock.symbol}
        stockName={orderStock.name}
        defaultSide={orderSide}
        onOrderPlaced={() => setOrderModalOpen(false)}
      />

      <OIAnalysisWidget
        isOpen={oiModalOpen}
        onClose={() => setOiModalOpen(false)}
        initialIndex="NIFTY"
        onSelectStrike={(strike, type) => {
          setOiModalOpen(false);
          handleOpenTrade(`NIFTY ${strike} ${type}`, `NIFTY ${strike} ${type}`, type === "CE" ? "BUY" : "SELL");
        }}
      />
    </div>
  );
}
