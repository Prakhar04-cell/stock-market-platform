"use client";

import React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { IndexTickerBar } from "@/components/layout/index-ticker-bar";
import { Footer } from "@/components/layout/footer";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-surface text-on-surface">
      {/* 1. Full-width Fixed Topbar Header */}
      <Topbar />

      {/* 2. Main Workspace Viewport offset by fixed header */}
      <main className="w-full pt-16 bg-surface min-h-screen flex flex-col">
        {/* Full-width Index Ticker Ribbon */}
        <IndexTickerBar />

        {/* Dynamic Page Content */}
        <div className="flex-1 w-full pb-16">
          {children}
        </div>
      </main>

      {/* Comprehensive Fintech Footer */}
      <Footer />

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
