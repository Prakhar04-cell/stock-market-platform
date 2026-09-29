"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { useMarketWebSocket } from "@/lib/market-ws";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

export function MobileHeader() {
  const router = useRouter();
  const { connectionState } = useMarketWebSocket();
  const isConnected = connectionState === "CONNECTED";
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // User initials
  const [userInitials, setUserInitials] = useState("BR");

  useEffect(() => {
    async function loadHeaderData() {
      try {
        const [userData, notifData] = await Promise.allSettled([
          apiRequest<{ full_name?: string; email?: string }>("/api/v1/auth/me"),
          apiRequest<NotificationItem[]>("/api/v1/notifications"),
        ]);

        if (userData.status === "fulfilled" && userData.value) {
          const name = userData.value.full_name || userData.value.email || "Trader";
          const parts = name.trim().split(" ");
          if (parts.length >= 2) {
            setUserInitials((parts[0][0] + parts[1][0]).toUpperCase());
          } else {
            setUserInitials(name.slice(0, 2).toUpperCase());
          }
        }

        if (notifData.status === "fulfilled" && notifData.value) {
          setNotifications(notifData.value);
          const unread = notifData.value.filter((n) => !n.is_read).length;
          setUnreadCount(unread);
        }
      } catch {
        // Fallback gracefully
      }
    }
    loadHeaderData();
  }, []);

  // Close notifications popup on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    if (isNotifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNotifOpen]);

  const handleMarkAllRead = async () => {
    try {
      await apiRequest("/api/v1/notifications/read-all", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-surface/80 backdrop-blur-xl pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.04)] select-none">
      <div className="h-16 px-space-md flex items-center justify-between">
        {/* Brand Logo & Live status */}
        <div className="flex items-center gap-space-sm">
          <Link href="/dashboard" className="font-headline-md text-primary font-bold">
            BullRun
          </Link>
          <span className="inline-flex items-center gap-space-xs px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-body-sm font-tabular-data">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-secondary animate-pulse" : "bg-outline"
              }`}
            />
            Live
          </span>
        </div>

        {/* Action icons: Search, Notifications, Avatar */}
        <div className="flex items-center gap-space-sm">
          {/* Search Trigger */}
          <button
            onClick={() => router.push("/explore")}
            className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors"
            aria-label="Search"
          >
            <span className="material-symbols-outlined text-[22px]">search</span>
          </button>

          {/* Notifications Trigger & Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors relative"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full" />
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-surface-container-lowest border border-outline-variant/40 rounded-xl shadow-lg z-50 overflow-hidden text-xs">
                <div className="p-3 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-on-surface">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-error-container text-on-error-container font-medium text-[10px]">
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

                <div className="max-h-64 overflow-y-auto divide-y divide-surface-container">
                  {notifications.length === 0 ? (
                    <div className="p-5 text-center text-outline">
                      <span className="material-symbols-outlined text-2xl text-outline mb-1 block">
                        notifications_off
                      </span>
                      <p className="font-medium text-body-sm">No notifications</p>
                      <p className="text-[10px] text-outline mt-0.5">
                        Order updates will appear here.
                      </p>
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3 flex items-start gap-2.5 transition-colors ${
                          !notif.is_read ? "bg-surface-container-low/60" : ""
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          <span
                            className={`material-symbols-outlined text-[16px] ${
                              notif.notification_type === "SUCCESS"
                                ? "text-secondary"
                                : notif.notification_type === "WARNING"
                                ? "text-amber-500"
                                : "text-primary"
                            }`}
                          >
                            {notif.notification_type === "SUCCESS"
                              ? "check_circle"
                              : notif.notification_type === "WARNING"
                              ? "warning"
                              : "info"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-on-surface text-xs leading-tight">
                            {notif.title}
                          </p>
                          <p className="text-on-surface-variant text-[11px] mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                          <span className="text-[9.5px] text-outline font-tabular-data mt-1 block">
                            {new Date(notif.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Avatar Button */}
          <Link
            href="/profile"
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary hover:opacity-90 transition-opacity"
            aria-label="Profile"
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
