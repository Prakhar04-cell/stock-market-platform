"use client";

import React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { IndexTickerBar } from "@/components/layout/index-ticker-bar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-[#F7F8FA] text-[#111827]">
      {/* 1. Full-width Topbar Header */}
      <Topbar />

      {/* 2. Full-width Index Ticker Ribbon */}
      <IndexTickerBar />

      {/* 3. Main Workspace: Sidebar + Content */}
      <div className="flex flex-1 min-w-0">
        {/* Desktop Left Sidebar */}
        <Sidebar />

        {/* Scrollable Dashboard Viewport */}
        <main className="flex-1 min-w-0 p-4 sm:p-5 lg:p-6 pb-20 md:pb-8 overflow-x-hidden">
          <div className="max-w-[1560px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
