"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  ChevronDown,
  Layers,
  BarChart2,
  PieChart,
  ShieldAlert,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { ChartContainer } from "@/components/ui/chart-container";
import { OrderPadModal } from "@/components/trading/order-pad-modal";
import { useMarketWebSocket, WsPriceUpdate } from "@/lib/market-ws";
import { NewsHeadlinesFeed } from "@/components/news/news-headlines-feed";
import {
  formatINR,
  formatPercentage,
  formatCompactINR,
  formatIndianNumber,
} from "@/lib/formatters";

interface IndexData {
  index: {
    symbol: string;
    name: string;
    category: string;
    exchange: string;
    instrument_key: string;
    description: string;
  };
  quote: {
    ltp: number | null;
    change: number | null;
    change_percent: number | null;
    is_positive: boolean;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    year_high: number | null;
    year_low: number | null;
    status: string;
    timestamp: string | null;
  };
  breadth: {
    advances: number;
    declines: number;
    unchanged: number;
    advance_decline_ratio: number;
    total_constituents: number;
  };
  constituents: Array<{
    symbol: string;
    name: string;
    sector: string;
    weight: number;
    ltp: number;
    change: number;
    change_percent: number;
    volume: number;
    is_positive: boolean;
    status: string;
  }>;
  provider: string;
}

const SUPPORTED_INDICES = [
  { symbol: "nifty", label: "NIFTY 50", exchange: "NSE" },
  { symbol: "banknifty", label: "BANK NIFTY", exchange: "NSE" },
  { symbol: "finnifty", label: "FIN NIFTY", exchange: "NSE" },
  { symbol: "sensex", label: "BSE SENSEX", exchange: "BSE" },
  { symbol: "midcpnifty", label: "MIDCAP NIFTY", exchange: "NSE" },
];

