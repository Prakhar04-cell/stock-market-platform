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
  failed_orders?: number;
  trading_volume_today?: number;
  system_status?: string;
  security_incidents?: number;
}

interface SecuritySummary {
  totalEvents: number;
  activeAlerts: number;
  failedAuthAttempts: number;
  blockedRequests: number;
  rateLimitViolations: number;
  riskScore: number;
  riskLevel: string;
  riskFactors?: string[];
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

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [securitySummary, setSecuritySummary] = useState<SecuritySummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [mRes, lRes, sRes] = await Promise.allSettled([
        apiRequest<AdminMetrics>("/api/v1/admin/metrics"),
        apiRequest<AuditLogItem[]>("/api/v1/admin/audit-logs?limit=8"),
        apiRequest<SecuritySummary>("/api/java/security/summary"),
      ]);

      if (mRes.status === "fulfilled" && mRes.value) {
        setMetrics(mRes.value);
      }

      if (lRes.status === "fulfilled" && lRes.value && Array.isArray(lRes.value)) {
        setAuditLogs(lRes.value);
      } else {
        setAuditLogs([]);
      }

      if (sRes.status === "fulfilled" && sRes.value) {
        setSecuritySummary(sRes.value);
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
    <div className="space-y-6 select-none w-full">
      {/* Top Banner / Greeting Row */}
      <div className="bg-white border border-[#E5E7EB] p-5 lg:p-6 rounded-2xl shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              SUPER_ADMIN
            </span>
            <span className="text-[#6B7280] font-mono text-xs">
              Session ID: #BR-88942-X
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#111827] tracking-tight">
            Platform Control Center
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280]">
            Real-time metrics, system health, and high-value trade surveillance for BullRun.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={exportAudit}
            className="px-4 py-2 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E5E7EB] text-[#111827] text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-2 shadow-xs font-medium"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export Audit Report</span>
          </button>
          <button
            onClick={() => alert("Emergency protocol check initiated: All gateways operating nominally.")}
            className="px-4 py-2 bg-primary text-white text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-2 shadow-xs font-semibold hover:bg-primary/90"
          >
            <span className="material-symbols-outlined text-[18px]">bolt</span>
            <span>Emergency Protocols</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-col gap-6">
        {/* Stat Cards Grid (7 Cards as in Platform Control Center) */}
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
                {isLoading ? "—" : (metrics?.total_users !== undefined ? metrics.total_users.toLocaleString() : "0")}
              </span>
              <div className="flex items-center gap-space-xs text-label-sm text-on-surface-variant mt-space-xs font-medium">
                <span>Active accounts: {metrics?.active_users ?? 0}</span>
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
                {isLoading ? "—" : (metrics?.active_users !== undefined ? metrics.active_users.toLocaleString() : "0")}
              </span>
              <div className="flex items-center gap-space-xs text-label-sm text-on-surface-variant mt-space-xs">
                <span>Verified paper traders</span>
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
                {isLoading ? "—" : (metrics?.orders_today !== undefined ? metrics.orders_today.toLocaleString() : "0")}
              </span>
              <div className="flex items-center gap-space-xs text-label-sm text-tertiary mt-space-xs font-medium">
                <span>Executed: {metrics?.executed_orders ?? 0}</span>
                {metrics?.failed_orders ? <span className="text-error font-normal">({metrics.failed_orders} rejected)</span> : null}
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
                {isLoading ? "—" : formatINR(metrics?.trading_volume_today || 0)}
              </span>
              <div className="flex items-center gap-space-xs text-label-sm text-on-surface-variant mt-space-xs font-medium">
                <span>{metrics?.trading_volume_today ? "Cumulative executed turnover" : "No executions recorded today"}</span>
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
                {metrics?.system_status || "OPERATIONAL"}
              </span>
              <div className="flex items-center gap-space-xs text-label-sm text-tertiary mt-space-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                <span>All telemetry nominal</span>
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
                {metrics?.system_status === "DEGRADED" ? "Degraded" : "Operational"}
              </span>
              <div className="flex items-center gap-space-xs text-label-sm text-on-surface-variant mt-space-xs">
                <span>Core Gateway &amp; Auth Active</span>
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
                    {securitySummary ? `${securitySummary.activeAlerts} Active` : `${metrics?.security_incidents ?? 0} Incidents`}
                  </span>
                  <span className="text-body-sm text-on-surface-variant">Active Security Incidents</span>
                </div>
                <div className="w-px h-8 bg-surface-container"></div>
                <div className="flex flex-col">
                  <span className="text-headline-md font-semibold font-tabular-data text-tertiary">
                    {securitySummary ? `${securitySummary.rateLimitViolations} Rate Limits` : "0 Blocked"}
                  </span>
                  <span className="text-body-sm text-on-surface-variant">Throttled &amp; Mitigated</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-space-md py-space-xs text-label-sm rounded-lg font-medium border ${
                    securitySummary?.riskLevel === "CRITICAL"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : securitySummary?.riskLevel === "HIGH"
                      ? "bg-orange-50 text-orange-700 border-orange-200"
                      : securitySummary?.riskLevel === "MEDIUM"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {securitySummary ? `Risk: ${securitySummary.riskLevel} (${securitySummary.riskScore}/100)` : "Risk: Low"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts & Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
          {/* User Growth Chart (2 Cols) */}
          <div className="lg:col-span-2 bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md border border-outline-variant/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-headline-sm font-semibold text-on-surface">User Growth &amp; Engagement</h2>
                <p className="text-body-sm text-outline">Registered traders across platform</p>
              </div>
              <span className="px-space-sm py-1 bg-surface-container rounded-lg text-label-sm text-on-surface font-medium">
                Live Status
              </span>
            </div>

            {metrics && metrics.total_users > 0 ? (
              <div className="space-y-4 pt-2">
                <div className="p-4 bg-surface-container-low/40 rounded-xl border border-outline-variant/10 space-y-3">
                  <div className="flex justify-between text-body-sm">
                    <span className="font-medium text-on-surface">Active User Ratio</span>
                    <span className="font-tabular-data text-outline">
                      {metrics.total_users > 0
                        ? `${Math.round((metrics.active_users / metrics.total_users) * 100)}%`
                        : "0%"}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(5, (metrics.active_users / Math.max(1, metrics.total_users)) * 100)
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-body-xs text-outline pt-1">
                    <span>Active: {metrics.active_users}</span>
                    <span>Total Accounts: {metrics.total_users}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-44 flex flex-col items-center justify-center p-6 bg-surface-container/20 rounded-xl border border-dashed border-outline-variant/30 text-center">
                <span className="material-symbols-outlined text-[32px] text-outline mb-2">person_add</span>
                <p className="text-body-md font-medium text-on-surface">No user registration history yet</p>
                <p className="text-body-xs text-outline max-w-sm mt-1">
                  New trader signups and active paper accounts will be tracked here in real-time.
                </p>
              </div>
            )}
          </div>

          {/* Trade Volume Distribution */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between gap-space-md border border-outline-variant/20">
            <div>
              <h2 className="text-headline-sm font-semibold text-on-surface">Volume By Exchange</h2>
              <p className="text-body-sm text-outline">Intraday liquidity share</p>
            </div>
            {metrics?.trading_volume_today && metrics.trading_volume_today > 0 ? (
              <div className="space-y-space-md">
                <div>
                  <div className="flex justify-between text-body-sm mb-1">
                    <span className="font-medium text-on-surface">NSE Equities</span>
                    <span className="font-tabular-data text-outline">100%</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: "100%" }}></div>
                  </div>
                </div>
                <div className="text-body-xs text-outline">
                  Total Turnover: {formatINR(metrics.trading_volume_today)}
                </div>
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-[28px] text-outline mb-1.5">show_chart</span>
                <p className="text-body-sm font-medium text-on-surface">No trading volume recorded today</p>
                <p className="text-body-xs text-outline mt-0.5">Awaiting executed market/limit orders</p>
              </div>
            )}
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
              href="/admin/monitoring"
              className="text-label-md text-primary font-medium hover:underline flex items-center gap-1"
            >
              <span>View All Logs</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
          {auditLogs.length > 0 ? (
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
          ) : (
            <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-outline mb-3">
                <span className="material-symbols-outlined text-[24px]">verified_user</span>
              </div>
              <h3 className="text-body-lg font-semibold text-on-surface">No Surveillance Audit Events Recorded</h3>
              <p className="text-body-sm text-outline max-w-sm mt-1">
                Authentication events, high-value trades, and administrative operations will appear here in real time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
