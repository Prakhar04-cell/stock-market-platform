"use client";

import React from "react";
import { Topbar } from "@/components/layout/topbar";
import { IndexTickerBar } from "@/components/layout/index-ticker-bar";
import { Footer } from "@/components/layout/footer";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { MobileBottomNav } from "@/components/mobile/mobile-bottom-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-surface text-on-surface">
      {/* 1. Header: Desktop Topbar (md+) / Mobile Stitch Header (<md) */}
      <div className="hidden md:block">
        <Topbar />
      </div>
      <div className="block md:hidden">
        <MobileHeader />
      </div>

      {/* 2. Main Workspace Viewport */}
      <main className="w-full pt-16 bg-surface min-h-screen flex flex-col">
        {/* Full-width Index Ticker Ribbon on Desktop Only */}
        <div className="hidden md:block">
          <IndexTickerBar />
        </div>

        {/* Dynamic Page Content (Desktop: pb-16 / Mobile: pb-20) */}
        <div className="flex-1 w-full pb-20 md:pb-16">
          {children}
        </div>
      </main>

      {/* Comprehensive Fintech Footer on Desktop Only */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Stitch Mobile Bottom Navigation on Mobile Only (<md) */}
      <div className="block md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
}