export default function IndexDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawParam = (params?.symbol as string) || "nifty";

  const [data, setData] = useState<IndexData | null>(null);
  const [liveLtp, setLiveLtp] = useState<number | null>(null);
  const [liveChange, setLiveChange] = useState<number | null>(null);
  const [liveChangePct, setLiveChangePct] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState<"1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL">("1D");
  const [chartType, setChartType] = useState<"candle" | "area">("area");

  // Search & Sorting for constituents
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("ALL");
  const [sortBy, setSortBy] = useState<"weight" | "ltp" | "change" | "symbol">("weight");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // OrderPad Modal for trading constituent
  const [orderModalStock, setOrderModalStock] = useState<{
    symbol: string;
    stockId: string;
    stockName?: string;
    defaultSide: "BUY" | "SELL";
  } | null>(null);

  const fetchIndexData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiRequest<IndexData>(
        `/api/v1/market/indices/${encodeURIComponent(rawParam)}`
      );
      if (res) {
        setData(res);
        if (res.quote.ltp !== null) {
          setLiveLtp(res.quote.ltp);
          setLiveChange(res.quote.change);
          setLiveChangePct(res.quote.change_percent);
        }
      }
    } catch {
      setData(null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [rawParam]);

  useEffect(() => {
    fetchIndexData();
  }, [fetchIndexData]);

  // WebSocket Live Subscription for real-time tick updates
  useMarketWebSocket(
    data?.index.symbol || "NIFTY 50",
    (update: WsPriceUpdate) => {
      if (update.ltp) {
        setLiveLtp(Number(update.ltp));
        if (update.change !== undefined) setLiveChange(Number(update.change));
        if (update.change_percent !== undefined) setLiveChangePct(Number(update.change_percent));
      }
    }
  );

  // Sector list from constituents
  const sectorList = useMemo(() => {
    if (!data?.constituents) return ["ALL"];
    const sectors = Array.from(new Set(data.constituents.map((c) => c.sector)));
    return ["ALL", ...sectors];
  }, [data?.constituents]);

  // Filtered & sorted constituents
  const filteredConstituents = useMemo(() => {
    if (!data?.constituents) return [];
    let list = data.constituents.filter((c) => {
      const matchesSearch =
        c.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSector =
        selectedSector === "ALL" || c.sector === selectedSector;
      return matchesSearch && matchesSector;
    });

    list.sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];
      if (sortBy === "change") {
        valA = a.change_percent;
        valB = b.change_percent;
      }
      if (typeof valA === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return sortDirection === "asc" ? valA - valB : valB - valA;
    });

    return list;
  }, [data?.constituents, searchQuery, selectedSector, sortBy, sortDirection]);

  // Sector distribution breakdown
  const sectorBreakdown = useMemo(() => {
    if (!data?.constituents) return [];
    const map: Record<string, number> = {};
    for (const c of data.constituents) {
      map[c.sector] = (map[c.sector] || 0) + c.weight;
    }
    return Object.entries(map)
      .map(([sector, weight]) => ({ sector, weight: Number(weight.toFixed(1)) }))
      .sort((a, b) => b.weight - a.weight);
  }, [data?.constituents]);

  const ltp = liveLtp ?? data?.quote.ltp ?? 0;
  const change = liveChange ?? data?.quote.change ?? 0;
  const changePct = liveChangePct ?? data?.quote.change_percent ?? 0;
  const isPositive = change >= 0;

  if (isLoading && !data) {
    return (
      <div className="flex flex-col gap-6 p-4 lg:p-8 max-w-7xl mx-auto animate-pulse">
        <div className="h-28 bg-surface-container-low rounded-2xl w-full" />
        <div className="h-96 bg-surface-container-low rounded-2xl w-full" />
        <div className="h-64 bg-surface-container-low rounded-2xl w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6">
        <ShieldAlert className="w-12 h-12 text-outline" />
        <h2 className="text-xl font-bold text-on-surface">Index Data Unavailable</h2>
        <p className="text-body-md text-on-surface-variant max-w-md">
          Unable to load market metrics for “{rawParam}”. The requested index may not be configured in the active data provider.
        </p>
        <div className="flex items-center gap-3 mt-2">
          <Link
            href="/indices/nifty"
            className="px-4 py-2 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            Explore NIFTY 50
          </Link>
          <Link
            href="/explore"
            className="px-4 py-2 bg-surface-container hover:bg-surface-container-high rounded-xl text-on-surface font-medium transition-colors"
          >
            Explore Markets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-space-lg p-space-md lg:p-space-xl max-w-7xl mx-auto select-none">
      {/* 1. Indices Quick Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {SUPPORTED_INDICES.map((idx) => {
          const isActive =
            rawParam.toLowerCase().replace(/[^a-z0-9]/g, "") ===
            idx.symbol.toLowerCase();
          return (
            <Link
              key={idx.symbol}
              href={`/indices/${idx.symbol}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                isActive
                  ? "bg-primary text-on-primary shadow-xs"
                  : "bg-surface-container-low text-on-surface hover:bg-surface-container border border-outline-variant/20"
              }`}
            >
              <span>{idx.label}</span>
              <span className={`text-[10px] opacity-75 ${isActive ? "text-on-primary" : "text-outline"}`}>
                {idx.exchange}
              </span>
            </Link>
          );
        })}
      </div>

      {/* 2. Index Header Overview Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-outline-variant/20 flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-on-surface">
              {data.index.name}
            </h1>
            <span className="px-2 py-0.5 rounded text-label-sm font-semibold bg-primary/10 text-primary">
              {data.index.category}
            </span>
            <span className="px-2 py-0.5 rounded text-label-sm font-mono text-outline bg-surface-container">
              {data.index.exchange}
            </span>
          </div>
          <p className="text-body-sm text-on-surface-variant mt-1 max-w-2xl">
            {data.index.description}
          </p>
        </div>

        {/* Live Index Value & Actions */}
        <div className="flex items-start lg:items-end flex-col gap-1 shrink-0">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl lg:text-4xl font-bold tracking-tight text-on-surface font-tabular-data">
              {formatINR(ltp)}
            </span>
            <div
              className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-sm font-bold font-tabular-data ${
                isPositive
                  ? "bg-tertiary-container/15 text-tertiary"
                  : "bg-error/10 text-error"
              }`}
            >
              {isPositive ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span>{isPositive ? "+" : ""}{change.toFixed(2)}</span>
              <span>({isPositive ? "+" : ""}{changePct.toFixed(2)}%)</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant font-mono">
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${data.quote.status === "LIVE" ? "bg-tertiary animate-pulse" : "bg-outline"}`} />
              <span>{data.quote.status}</span>
            </span>
            <span>•</span>
            <span>Provider: {data.provider}</span>
          </div>
        </div>
      </div>

      {/* 3. Key Day Range Statistics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-space-sm">
        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/20">
          <span className="text-[11px] text-outline font-medium block">Day Open</span>
          <span className="text-sm font-bold text-on-surface font-tabular-data">
            {data.quote.open ? formatINR(data.quote.open) : "—"}
          </span>
        </div>
        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/20">
          <span className="text-[11px] text-outline font-medium block">Day High</span>
          <span className="text-sm font-bold text-tertiary font-tabular-data">
            {data.quote.high ? formatINR(data.quote.high) : "—"}
          </span>
        </div>
        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/20">
          <span className="text-[11px] text-outline font-medium block">Day Low</span>
          <span className="text-sm font-bold text-error font-tabular-data">
            {data.quote.low ? formatINR(data.quote.low) : "—"}
          </span>
        </div>
        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/20">
          <span className="text-[11px] text-outline font-medium block">Prev Close</span>
          <span className="text-sm font-bold text-on-surface font-tabular-data">
            {data.quote.close ? formatINR(data.quote.close) : "—"}
          </span>
        </div>
        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/20">
          <span className="text-[11px] text-outline font-medium block">52-Week High</span>
          <span className="text-sm font-bold text-on-surface font-tabular-data">
            {data.quote.year_high ? formatINR(data.quote.year_high) : "—"}
          </span>
        </div>
        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/20">
          <span className="text-[11px] text-outline font-medium block">52-Week Low</span>
          <span className="text-sm font-bold text-on-surface font-tabular-data">
            {data.quote.year_low ? formatINR(data.quote.year_low) : "—"}
          </span>
        </div>
      </div>

      {/* 4. Chart & Market Breadth Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg">
        {/* Left: Interactive Index Chart (8 cols) */}
        <div className="xl:col-span-8 flex flex-col gap-space-sm bg-surface-container-lowest p-space-md rounded-2xl border border-outline-variant/20 shadow-sm">
          {/* Chart Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-space-md pb-space-xs border-b border-surface-container">
            <div className="flex items-center gap-space-xs bg-surface-container-low p-0.5 rounded-lg border border-outline-variant/20 text-xs">
              {(["1D", "1W", "1M", "3M", "6M", "1Y", "ALL"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded transition-colors font-semibold ${
                    timeframe === tf
                      ? "bg-surface-container-lowest text-primary shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-surface-container-low p-0.5 rounded-lg border border-outline-variant/20 text-xs">
              <button
                onClick={() => setChartType("area")}
                className={`px-2 py-1 rounded transition-colors font-medium ${
                  chartType === "area"
                    ? "bg-surface-container-lowest text-primary shadow-xs"
                    : "text-on-surface-variant"
                }`}
              >
                Mountain / Line
              </button>
              <button
                onClick={() => setChartType("candle")}
                className={`px-2 py-1 rounded transition-colors font-medium ${
                  chartType === "candle"
                    ? "bg-surface-container-lowest text-primary shadow-xs"
                    : "text-on-surface-variant"
                }`}
              >
                Candlestick
              </button>
            </div>
          </div>

          <ChartContainer
            symbol={data.index.symbol}
            timeframe={timeframe === "ALL" ? "1Y" : timeframe}
            chartType={chartType}
            height={420}
          />
        </div>

        {/* Right: Real Market Breadth & Sector Diversification (4 cols) */}
        <div className="xl:col-span-4 flex flex-col gap-space-md">
          {/* Market Breadth Card */}
          <div className="bg-surface-container-lowest p-space-md rounded-2xl border border-outline-variant/20 shadow-sm flex flex-col gap-space-sm">
            <div className="flex items-center justify-between border-b border-surface-container pb-space-xs">
              <div className="flex items-center gap-1.5 font-semibold text-sm text-on-surface">
                <BarChart2 className="w-4 h-4 text-primary" />
                <span>Market Breadth</span>
              </div>
              <span className="text-[11px] text-outline font-mono">
                A/D Ratio: {data.breadth.advance_decline_ratio}:1
              </span>
            </div>

            {/* Breadth Progress Bar */}
            <div className="w-full h-3 rounded-full bg-surface-container overflow-hidden flex">
              <div
                className="bg-tertiary h-full transition-all duration-500"
                style={{
                  width: `${(data.breadth.advances / Math.max(1, data.breadth.total_constituents)) * 100}%`,
                }}
              />
              <div
                className="bg-outline/30 h-full transition-all duration-500"
                style={{
                  width: `${(data.breadth.unchanged / Math.max(1, data.breadth.total_constituents)) * 100}%`,
                }}
              />
              <div
                className="bg-error h-full transition-all duration-500"
                style={{
                  width: `${(data.breadth.declines / Math.max(1, data.breadth.total_constituents)) * 100}%`,
                }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1 font-tabular-data">
              <div className="p-2 rounded-xl bg-tertiary-container/10 border border-tertiary/20">
                <span className="text-[10px] text-tertiary font-semibold block">Advances</span>
                <span className="text-base font-bold text-tertiary">{data.breadth.advances}</span>
              </div>
              <div className="p-2 rounded-xl bg-surface-container border border-outline-variant/20">
                <span className="text-[10px] text-outline font-semibold block">Unchanged</span>
                <span className="text-base font-bold text-on-surface">{data.breadth.unchanged}</span>
              </div>
              <div className="p-2 rounded-xl bg-error/10 border border-error/20">
                <span className="text-[10px] text-error font-semibold block">Declines</span>
                <span className="text-base font-bold text-error">{data.breadth.declines}</span>
              </div>
            </div>
          </div>

          {/* Top Sector Weight Distribution */}
          <div className="bg-surface-container-lowest p-space-md rounded-2xl border border-outline-variant/20 shadow-sm flex flex-col gap-space-sm flex-1">
            <div className="flex items-center justify-between border-b border-surface-container pb-space-xs">
              <div className="flex items-center gap-1.5 font-semibold text-sm text-on-surface">
                <PieChart className="w-4 h-4 text-primary" />
                <span>Sector Allocation</span>
              </div>
              <span className="text-[11px] text-outline font-mono">Top Sectors</span>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              {sectorBreakdown.slice(0, 6).map((sec) => (
                <div key={sec.sector} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-on-surface font-medium truncate max-w-[180px]">{sec.sector}</span>
                    <span className="font-mono font-semibold text-primary">{sec.weight}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${Math.min(100, sec.weight * 2.5)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Index Constituents Table */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-outline-variant/20 flex flex-col gap-space-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
          <div>
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              <span>Index Constituents ({data.constituents.length})</span>
            </h2>
            <p className="text-xs text-on-surface-variant">
              Live quotes and index weight representation of all member companies
            </p>
          </div>

          {/* Search & Sector Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-outline absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search constituent..."
                className="pl-8 pr-3 py-1.5 text-xs bg-surface-container-low border border-outline-variant/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary w-40 sm:w-48 text-on-surface"
              />
            </div>

            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="py-1.5 px-2 text-xs bg-surface-container-low border border-outline-variant/20 rounded-lg text-on-surface focus:outline-none"
            >
              {sectorList.map((s) => (
                <option key={s} value={s}>
                  {s === "ALL" ? "All Sectors" : s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-surface-container font-tabular-data">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-on-surface-variant border-b border-surface-container font-semibold">
              <tr>
                <th
                  onClick={() => {
                    setSortBy("symbol");
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  }}
                  className="py-2.5 px-3 cursor-pointer hover:text-on-surface"
                >
                  Company & Symbol
                </th>
                <th className="py-2.5 px-3">Sector</th>
                <th
                  onClick={() => {
                    setSortBy("weight");
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  }}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-on-surface"
                >
                  Weight (%)
                </th>
                <th
                  onClick={() => {
                    setSortBy("ltp");
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  }}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-on-surface"
                >
                  LTP (₹)
                </th>
                <th
                  onClick={() => {
                    setSortBy("change");
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  }}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-on-surface"
                >
                  Day Change
                </th>
                <th className="py-2.5 px-3 text-center">Trade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/60">
              {filteredConstituents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-outline">
                    No constituent companies match your search or filter.
                  </td>
                </tr>
              ) : (
                filteredConstituents.map((item) => (
                  <tr
                    key={item.symbol}
                    className="hover:bg-surface-container-low/60 transition-colors group"
                  >
                    <td className="py-2.5 px-3">
                      <Link
                        href={`/stocks/${item.symbol}`}
                        className="flex flex-col group-hover:text-primary transition-colors"
                      >
                        <span className="font-semibold text-on-surface group-hover:text-primary">
                          {item.symbol}
                        </span>
                        <span className="text-[11px] text-on-surface-variant truncate max-w-[200px]">
                          {item.name}
                        </span>
                      </Link>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant text-[11px]">
                        {item.sector}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-primary">
                      {item.weight.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-on-surface">
                      {item.ltp > 0 ? formatINR(item.ltp) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`inline-flex items-center gap-0.5 font-semibold ${
                          item.is_positive ? "text-tertiary" : "text-error"
                        }`}
                      >
                        {item.is_positive ? "+" : ""}
                        {item.change_percent.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() =>
                          setOrderModalStock({
                            symbol: item.symbol,
                            stockId: item.symbol,
                            stockName: item.name,
                            defaultSide: "BUY",
                          })
                        }
                        className="px-2.5 py-1 text-[11px] font-semibold rounded bg-primary text-on-primary hover:bg-primary/90 transition-colors shadow-2xs"
                      >
                        Trade
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Market News Section */}
      <NewsHeadlinesFeed
        title={`${data.index.name} & Market News`}
        maxItems={5}
      />

      {/* 7. Modal: Order Pad */}
      {orderModalStock && (
        <OrderPadModal
          isOpen={true}
          onClose={() => setOrderModalStock(null)}
          symbol={orderModalStock.symbol}
          stockId={orderModalStock.stockId}
          stockName={orderModalStock.stockName}
          defaultSide={orderModalStock.defaultSide}
        />
      )}
    </div>
  );
}
