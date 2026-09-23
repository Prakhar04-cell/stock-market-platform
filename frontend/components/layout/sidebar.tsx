"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  LineChart,
  Bookmark,
  Layers,
  Briefcase,
  ShieldCheck,
  Activity,
  Users,
  Cpu,
  FileText,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if current user is admin
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("tradex_token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          if (payload.role === "ADMIN" || payload.roles?.includes("ADMIN")) {
            setIsAdmin(true);
          }
        } catch {
          // Ignore
        }
      }
    }
  }, []);

  const traderNav = [
    { name: "Explore", href: "/explore", icon: LayoutDashboard },
    { name: "Stocks", href: "/stocks/NIFTY%2050", icon: LineChart },
    { name: "Terminal", href: "/terminal", icon: Cpu },
    { name: "Watchlist", href: "/watchlist", icon: Bookmark },
    { name: "Orders", href: "/orders", icon: Layers },
    { name: "Portfolio", href: "/portfolio", icon: Briefcase },
  ];

  const adminNav = [
    { name: "Admin Dashboard", href: "/admin", icon: ShieldCheck },
    { name: "Monitoring", href: "/admin/monitoring", icon: Activity },
    { name: "Users", href: "/admin/users", icon: Users },
  ];

  return (
    <aside className="hidden md:flex flex-col w-52 shrink-0 bg-white border-r border-[#E5E7EB] p-3 justify-between select-none min-h-[calc(100vh-100px)]">
      <div className="space-y-6">
        {/* Trader Navigation Section */}
        <div>
          <div className="px-3 pb-2 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">
            Trading Desk
          </div>
          <div className="space-y-0.5">
            {traderNav.map((item) => {
              const isActive =
                item.name === "Home"
                  ? pathname === "/dashboard"
                  : item.name === "Markets"
                  ? pathname.startsWith("/stocks")
                  : pathname === item.href;

              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all group",
                    isActive
                      ? "bg-[#EEF2FF] text-[#4F46E5] font-semibold"
                      : "text-[#4B5563] hover:text-[#111827] hover:bg-[#F7F8FA]"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 shrink-0 transition-colors",
                      isActive ? "text-[#4F46E5]" : "text-[#9CA3AF] group-hover:text-[#4B5563]"
                    )}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Separator & Admin Section */}
        <div className="pt-2 border-t border-[#E5E7EB]">
          <div className="px-3 pb-2 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider flex items-center justify-between">
            <span>Administration</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-[#6B7280]">
              OPS
            </span>
          </div>
          <div className="space-y-0.5">
            {adminNav.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all group",
                    isActive
                      ? "bg-[#EEF2FF] text-[#4F46E5] font-semibold"
                      : "text-[#4B5563] hover:text-[#111827] hover:bg-[#F7F8FA]"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 shrink-0 transition-colors",
                      isActive ? "text-[#4F46E5]" : "text-[#9CA3AF] group-hover:text-[#4B5563]"
                    )}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Compact Environment Badge */}
      <div className="p-3 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] text-center space-y-1">
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#00A86B]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00A86B] animate-pulse" />
          <span>Paper Engine Active</span>
        </div>
        <p className="text-[10px] text-[#6B7280]">
          Zero Capital Risk • Live Upstox Feeds
        </p>
      </div>
    </aside>
  );
}
