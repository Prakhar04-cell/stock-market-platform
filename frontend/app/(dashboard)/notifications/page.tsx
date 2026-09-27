"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";

interface NotificationItem {
  id: string;
  category: "price" | "order" | "trade" | "portfolio" | "news" | "system";
  title: string;
  symbol?: string;
  timeAgo: string;
  description: string;
  isRead: boolean;
  linkHref?: string;
  linkText?: string;
}

export default function NotificationsPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<
    "all" | "price" | "order" | "trade" | "portfolio" | "news" | "system"
  >("all");
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "n-1",
      category: "price",
      title: "Reliance Industries Target Reached",
      symbol: "RELIANCE",
      timeAgo: "10 mins ago",
      description: "Price crossed above your target of ₹2,850.00. Current trading price is ₹2,856.40 (+1.45%).",
      isRead: false,
      linkHref: "/stocks/RELIANCE",
      linkText: "View Chart",
    },
    {
      id: "n-2",
      category: "trade",
      title: "Buy Order Executed Successfully",
      symbol: "TATAMOTORS",
      timeAgo: "45 mins ago",
      description: "Limit order for 50 shares executed at ₹945.50. Total debit: ₹47,275.00.",
      isRead: false,
      linkHref: "/orders",
      linkText: "View Order Details",
    },
    {
      id: "n-3",
      category: "order",
      title: "Limit Order Placed",
      symbol: "INFY",
      timeAgo: "2 hours ago",
      description: "Buy limit order for 100 shares of INFY at ₹1,610.00 placed and waiting for fill in market depth.",
      isRead: true,
      linkHref: "/orders",
      linkText: "View Orders",
    },
    {
      id: "n-4",
      category: "portfolio",
      title: "Daily Portfolio Milestone",
      timeAgo: "4 hours ago",
      description: "Your equity portfolio reached a new all-time high of ₹12,45,680.50 (+18.6% total return).",
      isRead: false,
      linkHref: "/holdings",
      linkText: "View Portfolio",
    },
    {
      id: "n-5",
      category: "news",
      title: "TCS Enterprise AI Contract",
      symbol: "TCS",
      timeAgo: "5 hours ago",
      description: "TCS announces multi-year partnership with European banking consortium for sovereign AI orchestration.",
      isRead: true,
      linkHref: "/stocks/TCS",
      linkText: "Read Insights",
    },
    {
      id: "n-6",
      category: "system",
      title: "Market WebSocket Connected",
      timeAgo: "Today, 09:15 AM",
      description: "NSE high-frequency live price stream connected via primary broker gateway with sub-10ms latency.",
      isRead: true,
    },
  ]);

  // Load from backend if available
  useEffect(() => {
    (async () => {
      try {
        const res = await apiRequest<any[]>("/api/v1/notifications");
        if (res && res.length > 0) {
          const mapped: NotificationItem[] = res.map((n) => ({
            id: n.id || `n-${Math.random()}`,
            category: n.category || "order",
            title: n.title,
            symbol: n.symbol,
            timeAgo: n.time_ago || "Recently",
            description: n.message || n.description,
            isRead: Boolean(n.is_read),
            linkHref: n.link_href || "/dashboard",
            linkText: n.link_text || "View",
          }));
          setNotifications(mapped);
        }
      } catch {
        // Keep fallback
      }
    })();
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // Mark all as read
  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  // Dismiss item
  const dismissItem = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Filtered items
  const filteredNotifications = useMemo(() => {
    if (activeTab === "all") return notifications;
    return notifications.filter((n) => n.category === activeTab);
  }, [notifications, activeTab]);

  return (
    <div className="flex flex-col w-full bg-surface pb-space-xl">
      {/* Top Banner / Header Segment */}
      <div className="px-space-lg lg:px-space-xl pt-space-xl pb-space-lg bg-surface-container-lowest flex flex-col md:flex-row md:items-center justify-between gap-space-lg shadow-sm border-b border-outline-variant/20">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-sm">
            <span className="px-space-sm py-space-xs bg-primary-container text-on-primary-container rounded-lg text-label-sm font-medium">
              Notifications &amp; Alerts
            </span>
            <span className="text-outline text-label-sm">• Real-time Feed</span>
          </div>
          <h1 className="text-headline-xl text-on-surface font-semibold tracking-tight">Activity Center</h1>
          <p className="text-body-md text-on-surface-variant max-w-2xl">
            Manage your real-time price triggers, order execution logs, and automated portfolio notifications in one unified stream.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-space-md">
          <button
            onClick={markAllRead}
            className="px-space-md py-space-sm bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-label-md rounded-xl transition-colors flex items-center gap-space-xs"
          >
            <span className="material-symbols-outlined text-[18px]">done_all</span>
            <span>Mark all as read</span>
          </button>
          <button
            onClick={() => setPreferencesOpen(true)}
            className="px-space-md py-space-sm bg-primary text-on-primary text-label-md rounded-xl transition-all hover:bg-primary/90 shadow-sm flex items-center gap-space-xs font-medium"
          >
            <span className="material-symbols-outlined text-[18px]">settings</span>
            <span>Preferences</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl w-full mx-auto px-space-lg lg:px-space-xl pt-space-xl flex flex-col gap-space-xl">
        {/* Overview Stats (4 Bento Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between gap-space-md relative overflow-hidden border border-outline-variant/20">
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-outline font-medium uppercase tracking-wider">
                Unread Alerts
              </span>
              <span className="w-8 h-8 rounded-full bg-error-container text-on-error-container flex items-center justify-center text-label-md font-semibold">
                {unreadCount}
              </span>
            </div>
            <div className="flex items-baseline gap-space-sm">
              <span className="text-headline-md text-on-surface font-semibold">{notifications.length} Total</span>
              <span className="text-body-sm text-tertiary font-medium flex items-center">
                <span className="material-symbols-outlined text-[14px]">arrow_upward</span> +2 today
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between gap-space-md relative overflow-hidden border border-outline-variant/20">
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-outline font-medium uppercase tracking-wider">
                Active Price Triggers
              </span>
              <span className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-label-md font-semibold">
                8
              </span>
            </div>
            <div className="flex items-baseline gap-space-sm">
              <span className="text-headline-md text-on-surface font-semibold">3 Near Target</span>
              <span className="text-body-sm text-on-surface-variant">Monitoring 24/7</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between gap-space-md relative overflow-hidden border border-outline-variant/20">
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-outline font-medium uppercase tracking-wider">
                Trade Executions
              </span>
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-label-md font-semibold">
                18
              </span>
            </div>
            <div className="flex items-baseline gap-space-sm">
              <span className="text-headline-md text-on-surface font-semibold">100% Filled</span>
              <span className="text-body-sm text-tertiary font-medium">Zero Slippage</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between gap-space-md relative overflow-hidden border border-outline-variant/20">
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-outline font-medium uppercase tracking-wider">
                System Status
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-tertiary animate-pulse"></span>
            </div>
            <div className="flex items-baseline gap-space-sm">
              <span className="text-headline-md text-on-surface font-semibold">All Systems</span>
              <span className="text-body-sm text-tertiary font-medium">Operational</span>
            </div>
          </div>
        </div>

        {/* Main Navigation Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-surface-container-lowest p-space-sm rounded-xl shadow-sm border border-outline-variant/20">
          <div className="flex items-center gap-space-xs overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
            {(
              [
                { id: "all", label: "All Notifications" },
                { id: "price", label: "Price Alerts" },
                { id: "order", label: "Order Updates" },
                { id: "trade", label: "Trade Executions" },
                { id: "portfolio", label: "Portfolio" },
                { id: "news", label: "Market News" },
                { id: "system", label: "System" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-space-md py-space-sm rounded-lg text-label-md font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notification Feed View */}
        <div className="flex flex-col gap-space-md">
          {filteredNotifications.map((n) => {
            const isUnread = !n.isRead;
            const borderCol =
              n.category === "price"
                ? "bg-primary"
                : n.category === "trade"
                ? "bg-tertiary"
                : n.category === "order"
                ? "bg-secondary"
                : n.category === "portfolio"
                ? "bg-primary-container"
                : "bg-surface-container-highest";

            return (
              <div
                key={n.id}
                className={`bg-surface-container-lowest p-space-lg rounded-xl shadow-sm hover:shadow-md transition-all flex items-start gap-space-md relative overflow-hidden border border-outline-variant/20 ${
                  isUnread ? "" : "opacity-85"
                }`}
              >
                {/* Left accent bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${borderCol}`}></div>

                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[20px]">
                    {n.category === "price"
                      ? "trending_up"
                      : n.category === "trade"
                      ? "check_circle"
                      : n.category === "order"
                      ? "receipt_long"
                      : n.category === "portfolio"
                      ? "account_balance_wallet"
                      : n.category === "news"
                      ? "newspaper"
                      : "dns"}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col gap-space-xs min-w-0">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-space-sm flex-wrap">
                      <span className="text-headline-sm font-semibold text-on-surface">{n.title}</span>
                      {n.symbol && (
                        <span className="px-space-xs py-0.5 bg-primary-container/10 text-primary rounded text-label-sm font-medium">
                          {n.symbol}
                        </span>
                      )}
                      {isUnread && <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>}
                    </div>
                    <span className="text-body-sm text-outline">{n.timeAgo}</span>
                  </div>

                  <p className="text-body-md text-on-surface-variant">{n.description}</p>

                  <div className="flex items-center gap-space-md mt-space-xs flex-wrap">
                    {n.linkHref && (
                      <Link
                        href={n.linkHref}
                        className="text-label-md text-primary font-medium hover:underline flex items-center gap-1"
                      >
                        <span>{n.linkText || "View Details"}</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </Link>
                    )}
                    <button
                      onClick={() => dismissItem(n.id)}
                      className="text-label-md text-outline hover:text-on-surface transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preferences Modal */}
      {preferencesOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-space-xl rounded-2xl max-w-md w-full shadow-2xl border border-outline-variant/30 flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-on-surface font-semibold">Notification Preferences</h3>
              <button
                onClick={() => setPreferencesOpen(false)}
                className="p-1 rounded-full hover:bg-surface-container text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="font-body-sm text-on-surface-variant">
              Configure alert channels and push settings for your active trading session.
            </p>
            <div className="space-y-space-md py-space-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-medium text-on-surface block">Price Triggers</span>
                  <span className="text-body-sm text-outline">Real-time alerts when targets are crossed</span>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 text-primary rounded" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-medium text-on-surface block">Order Executions</span>
                  <span className="text-body-sm text-outline">Fill and cancellation confirmations</span>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 text-primary rounded" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-medium text-on-surface block">Daily P&amp;L Digest</span>
                  <span className="text-body-sm text-outline">End of day market wrap email</span>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 text-primary rounded" />
              </label>
            </div>
            <div className="flex justify-end gap-space-sm mt-space-md">
              <button
                onClick={() => setPreferencesOpen(false)}
                className="px-space-md py-space-sm bg-primary text-on-primary rounded-lg font-label-md font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
