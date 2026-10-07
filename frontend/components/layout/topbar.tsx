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
import {
  formatINR,
  formatCompactINR,
  formatStockPrice,
  formatPnL,
} from "@/lib/formatters";
import { useMarketWebSocket } from "@/lib/market-ws";
import { clearPositionsCache } from "@/lib/positions-service";

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
      clearPositionsCache();
      router.push("/login");
    }
  };

  const isMarketConnected = connectionState === "CONNECTED";

  // Navigation Items
  const navTabs = [
    { name: "Dashboard", href: "/dashboard", isActive: pathname === "/dashboard" },
    { name: "Explore", href: "/explore", isActive: pathname === "/explore" },
    { name: "Holdings", href: "/holdings", isActive: pathname === "/holdings" || (pathname === "/portfolio" && currentTab !== "positions") },
    { name: "Positions", href: "/positions", isActive: pathname === "/positions" || (pathname === "/portfolio" && currentTab === "positions") },
    { name: "Orders", href: "/orders", isActive: pathname === "/orders" },
    { name: "Watchlist", href: "/watchlist", isActive: pathname === "/watchlist" },
    { name: "Option Chain", href: "/option-chain", isActive: pathname === "/option-chain" },
    { name: "Terminal", href: "/terminal", isActive: pathname === "/terminal" },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex items-center justify-between px-space-md lg:px-space-xl border-b border-outline-variant/30 select-none">
        {/* 1. Left: Brand Logo & Navigation */}
        <div className="flex items-center gap-space-lg">
          <Link href="/dashboard" className="flex items-center gap-space-sm group">
            <img
              alt="BullRun Logo"
              className="h-8 w-auto object-contain"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_jSrXZityA6DebTcw55vtDhhZUd0MFdGGRb6IF1-tMVDnnFsuujPjivFjAOFN-rAclxccNjQ-Mf5AcIN1sPYmV_zaypAoqGD0hM2fgPG-gJnruMb_faq8LI6TiWgCEpNaNzE7_mKF6FYVwJDiuL81IT1nAY1TPR99faLbO51WYqrWj1yH3J-cjRaC9AcLfGEkCtpUwhViiq0oa1G2rWCGMI7UJ9jQS9OWW8skBAEZFLv2PJpJjFqT"
            />
            <span className="font-headline-sm tracking-tight text-on-surface">BullRun</span>
          </Link>

          <nav className="hidden xl:flex items-center gap-space-xs ml-space-sm">
            {navTabs.map((tab) => (
              <Link
                key={tab.name}
                href={tab.href}
                className={`px-space-md py-space-xs transition-colors rounded-lg text-body-md ${
                  tab.isActive
                    ? "bg-primary-container text-on-primary-container font-medium"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                }`}
              >
                {tab.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* 2. Center/Right: Search, Live Feed, Paper Trade, Notifications, Profile */}
        <div className="flex items-center gap-space-md">
          {/* Search Box */}
          <div className="relative hidden md:block w-64 lg:w-72">
            <span className="absolute inset-y-0 left-0 flex items-center pl-space-md pointer-events-none">
              <span className="material-symbols-outlined text-outline text-[18px]">search</span>
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (results.length > 0 || searchQuery.trim()) setIsOpen(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search symbols, assets..."
              className="w-full pl-10 pr-space-md py-space-xs bg-surface-container-low rounded-lg text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary transition-all font-normal"
            />
            {searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setResults([]);
                  setIsOpen(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden lg:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-surface-container text-[10px] font-mono text-outline pointer-events-none">
                /
              </kbd>
            )}

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
                    className={`px-2.5 py-1 rounded-[6px] font-medium transition-colors ${
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
                    const pnl = formatPnL(item.change_percent ?? 0, item.change_percent ?? 0);
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
                          <div className="w-7 h-7 rounded-[6px] bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-center font-semibold text-[#374151] text-[11px] font-mono shrink-0">
                            {item.symbol.slice(0, 2)}
                          </div>
                          <div className="truncate">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-[#111827] text-xs">
                                {item.symbol}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F3F4F6] text-[#6B7280] font-mono font-normal">
                                {item.instrument_type === "INDEX" ? "Index" : (item.exchange || "NSE")}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#6B7280] block truncate max-w-[220px] font-normal">
                              {item.name}
                            </span>
                          </div>
                        </div>

                        {/* Real Price & Change Preview */}
                        <div className="text-right shrink-0">
                          {hasPrice ? (
                            <>
                              <div className="font-mono font-semibold text-xs text-[#111827] tabular-nums">
                                {formatStockPrice(item.price!)}
                              </div>
                              <div
                                className={`text-[10px] font-medium tabular-nums flex items-center justify-end gap-0.5 ${pnl.colorClass}`}
                              >
                                {pnl.percentText}
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

          {/* LIVE MARKET Indicator */}
          <div className="hidden lg:flex items-center gap-space-xs px-space-sm py-space-xs bg-tertiary-container/10 rounded-full text-tertiary text-label-sm">
            <span className={`w-2 h-2 rounded-full ${isMarketConnected ? "bg-tertiary animate-pulse" : "bg-error"}`} />
            <span>LIVE MARKET</span>
          </div>

          {/* Paper Trade Badge */}
          <button
            onClick={() => setIsPaperModalOpen(true)}
            className="hidden lg:flex items-center gap-space-xs px-space-sm py-space-xs bg-secondary-container text-on-secondary-container rounded-lg text-label-sm font-medium hover:opacity-90 transition-opacity"
            title={`Virtual Margin Available: ${formatINR(wallet ? Number(wallet.available_balance) : 100000)}`}
          >
            <span>Paper Trade</span>
          </button>

          {/* Notifications Button */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-space-xs rounded-full hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest border border-outline-variant/40 rounded-xl shadow-lg z-50 overflow-hidden text-xs">
                <div className="p-3 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-on-surface">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-error-container text-error font-medium text-[10px]">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-primary hover:underline font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-[#6B7280]">
                      <Bell className="w-6 h-6 mx-auto mb-2 text-[#9CA3AF]" />
                      <p className="font-normal text-xs">No notifications yet</p>
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
                          <p className="font-semibold text-[#111827] text-xs leading-tight">
                            {notif.title}
                          </p>
                          <p className="text-[#6B7280] text-[11px] mt-0.5 line-clamp-2 font-normal">
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

                <div className="p-2 border-t border-outline-variant/30 bg-surface-container-low text-center">
                  <Link
                    href="/notifications"
                    onClick={() => setIsNotifOpen(false)}
                    className="text-[11px] text-primary font-medium hover:underline"
                  >
                    View all notifications &amp; alerts →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <div
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-space-sm pl-space-sm border-l border-outline-variant/30 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-medium text-label-md">
                BR
              </div>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
                <span className="material-symbols-outlined text-[18px]">person</span>
              </div>
            </div>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest border border-outline-variant/40 rounded-xl shadow-lg z-50 py-1 text-xs">
                <div className="px-3.5 py-2.5 border-b border-outline-variant/30">
                  <p className="font-semibold text-on-surface">BullRun Trader</p>
                  <p className="text-[11px] text-outline font-mono">Paper Account Active</p>
                </div>

                <Link
                  href="/profile"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-[16px]">account_circle</span>
                  <span>My Profile &amp; Settings</span>
                </Link>

                <Link
                  href="/holdings"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                  <span>Holdings Portfolio</span>
                </Link>

                <Link
                  href="/positions"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-[16px]">show_chart</span>
                  <span>Open Positions</span>
                </Link>

                <Link
                  href="/orders"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                  <span>Order Book</span>
                </Link>

                <Link
                  href="/terminal"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-[16px] text-primary">terminal</span>
                  <span className="font-medium text-on-surface">Pro Terminal</span>
                </Link>

                <Link
                  href="/set-up-mpin"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-[16px]">password</span>
                  <span>Security &amp; MPIN</span>
                </Link>

                <Link
                  href="/admin"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                  <span>Admin Dashboard</span>
                </Link>

                <div className="border-t border-outline-variant/30 my-1" />

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3.5 py-2 text-error hover:bg-error-container/20 text-left font-medium"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
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
                  <h3 className="font-semibold text-sm text-[#111827]">Paper Trading Mode</h3>
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
                <span className="font-mono font-semibold text-[#111827] tabular-nums">
                  {formatINR(wallet ? Number(wallet.available_balance) : 100000)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#6B7280]">Total Virtual Balance:</span>
                <span className="font-mono font-normal text-[#111827] tabular-nums">
                  {formatINR(wallet ? Number(wallet.balance) : 100000)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#6B7280]">Locked Limit Margin:</span>
                <span className="font-mono font-normal text-[#6B7280] tabular-nums">
                  {formatINR(wallet ? Number(wallet.locked_balance) : 0)}
                </span>
              </div>
            </div>

            <p className="text-xs text-[#6B7280] leading-relaxed font-normal">
              Real money is not involved. All orders execute against your virtual BullRun balance with real-time market price benchmarks and simulated regulatory charges.
            </p>

            <button
              onClick={() => setIsPaperModalOpen(false)}
              className="w-full py-2 rounded-[8px] bg-[#F97316] text-white font-medium text-xs hover:bg-[#EA580C] transition-colors"
            >
              Continue Trading
            </button>
          </div>
        </div>
      )}
    </>
  );
}
