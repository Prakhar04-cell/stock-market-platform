"use client";

import React from "react";
import { MobileHeader } from "./mobile-header";
import { MobileBottomNav } from "./mobile-bottom-nav";

interface MobileShellProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showBottomNav?: boolean;
  className?: string;
}

export function MobileShell({
  children,
  showHeader = true,
  showBottomNav = true,
  className = "",
}: MobileShellProps) {
  return (
    <div className={`mobile-stitch min-h-screen bg-surface font-body-md text-on-surface flex flex-col relative w-full ${className}`}>
      {showHeader && <MobileHeader />}
      <main className="flex flex-col relative w-full pt-16 pb-20 bg-surface flex-1">
        {children}
      </main>
      {showBottomNav && <MobileBottomNav />}
    </div>
  );
}
