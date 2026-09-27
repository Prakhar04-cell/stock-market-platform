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
    { name: "Terminal", href: "/terminal", icon: Cpu, badge: "Live" },
    { name: "Portfolio & PnL", href: "/portfolio", icon: Briefcase },
    { name: "Order Book", href: "/orders", icon: Layers },
    { name: "Watchlist", href: "/watchlist", icon: Bookmark },
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
          <div className="px-3 pb-2 text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider">
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
                    "flex items-center justify-between px-3 py-2 rounded-[8px] text-[13px] font-medium transition-all group",
                    isActive
                      ? "bg-[#FFF7ED] text-[#111827] font-semibold border-l-2 border-[#F97316]"
                      : "text-[#4B5563] hover:text-[#111827] hover:bg-[#F8FAFC]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        isActive ? "text-[#F97316]" : "text-[#9CA3AF] group-hover:text-[#4B5563]"
                      )}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-[4px] bg-[#FFF7ED] text-[#EA580C]">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Separator & Admin Section */}
        <div className="pt-2 border-t border-[#E5E7EB]">
          <div className="px-3 pb-2 text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider flex items-center justify-between">
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
                    "flex items-center gap-3 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-all group",
                    isActive
                      ? "bg-[#FFF7ED] text-[#111827] font-semibold border-l-2 border-[#F97316]"
                      : "text-[#4B5563] hover:text-[#111827] hover:bg-[#F8FAFC]"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 shrink-0 transition-colors",
                      isActive ? "text-[#F97316]" : "text-[#9CA3AF] group-hover:text-[#4B5563]"
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
      <div className="p-3 rounded-[10px] bg-[#F8FAFC] border border-[#E5E7EB] text-center space-y-1">
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#16A34A]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
          <span>Paper Engine Active</span>
        </div>
        <p className="text-[10px] text-[#6B7280]">
          Zero Capital Risk • Real-Time Feeds
        </p>
      </div>
    </aside>
  );
}
