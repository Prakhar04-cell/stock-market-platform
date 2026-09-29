"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileBottomNav() {
  const pathname = usePathname();

  const navTabs = [
    {
      name: "Home",
      href: "/dashboard",
      icon: "home",
      isActive: pathname === "/dashboard",
    },
    {
      name: "Explore",
      href: "/explore",
      icon: "explore",
      isActive: pathname === "/explore",
    },
    {
      name: "Portfolio",
      href: "/holdings",
      icon: "pie_chart",
      isActive: pathname === "/holdings" || pathname === "/portfolio",
    },
    {
      name: "Orders",
      href: "/orders",
      icon: "receipt_long",
      isActive: pathname === "/orders",
    },
    {
      name: "Profile",
      href: "/profile",
      icon: "person",
      isActive: pathname === "/profile",
    },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-surface/90 backdrop-blur-xl shadow-[0_-1px_8px_rgba(0,0,0,0.04)] border-t border-outline-variant/20 select-none"
      data-active-classes="text-primary font-bold"
    >
      <div className="flex justify-around items-center h-16 px-space-sm">
        {navTabs.map((tab) => {
          return (
            <Link
              key={tab.name}
              href={tab.href}
              aria-current={tab.isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-space-xs w-16 h-12 transition-all ${
                tab.isActive
                  ? "text-primary font-bold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span
                className={`material-symbols-outlined text-[24px] ${
                  tab.isActive ? "text-primary" : "text-on-surface-variant"
                }`}
                style={tab.isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {tab.icon}
              </span>
              <span className="text-body-sm font-label-md">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
