"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  Activity,
  ArrowLeft,
  Settings,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const adminNav = [
    { name: "Overview", href: "/admin", icon: LayoutDashboard },
    { name: "Users Management", href: "/admin/users", icon: Users },
    { name: "System Monitoring", href: "/admin/monitoring", icon: Activity },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50/60 text-slate-900">
      {/* Admin Sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-slate-200/90 bg-white p-3 shrink-0 min-h-screen select-none">
        <Link href="/admin" className="flex items-center gap-3 px-3 py-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
            TX
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-1">
              Admin<span className="text-indigo-600">Portal</span>
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-mono">
              Governance
            </span>
          </div>
        </Link>

        <div className="space-y-0.5 flex-1">
          <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Governance &amp; Controls
          </div>
          {adminNav.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 h-11 rounded-lg text-xs font-semibold transition-all",
                  isActive
                    ? "bg-indigo-50 text-indigo-700 border-l-2 border-indigo-600"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-indigo-600" : "text-slate-400")} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Back to Trading App link */}
        <div className="pt-3 border-t border-slate-100">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-3 h-9 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Trading App</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <Topbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
