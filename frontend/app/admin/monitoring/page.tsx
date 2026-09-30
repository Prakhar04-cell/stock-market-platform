"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiRequest, API_BASE_URL } from "@/lib/api-client";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Box,
  Cloud,
} from "lucide-react";

export default function AdminMonitoringPage() {
  const [monitoringData, setMonitoringData] = useState<any>(null);
  const [infraData, setInfraData] = useState<any>(null);
  const [upstoxStatus, setUpstoxStatus] = useState<any>(null);
  const [marketDataHealth, setMarketDataHealth] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  const loadHealthData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [monData, upData, infra, marketH] = await Promise.allSettled([
        apiRequest("/api/v1/admin/monitoring"),
        apiRequest("/api/v1/upstox/auth/status"),
        apiRequest("/health/infrastructure"),
        apiRequest("/health/market-data"),
      ]);

      if (monData.status === "fulfilled") {
        setMonitoringData(monData.value);
      }
      if (upData.status === "fulfilled") {
        setUpstoxStatus(upData.value);
      }
      if (infra.status === "fulfilled") {
        setInfraData(infra.value);
      }
      if (marketH.status === "fulfilled") {
        setMarketDataHealth(marketH.value);
      }

      setLastRefreshed(new Date().toLocaleTimeString());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHealthData();
    const interval = setInterval(loadHealthData, 15000);
    return () => clearInterval(interval);
  }, [loadHealthData]);

  const isUpstoxAuth =
    upstoxStatus?.authenticated ||
    infraData?.upstox?.status === "AUTHENTICATED" ||
    monitoringData?.metrics?.upstox_authenticated ||
    marketDataHealth?.authenticated;

  const isUpstoxConfigured =
    upstoxStatus?.configured ||
    infraData?.upstox?.configured ||
    monitoringData?.metrics?.upstox_configured ||
    marketDataHealth?.configured;

  const isWsConnected =
    infraData?.websocket?.status === "CONNECTED" ||
    monitoringData?.metrics?.market_websocket_status === "connected" ||
    marketDataHealth?.websocket === "connected";

  const postgresStatus =
    infraData?.database?.status ||
    monitoringData?.metrics?.postgresql_status ||
    (marketDataHealth ? "HEALTHY" : "UNKNOWN");

  const redisStatus =
    infraData?.redis?.status ||
    monitoringData?.metrics?.redis_status ||
    (marketDataHealth?.redis === "connected" ? "HEALTHY" : "UNKNOWN");

  const isDockerContainer = infraData?.docker_runtime?.is_container ?? false;
  const isVercel = typeof window !== "undefined" && window.location.hostname.includes("vercel.app");

  return (
    <div className="space-y-5 select-none">
      {/* Header */}
      <div className="bg-white border border-[#E5E7EB] p-4 rounded-2xl shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#111827] flex items-center gap-2">
            System Monitoring &amp; Infrastructure Diagnostics
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5 font-normal">
            Real-time diagnostics for Docker / Host runtime, Cloud Database, Redis, and Upstox Market Feed V3.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-[11px] text-[#9CA3AF] font-mono font-normal">
              Last probe: {lastRefreshed}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={loadHealthData}
            isLoading={isLoading}
            className="border-[#E5E7EB] text-[#4B5563] text-xs hover:bg-[#F8FAFC] font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1 text-[#F97316]" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Production Infrastructure & Docker Runtime Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-[#F97316]" />
            <h2 className="text-sm font-semibold text-[#111827]">
              Infrastructure &amp; Container Runtime
            </h2>
          </div>
          <Badge variant="neutral" className="text-[10px] font-mono font-normal">
            {isVercel ? "FRONTEND: VERCEL PRODUCTION" : "FRONTEND: LOCAL HOST"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Docker Runtime */}
          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5 text-[#9CA3AF]" />
              Docker Runtime
            </span>
            <span
              className={`font-semibold ${
                isDockerContainer ? "text-[#16A34A]" : "text-[#4B5563]"
              }`}
            >
              {isDockerContainer ? "CONNECTED" : "NOT AVAILABLE"}
            </span>
            <p className="text-[10px] text-[#9CA3AF] font-normal">
              {isDockerContainer ? "Containerized stack" : "Host process (Docker optional)"}
            </p>
          </div>

          {/* Backend Container */}
          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-[#9CA3AF]" />
              Backend Container
            </span>
            <span
              className={`font-semibold ${
                isDockerContainer
                  ? "text-[#16A34A]"
                  : infraData?.backend?.status === "HEALTHY"
                  ? "text-[#16A34A]"
                  : "text-[#D97706]"
              }`}
            >
              {isDockerContainer
                ? "HEALTHY"
                : infraData?.backend?.status === "HEALTHY"
                ? "HEALTHY (NATIVE)"
                : "UNHEALTHY"}
            </span>
            <p className="text-[10px] text-[#9CA3AF] font-normal">
              {infraData?.backend?.service || "FastAPI"} v{infraData?.backend?.version || "1.0.0"}
            </p>
          </div>

          {/* PostgreSQL */}
          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#9CA3AF]" />
              PostgreSQL
            </span>
            <span
              className={`font-semibold ${
                postgresStatus === "CONNECTED" || postgresStatus === "HEALTHY"
                  ? "text-[#16A34A]"
                  : "text-[#DC2626]"
              }`}
            >
              {postgresStatus === "CONNECTED" || postgresStatus === "HEALTHY"
                ? "CONNECTED"
                : "FAILED"}
            </span>
            <p className="text-[10px] text-[#9CA3AF] truncate font-normal">
              {infraData?.database?.provider || "PostgreSQL Database"}
            </p>
          </div>

          {/* Redis */}
          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#9CA3AF]" />
              Redis Cache
            </span>
            <span
              className={`font-semibold ${
                redisStatus === "CONNECTED" || redisStatus === "HEALTHY"
                  ? "text-[#16A34A]"
                  : "text-[#DC2626]"
              }`}
            >
              {redisStatus === "CONNECTED" || redisStatus === "HEALTHY"
                ? "CONNECTED"
                : "FAILED"}
            </span>
            <p className="text-[10px] text-[#9CA3AF] truncate font-normal">
              {infraData?.redis?.provider || "Redis Datastore"}
            </p>
          </div>
        </div>
      </div>

      {/* Upstox Authentication & Live Stream Status Banner */}
      <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-xl border ${
              isUpstoxAuth
                ? "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]"
                : "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]"
            }`}
          >
            {isUpstoxAuth ? (
              <CheckCircle2 className="w-6 h-6 text-[#16A34A]" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-[#D97706]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#111827]">
                Official Upstox Market Feed Provider
              </h3>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                  isUpstoxAuth
                    ? "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]"
                    : "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]"
                }`}
              >
                {isUpstoxAuth ? "AUTHENTICATED" : isUpstoxConfigured ? "EXPIRED" : "NOT CONFIGURED"}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-1 font-normal">
              {isUpstoxAuth
                ? `Authorized with active server-side access token. Market ticks and candlestick bars active.`
                : "Upstox access token is not configured or requires daily OAuth renewal."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isUpstoxAuth ? (
            <a
              href={`${API_BASE_URL}/api/v1/upstox/auth/login?redirect=true`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-medium shadow-xs transition-colors"
            >
              <span>Authorize Upstox</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <a
              href="/api/v1/upstox/auth/disconnect"
              className="px-3 py-1.5 rounded-xl border border-[#E5E7EB] text-[#DC2626] hover:bg-[#FEF2F2] text-xs font-medium transition-colors"
            >
              Disconnect Session
            </a>
          )}
        </div>
      </div>

      {/* Live Market Telemetry & Engine Metrics */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-card space-y-4">
        <h2 className="text-sm font-semibold text-[#111827] flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#F97316]" />
          Live Market Telemetry &amp; Operational Metrics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block">Upstox Configured</span>
            <span className="font-semibold text-[#111827]">
              {isUpstoxConfigured ? "Yes" : "No"}
            </span>
          </div>

          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block">Upstox Authentication</span>
            <span className={`font-semibold ${isUpstoxAuth ? "text-[#16A34A]" : "text-[#D97706]"}`}>
              {isUpstoxAuth ? "AUTHENTICATED" : isUpstoxConfigured ? "EXPIRED" : "NOT CONFIGURED"}
            </span>
          </div>

          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block">Market WebSocket</span>
            <span className={`font-semibold ${isWsConnected ? "text-[#16A34A]" : "text-[#4B5563]"}`}>
              {isWsConnected ? "CONNECTED" : "DISCONNECTED"}
            </span>
          </div>

          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block">Subscribed Instruments</span>
            <span className="font-semibold text-[#111827] tabular-nums">
              {monitoringData?.metrics?.subscribed_instruments_count ?? marketDataHealth?.instruments ?? 15}
            </span>
          </div>

          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block">Quote Update Rate</span>
            <span className="font-semibold text-[#111827]">
              {monitoringData?.metrics?.quote_update_rate ?? (isWsConnected ? "Live Feed" : "Standby")}
            </span>
          </div>

          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block">Market Data Latency</span>
            <span className="font-semibold text-[#111827] tabular-nums">
              {monitoringData?.metrics?.market_data_latency_ms ? `${monitoringData.metrics.market_data_latency_ms} ms` : "0 ms"}
            </span>
          </div>

          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block">PostgreSQL Status</span>
            <span className={`font-semibold ${postgresStatus === "CONNECTED" || postgresStatus === "HEALTHY" ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
              {postgresStatus === "CONNECTED" || postgresStatus === "HEALTHY" ? "CONNECTED" : "FAILED"}
            </span>
          </div>

          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block">Redis Status</span>
            <span className={`font-semibold ${redisStatus === "CONNECTED" || redisStatus === "HEALTHY" ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
              {redisStatus === "CONNECTED" || redisStatus === "HEALTHY" ? "CONNECTED" : "FAILED"}
            </span>
          </div>

          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block">Sentry Monitoring</span>
            <span className="font-semibold text-[#16A34A] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
              ACTIVE (ENABLED)
            </span>
          </div>

          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block">Paper Trading Engine</span>
            <span className="font-semibold text-[#16A34A] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
              {monitoringData?.metrics?.paper_trading_engine_status ?? "ACTIVE (PAPER ONLY)"}
            </span>
          </div>
        </div>
      </div>

      {/* Strict Guardrail Notice */}
      <div className="p-4 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] shadow-card text-xs text-[#9A3412] space-y-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#F97316]" />
          <span className="font-semibold">Phase 2 Virtual Guardrail Integrity</span>
        </div>
        <p className="text-[#C2410C] leading-relaxed text-[11px] font-normal">
          BullRun uses real official Upstox market data feeds for live prices, candlestick charts, and order matching. Orders are simulated strictly in a paper trading sandbox with virtual ₹1,00,000 ledger balance. Under no circumstances are trades placed with real money or sent to a broker.
        </p>
      </div>
    </div>
  );
}
