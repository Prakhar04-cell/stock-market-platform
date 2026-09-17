"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  LineChart,
  Star,
  Briefcase,
  Layers,
  TrendingUp,
  Wallet,
  Bell,
  SlidersHorizontal,
  CircleDot,
  Clock,
  Wheat,
  BookOpen,
  HelpCircle,
  Crown,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const primaryNav = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Markets", href: "/dashboard", icon: LineChart },
    { name: "Watchlist", href: "/watchlist", icon: Star },
    { name: "Portfolio", href: "/portfolio", icon: Briefcase },
    { name: "Orders", href: "/orders", icon: Layers },
    { name: "Positions", href: "/portfolio", icon: TrendingUp },
    { name: "Funds", href: "/portfolio", icon: Wallet },
    { name: "Alerts", href: "/watchlist", icon: Bell },
    { name: "Screener", href: "/stocks/RELIANCE", icon: SlidersHorizontal },
    { name: "Options", href: "/stocks/RELIANCE", icon: CircleDot },
    { name: "Futures", href: "/stocks/RELIANCE", icon: Clock },
    { name: "Commodities", href: "/dashboard", icon: Wheat },
  ];

  const secondaryNav = [
    { name: "Learn", href: "/dashboard", icon: BookOpen },
    { name: "Support", href: "/dashboard", icon: HelpCircle },
  ];

  return (
    <aside className="hidden md:flex flex-col w-[210px] shrink-0 bg-white border-r border-slate-200/90 p-3 justify-between select-none min-h-[calc(100vh-100px)]">
      {/* 1. Primary & Secondary Navigation */}
      <div className="space-y-1">
        {primaryNav.map((item) => {
          const isActive = pathname === item.href && item.name === "Dashboard";
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all",
                isActive
                  ? "bg-[#EEF2FF] text-[#4F46E5] font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0",
                  isActive ? "text-[#4F46E5]" : "text-slate-400"
                )}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* Separator */}
        <div className="pt-2 pb-1">
          <div className="h-[1px] bg-slate-100 mx-2" />
        </div>

        {/* Secondary Links */}
        {secondaryNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              <Icon className="w-4 h-4 shrink-0 text-slate-400" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* 2. Bottom Promo Card: Upgrade to Pro */}
      <div className="pt-4 mt-4">
        <div className="rounded-2xl bg-gradient-to-b from-[#F5F3FF] to-[#EDE9FE] border border-indigo-100/90 p-3.5 text-center shadow-xs">
          <div className="flex justify-center mb-1">
            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-500 shadow-2xs">
              <Crown className="w-4 h-4 fill-amber-400 text-amber-500" />
            </div>
          </div>
          <h4 className="text-[13px] font-bold text-slate-900">
            Upgrade to Pro
          </h4>
          <p className="text-[10px] text-slate-500 mt-0.5 mb-2.5">
            Advanced tools, insights &amp; more
          </p>
          <button
            onClick={() => alert("TradeX Pro features activated in Phase 1!")}
            className="w-full py-1.5 px-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs cursor-pointer"
          >
            Learn More
          </button>
        </div>
      </div>
    </aside>
  );
}
