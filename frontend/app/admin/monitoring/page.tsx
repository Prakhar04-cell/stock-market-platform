"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiRequest } from "@/lib/api-client";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import {
  Activity,
  RefreshCw,
  Server,
  Database,
  Radio,
  Cpu,
  Globe,
  Layers,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export default function AdminMonitoringPage() {
  const [monitoringData, setMonitoringData] = useState<any>(null);
  const [upstoxStatus, setUpstoxStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  const loadHealthData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [monData, upData] = await Promise.allSettled([
        apiRequest("/api/v1/admin/monitoring"),
        apiRequest("/api/v1/upstox/auth/status"),
      ]);

      if (monData.status === "fulfilled") {
        setMonitoringData(monData.value);
      }
      if (upData.status === "fulfilled") {
        setUpstoxStatus(upData.value);
      }
      setLastRefreshed(new Date().toLocaleTimeString());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHealthData();
    const interval = setInterval(loadHealthData, 30000);
    return () => clearInterval(interval);
  }, [loadHealthData]);

  const getServiceIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("database") || lower.includes("postgres")) return Database;
    if (lower.includes("frontend")) return Globe;
    if (lower.includes("backend") || lower.includes("api")) return Server;
    if (lower.includes("redis")) return Cpu;
    if (lower.includes("websocket")) return Radio;
    if (lower.includes("market") || lower.includes("trading") || lower.includes("upstox")) return Layers;
    return Activity;
  };

  return (
    <div className="space-y-5 select-none">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            System Monitoring &amp; Provider Diagnostics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time diagnostics for Upstox Feed V3, Market WebSocket fanout, and Paper Trading engine.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-[11px] text-slate-400 font-mono">
              Last probe: {lastRefreshed}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={loadHealthData}
            isLoading={isLoading}
            className="border-slate-200 text-slate-700 text-xs hover:bg-slate-50"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1 text-indigo-600" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Upstox Authentication & Live Stream Status Banner */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-xl border ${
              upstoxStatus?.authenticated
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            {upstoxStatus?.authenticated ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Official Upstox Market Feed Provider
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  upstoxStatus?.authenticated
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {upstoxStatus?.authenticated ? "TOKEN ACTIVE" : "REQUIRES LOGIN"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {upstoxStatus?.authenticated
                ? `Authorized for user: ${upstoxStatus.user_name || "Trader"}. Expires at: ${upstoxStatus.expires_at || "Daily cycle"}.`
                : "Upstox daily OAuth 2.0 access token is not set. Click Authorize to authenticate with your Upstox Developer App."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!upstoxStatus?.authenticated ? (
            <a
              href="/api/v1/upstox/auth/login"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <span>Authorize Upstox</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <a
              href="/api/v1/upstox/auth/disconnect"
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
            >
              Disconnect Session
            </a>
          )}
        </div>
      </div>

      {/* Subsystem Monitoring Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {monitoringData?.components?.map((comp: any) => {
          const Icon = getServiceIcon(comp.service_name);
          const isHealthy = comp.status === "HEALTHY";
          const isNotConfigured = comp.status === "NOT_CONFIGURED";

          return (
            <div
              key={comp.service_name}
              className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3 shadow-card hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/60">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                      {comp.service_name}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate">{comp.details}</p>
                  </div>
                </div>

                <StatusIndicator status={comp.status} showText={false} />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">State:</span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    isHealthy
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : isNotConfigured
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {comp.status.replace("_", " ")}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Market Telemetry & Engine Metrics */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-600" />
          Live Market Telemetry &amp; Operational Metrics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-500 font-medium block">Upstox Configured</span>
            <span className="font-bold text-slate-900">
              {monitoringData?.metrics?.upstox_configured ? "Yes" : "No"}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-500 font-medium block">Upstox Authentication</span>
            <span className={`font-bold ${monitoringData?.metrics?.upstox_authenticated ? "text-emerald-700" : "text-amber-700"}`}>
              {monitoringData?.metrics?.upstox_authenticated ? "Valid" : "Invalid / Expired"}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-500 font-medium block">Market WebSocket</span>
            <span className={`font-bold ${monitoringData?.metrics?.market_websocket_status === "connected" ? "text-emerald-700" : "text-slate-700"}`}>
              {monitoringData?.metrics?.market_websocket_status === "connected" ? "Connected" : "Disconnected"}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-500 font-medium block">Subscribed Instruments</span>
            <span className="font-bold text-slate-900">
              {monitoringData?.metrics?.subscribed_instruments_count ?? 0}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-500 font-medium block">Quote Update Rate</span>
            <span className="font-bold text-slate-900">
              {monitoringData?.metrics?.quote_update_rate ?? "N/A"}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-500 font-medium block">Market Data Latency</span>
            <span className="font-bold text-slate-900">
              {monitoringData?.metrics?.market_data_latency_ms ? `${monitoringData.metrics.market_data_latency_ms} ms` : "0 ms"}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-500 font-medium block">PostgreSQL Status</span>
            <span className={`font-bold ${monitoringData?.metrics?.postgresql_status === "HEALTHY" ? "text-emerald-700" : "text-rose-700"}`}>
              {monitoringData?.metrics?.postgresql_status ?? "UNKNOWN"}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-500 font-medium block">Redis Status</span>
            <span className={`font-bold ${monitoringData?.metrics?.redis_status === "HEALTHY" ? "text-emerald-700" : "text-rose-700"}`}>
              {monitoringData?.metrics?.redis_status ?? "UNKNOWN"}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1 md:col-span-2">
            <span className="text-[11px] text-slate-500 font-medium block">Paper Trading Engine</span>
            <span className="font-bold text-emerald-700 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              {monitoringData?.metrics?.paper_trading_engine_status ?? "ACTIVE (PAPER EXECUTION ONLY)"}
            </span>
          </div>
        </div>
        {monitoringData?.metrics?.last_market_update && (
          <p className="text-[11px] text-slate-400 font-mono">
            Last market feed packet: {monitoringData.metrics.last_market_update}
          </p>
        )}
      </div>

      {/* Strict Guardrail Notice */}
      <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 shadow-card text-xs text-indigo-950 space-y-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span className="font-bold">Phase 2 Virtual Guardrail Integrity</span>
        </div>
        <p className="text-indigo-800 leading-relaxed text-[11px]">
          TradeX uses real official Upstox market data feeds for live prices, candlestick charts, and order matching. Orders are simulated strictly in a paper trading sandbox with virtual ₹1,00,000 ledger balance. Under no circumstances are trades placed with real money or sent to a broker.
        </p>
      </div>
    </div>
  );
}
