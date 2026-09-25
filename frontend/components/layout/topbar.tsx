"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  Bell,
  ChevronDown,
  X,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Info,
  LogOut,
  User as UserIcon,
  Wallet as WalletIcon,
  Check,
  Terminal as TerminalIcon,
  Layers,
  Sparkles,
} from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { useMarketWebSocket } from "@/lib/market-ws";

interface SearchResultItem {
  instrument_key: string;
  symbol: string;
  name: string;
  exchange: string;
  segment?: string;
  instrument_type?: string;
  price?: number;
  change_percent?: number;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

interface WalletData {
  balance: number;
  available_balance: number;
  locked_balance: number;
  currency: string;
}

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentTab, setCurrentTab] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setCurrentTab(params.get("tab"));
    }
  }, [pathname]);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState<"ALL" | "STOCKS" | "INDICES" | "ETFS" | "COMMODITIES">("ALL");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Market WebSocket connection state
  const { connectionState } = useMarketWebSocket();

  // Wallet & Paper Trading state
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isPaperModalOpen, setIsPaperModalOpen] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Profile dropdown state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Load wallet balance
  const loadWallet = useCallback(async () => {
    try {
      const data = await apiRequest<WalletData>("/api/v1/wallet");
      if (data) setWallet(data);
    } catch {
      // Default virtual wallet if unauthenticated
      setWallet({ balance: 100000, available_balance: 100000, locked_balance: 0, currency: "INR" });
    }
  }, []);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    try {
      const data = await apiRequest<{ notifications: NotificationItem[]; unread_count: number }>("/api/v1/notifications");
      if (data) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch {
      // Ignore if unauthenticated
    }
  }, []);

  useEffect(() => {
    loadWallet();
    loadNotifications();
    const interval = setInterval(() => {
      loadWallet();
      loadNotifications();
    }, 20000);
    return () => clearInterval(interval);
  }, [loadWallet, loadNotifications]);

  // Global hotkeys '/' and 'Ctrl+K' / 'Cmd+K' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "/" && document.activeElement !== searchInputRef.current) ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Search query with real batch quote enrichment
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
        let list = data || [];

        // Filter by category if selected
        if (searchCategory === "STOCKS") {
          list = list.filter((item) => item.instrument_type !== "INDEX" && !item.symbol.includes("BEES"));
        } else if (searchCategory === "INDICES") {
          list = list.filter((item) => item.instrument_type === "INDEX");
        } else if (searchCategory === "ETFS") {
          list = list.filter((item) => item.symbol.includes("BEES") || item.name.toLowerCase().includes("etf"));
        }

        // Enrich with real live prices where possible
        if (list.length > 0) {
          try {
            const symbolsParam = list.map((i) => i.symbol).join(",");
            const quotes = await apiRequest<Record<string, any>>(`/api/v1/market/quotes?symbols=${encodeURIComponent(symbolsParam)}`);
            if (quotes) {
              list.forEach((item) => {
                const q = quotes[item.symbol] || quotes[item.instrument_key];
                if (q && q.ltp) {
                  item.price = Number(q.ltp);
                  item.change_percent = q.change_percent !== null ? Number(q.change_percent) : 0;
                }
              });
            }
          } catch {
            // Quotes fetch optional
          }
        }

        setResults(list);
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, searchCategory]);

  // Click outside listener for dropdowns
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
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
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

  const handleMarkAllRead = async () => {
    try {
      await apiRequest("/api/v1/notifications/mark-all-read", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Ignore
    }
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      await apiRequest(`/api/v1/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Ignore
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("tradex_token");
      localStorage.removeItem("tradex_refresh_token");
      router.push("/login");
    }
  };

  const isMarketConnected = connectionState === "CONNECTED";

  // Navigation Items
  const navTabs = [
    { name: "Stocks", href: "/stocks/NIFTY%2050", isActive: pathname.startsWith("/stocks") },
    { name: "Explore", href: "/explore", isActive: pathname === "/explore" },
    { name: "Holdings", href: "/portfolio", isActive: pathname === "/portfolio" && currentTab !== "positions" },
    { name: "Positions", href: "/portfolio?tab=positions", isActive: pathname === "/portfolio" && currentTab === "positions" },
    { name: "Orders", href: "/orders", isActive: pathname === "/orders" },
    { name: "Watchlist", href: "/watchlist", isActive: pathname === "/watchlist" },
  ];

  return (
    <>
      <header className="h-14 bg-white border-b border-[#E5E7EB] px-4 sm:px-6 flex items-center sticky top-0 z-40 select-none">
        <nav aria-label="Main Navigation" className="w-full flex items-center justify-between">
          {/* 1. Left: Brand Logo & Main Navigation Tabs */}
          <div className="flex items-center gap-6 shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-[8px] bg-[#0F172A] flex items-center justify-center text-white shadow-none group-hover:bg-[#F97316] transition-colors">
                <span className="font-extrabold text-sm tracking-tight text-white">BR</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[17px] font-extrabold tracking-tight text-[#111827] leading-none">
                  Bull<span className="text-[#F97316]">Run</span>
                </span>
                <span className="text-[9.5px] text-[#6B7280] font-medium tracking-wide">
                  Markets
                </span>
              </div>
            </Link>

            {/* Top Desktop Navigation Links with Active Indicators */}
            <div className="hidden xl:flex items-center space-x-1">
              {navTabs.map((tab) => (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={`relative px-3 py-4 text-[13px] font-medium transition-colors flex items-center ${
                    tab.isActive
                      ? "text-[#111827] font-bold"
                      : "text-[#6B7280] hover:text-[#111827]"
                  }`}
                >
                  <span>{tab.name}</span>
                  {tab.isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2.5px] bg-[#F97316] rounded-t-full" />
                  )}
                </Link>
              ))}
            </div>
          </div>

        {/* 2. Center: Global Search Bar + Terminal Action Button */}
        <div className="flex-1 max-w-lg mx-3 sm:mx-6 flex items-center gap-2 relative">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (results.length > 0 || searchQuery.trim()) setIsOpen(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search stocks, indices, ETFs (Press /)"
              className="w-full pl-9 pr-14 py-1.5 rounded-[8px] bg-[#F8FAFC] border border-[#E5E7EB] text-[13px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#F97316] focus:bg-white focus:ring-2 focus:ring-[#FFF7ED] transition-all"
            />
            {searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setResults([]);
                  setIsOpen(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-white border border-[#E5E7EB] text-[10px] font-mono text-[#9CA3AF] pointer-events-none">
                ⌘K
              </kbd>
            )}
          </div>

          {/* Dedicated Terminal Button */}
          <Link
            href="/terminal"
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border text-xs font-semibold transition-all shrink-0 ${
              pathname === "/terminal"
                ? "bg-[#0F172A] text-white border-[#0F172A]"
                : "bg-white text-[#111827] border-[#E5E7EB] hover:bg-[#F8FAFC] hover:border-[#D1D5DB]"
            }`}
            title="Open Dedicated Full-Screen Trading Terminal"
          >
            <TerminalIcon className="w-3.5 h-3.5 text-[#F97316]" />
            <span>Terminal</span>
          </Link>

          {/* Autocomplete Dropdown with Category Tabs */}
          {isOpen && (
            <div
              ref={dropdownRef}
              className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#E5E7EB] rounded-[10px] shadow-dropdown z-50 overflow-hidden text-xs max-h-96 overflow-y-auto"
            >
              {/* Category Pills */}
              <div className="flex items-center gap-1 p-2 bg-[#F8FAFC] border-b border-[#E5E7EB] overflow-x-auto text-[11px]">
                {(["ALL", "STOCKS", "INDICES", "ETFS"] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSearchCategory(cat)}
                    className={`px-2.5 py-1 rounded-[6px] font-semibold transition-colors ${
                      searchCategory === cat
                        ? "bg-[#F97316] text-white"
                        : "text-[#6B7280] hover:text-[#111827] hover:bg-[#E5E7EB]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {isLoading && (
                <div className="p-4 text-center text-[#6B7280] flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
                  <span>Searching instruments...</span>
                </div>
              )}

              {!isLoading && results.length === 0 && searchQuery && (
                <div className="p-4 text-center text-[#6B7280]">
                  No matching instruments found for &quot;{searchQuery}&quot;. Press Enter to view directly.
                </div>
              )}

              {!isLoading && results.length > 0 && (
                <div className="py-1">
                  {results.map((item, idx) => {
                    const hasPrice = item.price !== undefined && item.price !== null;
                    const isPos = (item.change_percent ?? 0) >= 0;
                    return (
                      <div
                        key={item.instrument_key || item.symbol}
                        onClick={() => handleSelect(item)}
                        className={`px-3.5 py-2.5 flex items-center justify-between cursor-pointer border-b border-slate-50 last:border-none transition-colors ${
                          idx === selectedIndex
                            ? "bg-[#FFF7ED] text-[#111827]"
                            : "hover:bg-[#F8FAFC] text-[#111827]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-[6px] bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-center font-bold text-[#374151] text-[11px] font-mono shrink-0">
                            {item.symbol.slice(0, 2)}
                          </div>
                          <div className="truncate">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[#111827] text-xs">
                                {item.symbol}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F3F4F6] text-[#6B7280] font-mono font-medium">
                                {item.instrument_type === "INDEX" ? "Index" : (item.exchange || "NSE")}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#6B7280] block truncate max-w-[220px]">
                              {item.name}
                            </span>
                          </div>
                        </div>

                        {/* Real Price & Change Preview */}
                        <div className="text-right shrink-0">
                          {hasPrice ? (
                            <>
                              <div className="font-mono font-bold text-xs text-[#111827] tabular-nums">
                                ₹{item.price?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </div>
                              <div
                                className={`text-[10px] font-semibold tabular-nums flex items-center justify-end gap-0.5 ${
                                  isPos ? "text-[#16A34A]" : "text-[#DC2626]"
                                }`}
                              >
                                {isPos ? "+" : ""}
                                {item.change_percent?.toFixed(2)}%
                              </div>
                            </>
                          ) : (
                            <ArrowRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Right: Paper Trading Badge, Notifications, Market Status, Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Market Status Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#F8FAFC] border border-[#E5E7EB] text-[#4B5563]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isMarketConnected ? "bg-[#16A34A] animate-pulse" : "bg-slate-400"
              }`}
            />
            <span>{isMarketConnected ? "● LIVE FEED" : "○ FEED DISCONNECTED"}</span>
          </div>

          {/* Paper Trading Indicator Badge (Clickable modal) */}
          <button
            onClick={() => setIsPaperModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFF7ED] border border-[#FDBA74] text-[#EA580C] text-xs font-bold hover:bg-[#FFEDD5] transition-colors"
            title="Click to view Paper Trading details"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] animate-pulse" />
            <span className="hidden sm:inline">PAPER TRADING</span>
            <span className="sm:hidden">PAPER</span>
          </button>

          {/* Virtual Balance Display */}
          <button
            onClick={() => setIsPaperModalOpen(true)}
            className="hidden md:flex flex-col items-end px-2.5 py-0.5 rounded-[8px] hover:bg-[#F8FAFC] transition-colors"
            title="Available Virtual Margin"
          >
            <span className="text-[10px] font-medium text-[#6B7280] leading-none">
              Virtual Margin
            </span>
            <span className="text-xs font-bold font-mono text-[#111827] tabular-nums">
              ₹{wallet ? Number(wallet.available_balance).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "1,00,000.00"}
            </span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2 rounded-[8px] text-[#6B7280] hover:text-[#111827] hover:bg-[#F8FAFC] relative transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#DC2626]" />
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E5E7EB] rounded-[10px] shadow-dropdown z-50 overflow-hidden text-xs">
                <div className="p-3 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F8FAFC]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#111827]">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-[#FFF7ED] text-[#F97316] font-bold text-[10px]">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-[#F97316] hover:underline font-semibold"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-[#6B7280]">
                      <Bell className="w-6 h-6 mx-auto mb-2 text-[#9CA3AF]" />
                      <p className="font-medium text-xs">No notifications yet</p>
                      <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                        Order fills and alerts will appear here.
                      </p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleMarkOneRead(notif.id)}
                        className={`p-3 flex items-start gap-2.5 hover:bg-[#F8FAFC] cursor-pointer transition-colors ${
                          !notif.is_read ? "bg-[#FFF7ED]/30" : ""
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {notif.notification_type === "SUCCESS" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                          ) : notif.notification_type === "WARNING" ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          ) : (
                            <Info className="w-3.5 h-3.5 text-[#F97316]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#111827] text-xs leading-tight">
                            {notif.title}
                          </p>
                          <p className="text-[#6B7280] text-[11px] mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                          <span className="text-[9.5px] text-[#9CA3AF] font-mono mt-1 block">
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        {!notif.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] shrink-0 mt-1" />
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2 border-t border-[#E5E7EB] bg-[#F8FAFC] text-center">
                  <Link
                    href="/orders"
                    onClick={() => setIsNotifOpen(false)}
                    className="text-[11px] text-[#F97316] font-semibold hover:underline"
                  >
                    View order execution history →
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="h-5 w-[1px] bg-[#E5E7EB]" />

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-1.5 pl-1.5 py-1 rounded-full hover:bg-[#F8FAFC] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs shadow-none">
                BR
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-[#E5E7EB] rounded-[10px] shadow-dropdown z-50 py-1 text-xs">
                <div className="px-3.5 py-2.5 border-b border-[#E5E7EB]">
                  <p className="font-bold text-[#111827]">BullRun Trader</p>
                  <p className="text-[11px] text-[#6B7280] font-mono">Paper Account Active</p>
                </div>

                <Link
                  href="/explore"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-[#4B5563] hover:text-[#111827] hover:bg-[#F8FAFC]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Explore Markets</span>
                </Link>

                <Link
                  href="/portfolio"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-[#4B5563] hover:text-[#111827] hover:bg-[#F8FAFC]"
                >
                  <WalletIcon className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Portfolio Holdings</span>
                </Link>

                <Link
                  href="/orders"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-[#4B5563] hover:text-[#111827] hover:bg-[#F8FAFC]"
                >
                  <Activity className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Order Book</span>
                </Link>

                <Link
                  href="/terminal"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-[#4B5563] hover:text-[#111827] hover:bg-[#F8FAFC]"
                >
                  <TerminalIcon className="w-3.5 h-3.5 text-[#F97316]" />
                  <span className="font-medium text-[#111827]">Trading Terminal</span>
                </Link>

                <Link
                  href="/admin/monitoring"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-[#4B5563] hover:text-[#111827] hover:bg-[#F8FAFC]"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>System Monitoring</span>
                </Link>

                <div className="border-t border-[#E5E7EB] my-1" />

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3.5 py-2 text-[#DC2626] hover:bg-rose-50 text-left font-medium"
                >
                  <LogOut className="w-3.5 h-3.5 text-[#DC2626]" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>

      {/* Paper Trading Information Modal */}
      {isPaperModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] max-w-sm w-full p-5 space-y-4 shadow-dropdown select-none">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-[8px] bg-[#F0FDF4] text-[#16A34A]">
                  <ShieldCheck className="w-5 h-5 text-[#16A34A]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#111827]">Paper Trading Mode</h3>
                  <p className="text-[11px] text-[#6B7280]">Simulated virtual risk-free environment</p>
                </div>
              </div>
              <button
                onClick={() => setIsPaperModalOpen(false)}
                className="text-[#9CA3AF] hover:text-[#111827]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-[8px] bg-[#F8FAFC] border border-[#E5E7EB] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#6B7280]">Available Virtual Margin:</span>
                <span className="font-mono font-bold text-[#111827] tabular-nums">
                  ₹{wallet ? Number(wallet.available_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "1,00,000.00"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#6B7280]">Total Virtual Balance:</span>
                <span className="font-mono font-medium text-[#111827] tabular-nums">
                  ₹{wallet ? Number(wallet.balance).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "1,00,000.00"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#6B7280]">Locked Limit Margin:</span>
                <span className="font-mono text-[#6B7280] tabular-nums">
                  ₹{wallet ? Number(wallet.locked_balance).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
                </span>
              </div>
            </div>

            <p className="text-xs text-[#6B7280] leading-relaxed">
              Real money is not involved. All orders execute against your virtual BullRun balance with real-time market price benchmarks and simulated regulatory charges.
            </p>

            <button
              onClick={() => setIsPaperModalOpen(false)}
              className="w-full py-2 rounded-[8px] bg-[#F97316] text-white font-semibold text-xs hover:bg-[#EA580C] transition-colors"
            >
              Continue Trading
            </button>
          </div>
        </div>
      )}
    </>
  );
}
