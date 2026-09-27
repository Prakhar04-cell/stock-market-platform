"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, LineChart, Bookmark, Layers, Briefcase } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/dashboard", icon: LayoutDashboard },
    { name: "Markets", href: "/stocks/NIFTY%2050", icon: LineChart },
    { name: "Watchlist", href: "/watchlist", icon: Bookmark },
    { name: "Orders", href: "/orders", icon: Layers },
    { name: "Portfolio", href: "/portfolio", icon: Briefcase },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E5E7EB] flex items-center justify-around h-14 px-2 select-none shadow-none">
      {navItems.map((item) => {
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
              "flex flex-col items-center justify-center w-full py-1 text-[10px] font-medium transition-colors",
              isActive ? "text-[#F97316] font-semibold" : "text-[#6B7280] hover:text-[#111827]"
            )}
          >
            <Icon
              className={cn(
                "w-4 h-4 mb-0.5 transition-colors",
                isActive ? "text-[#F97316]" : "text-[#9CA3AF]"
              )}
            />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
