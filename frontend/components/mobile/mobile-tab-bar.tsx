"use client";

import React from "react";

interface TabItem {
  id: string;
  label: string;
  badge?: number | string;
}

interface MobileTabBarProps {
  tabs: TabItem[] | string[];
  activeTab: string;
  onTabChange: (id: string) => void;
  variant?: "underline" | "pill" | "rounded-pill" | "toggle";
  className?: string;
}

export function MobileTabBar({
  tabs,
  activeTab,
  onTabChange,
  variant = "pill",
  className = "",
}: MobileTabBarProps) {
  const normalizedTabs: TabItem[] = tabs.map((t) =>
    typeof t === "string" ? { id: t, label: t } : t
  );

  if (variant === "underline") {
    return (
      <div className={`flex border-b border-surface-variant/40 select-none ${className}`}>
        {normalizedTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 pb-3 text-center font-headline-sm text-body-md transition-colors ${
                isActive
                  ? "text-primary border-b-2 border-primary font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && (
                <span className="ml-1 text-xs opacity-75">({tab.badge})</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === "toggle") {
    return (
      <div className={`flex gap-1 bg-surface-container-high p-1 rounded-lg select-none ${className}`}>
        {normalizedTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3 py-1 text-xs font-label-md rounded transition-colors ${
                isActive
                  ? "bg-surface text-on-surface shadow-sm font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === "rounded-pill") {
    return (
      <div className={`flex gap-2 overflow-x-auto no-scrollbar select-none ${className}`}>
        {normalizedTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-1.5 rounded-full text-body-sm font-label-md transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-primary text-on-primary shadow-sm"
                  : "bg-surface-container-high text-on-surface-variant hover:bg-surface-variant"
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && (
                <span className="ml-1 text-xs opacity-75">({tab.badge})</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Default 'pill' (used on Orders page)
  return (
    <div className={`flex overflow-x-auto gap-space-xs no-scrollbar pt-1 select-none ${className}`}>
      {normalizedTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 rounded-lg font-label-md whitespace-nowrap transition-all text-body-sm ${
              isActive
                ? "bg-primary text-on-primary shadow-sm font-semibold"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && ` (${tab.badge})`}
          </button>
        );
      })}
    </div>
  );
}
