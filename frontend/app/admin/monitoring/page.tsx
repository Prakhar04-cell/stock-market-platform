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
  Lock,
} from "lucide-react";

export default function AdminMonitoringPage() {
  const [monitoringData, setMonitoringData] = useState<any>(null);
  const [infraData, setInfraData] = useState<any>(null);
  const [upstoxStatus, setUpstoxStatus] = useState<any>(null);
  const [marketDataHealth, setMarketDataHealth] = useState<any>(null);
  const [securitySummary, setSecuritySummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");
  const [isAdminAuthorized, setIsAdminAuthorized] = useState<boolean>(true);
  const [isMonitoringUnavailable, setIsMonitoringUnavailable] = useState<boolean>(false);

  const loadHealthData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [monData, upData, infra, marketH, secSummary] = await Promise.allSettled([
        apiRequest("/api/v1/admin/monitoring"),
        apiRequest("/api/v1/upstox/auth/status"),
        apiRequest("/health/infrastructure").catch(() => apiRequest("/api/v1/health/infrastructure")),
        apiRequest("/health/market-data").catch(() => apiRequest("/api/v1/health/market-data")),
        apiRequest("/api/java/security/summary").catch(() => null),
      ]);

      let anySuccess = false;

      if (monData.status === "fulfilled") {
        setMonitoringData(monData.value);
        setIsAdminAuthorized(true);
        anySuccess = true;
      } else {
        // If 403 Forbidden or unauthorized, record non-admin state
        setIsAdminAuthorized(false);
      }

      if (upData.status === "fulfilled") {
        setUpstoxStatus(upData.value);
        anySuccess = true;
      }
      if (infra.status === "fulfilled") {
        setInfraData(infra.value);
        anySuccess = true;
      }
      if (marketH.status === "fulfilled") {
        setMarketDataHealth(marketH.value);
        anySuccess = true;
      }
      if (secSummary.status === "fulfilled" && secSummary.value) {
        setSecuritySummary(secSummary.value);
      }

      setIsMonitoringUnavailable(!anySuccess);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch {
      setIsMonitoringUnavailable(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHealthData();
    const interval = setInterval(loadHealthData, 15000);
    return () => clearInterval(interval);
  }, [loadHealthData]);

  // Upstox Authentication status
  const isUpstoxAuth =
    upstoxStatus?.authenticated ||
    infraData?.upstox?.status === "AUTHENTICATED" ||
    infraData?.upstox?.status === "Analytics Token ACTIVE" ||
    monitoringData?.metrics?.upstox_authenticated ||
    marketDataHealth?.authenticated;

  const isUpstoxConfigured =
    upstoxStatus?.configured ||
    infraData?.upstox?.configured ||
    monitoringData?.metrics?.upstox_configured ||
    marketDataHealth?.configured;

  // Backend Process Status
  const isBackendAlive =
    !isMonitoringUnavailable &&
    (infraData?.backend_container?.status === "HEALTHY" ||
      infraData?.backend?.status === "HEALTHY" ||
      monitoringData != null ||
      marketDataHealth != null ||
      upstoxStatus != null);

  // Docker / Host Runtime
  const isDockerContainer = infraData?.docker_runtime?.is_container ?? false;
  const dockerRuntimeStatus =
    infraData?.docker_runtime?.status ||
    monitoringData?.metrics?.docker_runtime?.status ||
    (isDockerContainer ? "CONTAINERIZED" : "MANAGED BY HOST");

  const dockerRuntimeDesc =
    infraData?.docker_runtime?.description ||
    monitoringData?.metrics?.docker_runtime?.description ||
    (isDockerContainer
      ? "Running inside containerized stack."
      : "Host Docker runtime is managed by Render and is not directly exposed to the application.");

  // Database (PostgreSQL)
  const rawDbStatus =
    infraData?.database?.status ||
    monitoringData?.metrics?.postgresql_status;
  const isDbHealthy = rawDbStatus === "HEALTHY" || rawDbStatus === "CONNECTED";
  const dbLatency =
    infraData?.database?.latency_ms ??
    monitoringData?.metrics?.postgresql_latency_ms ??
    null;
  const dbProvider =
    infraData?.database?.provider ||
    monitoringData?.metrics?.postgresql_provider ||
    "PostgreSQL Database";

  // Redis Cache
  const rawRedisStatus =
    infraData?.redis?.status ||
    monitoringData?.metrics?.redis_status ||
    (marketDataHealth?.redis === "connected" ? "HEALTHY" : marketDataHealth?.redis === "disconnected" ? "FAILED" : undefined);
  const isRedisHealthy = rawRedisStatus === "HEALTHY" || rawRedisStatus === "CONNECTED";
  const isRedisNotConfigured = rawRedisStatus === "NOT_CONFIGURED";
  const redisLatency =
    infraData?.redis?.latency_ms ??
    monitoringData?.metrics?.redis_latency_ms ??
    null;
  const redisProvider =
    infraData?.redis?.provider ||
    monitoringData?.metrics?.redis_provider ||
    "Redis Datastore";

  // Market WebSocket State
  const wsState =
    infraData?.websocket?.status ||
    monitoringData?.metrics?.market_websocket_state ||
    marketDataHealth?.websocket_state ||
    (infraData?.websocket?.connected ? "CONNECTED" : "DISCONNECTED");

  const isWsConnected = wsState === "CONNECTED";

  // Rolling Quote Rate
  const quoteUpdateRate =
    monitoringData?.metrics?.quote_update_rate ??
    infraData?.websocket?.quote_update_rate ??
    marketDataHealth?.quote_update_rate ??
    (isWsConnected ? "Live Feed" : "N/A");

  // WebSocket RTT
  const rawWsRtt =
    monitoringData?.metrics?.websocket_rtt_ms ??
    infraData?.websocket?.websocket_rtt_ms ??
    marketDataHealth?.websocket_rtt_ms;
  const wsRttDisplay =
    rawWsRtt !== undefined && rawWsRtt !== null && rawWsRtt >= 0
      ? `${rawWsRtt} ms`
      : "N/A";

  // Market Data Latency
  const rawMarketLatency =
    monitoringData?.metrics?.market_data_latency_ms ??
    infraData?.websocket?.market_data_latency_ms ??
    marketDataHealth?.market_data_latency_ms;
  const marketLatencyDisplay =
    rawMarketLatency !== undefined && rawMarketLatency !== null && rawMarketLatency >= 0
      ? `${rawMarketLatency} ms`
      : "N/A";

  // Subscribed Instruments Count (never hardcode 15)
  const subscribedInstrumentsCount =
    monitoringData?.metrics?.subscribed_instruments_count ??
    infraData?.websocket?.subscribed_instruments_count ??
    marketDataHealth?.instruments ??
    0;

  // Sentry Status
  const rawSentryStatus =
    infraData?.sentry?.status ||
    monitoringData?.metrics?.sentry_status ||
    "NOT_CONFIGURED";
  const isSentryActive =
    rawSentryStatus === "ACTIVE" || rawSentryStatus === "CONFIGURED";
  const sentryDescription =
    infraData?.sentry?.description ||
    monitoringData?.metrics?.sentry_description ||
    "sentry-sdk not installed; skipping Sentry initialization.";

  // Paper Trading Engine Status
  const paperTradingStatus =
    monitoringData?.metrics?.paper_trading_engine_status ??
    "ACTIVE (PAPER ONLY)";

  // Java Security & Trading Analytics Service
  const rawJavaStatus =
    infraData?.java_security_service?.status ||
    (securitySummary ? "HEALTHY" : "DISCONNECTED");
  const isJavaHealthy = rawJavaStatus === "HEALTHY";
  const javaLatency = infraData?.java_security_service?.latency_ms ?? null;
  const javaVersion = infraData?.java_security_service?.version || "1.0.0";
  const javaService = infraData?.java_security_service?.service || "Spring Boot (Java 21)";

  const isVercel =
    typeof window !== "undefined" && window.location.hostname.includes("vercel.app");

  return (
    <div className="space-y-5 select-none">
      {/* Header */}
      <div className="bg-white border border-[#E5E7EB] p-4 rounded-2xl shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#111827] flex items-center gap-2">
            System Monitoring &amp; Infrastructure Diagnostics
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5 font-normal">
            Real-time diagnostics for Host runtime, Cloud Database, Redis, and Upstox Market Feed V3.
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

      {/* Backend Unavailable Alert Banner */}
      {isMonitoringUnavailable && (
        <div className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] shadow-card flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-[#991B1B]">
              Monitoring Data Unavailable
            </h4>
            <p className="text-xs text-[#B91C1C] mt-0.5">
              Unable to reach backend health endpoints at {API_BASE_URL}. Verify backend process status and network connectivity.
            </p>
          </div>
        </div>
      )}

      {/* Admin Authorization Notice */}
      {!isAdminAuthorized && !isMonitoringUnavailable && (
        <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] shadow-xs flex items-center gap-2.5 text-xs text-[#475569]">
          <Lock className="w-4 h-4 text-[#64748B] shrink-0" />
          <span>
            <strong>Admin Telemetry Notice:</strong> Showing public infrastructure health checks. Log in with an administrator account for full internal audit metrics and broker credentials.
          </span>
        </div>
      )}

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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {/* Docker Runtime */}
          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5 text-[#9CA3AF]" />
              Docker Runtime
            </span>
            <span
              className={`font-semibold ${
                isDockerContainer ? "text-[#16A34A]" : "text-[#4B5563]"
              }`}
            >
              {dockerRuntimeStatus}
            </span>
            <p className="text-[10px] text-[#9CA3AF] font-normal leading-snug">
              {dockerRuntimeDesc}
            </p>
          </div>

          {/* Backend Container */}
          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-[#9CA3AF]" />
              Backend Container
            </span>
            <span
              className={`font-semibold ${
                isBackendAlive ? "text-[#16A34A]" : "text-[#DC2626]"
              }`}
            >
              {isBackendAlive ? "HEALTHY" : "UNHEALTHY"}
            </span>
            <p className="text-[10px] text-[#9CA3AF] font-normal">
              {infraData?.backend_container?.service || infraData?.backend?.service || "FastAPI"} v
              {infraData?.backend_container?.version || infraData?.backend?.version || "1.0.0"}
            </p>
          </div>

          {/* Java Security Core */}
          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#9CA3AF]" />
              Java Security Core
            </span>
            <span
              className={`font-semibold ${
                isJavaHealthy
                  ? "text-[#16A34A]"
                  : rawJavaStatus === "DEGRADED"
                  ? "text-[#D97706]"
                  : rawJavaStatus === "DISCONNECTED"
                  ? "text-[#6B7280]"
                  : "text-[#DC2626]"
              }`}
            >
              {rawJavaStatus}
            </span>
            <p className="text-[10px] text-[#9CA3AF] truncate font-normal">
              {javaService} v{javaVersion} {javaLatency !== null ? `(${javaLatency} ms)` : ""}
            </p>
          </div>

          {/* PostgreSQL */}
          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#9CA3AF]" />
              PostgreSQL
            </span>
            <span
              className={`font-semibold ${
                isDbHealthy ? "text-[#16A34A]" : "text-[#DC2626]"
              }`}
            >
              {isDbHealthy ? "HEALTHY" : "FAILED"}
            </span>
            <p className="text-[10px] text-[#9CA3AF] truncate font-normal">
              {dbProvider} {dbLatency !== null ? `(${dbLatency} ms)` : ""}
            </p>
          </div>

          {/* Redis */}
          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#9CA3AF]" />
              Redis Cache
            </span>
            <span
              className={`font-semibold ${
                isRedisHealthy
                  ? "text-[#16A34A]"
                  : isRedisNotConfigured
                  ? "text-[#6B7280]"
                  : "text-[#DC2626]"
              }`}
            >
              {isRedisHealthy
                ? "HEALTHY"
                : isRedisNotConfigured
                ? "NOT CONFIGURED"
                : "FAILED"}
            </span>
            <p className="text-[10px] text-[#9CA3AF] truncate font-normal">
              {isRedisNotConfigured
                ? "Optional cache & rate limiter"
                : `${redisProvider} ${redisLatency !== null ? `(${redisLatency} ms)` : ""}`}
            </p>
          </div>
        </div>
      </div>

      {/* Java Security & Audit Governance Telemetry Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-[#111827]">
              Java API Security &amp; Audit Governance Telemetry
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                securitySummary?.riskLevel === "CRITICAL"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : securitySummary?.riskLevel === "HIGH"
                  ? "bg-orange-50 text-orange-700 border-orange-200"
                  : securitySummary?.riskLevel === "MEDIUM"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              Risk Assessment: {securitySummary?.riskLevel || "LOW"} ({securitySummary?.riskScore ?? 0}/100)
            </span>
            <Badge variant="neutral" className="text-[10px] font-mono">
              ROLE: ADMIN RBAC
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* 1. Security Status */}
          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block">Security Engine</span>
            <span className={`font-semibold ${isJavaHealthy ? "text-[#16A34A]" : "text-[#6B7280]"}`}>
              {isJavaHealthy ? "ENFORCING" : rawJavaStatus}
            </span>
            <p className="text-[10px] text-[#9CA3AF]">JWT, RBAC &amp; Rate Limit</p>
          </div>

          {/* 2. Active Alerts */}
          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block">Active Alerts</span>
            <span className={`font-semibold ${(securitySummary?.activeAlerts ?? 0) > 0 ? "text-rose-600" : "text-[#111827]"}`}>
              {securitySummary?.activeAlerts ?? 0}
            </span>
            <p className="text-[10px] text-[#9CA3AF]">High/Critical severity</p>
          </div>

          {/* 3. Resolved Alerts */}
          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block">Resolved Alerts</span>
            <span className="font-semibold text-emerald-600">
              0
            </span>
            <p className="text-[10px] text-[#9CA3AF]">Auto-mitigated events</p>
          </div>

          {/* 4. Failed Auth Attempts */}
          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block">Failed Auth</span>
            <span className="font-semibold text-[#111827]">
              {securitySummary?.failedAuthAttempts ?? 0}
            </span>
            <p className="text-[10px] text-[#9CA3AF]">Invalid credentials / JWT</p>
          </div>

          {/* 5. Blocked Requests */}
          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block">Blocked Requests</span>
            <span className="font-semibold text-[#111827]">
              {securitySummary?.blockedRequests ?? 0}
            </span>
            <p className="text-[10px] text-[#9CA3AF]">RBAC access denials</p>
          </div>

          {/* 6. Rate-Limit Violations */}
          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block">Rate Limits Hit</span>
            <span className="font-semibold text-[#111827]">
              {securitySummary?.rateLimitViolations ?? 0}
            </span>
            <p className="text-[10px] text-[#9CA3AF]">HTTP 429 throttles</p>
          </div>
        </div>

        {securitySummary?.riskFactors && securitySummary.riskFactors.length > 0 ? (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
            <span className="font-semibold block">Identified Risk Factors:</span>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              {securitySummary.riskFactors.map((factor: string, idx: number) => (
                <li key={idx}>{factor}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[11px] text-[#6B7280] pt-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Audit pipeline operating nominally. All user credentials and API tokens validated through HS256 crypto keys.</span>
          </div>
        )}
      </div>

      {/* Upstox Authentication & Live Stream Status Banner */}
      <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-xl border ${
              isUpstoxAuth
                ? "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]"
                : isUpstoxConfigured
                ? "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]"
                : "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]"
            }`}
          >
            {isUpstoxAuth ? (
              <CheckCircle2 className="w-6 h-6 text-[#16A34A]" />
            ) : isUpstoxConfigured ? (
              <AlertTriangle className="w-6 h-6 text-[#D97706]" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-[#6B7280]" />
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
                    : isUpstoxConfigured
                    ? "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]"
                    : "bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]"
                }`}
              >
                {isUpstoxAuth
                  ? "Analytics Token ACTIVE"
                  : isUpstoxConfigured
                  ? "EXPIRED"
                  : "NOT CONFIGURED"}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-1 font-normal">
              {isUpstoxAuth
                ? "Authorized with 1-year Upstox Analytics Token. Market ticks and candlestick bars active."
                : isUpstoxConfigured
                ? "Upstox Analytics Token is missing or invalid."
                : "UPSTOX_ANALYTICS_TOKEN not configured in backend environment variables."}
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
              href={`${API_BASE_URL}/api/v1/upstox/auth/disconnect`}
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
            <span className="text-[11px] text-[#6B7280] font-normal block">Market Data Auth</span>
            <span
              className={`font-semibold ${
                isUpstoxAuth
                  ? "text-[#16A34A]"
                  : isUpstoxConfigured
                  ? "text-[#D97706]"
                  : "text-[#6B7280]"
              }`}
            >
              {isUpstoxAuth ? "Analytics Token ACTIVE" : isUpstoxConfigured ? "EXPIRED" : "NOT CONFIGURED"}
            </span>
          </div>

          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block">Market WebSocket</span>
            <span
              className={`font-semibold ${
                wsState === "CONNECTED"
                  ? "text-[#16A34A]"
                  : wsState === "CONNECTING" || wsState === "RECONNECTING"
                  ? "text-[#D97706]"
                  : wsState === "ERROR"
                  ? "text-[#DC2626]"
                  : "text-[#4B5563]"
              }`}
            >
              {wsState}
            </span>
          </div>

          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block">Subscribed Instruments</span>
            <span className="font-semibold text-[#111827] tabular-nums">
              {subscribedInstrumentsCount > 0
                ? subscribedInstrumentsCount
                : isWsConnected
                ? "0 (No active subscriptions)"
                : "0"}
            </span>
          </div>

          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block">Quote Update Rate</span>
            <span className="font-semibold text-[#111827]">
              {quoteUpdateRate}
            </span>
          </div>

          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block">WebSocket RTT</span>
            <span className="font-semibold text-[#111827] tabular-nums">
              {wsRttDisplay}
            </span>
          </div>

          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block">Market Data Latency</span>
            <span className="font-semibold text-[#111827] tabular-nums">
              {marketLatencyDisplay}
            </span>
          </div>

          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block">PostgreSQL Status</span>
            <span
              className={`font-semibold ${
                isDbHealthy ? "text-[#16A34A]" : "text-[#DC2626]"
              }`}
            >
              {isDbHealthy ? "HEALTHY" : "FAILED"}
            </span>
          </div>

          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block">Redis Status</span>
            <span
              className={`font-semibold ${
                isRedisHealthy
                  ? "text-[#16A34A]"
                  : isRedisNotConfigured
                  ? "text-[#6B7280]"
                  : "text-[#DC2626]"
              }`}
            >
              {isRedisHealthy
                ? "HEALTHY"
                : isRedisNotConfigured
                ? "NOT CONFIGURED"
                : "FAILED"}
            </span>
          </div>

          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block">Sentry Monitoring</span>
            <span
              className={`font-semibold flex items-center gap-1.5 ${
                isSentryActive ? "text-[#16A34A]" : "text-[#6B7280]"
              }`}
            >
              <ShieldCheck
                className={`w-3.5 h-3.5 ${
                  isSentryActive ? "text-[#16A34A]" : "text-[#9CA3AF]"
                }`}
              />
              {isSentryActive ? (rawSentryStatus === "ACTIVE" ? "ACTIVE" : "CONFIGURED") : "NOT CONFIGURED"}
            </span>
          </div>

          <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1">
            <span className="text-[11px] text-[#6B7280] font-normal block">Paper Trading Engine</span>
            <span className="font-semibold text-[#16A34A] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
              {paperTradingStatus}
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
