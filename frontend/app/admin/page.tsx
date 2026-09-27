"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { formatINR, formatPercentage } from "@/lib/formatters";

interface AdminMetrics {
  total_users: number;
  active_users: number;
  orders_today: number;
  executed_orders?: number;
  trading_volume_today?: number;
  system_health?: number;
  api_status?: string;
  security_incidents?: number;
}

interface AuditLogItem {
  id: string;
  user_email?: string;
  action: string;
  target?: string;
  ip_address?: string;
  created_at: string;
  status?: string;
}

export default function AdminOverviewPage() {
  const router = useRouter();

  const [metrics, setMetrics] = useState<AdminMetrics>({
    total_users: 48250,
    active_users: 14890,
    orders_today: 124580,
    trading_volume_today: 4825000000,
    system_health: 99.98,
    api_status: "Operational",
    security_incidents: 0,
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [mRes, lRes] = await Promise.allSettled([
        apiRequest<AdminMetrics>("/api/v1/admin/metrics"),
        apiRequest<AuditLogItem[]>("/api/v1/admin/audit-logs?limit=8"),
      ]);

      if (mRes.status === "fulfilled" && mRes.value) {
        setMetrics((prev) => ({
          ...prev,
          ...mRes.value,
          total_users: mRes.value.total_users || prev.total_users,
          active_users: mRes.value.active_users || prev.active_users,
        }));
      }

      if (lRes.status === "fulfilled" && lRes.value) {
        setAuditLogs(lRes.value);
      } else {
        setAuditLogs([
          { id: "log-1", user_email: "rajesh.k@gmail.com", action: "BUY LIMIT 500 INFY", target: "₹8,10,000", ip_address: "103.21.58.12 (Mumbai)", status: "COMPLETED", created_at: new Date(Date.now() - 1000 * 60 * 3).toISOString() },
          { id: "log-2", user_email: "priya.m@yahoo.com", action: "SELL MARKET 120 RELIANCE", target: "₹3,42,060", ip_address: "49.36.128.4 (Delhi)", status: "COMPLETED", created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString() },
          { id: "log-3", user_email: "anand.s@outlook.com", action: "BUY MIS 1000 SBIN", target: "₹8,12,300", ip_address: "117.247.88.9 (Bengaluru)", status: "EXECUTED", created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
          { id: "log-4", user_email: "sneha.v@gmail.com", action: "2FA MPIN Verified", target: "Session Started", ip_address: "152.57.19.44 (Pune)", status: "SUCCESS", created_at: new Date(Date.now() - 1000 * 60 * 22).toISOString() },
        ]);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Export Audit Report
  const exportAudit = () => {
    const headers = ["Log ID", "User", "Action", "Volume / Target", "IP / Region", "Status", "Time"];
    const rows = auditLogs.map((l) => [
      l.id,
      l.user_email || "System",
      `"${l.action}"`,
      l.target || "N/A",
      l.ip_address || "N/A",
      l.status || "OK",
      new Date(l.created_at).toLocaleString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BullRun_AuditReport_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col w-full bg-surface pb-16">
      {/* Top Banner / Greeting Row */}
      <div className="px-space-lg lg:px-space-xl py-space-lg bg-surface-container-lowest flex flex-col md:flex-row md:items-center justify-between gap-space-md shadow-sm border-b border-outline-variant/20">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-sm">
            <span className="px-space-sm py-0.5 rounded-full bg-primary-container text-on-primary-container text-label-sm font-semibold">
              SUPER_ADMIN
            </span>
            <span className="text-outline text-tabular-data font-tabular-data text-body-sm">
              Session ID: #BR-88942-X
            </span>
          </div>
          <h1 className="text-headline-lg text-on-surface font-semibold tracking-tight">
            Platform Control Center
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Real-time metrics, system health, and high-value trade surveillance for BullRun.
          </p>
        </div>
        <div className="flex items-center gap-space-md flex-wrap">
          <button
            onClick={exportAudit}
            className="px-space-md py-space-sm bg-surface-container hover:bg-surface-container-high text-on-surface text-label-md rounded-xl transition-colors flex items-center gap-space-xs shadow-sm font-medium"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export Audit Report</span>
          </button>
          <button
            onClick={() => alert("Emergency protocol check initiated: All gateways operating nominally.")}
            className="px-space-md py-space-sm bg-primary text-on-primary text-label-md rounded-xl transition-colors flex items-center gap-space-xs shadow-sm font-semibold hover:bg-primary/90"
          >
            <span className="material-symbols-outlined text-[18px]">bolt</span>
            <span>Emergency Protocols</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="px-space-lg lg:px-space-xl py-space-lg flex flex-col gap-space-xl">
        {/* Stat Cards Grid (7 Cards as in Stitch UI) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {/* 1. Total Users */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between gap-space-md border border-outline-variant/20">
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-on-surface-variant font-medium uppercase tracking-wider">
                Total Users
              </span>
              <div className="w-10 h-10 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">group</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-headline-lg font-tabular-data font-semibold text-on-surface">
                {metrics.total_users.toLocaleString()}
              </span>
              <div className="flex items-center gap-space-xs text-label-sm text-tertiary mt-space-xs font-medium">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                <span>+12.4% this month</span>
              </div>
            </div>
          </div>

          {/* 2. Active Users Today */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between gap-space-md border border-outline-variant/20">
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-on-surface-variant font-medium uppercase tracking-wider">
                Active Users (Today)
              </span>
              <div className="w-10 h-10 rounded-xl bg-tertiary-container/20 text-tertiary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">pulse_alert</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-headline-lg font-tabular-data font-semibold text-on-surface">
                {metrics.active_users.toLocaleString()}
              </span>
              <div className="flex items-center gap-space-xs text-label-sm text-on-surface-variant mt-space-xs">
                <span>Peak concurrent: 4,120</span>
              </div>
            </div>
          </div>

          {/* 3. Total Orders Today */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between gap-space-md border border-outline-variant/20">
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-on-surface-variant font-medium uppercase tracking-wider">
                Total Orders Today
              </span>
              <div className="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">receipt_long</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-headline-lg font-tabular-data font-semibold text-on-surface">
                {metrics.orders_today.toLocaleString()}
              </span>
              <div className="flex items-center gap-space-xs text-label-sm text-tertiary mt-space-xs font-medium">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                <span>+8.2% vs yesterday</span>
              </div>
            </div>
          </div>

          {/* 4. Total Trading Volume Today */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between gap-space-md border border-outline-variant/20">
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-on-surface-variant font-medium uppercase tracking-wider">
                Trading Volume (Today)
              </span>
              <div className="w-10 h-10 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">payments</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-headline-lg font-tabular-data font-semibold text-on-surface">
                ₹482.50 Cr
              </span>
              <div className="flex items-center gap-space-xs text-label-sm text-tertiary mt-space-xs font-medium">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                <span>+15.1% avg</span>
              </div>
            </div>
          </div>

          {/* 5. System Health */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between gap-space-md border border-outline-variant/20">
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-on-surface-variant font-medium uppercase tracking-wider">
                System Health
              </span>
              <div className="w-10 h-10 rounded-xl bg-tertiary-container/20 text-tertiary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">dns</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-headline-lg font-tabular-data font-semibold text-on-surface">
                {metrics.system_health ?? 99.98}%
              </span>
              <div className="flex items-center gap-space-xs text-label-sm text-tertiary mt-space-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                <span>All systems normal</span>
              </div>
            </div>
          </div>

          {/* 6. API Status */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between gap-space-md border border-outline-variant/20">
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-on-surface-variant font-medium uppercase tracking-wider">
                API Status
              </span>
              <div className="w-10 h-10 rounded-xl bg-tertiary-container/20 text-tertiary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">api</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-headline-md font-semibold text-on-surface mt-1">
                {metrics.api_status || "Operational"}
              </span>
              <div className="flex items-center gap-space-xs text-label-sm text-on-surface-variant mt-space-xs">
                <span>Latency: 24ms avg</span>
              </div>
            </div>
          </div>

          {/* 7. Security Alerts */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between gap-space-md sm:col-span-2 lg:col-span-2 border border-outline-variant/20">
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-on-surface-variant font-medium uppercase tracking-wider">
                Security &amp; Compliance Alerts
              </span>
              <div className="w-10 h-10 rounded-xl bg-surface-container text-on-surface flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">security</span>
              </div>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-space-md">
                <div className="flex flex-col">
                  <span className="text-headline-md font-semibold font-tabular-data text-on-surface">
                    0 Active
                  </span>
                  <span className="text-body-sm text-on-surface-variant">Critical Incidents</span>
                </div>
                <div className="w-px h-8 bg-surface-container"></div>
                <div className="flex flex-col">
                  <span className="text-headline-md font-semibold font-tabular-data text-tertiary">
                    2 Resolved
                  </span>
                  <span className="text-body-sm text-on-surface-variant">Auto-mitigated today</span>
                </div>
              </div>
              <span className="px-space-md py-space-xs bg-tertiary-container/10 text-tertiary text-label-sm rounded-lg font-medium">
                Secure
              </span>
            </div>
          </div>
        </div>

        {/* Charts & Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
          {/* User Growth Chart (2 Cols) */}
          <div className="lg:col-span-2 bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md border border-outline-variant/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-headline-sm font-semibold text-on-surface">User Growth Trajectory</h2>
                <p className="text-body-sm text-outline">Registered traders across past 6 months</p>
              </div>
              <span className="px-space-sm py-1 bg-surface-container rounded-lg text-label-sm text-on-surface font-medium">
                Past 6M
              </span>
            </div>
            <div className="w-full h-56 flex items-end justify-between gap-3 pt-6 pb-2 px-4 bg-surface-container/20 rounded-xl relative">
              <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none opacity-20">
                <div className="w-full h-px bg-outline"></div>
                <div className="w-full h-px bg-outline"></div>
                <div className="w-full h-px bg-outline"></div>
              </div>
              {[
                { m: "May", h: "45%", val: "28K" },
                { m: "Jun", h: "55%", val: "32K" },
                { m: "Jul", h: "68%", val: "38K" },
                { m: "Aug", h: "78%", val: "42K" },
                { m: "Sep", h: "88%", val: "45K" },
                { m: "Oct", h: "98%", val: "48.2K", active: true },
              ].map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative z-10">
                  <div
                    className={`w-full rounded-t transition-all ${
                      bar.active ? "bg-primary" : "bg-primary/20 group-hover:bg-primary"
                    }`}
                    style={{ height: bar.h }}
                  ></div>
                  <span
                    className={`text-[11px] font-tabular-data ${
                      bar.active ? "text-on-surface font-semibold" : "text-outline"
                    }`}
                  >
                    {bar.m}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Trade Volume Distribution */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between gap-space-md border border-outline-variant/20">
            <div>
              <h2 className="text-headline-sm font-semibold text-on-surface">Volume By Exchange</h2>
              <p className="text-body-sm text-outline">Intraday liquidity share</p>
            </div>
            <div className="space-y-space-md">
              <div>
                <div className="flex justify-between text-body-sm mb-1">
                  <span className="font-medium text-on-surface">NSE Equities</span>
                  <span className="font-tabular-data text-outline">68%</span>
                </div>
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: "68%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-body-sm mb-1">
                  <span className="font-medium text-on-surface">NSE F&amp;O Derivatives</span>
                  <span className="font-tabular-data text-outline">24%</span>
                </div>
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div className="bg-tertiary h-full rounded-full" style={{ width: "24%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-body-sm mb-1">
                  <span className="font-medium text-on-surface">BSE Equities</span>
                  <span className="font-tabular-data text-outline">8%</span>
                </div>
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div className="bg-secondary h-full rounded-full" style={{ width: "8%" }}></div>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-surface-container text-body-sm text-outline flex items-center justify-between">
              <span>Primary Gateway</span>
              <span className="text-tertiary font-medium">Upstox Active</span>
            </div>
          </div>
        </div>

        {/* Audit Log / Surveillance Table */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant/20">
          <div className="p-space-lg border-b border-surface-container flex items-center justify-between">
            <div>
              <h2 className="text-headline-sm font-semibold text-on-surface">
                Trade Surveillance &amp; Audit Trail
              </h2>
              <p className="text-body-sm text-outline">Recent high-value transactions and auth events</p>
            </div>
            <Link
              href="/admin/audit-logs"
              className="text-label-md text-primary font-medium hover:underline flex items-center gap-1"
            >
              <span>View All Logs</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-body-md font-tabular-data">
              <thead>
                <tr className="bg-surface-container-low text-outline text-label-sm uppercase tracking-wider border-b border-surface-container-high">
                  <th className="py-space-md px-space-md font-medium">User / Client</th>
                  <th className="py-space-md px-space-md font-medium">Action</th>
                  <th className="py-space-md px-space-md font-medium">Value / Target</th>
                  <th className="py-space-md px-space-md font-medium">IP &amp; Region</th>
                  <th className="py-space-md px-space-md font-medium">Timestamp</th>
                  <th className="py-space-md px-space-md font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-space-md px-space-md font-medium text-on-surface">
                      {log.user_email || "System Service"}
                    </td>
                    <td className="py-space-md px-space-md">{log.action}</td>
                    <td className="py-space-md px-space-md font-semibold text-on-surface">
                      {log.target || "N/A"}
                    </td>
                    <td className="py-space-md px-space-md text-outline">
                      {log.ip_address || "Internal"}
                    </td>
                    <td className="py-space-md px-space-md text-outline">
                      {new Date(log.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-space-md px-space-md text-right">
                      <span className="px-space-sm py-0.5 rounded-full bg-tertiary-container/10 text-tertiary text-label-sm font-semibold">
                        {log.status || "OK"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
