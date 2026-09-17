"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { MetricCard } from "@/components/ui/metric-card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer } from "@/components/ui/chart-container";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ProviderStatusBanner } from "@/components/trading/provider-status-banner";
import { Briefcase, PieChart, TrendingUp, Layers, AlertCircle, ArrowUpRight } from "lucide-react";

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPortfolio() {
      setIsLoading(true);
      try {
        const data = await apiRequest("/api/v1/portfolio");
        setPortfolio(data);
      } catch {
        // Fallback
      } finally {
        setIsLoading(false);
      }
    }
    loadPortfolio();
  }, []);

  return (
    <div className="space-y-5 select-none">
      <ProviderStatusBanner />

      {/* Page Header */}
      <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Portfolio Holdings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Simulated equity positions, invested capital basis, and asset allocation.
          </p>
        </div>
        <Badge variant="unconfigured">PHASE 1 SIMULATION</Badge>
      </div>

      {/* Financial Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <MetricCard
          title="Total Invested Capital"
          value={formatCurrency(portfolio?.total_invested_value || 0)}
          subtitle="Sum of cost basis"
          icon={Layers}
        />
        <MetricCard
          title="Current Portfolio Value"
          value={<span className="text-slate-400 font-mono text-lg font-normal">Market Disconnected</span>}
          subtitle="Awaiting Phase 2 Live Stream"
          icon={TrendingUp}
        />
        <MetricCard
          title="Available Cash Balance"
          value={formatCurrency(portfolio?.available_balance ?? 100000.0)}
          subtitle="Ready to deploy margin"
          icon={Briefcase}
        />
        <MetricCard
          title="Unrealized P&L"
          value={<span className="text-slate-400 font-mono text-lg font-normal">₹ --</span>}
          subtitle="Pending live quotes"
          icon={ArrowUpRight}
        />
      </div>

      {/* Portfolio Chart Section (Section 8) */}
      <ChartContainer symbol="PORTFOLIO" isPortfolio={true} />

      {/* Holdings Section */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4 shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Current Holdings (0)</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">NSE Cash Segment</span>
        </div>

        {portfolio?.holdings && portfolio.holdings.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instrument</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Avg Price</TableHead>
                <TableHead className="text-right">Current Price</TableHead>
                <TableHead className="text-right">Current Value</TableHead>
                <TableHead className="text-right">Total P&amp;L</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {portfolio.holdings.map((h: any) => (
                <TableRow key={h.id}>
                  <TableCell className="font-bold text-slate-900">{h.symbol}</TableCell>
                  <TableCell className="text-right font-mono">{h.quantity}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(h.average_buy_price)}</TableCell>
                  <TableCell className="text-right font-mono text-slate-400">Waiting</TableCell>
                  <TableCell className="text-right font-mono text-slate-400">--</TableCell>
                  <TableCell className="text-right font-mono text-slate-400">--</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          /* Section 25 Empty State */
          <div className="py-12 text-center flex flex-col items-center justify-center">
            <div className="p-3 rounded-full bg-slate-100 text-slate-400 mb-3">
              <Briefcase className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Your portfolio will appear here</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Add stocks to your watchlist and execute simulated orders to begin building your paper portfolio.
            </p>
            <Link
              href="/watchlist"
              className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              Explore Watchlist
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
