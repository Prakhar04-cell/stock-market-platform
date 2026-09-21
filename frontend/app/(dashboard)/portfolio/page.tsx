"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { MetricCard } from "@/components/ui/metric-card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer } from "@/components/ui/chart-container";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { OrderPadModal } from "@/components/trading/order-pad-modal";
import { useMarketWebSocket, WsPriceUpdate } from "@/lib/market-ws";
import {
  Briefcase,
  PieChart,
  TrendingUp,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

interface HoldingItem {
  id: string;
  stock_id: string;
  symbol: string;
  quantity: number;
  average_buy_price: number;
  invested_value: number;
  current_price?: number;
  current_value?: number;
  unrealized_pnl?: number;
  unrealized_pnl_percent?: number;
}

interface PortfolioData {
  total_invested_value: number;
  current_portfolio_value: number;
  total_unrealized_pnl: number;
  total_unrealized_pnl_percent: number;
  cash_balance: number;
  available_balance: number;
  locked_balance: number;
  holdings: HoldingItem[];
}

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<{ id: string; symbol: string; name: string; side: "BUY" | "SELL" } | null>(null);

  const loadPortfolio = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<PortfolioData>("/api/v1/portfolio");
      setPortfolio(data);
      // Initialize live prices from holdings current_price
      if (data?.holdings) {
        const prices: Record<string, number> = {};
        data.holdings.forEach((h) => {
          if (h.current_price) {
            prices[h.symbol] = Number(h.current_price);
          }
        });
        setLivePrices((prev) => ({ ...prev, ...prices }));
      }
    } catch {
      // Fallback default state
      setPortfolio({
        total_invested_value: 0,
        current_portfolio_value: 0,
        total_unrealized_pnl: 0,
        total_unrealized_pnl_percent: 0,
        cash_balance: 100000.0,
        available_balance: 100000.0,
        locked_balance: 0,
        holdings: [],
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  // Subscribe to live websocket updates for all holding symbols
  useEffect(() => {
    if (!portfolio?.holdings || portfolio.holdings.length === 0) return;

    const unsubs: (() => void)[] = [];
    portfolio.holdings.forEach((h) => {
      const unsub = (window as any).tradexWsUnsub = () => {}; // fallback
      // Use marketWs
      const u = require("@/lib/market-ws").marketWs.subscribe(h.symbol, (update: WsPriceUpdate) => {
        const ltp = Number(update.ltp);
        if (ltp) {
          setLivePrices((prev) => ({
            ...prev,
            [update.symbol]: ltp,
          }));
        }
      });
      unsubs.push(u);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [portfolio?.holdings]);

  // Compute live portfolio totals based on real-time prices
  const computedHoldings = useMemo(() => {
    if (!portfolio?.holdings) return [];

    return portfolio.holdings.map((h) => {
      const qty = Number(h.quantity);
      const avgPrice = Number(h.average_buy_price);
      const invested = qty * avgPrice;
      const curPrice = livePrices[h.symbol] ?? (h.current_price ? Number(h.current_price) : avgPrice);
      const curVal = qty * curPrice;
      const pnl = curVal - invested;
      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

      return {
        ...h,
        quantity: qty,
        average_buy_price: avgPrice,
        invested_value: invested,
        current_price: curPrice,
        current_value: curVal,
        unrealized_pnl: pnl,
        unrealized_pnl_percent: pnlPct,
      };
    });
  }, [portfolio?.holdings, livePrices]);

  const totalInvested = useMemo(() => {
    return computedHoldings.reduce((sum, h) => sum + h.invested_value, 0);
  }, [computedHoldings]);

  const totalCurrentValue = useMemo(() => {
    return computedHoldings.reduce((sum, h) => sum + (h.current_value || 0), 0);
  }, [computedHoldings]);

  const totalPnl = totalCurrentValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const isTotalPnlPositive = totalPnl >= 0;

  const handleTrade = (h: HoldingItem, side: "BUY" | "SELL") => {
    setSelectedStock({
      id: h.stock_id,
      symbol: h.symbol,
      name: h.symbol,
      side: side,
    });
    setOrderModalOpen(true);
  };

  return (
    <div className="space-y-5 select-none">
      {/* Page Header */}
      <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Paper Portfolio Holdings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Simulated equity positions, live valuations against official Upstox market ticks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success">VIRTUAL SIMULATION</Badge>
          <button
            onClick={loadPortfolio}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            title="Refresh Portfolio"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Financial Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <MetricCard
          title="Total Invested Capital"
          value={formatCurrency(totalInvested)}
          subtitle="Sum of cost basis"
          icon={Layers}
        />
        <MetricCard
          title="Current Portfolio Value"
          value={formatCurrency(totalCurrentValue)}
          subtitle="Real-time equity value"
          icon={TrendingUp}
        />
        <MetricCard
          title="Available Cash Balance"
          value={formatCurrency(portfolio?.available_balance ?? 100000.0)}
          subtitle="Virtual balance ready to deploy"
          icon={Briefcase}
        />
        <MetricCard
          title="Unrealized P&L"
          value={
            <span className={`font-mono font-bold ${isTotalPnlPositive ? "text-emerald-600" : "text-rose-600"}`}>
              {isTotalPnlPositive ? "+" : ""}
              {formatCurrency(totalPnl)} ({isTotalPnlPositive ? "+" : ""}{totalPnlPct.toFixed(2)}%)
            </span>
          }
          subtitle="Live unrealized profit / loss"
          icon={isTotalPnlPositive ? ArrowUpRight : ArrowDownRight}
        />
      </div>

      {/* Portfolio Chart Section */}
      <ChartContainer symbol="NIFTY 50" isPortfolio={true} />

      {/* Holdings Section */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4 shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Current Holdings ({computedHoldings.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">NSE Delivery Segment</span>
        </div>

        {computedHoldings.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instrument</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Avg Price</TableHead>
                <TableHead className="text-right">Live Price (LTP)</TableHead>
                <TableHead className="text-right">Current Value</TableHead>
                <TableHead className="text-right">Total P&amp;L</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {computedHoldings.map((h) => {
                const isPos = (h.unrealized_pnl || 0) >= 0;
                return (
                  <TableRow key={h.id || h.symbol}>
                    <TableCell className="font-bold text-slate-900">
                      <Link href={`/stocks/${h.symbol}`} className="hover:text-indigo-600">
                        {h.symbol}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-slate-800">
                      {h.quantity}
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-600">
                      {formatCurrency(h.average_buy_price)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-900">
                      {h.current_price ? formatCurrency(h.current_price) : "--"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-slate-800">
                      {formatCurrency(h.current_value || 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={`font-bold ${isPos ? "text-emerald-600" : "text-rose-600"}`}>
                        {isPos ? "+" : ""}
                        {formatCurrency(h.unrealized_pnl || 0)} ({isPos ? "+" : ""}
                        {h.unrealized_pnl_percent?.toFixed(2)}%)
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleTrade(h, "BUY")}
                          className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                        >
                          BUY
                        </button>
                        <button
                          onClick={() => handleTrade(h, "SELL")}
                          className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                        >
                          SELL
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="py-12 text-center flex flex-col items-center justify-center">
            <div className="p-3 rounded-full bg-slate-100 text-slate-400 mb-3">
              <Briefcase className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Your portfolio will appear here</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Select stocks from the search bar or watchlist and place simulated paper orders to build your equity positions.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Explore Markets
            </Link>
          </div>
        )}
      </div>

      {/* Order Pad Modal */}
      {selectedStock && (
        <OrderPadModal
          isOpen={orderModalOpen}
          onClose={() => setOrderModalOpen(false)}
          stockId={selectedStock.id}
          symbol={selectedStock.symbol}
          stockName={selectedStock.name}
          defaultSide={selectedStock.side}
          onOrderPlaced={loadPortfolio}
        />
      )}
    </div>
  );
}
