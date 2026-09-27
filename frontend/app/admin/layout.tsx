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
      <aside className="hidden md:flex flex-col w-60 border-r border-[#E5E7EB] bg-white p-3 shrink-0 min-h-screen select-none">
        <Link href="/admin" className="flex items-center gap-3 px-3 py-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#0F172A] flex items-center justify-center text-white font-semibold text-sm shadow-xs">
            <span>B</span>
            <span className="text-[#F97316]">R</span>
          </div>
          <div>
            <span className="text-base font-semibold tracking-tight text-[#111827] flex items-center gap-1">
              Admin<span className="text-[#F97316]">Portal</span>
            </span>
            <span className="text-[10px] text-[#6B7280] uppercase tracking-widest block font-mono font-normal">
              Governance
            </span>
          </div>
        </Link>

        <div className="space-y-0.5 flex-1">
          <div className="px-3 text-[10px] font-medium text-[#6B7280] uppercase tracking-wider mb-2">
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
                  "flex items-center gap-3 px-3 h-11 rounded-lg text-xs font-medium transition-all",
                  isActive
                    ? "bg-[#FFF7ED] text-[#EA580C] border-l-2 border-[#F97316]"
                    : "text-[#4B5563] hover:text-[#111827] hover:bg-[#F8FAFC]"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-[#F97316]" : "text-[#9CA3AF]")} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Back to Trading App link */}
        <div className="pt-3 border-t border-[#E5E7EB]">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-3 h-9 rounded-lg text-xs font-medium text-[#4B5563] hover:text-[#111827] hover:bg-[#F8FAFC] transition-colors"
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
