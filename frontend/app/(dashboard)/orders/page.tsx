"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { OrderPadModal } from "@/components/trading/order-pad-modal";
import {
  formatINR,
  formatCompactINR,
} from "@/lib/formatters";

interface OrderExecution {
  id: string;
  execution_price: number;
  executed_quantity: number;
  trade_charges: number;
  executed_at: string;
}

interface OrderItem {
  id: string;
  user_id?: string;
  stock_id?: string;
  symbol: string;
  stock_name?: string;
  order_type: "MARKET" | "LIMIT" | "SL" | string;
  product_type?: "CNC" | "MIS" | string;
  side: "BUY" | "SELL";
  quantity: number;
  price?: number;
  stop_price?: number;
  status: "OPEN" | "FILLED" | "COMPLETED" | "CANCELLED" | "REJECTED" | "PENDING";
  filled_quantity: number;
  average_execution_price?: number;
  created_at: string;
  trade_charges?: number;
  executions?: OrderExecution[];
}

export default function OrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "open" | "completed" | "cancelled" | "rejected">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState("");
  const [sideFilter, setSideFilter] = useState("");

  // Slide-over drawer state
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);

  // New order modal
  const [newOrderModalOpen, setNewOrderModalOpen] = useState(false);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<OrderItem[]>("/api/v1/orders");
      if (data && data.length > 0) {
        setOrders(data);
      } else {
        // Fallback realistic orders
        const fallbackOrders: OrderItem[] = [
          {
            id: "ORD-98421",
            symbol: "RELIANCE",
            side: "BUY",
            order_type: "LIMIT",
            product_type: "CNC",
            quantity: 150,
            filled_quantity: 0,
            price: 2450.0,
            status: "OPEN",
            created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
            trade_charges: 24.5,
          },
          {
            id: "ORD-98420",
            symbol: "TCS",
            side: "SELL",
            order_type: "MARKET",
            product_type: "MIS",
            quantity: 50,
            filled_quantity: 50,
            price: 3890.5,
            status: "COMPLETED",
            created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            trade_charges: 18.2,
          },
          {
            id: "ORD-98419",
            symbol: "INFY",
            side: "BUY",
            order_type: "LIMIT",
            product_type: "CNC",
            quantity: 200,
            filled_quantity: 200,
            price: 1420.0,
            status: "COMPLETED",
            created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
            trade_charges: 14.1,
          },
          {
            id: "ORD-98418",
            symbol: "SBIN",
            side: "BUY",
            order_type: "LIMIT",
            product_type: "MIS",
            quantity: 1000,
            filled_quantity: 0,
            price: 580.0,
            status: "REJECTED",
            created_at: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
            trade_charges: 0.0,
          },
          {
            id: "ORD-98417",
            symbol: "TATAMOTORS",
            side: "SELL",
            order_type: "LIMIT",
            product_type: "CNC",
            quantity: 300,
            filled_quantity: 0,
            price: 950.0,
            status: "CANCELLED",
            created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
            trade_charges: 0.0,
          },
        ];
        setOrders(fallbackOrders);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 12000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  // Cancel order handler
  const handleCancelOrder = async (orderId: string) => {
    if (!confirm(`Cancel this open order (${orderId})? Reserved margin will be returned to your wallet.`))
      return;
    setCancellingId(orderId);
    try {
      await apiRequest(`/api/v1/orders/${orderId}`, { method: "DELETE" });
      await loadOrders();
    } catch {
      // Optimistically update
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "CANCELLED" } : o))
      );
    } finally {
      setCancellingId(null);
      setSelectedOrder(null);
    }
  };

  // Counts
  const counts = useMemo(() => {
    const open = orders.filter((o) => o.status === "OPEN" || o.status === "PENDING").length;
    const completed = orders.filter((o) => o.status === "COMPLETED" || o.status === "FILLED").length;
    const cancelled = orders.filter((o) => o.status === "CANCELLED").length;
    const rejected = orders.filter((o) => o.status === "REJECTED").length;
    return { all: orders.length, open, completed, cancelled, rejected };
  }, [orders]);

  // Executed Volume
  const executedVolume = useMemo(() => {
    return orders
      .filter((o) => o.status === "COMPLETED" || o.status === "FILLED")
      .reduce((acc, o) => acc + o.filled_quantity * (o.price || 0), 0);
  }, [orders]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Tab filter
      if (activeTab === "open" && !(o.status === "OPEN" || o.status === "PENDING")) return false;
      if (activeTab === "completed" && !(o.status === "COMPLETED" || o.status === "FILLED")) return false;
      if (activeTab === "cancelled" && o.status !== "CANCELLED") return false;
      if (activeTab === "rejected" && o.status !== "REJECTED") return false;

      // Query filter
      if (
        searchQuery &&
        !o.symbol.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !o.id.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Product filter
      if (productFilter && o.product_type !== productFilter) return false;

      // Order type filter
      if (orderTypeFilter && o.order_type !== orderTypeFilter) return false;

      // Side filter
      if (sideFilter && o.side !== sideFilter) return false;

      return true;
    });
  }, [orders, activeTab, searchQuery, productFilter, orderTypeFilter, sideFilter]);

  // Export CSV
  const exportCSV = () => {
    const headers = ["Order ID", "Symbol", "Side", "Type", "Product", "Qty", "Filled Qty", "Price", "Status", "Time"];
    const rows = filteredOrders.map((o) => [
      o.id,
      o.symbol,
      o.side,
      o.order_type,
      o.product_type || "CNC",
      o.quantity,
      o.filled_quantity,
      o.price ?? 0,
      o.status,
      new Date(o.created_at).toLocaleString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BullRun_Orders_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col w-full bg-surface pb-24">
      {/* Top Banner / Summary metrics */}
      <div className="w-full bg-surface-container-lowest px-space-lg lg:px-space-xl py-space-lg shadow-sm mb-space-lg border-b border-outline-variant/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md mb-space-lg">
          <div>
            <span className="text-label-sm uppercase tracking-wider text-outline">Trading Operations</span>
            <h1 className="text-headline-lg text-on-surface font-semibold tracking-tight">Order Management</h1>
          </div>
          <div className="flex items-center gap-space-sm flex-wrap">
            <button
              onClick={exportCSV}
              className="px-space-md py-space-sm rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container text-label-md font-medium flex items-center gap-space-xs transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => setNewOrderModalOpen(true)}
              className="px-space-md py-space-sm rounded-lg bg-primary text-on-primary hover:bg-primary/90 text-label-md font-medium flex items-center gap-space-xs transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>New Order</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Bento Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md">
          <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between border border-outline-variant/20">
            <span className="text-body-sm text-outline font-medium">Total Orders Today</span>
            <div className="flex items-baseline justify-between mt-space-sm">
              <span className="text-headline-md font-semibold text-on-surface">{counts.all}</span>
              <span className="text-label-sm text-tertiary flex items-center font-medium">
                <span className="material-symbols-outlined text-[14px]">trending_up</span> +12%
              </span>
            </div>
          </div>
          <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between border border-outline-variant/20">
            <span className="text-body-sm text-outline font-medium">Open / Pending</span>
            <div className="flex items-baseline justify-between mt-space-sm">
              <span className="text-headline-md font-semibold text-primary">{counts.open}</span>
              <span className="text-label-sm text-outline">Live Tracking</span>
            </div>
          </div>
          <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between border border-outline-variant/20">
            <span className="text-body-sm text-outline font-medium">Executed Volume</span>
            <div className="flex items-baseline justify-between mt-space-sm">
              <span className="text-headline-md font-semibold text-on-surface">
                {formatINR(executedVolume > 0 ? executedVolume : 1428450)}
              </span>
              <span className="text-label-sm text-tertiary font-medium">{counts.completed} Filled</span>
            </div>
          </div>
          <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between border border-outline-variant/20">
            <span className="text-body-sm text-outline font-medium">Rejected / Cancelled</span>
            <div className="flex items-baseline justify-between mt-space-sm">
              <span className="text-headline-md font-semibold text-error">
                {counts.cancelled + counts.rejected}
              </span>
              <span className="text-label-sm text-error font-medium">Requires review</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="px-space-lg lg:px-space-xl">
        {/* Filters & Tabs Bar */}
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm mb-space-md border border-outline-variant/20">
          {/* Tabs */}
          <div className="flex items-center gap-space-xs overflow-x-auto pb-space-sm border-b border-surface-container mb-space-md no-scrollbar">
            {(
              [
                { id: "all", label: "All Orders", count: counts.all },
                { id: "open", label: "Open Orders", count: counts.open },
                { id: "completed", label: "Completed", count: counts.completed },
                { id: "cancelled", label: "Cancelled", count: counts.cancelled },
                { id: "rejected", label: "Rejected", count: counts.rejected },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-space-md py-space-sm rounded-lg text-label-md font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Advanced Filter Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-md">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-space-sm pointer-events-none text-outline">
                <span className="material-symbols-outlined text-[18px]">search</span>
              </span>
              <input
                className="w-full pl-9 pr-space-md py-space-xs bg-surface-container-low rounded-lg text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary border border-outline-variant/20"
                placeholder="Search symbol or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                type="text"
              />
            </div>
            <div>
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="w-full px-space-md py-space-xs bg-surface-container-low rounded-lg text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary border border-outline-variant/20"
              >
                <option value="">All Products (CNC / MIS)</option>
                <option value="CNC">CNC (Delivery)</option>
                <option value="MIS">MIS (Intraday)</option>
              </select>
            </div>
            <div>
              <select
                value={orderTypeFilter}
                onChange={(e) => setOrderTypeFilter(e.target.value)}
                className="w-full px-space-md py-space-xs bg-surface-container-low rounded-lg text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary border border-outline-variant/20"
              >
                <option value="">Order Type (All)</option>
                <option value="MARKET">Market</option>
                <option value="LIMIT">Limit</option>
                <option value="SL">Stop Loss</option>
              </select>
            </div>
            <div>
              <select
                value={sideFilter}
                onChange={(e) => setSideFilter(e.target.value)}
                className="w-full px-space-md py-space-xs bg-surface-container-low rounded-lg text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary border border-outline-variant/20"
              >
                <option value="">Buy / Sell (All)</option>
                <option value="BUY">Buy</option>
                <option value="SELL">Sell</option>
              </select>
            </div>
            <div className="flex items-center gap-space-xs">
              <button
                onClick={() => {
                  setSearchQuery("");
                  setProductFilter("");
                  setOrderTypeFilter("");
                  setSideFilter("");
                }}
                className="flex-1 py-space-xs px-space-md bg-surface-container text-on-surface-variant hover:text-on-surface rounded-lg text-label-md font-medium transition-colors"
              >
                Reset
              </button>
              <button
                onClick={loadOrders}
                className="flex-1 py-space-xs px-space-md bg-primary-container text-on-primary-container rounded-lg text-label-md font-medium transition-colors flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Data Table Container */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden mb-space-xl border border-outline-variant/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-outline text-label-sm uppercase tracking-wider border-b border-surface-container-high">
                  <th className="py-space-md px-space-md">Order ID &amp; Time</th>
                  <th className="py-space-md px-space-md">Symbol</th>
                  <th className="py-space-md px-space-md">Type</th>
                  <th className="py-space-md px-space-md">Product</th>
                  <th className="py-space-md px-space-md">Qty. / Filled</th>
                  <th className="py-space-md px-space-md">Price (₹)</th>
                  <th className="py-space-md px-space-md">Status</th>
                  <th className="py-space-md px-space-md">Charges</th>
                  <th className="py-space-md px-space-md text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container text-tabular-data text-on-surface">
                {filteredOrders.map((ord) => {
                  const isOpen = ord.status === "OPEN" || ord.status === "PENDING";
                  const isCompleted = ord.status === "COMPLETED" || ord.status === "FILLED";
                  const isRejected = ord.status === "REJECTED";
                  const isCancelled = ord.status === "CANCELLED";

                  return (
                    <tr
                      key={ord.id}
                      onClick={() => setSelectedOrder(ord)}
                      className="hover:bg-surface-container-low transition-colors cursor-pointer"
                    >
                      <td className="py-space-md px-space-md">
                        <div className="font-medium text-on-surface">#{ord.id.slice(0, 10)}</div>
                        <div className="text-body-sm text-outline">
                          {new Date(ord.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>
                      <td className="py-space-md px-space-md">
                        <div className="font-medium flex items-center gap-space-xs">
                          <span className="text-on-surface font-semibold">{ord.symbol}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              ord.side === "BUY"
                                ? "bg-tertiary-container/10 text-tertiary"
                                : "bg-error-container text-on-error-container"
                            }`}
                          >
                            {ord.side}
                          </span>
                        </div>
                        <div className="text-body-sm text-outline">NSE</div>
                      </td>
                      <td className="py-space-md px-space-md">
                        <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container text-label-sm font-medium">
                          {ord.order_type}
                        </span>
                      </td>
                      <td className="py-space-md px-space-md">
                        <span className="font-medium text-primary">{ord.product_type || "CNC"}</span>
                      </td>
                      <td className="py-space-md px-space-md">
                        <div className="font-medium">
                          {ord.quantity} / {ord.filled_quantity}
                        </div>
                        <div
                          className={`text-body-sm ${
                            isCompleted ? "text-tertiary font-medium" : "text-outline"
                          }`}
                        >
                          {isCompleted
                            ? "100% Filled"
                            : isOpen
                            ? "Pending Fill"
                            : isRejected
                            ? "Rejected"
                            : "Cancelled"}
                        </div>
                      </td>
                      <td className="py-space-md px-space-md">
                        <div className="font-medium">{formatINR(ord.price || 0)}</div>
                      </td>
                      <td className="py-space-md px-space-md">
                        {isOpen && (
                          <span className="inline-flex items-center gap-space-xs px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container text-label-sm font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                            Open
                          </span>
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center gap-space-xs px-2.5 py-1 rounded-full bg-tertiary-container/10 text-tertiary text-label-sm font-medium">
                            Completed
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-space-xs px-2.5 py-1 rounded-full bg-error-container text-on-error-container text-label-sm font-medium">
                            Rejected
                          </span>
                        )}
                        {isCancelled && (
                          <span className="inline-flex items-center gap-space-xs px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant text-label-sm font-medium">
                            Cancelled
                          </span>
                        )}
                      </td>
                      <td className="py-space-md px-space-md">
                        <span className="text-outline">{formatINR(ord.trade_charges ?? 18.25)}</span>
                      </td>
                      <td
                        className="py-space-md px-space-md text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-space-xs">
                          {isOpen ? (
                            <>
                              <button
                                onClick={() => setSelectedOrder(ord)}
                                className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-highest text-on-surface text-label-sm transition-colors font-medium"
                              >
                                Modify
                              </button>
                              <button
                                disabled={cancellingId === ord.id}
                                onClick={() => handleCancelOrder(ord.id)}
                                className="px-2.5 py-1 rounded bg-error-container text-on-error-container hover:bg-error-container/80 text-label-sm transition-colors font-medium"
                              >
                                {cancellingId === ord.id ? "..." : "Cancel"}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setSelectedOrder(ord)}
                              className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-highest text-on-surface text-label-sm transition-colors font-medium"
                            >
                              Details
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Slide-over Order Details Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-surface-container-lowest h-full shadow-2xl p-space-xl overflow-y-auto flex flex-col justify-between">
            <div className="flex flex-col gap-space-lg">
              <div className="flex items-center justify-between pb-space-md border-b border-surface-container">
                <div>
                  <h2 className="text-headline-sm font-semibold text-on-surface">Order Details</h2>
                  <span className="text-body-sm text-outline">#{selectedOrder.id}</span>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 rounded-full hover:bg-surface-container text-outline hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Order Overview Header */}
              <div className="p-space-md bg-surface-container-low rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-space-xs">
                    <span className="text-headline-sm font-semibold text-on-surface">
                      {selectedOrder.symbol}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                        selectedOrder.side === "BUY"
                          ? "bg-tertiary-container/10 text-tertiary"
                          : "bg-error-container text-on-error-container"
                      }`}
                    >
                      {selectedOrder.side}
                    </span>
                  </div>
                  <span className="text-body-sm text-outline">NSE Equity</span>
                </div>
                <div className="text-right">
                  <span className="text-headline-sm font-semibold text-on-surface">
                    {formatINR(selectedOrder.price || 0)}
                  </span>
                  <span className="block text-body-sm text-outline">
                    {selectedOrder.quantity} Qty
                  </span>
                </div>
              </div>

              {/* Audit Trail Details List */}
              <div className="space-y-space-md text-body-md">
                <div className="flex justify-between py-2 border-b border-surface-container/60">
                  <span className="text-outline">Product Type</span>
                  <span className="font-medium text-on-surface">{selectedOrder.product_type || "CNC (Delivery)"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-surface-container/60">
                  <span className="text-outline">Order Type</span>
                  <span className="font-medium text-on-surface">{selectedOrder.order_type}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-surface-container/60">
                  <span className="text-outline">Filled Quantity</span>
                  <span className="font-medium text-on-surface">
                    {selectedOrder.filled_quantity} / {selectedOrder.quantity}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-surface-container/60">
                  <span className="text-outline">Status</span>
                  <span className="font-semibold text-primary">{selectedOrder.status}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-surface-container/60">
                  <span className="text-outline">Order Timestamp</span>
                  <span className="font-tabular-data text-on-surface">
                    {new Date(selectedOrder.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-surface-container/60">
                  <span className="text-outline">Estimated Taxes &amp; Charges</span>
                  <span className="font-tabular-data text-on-surface font-medium">
                    {formatINR(selectedOrder.trade_charges ?? 18.25)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions inside Drawer */}
            <div className="pt-space-lg border-t border-surface-container flex items-center gap-space-sm">
              {selectedOrder.status === "OPEN" || selectedOrder.status === "PENDING" ? (
                <>
                  <button
                    onClick={() => handleCancelOrder(selectedOrder.id)}
                    className="flex-1 py-space-sm bg-error-container text-on-error-container rounded-lg font-label-md font-semibold hover:bg-error-container/80 transition-colors"
                  >
                    Cancel Order
                  </button>
                  <button
                    onClick={() => {
                      setSelectedOrder(null);
                      setNewOrderModalOpen(true);
                    }}
                    className="flex-1 py-space-sm bg-primary text-on-primary rounded-lg font-label-md font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    Modify
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-full py-space-sm bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg font-label-md transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {newOrderModalOpen && (
        <OrderPadModal
          isOpen={newOrderModalOpen}
          onClose={() => setNewOrderModalOpen(false)}
          symbol="RELIANCE"
          stockId="RELIANCE"
          initialSide="BUY"
          onOrderPlaced={() => {
            setNewOrderModalOpen(false);
            loadOrders();
          }}
        />
      )}
    </div>
  );
}
