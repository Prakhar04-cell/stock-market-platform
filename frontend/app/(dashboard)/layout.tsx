"use client";

import React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { IndexTickerBar } from "@/components/layout/index-ticker-bar";
import { Footer } from "@/components/layout/footer";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] text-[#111827]">
      {/* 1. Full-width Topbar Header */}
      <Topbar />

      {/* 2. Full-width Index Ticker Ribbon */}
      <IndexTickerBar />

      {/* 3. Main Workspace: Sidebar + Content */}
      <div className="flex flex-1 min-w-0">
        {/* Desktop Left Sidebar */}
        <Sidebar />

        {/* Scrollable Dashboard Viewport */}
        <main className="flex-1 min-w-0 p-4 sm:p-5 lg:p-6 pb-20 md:pb-8 overflow-x-hidden flex flex-col">
          <div className="max-w-[1400px] mx-auto w-full flex-1">
            {children}
          </div>
        </main>
      </div>

      {/* Comprehensive Fintech Footer */}
      <Footer />

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
