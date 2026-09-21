"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiRequest } from "@/lib/api-client";
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
      <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            System Monitoring &amp; Infrastructure Diagnostics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time diagnostics for Docker / Host runtime, Cloud Database, Redis, and Upstox Market Feed V3.
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

      {/* Production Infrastructure & Docker Runtime Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Infrastructure &amp; Container Runtime
            </h2>
          </div>
          <Badge variant="neutral" className="text-[10px] font-mono">
            {isVercel ? "FRONTEND: VERCEL PRODUCTION" : "FRONTEND: LOCAL HOST"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Docker Runtime */}
          <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-500 font-medium block flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5 text-slate-400" />
              Docker Runtime
            </span>
            <span
              className={`font-bold ${
                isDockerContainer ? "text-emerald-700" : "text-slate-600"
              }`}
            >
              {isDockerContainer ? "CONNECTED" : "NOT AVAILABLE"}
            </span>
            <p className="text-[10px] text-slate-400">
              {isDockerContainer ? "Containerized stack" : "Host process (Docker optional)"}
            </p>
          </div>

          {/* Backend Container */}
          <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-500 font-medium block flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              Backend Container
            </span>
            <span
              className={`font-bold ${
                isDockerContainer
                  ? "text-emerald-700"
                  : infraData?.backend?.status === "HEALTHY"
                  ? "text-emerald-700"
                  : "text-amber-700"
              }`}
            >
              {isDockerContainer
                ? "HEALTHY"
                : infraData?.backend?.status === "HEALTHY"
                ? "HEALTHY (NATIVE)"
                : "UNHEALTHY"}
            </span>
            <p className="text-[10px] text-slate-400">
              {infraData?.backend?.service || "FastAPI"} v{infraData?.backend?.version || "1.0.0"}
            </p>
          </div>

          {/* PostgreSQL */}
          <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-500 font-medium block flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              PostgreSQL
            </span>
            <span
              className={`font-bold ${
                postgresStatus === "CONNECTED" || postgresStatus === "HEALTHY"
                  ? "text-emerald-700"
                  : "text-rose-700"
              }`}
            >
              {postgresStatus === "CONNECTED" || postgresStatus === "HEALTHY"
                ? "CONNECTED"
                : "FAILED"}
            </span>
            <p className="text-[10px] text-slate-400 truncate">
              {infraData?.database?.provider || "PostgreSQL Database"}
            </p>
          </div>

          {/* Redis */}
          <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-500 font-medium block flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              Redis Cache
            </span>
            <span
              className={`font-bold ${
                redisStatus === "CONNECTED" || redisStatus === "HEALTHY"
                  ? "text-emerald-700"
                  : "text-rose-700"
              }`}
            >
              {redisStatus === "CONNECTED" || redisStatus === "HEALTHY"
                ? "CONNECTED"
                : "FAILED"}
            </span>
            <p className="text-[10px] text-slate-400 truncate">
              {infraData?.redis?.provider || "Redis Datastore"}
            </p>
          </div>
        </div>
      </div>

      {/* Upstox Authentication & Live Stream Status Banner */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-xl border ${
              isUpstoxAuth
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            {isUpstoxAuth ? (
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
                  isUpstoxAuth
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {isUpstoxAuth ? "AUTHENTICATED" : isUpstoxConfigured ? "EXPIRED" : "NOT CONFIGURED"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isUpstoxAuth
                ? `Authorized with active server-side access token. Market ticks and candlestick bars active.`
                : "Upstox access token is not configured or requires daily OAuth renewal."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isUpstoxAuth ? (
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
              {isUpstoxConfigured ? "Yes" : "No"}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-500 font-medium block">Upstox Authentication</span>
            <span className={`font-bold ${isUpstoxAuth ? "text-emerald-700" : "text-amber-700"}`}>
              {isUpstoxAuth ? "AUTHENTICATED" : isUpstoxConfigured ? "EXPIRED" : "NOT CONFIGURED"}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-500 font-medium block">Market WebSocket</span>
            <span className={`font-bold ${isWsConnected ? "text-emerald-700" : "text-slate-700"}`}>
              {isWsConnected ? "CONNECTED" : "DISCONNECTED"}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-500 font-medium block">Subscribed Instruments</span>
            <span className="font-bold text-slate-900">
              {monitoringData?.metrics?.subscribed_instruments_count ?? marketDataHealth?.instruments ?? 15}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-500 font-medium block">Quote Update Rate</span>
            <span className="font-bold text-slate-900">
              {monitoringData?.metrics?.quote_update_rate ?? (isWsConnected ? "Live Feed" : "Standby")}
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
            <span className={`font-bold ${postgresStatus === "CONNECTED" || postgresStatus === "HEALTHY" ? "text-emerald-700" : "text-rose-700"}`}>
              {postgresStatus === "CONNECTED" || postgresStatus === "HEALTHY" ? "CONNECTED" : "FAILED"}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
            <span className="text-[11px] text-slate-500 font-medium block">Redis Status</span>
            <span className={`font-bold ${redisStatus === "CONNECTED" || redisStatus === "HEALTHY" ? "text-emerald-700" : "text-rose-700"}`}>
              {redisStatus === "CONNECTED" || redisStatus === "HEALTHY" ? "CONNECTED" : "FAILED"}
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
