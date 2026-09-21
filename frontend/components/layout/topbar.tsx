"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Layers,
  ArrowRight,
  TrendingUp,
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/api-client";

interface SearchResultItem {
  instrument_key: string;
  symbol: string;
  name: string;
  exchange: string;
  segment?: string;
  instrument_type?: string;
}

export function Topbar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Global hotkey '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced search query execution
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await apiRequest<SearchResultItem[]>(
          `/api/v1/market/instruments/search?query=${encodeURIComponent(searchQuery.trim())}&limit=8`
        );
        setResults(data || []);
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: SearchResultItem) => {
    setIsOpen(false);
    setSearchQuery("");
    router.push(`/stocks/${encodeURIComponent(item.symbol)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelect(results[selectedIndex]);
      } else if (searchQuery.trim()) {
        setIsOpen(false);
        router.push(`/stocks/${encodeURIComponent(searchQuery.trim().toUpperCase())}`);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <header className="h-[58px] bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 select-none shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* 1. Left: Brand Logo */}
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
              Virtual Trading Hub
            </span>
          </div>
        </Link>
      </div>

      {/* 2. Center: Search Bar with Autocomplete Dropdown */}
      <div className="flex-1 max-w-xl mx-4 lg:mx-10 hidden sm:block relative">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search stocks, indices, ETFs (e.g. RELIANCE, NIFTY 50, TCS)..."
            className="w-full pl-10 pr-9 py-2 rounded-full bg-slate-50/70 border border-slate-200/90 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
          />
          {searchQuery ? (
            <button
              onClick={() => {
                setSearchQuery("");
                setResults([]);
                setIsOpen(false);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-mono text-slate-400 pointer-events-none">
              /
            </div>
          )}
        </div>

        {/* Autocomplete Dropdown Menu */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden text-xs max-h-96 overflow-y-auto"
          >
            {isLoading && (
              <div className="p-3 text-center text-slate-400 flex items-center justify-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span>Searching instruments master...</span>
              </div>
            )}

            {!isLoading && results.length === 0 && searchQuery && (
              <div className="p-4 text-center text-slate-400">
                No matching instruments found for &quot;{searchQuery}&quot;. Press Enter to search anyway.
              </div>
            )}

            {!isLoading && results.length > 0 && (
              <div className="py-1">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Instruments ({results.length})
                </div>
                {results.map((item, idx) => (
                  <div
                    key={item.instrument_key || item.symbol}
                    onClick={() => handleSelect(item)}
                    className={`px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                      idx === selectedIndex ? "bg-indigo-50/70 text-indigo-900" : "hover:bg-slate-50 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs font-mono shrink-0">
                        {item.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{item.symbol}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-mono font-medium">
                            {item.exchange}
                          </span>
                          {item.instrument_type && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-50 text-indigo-600 font-mono font-semibold">
                              {item.instrument_type}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                          {item.name}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Right: Quick Navigation & Profile */}
      <div className="flex items-center gap-1 sm:gap-2 lg:gap-5 shrink-0">
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

          <Link
            href="/admin/monitoring"
            className="flex items-center gap-1.5 hover:text-slate-900 transition-colors"
          >
            <Activity className="w-4 h-4 text-slate-500" />
            <span>Monitoring</span>
          </Link>
        </nav>

        <div className="hidden xl:block h-5 w-[1px] bg-slate-200" />

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
