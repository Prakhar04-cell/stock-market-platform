"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import { TableRowSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatStockPrice, formatINR } from "@/lib/formatters";
import {
  Layers,
  RefreshCw,
  Ban,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";

interface OrderExecution {
  id: string;
  execution_price: number;
  executed_quantity: number;
  trade_charges: number;
  executed_at: string;
}

interface OrderItem {
  id: string;
  user_id: string;
  stock_id: string;
  symbol: string;
  stock_name?: string;
  order_type: string;
  side: "BUY" | "SELL";
  quantity: number;
  price?: number;
  stop_price?: number;
  status: "OPEN" | "FILLED" | "CANCELLED" | "REJECTED" | "PENDING";
  filled_quantity: number;
  average_execution_price?: number;
  created_at: string;
  executions?: OrderExecution[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [activeTab, setActiveTab] = useState<"ALL" | "OPEN" | "FILLED" | "CANCELLED" | "REJECTED">("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<OrderItem[]>("/api/v1/orders");
      setOrders(data || []);
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 12000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Cancel this open limit order? Reserved virtual margin will be unlocked.")) return;
    setCancellingId(orderId);
    try {
      await apiRequest(`/api/v1/orders/${orderId}`, { method: "DELETE" });
      await loadOrders();
    } catch (err: any) {
      alert(err.message || "Failed to cancel order");
    } finally {
      setCancellingId(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "OPEN") return o.status === "OPEN" || o.status === "PENDING";
    if (activeTab === "FILLED") return o.status === "FILLED";
    if (activeTab === "CANCELLED") return o.status === "CANCELLED";
    if (activeTab === "REJECTED") return o.status === "REJECTED";
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "FILLED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#ECFDF5] text-[#00A86B] border border-[#A7F3D0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00A86B]" />
            FILLED
          </span>
        );
      case "OPEN":
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            OPEN
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-[#6B7280] border border-[#E5E7EB]">
            CANCELLED
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#FEF2F2] text-[#EF4444] border border-[#FECACA]">
            REJECTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-[#6B7280]">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E5E7EB] p-4 sm:p-5 rounded-xl shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-[#111827] tracking-tight">
            Order Book &amp; Executions
          </h1>
          <p className="text-xs text-[#6B7280]">
            Audit history of paper market orders, limit fills, and margin releases
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#00A86B] text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00A86B] animate-pulse" />
            <span>Virtual Execution Engine</span>
          </div>

          <button
            onClick={loadOrders}
            className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#4B5563] hover:text-[#111827] hover:bg-[#F7F8FA]"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: "ALL", label: "All", count: orders.length },
          { id: "OPEN", label: "Open", count: orders.filter((o) => o.status === "OPEN" || o.status === "PENDING").length },
          { id: "FILLED", label: "Filled", count: orders.filter((o) => o.status === "FILLED").length },
          { id: "CANCELLED", label: "Cancelled", count: orders.filter((o) => o.status === "CANCELLED").length },
          { id: "REJECTED", label: "Rejected", count: orders.filter((o) => o.status === "REJECTED").length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]"
                : "bg-white text-[#6B7280] border border-[#E5E7EB] hover:text-[#111827] hover:bg-[#F7F8FA]"
            }`}
          >
            <span>{tab.label}</span>
            <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-[#4B5563]">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <table className="w-full text-xs">
              <tbody>
                <TableRowSkeleton cols={8} />
                <TableRowSkeleton cols={8} />
                <TableRowSkeleton cols={8} />
                <TableRowSkeleton cols={8} />
              </tbody>
            </table>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={Layers}
              title={`No ${activeTab !== "ALL" ? activeTab.toLowerCase() : ""} orders found`}
              description="Execute paper orders to populate your audit book with real-time simulated executions."
              action={
                <Link
                  href="/stocks/RELIANCE"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4F46E5] text-white text-xs font-bold hover:bg-[#4338CA] shadow-xs transition-colors"
                >
                  <span>Explore Markets &amp; Trade</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              }
            />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F7F8FA] border-b border-[#E5E7EB] text-[#6B7280] text-[11px] font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Instrument</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                    <th className="py-3 px-4 text-right">Price</th>
                    <th className="py-3 px-4 text-right">Order Value</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {filteredOrders.map((order) => {
                    const price = Number(order.average_execution_price || order.price || 0);
                    const qty = Number(order.quantity);
                    const orderValue = price * qty;
                    const isBuy = order.side === "BUY";
                    const isOpen = order.status === "OPEN" || order.status === "PENDING";

                    return (
                      <tr key={order.id} className="hover:bg-[#F7F8FA] transition-colors">
                        {/* Instrument */}
                        <td className="py-3 px-4">
                          <Link
                            href={`/stocks/${encodeURIComponent(order.symbol || order.stock_id)}`}
                            className="font-bold text-xs text-[#111827] hover:text-[#4F46E5] transition-colors"
                          >
                            {order.symbol || order.stock_id}
                          </Link>
                          <span className="text-[10px] text-[#6B7280] block font-mono">
                            ID: {order.id.slice(0, 8)}
                          </span>
                        </td>

                        {/* Side & Type */}
                        <td className="py-3 px-4 font-semibold">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold ${
                              isBuy ? "bg-[#ECFDF5] text-[#00A86B]" : "bg-[#FEF2F2] text-[#EF4444]"
                            }`}
                          >
                            {order.side}
                          </span>
                          <span className="ml-1.5 text-[11px] text-[#4B5563] font-mono">
                            {order.order_type}
                          </span>
                        </td>

                        {/* Quantity */}
                        <td className="py-3 px-4 text-right financial-num-sm font-bold text-[#111827] tabular-nums">
                          {order.filled_quantity} / {order.quantity}
                        </td>

                        {/* Price */}
                        <td className="py-3 px-4 text-right financial-num-sm font-bold text-[#111827] tabular-nums">
                          {formatStockPrice(price)}
                        </td>

                        {/* Order Value */}
                        <td className="py-3 px-4 text-right financial-num-sm font-extrabold text-[#111827] tabular-nums">
                          {formatINR(orderValue)}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          {getStatusBadge(order.status)}
                        </td>

                        {/* Time */}
                        <td className="py-3 px-4 text-[#6B7280] font-mono text-[11px]">
                          {new Date(order.created_at).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          {isOpen ? (
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              disabled={cancellingId === order.id}
                              className="px-2.5 py-1 rounded bg-[#FEF2F2] border border-[#FECACA] text-[#EF4444] text-[11px] font-bold hover:bg-[#FEE2E2] transition-colors"
                            >
                              {cancellingId === order.id ? "Cancelling..." : "Cancel"}
                            </button>
                          ) : (
                            <span className="text-[11px] text-[#9CA3AF]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-[#E5E7EB]">
              {filteredOrders.map((order) => {
                const price = Number(order.average_execution_price || order.price || 0);
                const qty = Number(order.quantity);
                const orderValue = price * qty;
                const isBuy = order.side === "BUY";
                const isOpen = order.status === "OPEN" || order.status === "PENDING";

                return (
                  <div key={order.id} className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#111827]">
                          {order.symbol || order.stock_id}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            isBuy ? "bg-[#ECFDF5] text-[#00A86B]" : "bg-[#FEF2F2] text-[#EF4444]"
                          }`}
                        >
                          {order.side}
                        </span>
                        <span className="text-[10.5px] font-mono text-[#6B7280]">
                          {order.order_type}
                        </span>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-[#6B7280] block font-sans">Quantity</span>
                        <span className="financial-num-sm font-bold text-[#111827]">{order.quantity}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#6B7280] block font-sans">Price</span>
                        <span className="financial-num-sm font-bold text-[#111827]">{formatStockPrice(price)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#6B7280] block font-sans">Total Value</span>
                        <span className="financial-num-sm font-extrabold text-[#111827]">{formatINR(orderValue)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#6B7280] block font-sans">Date</span>
                        <span className="text-[#6B7280] text-[10.5px]">
                          {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    {isOpen && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={cancellingId === order.id}
                        className="w-full py-1.5 rounded-lg bg-[#FEF2F2] text-[#EF4444] border border-[#FECACA] text-xs font-bold"
                      >
                        Cancel Limit Order
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
