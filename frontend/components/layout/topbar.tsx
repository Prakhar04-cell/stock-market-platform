"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  LineChart,
  Star,
  FileText,
  PieChart,
  ChevronDown,
  Bell,
  Activity,
} from "lucide-react";

export function Topbar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      router.push(`/stocks/${searchQuery.trim().toUpperCase()}`);
    }
  };

  return (
    <header className="h-[58px] bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 select-none shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* 1. Left: Brand Logo & Tagline */}
      <div className="flex items-center gap-8 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[17px] font-bold tracking-tight text-slate-900 leading-tight">
              Trade<span className="text-indigo-600">X</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">
              Invest Smarter
            </span>
          </div>
        </Link>
      </div>

      {/* 2. Center: Search Bar with Hotkey '/' */}
      <div className="flex-1 max-w-xl mx-4 lg:mx-10 hidden sm:block">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search for stocks, ETFs, indices, tools..."
            className="w-full pl-10 pr-9 py-2 rounded-full bg-slate-50/70 border border-slate-200/90 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
          />
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-mono text-slate-400 pointer-events-none">
            /
          </div>
        </div>
      </div>

      {/* 3. Right: Quick Navigation & Profile */}
      <div className="flex items-center gap-1 sm:gap-2 lg:gap-5 shrink-0">
        {/* Desktop Quick Nav Links */}
        <nav className="hidden xl:flex items-center gap-5 text-[13px] font-medium text-slate-600">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 hover:text-slate-900 transition-colors"
          >
            <LineChart className="w-4 h-4 text-slate-500" />
            <span>Markets</span>
          </Link>

          <Link
            href="/watchlist"
            className="flex items-center gap-1.5 hover:text-slate-900 transition-colors"
          >
            <Star className="w-4 h-4 text-slate-500" />
            <span>Watchlist</span>
          </Link>

          <Link
            href="/orders"
            className="flex items-center gap-1.5 hover:text-slate-900 transition-colors"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Orders</span>
          </Link>

          <Link
            href="/portfolio"
            className="flex items-center gap-1.5 hover:text-slate-900 transition-colors"
          >
            <PieChart className="w-4 h-4 text-slate-500" />
            <span>Holdings</span>
          </Link>

          <div className="flex items-center gap-1 text-slate-600 hover:text-slate-900 cursor-pointer transition-colors">
            <span>More</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </nav>

        {/* Vertical Divider */}
        <div className="hidden xl:block h-5 w-[1px] bg-slate-200" />

        {/* Notifications Icon with Red Badge '3' */}
        <button
          className="relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
            3
          </span>
        </button>

        {/* User Profile Pill */}
        <Link
          href="/admin"
          className="flex items-center gap-2 pl-1 sm:pl-2 py-1 hover:bg-slate-50 rounded-full transition-colors cursor-pointer"
        >
          <div className="w-7 h-7 rounded-full bg-[#7C3AED] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            PS
          </div>
          <span className="text-[13px] font-semibold text-slate-800 hidden md:inline">
            Prakhar
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
        </Link>
      </div>
    </header>
  );
}
