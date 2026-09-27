"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, LineChart, Bookmark, Layers, Briefcase } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: "dashboard" },
    { name: "Explore", href: "/explore", icon: "travel_explore" },
    { name: "Holdings", href: "/holdings", icon: "account_balance_wallet" },
    { name: "Orders", href: "/orders", icon: "receipt_long" },
    { name: "Watchlist", href: "/watchlist", icon: "bookmark" },
    { name: "Terminal", href: "/terminal", icon: "terminal" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-container-lowest/95 backdrop-blur-lg border-t border-outline-variant/30 flex items-center justify-around h-14 px-2 select-none shadow-sm">
      {navItems.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : item.href === "/holdings"
            ? pathname === "/holdings" || pathname === "/portfolio"
            : pathname === item.href;

        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-full py-1 text-[10px] font-medium transition-colors",
              isActive ? "text-primary font-semibold" : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            <span
              className={cn(
                "material-symbols-outlined text-[20px] mb-0.5 transition-colors",
                isActive ? "text-primary" : "text-outline"
              )}
            >
              {item.icon}
            </span>
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
