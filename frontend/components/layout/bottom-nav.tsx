"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Bookmark, Briefcase, Layers, TrendingUp } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Watchlist", href: "/watchlist", icon: Bookmark },
    { name: "Portfolio", href: "/portfolio", icon: Briefcase },
    { name: "Orders", href: "/orders", icon: Layers },
    { name: "Terminal", href: "/stocks/RELIANCE", icon: TrendingUp },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-around h-15 px-2 select-none shadow-md">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-full py-1.5 text-[10px] font-medium transition-colors",
              isActive ? "text-indigo-600 font-bold" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <Icon className={cn("w-4 h-4 mb-0.5", isActive ? "text-indigo-600" : "text-slate-400")} />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
