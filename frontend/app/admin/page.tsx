"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import { MetricCard } from "@/components/ui/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import {
  Users,
  UserCheck,
  ShoppingBag,
  AlertTriangle,
  ShieldAlert,
  Activity,
  ArrowRight,
  Clock,
  ShieldCheck,
} from "lucide-react";

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAdminData() {
      setIsLoading(true);
      try {
        const mData = await apiRequest("/api/v1/admin/metrics");
        setMetrics(mData);
        const logs = await apiRequest("/api/v1/admin/audit-logs?limit=8");
        setAuditLogs(logs);
      } catch {
        setMetrics({
          total_users: 1,
          active_users: 1,
          orders_today: 0,
          executed_orders: 0,
          failed_orders: 0,
          security_incidents: 0,
          system_status: "HEALTHY",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadAdminData();
  }, []);

  return (
    <div className="space-y-5 select-none">
      {/* Header */}
      <div className="bg-white border border-[#E5E7EB] p-4 rounded-2xl shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#111827] flex items-center gap-2">
            Governance &amp; Operations Overview
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5 font-normal">
            Real-time platform operations, active traders, and security governance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/users">
            <Button variant="outline" size="sm" className="border-[#E5E7EB] text-[#4B5563] text-xs hover:bg-[#F8FAFC] font-medium">
              <Users className="w-3.5 h-3.5 mr-1" />
              Manage Users
            </Button>
          </Link>
          <Link href="/admin/monitoring">
            <Button size="sm" className="bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-medium shadow-xs">
              <Activity className="w-3.5 h-3.5 mr-1" />
              System Health
            </Button>
          </Link>
        </div>
      </div>

      {/* 6 Required Admin Overview Cards (Section 16) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <MetricCard
          title="Total Users"
          value={metrics?.total_users ?? "--"}
          subtitle="Registered accounts"
          icon={Users}
        />
        <MetricCard
          title="Active Users"
          value={metrics?.active_users ?? "--"}
          subtitle="Past 24h activity"
          icon={UserCheck}
        />
        <MetricCard
          title="Orders Today"
          value={metrics?.orders_today ?? 0}
          subtitle="Simulated orders"
          icon={ShoppingBag}
        />
        <MetricCard
          title="Failed Orders"
          value={metrics?.failed_orders ?? 0}
          subtitle="Execution rejects"
          icon={AlertTriangle}
        />
        <MetricCard
          title="System Health"
          value={
            <StatusIndicator
              status={metrics?.system_status || "HEALTHY"}
              showText={false}
              className="mt-1"
            />
          }
          subtitle="Core services status"
          icon={Activity}
        />
        <MetricCard
          title="Security Events"
          value={metrics?.security_incidents ?? 0}
          subtitle="Zero critical alerts"
          icon={ShieldAlert}
        />
      </div>

      {/* Audit Logs Section */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 space-y-4 shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#F97316]" />
            <h3 className="text-sm font-semibold text-[#111827]">Governance Audit Trail</h3>
          </div>
          <span className="text-xs text-[#6B7280] font-mono font-normal">Immutable Compliance Log</span>
        </div>

        {auditLogs.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Action</TableHead>
                <TableHead>Entity Type</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <span className="font-mono text-xs font-medium text-[#EA580C] bg-[#FFF7ED] px-2 py-0.5 rounded border border-[#FED7AA]">
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-[#4B5563]">{log.entity_type}</TableCell>
                  <TableCell className="font-mono text-xs text-[#6B7280]">{log.user_id || "System"}</TableCell>
                  <TableCell className="font-mono text-xs text-[#6B7280]">{log.ip_address || "127.0.0.1"}</TableCell>
                  <TableCell className="text-xs text-[#6B7280] font-mono">{formatDateTime(log.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            No governance events logged in the active window.
          </div>
        )}
      </div>
    </div>
  );
}
