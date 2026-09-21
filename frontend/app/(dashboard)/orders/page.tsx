"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Layers, Eye, Ban, CheckCircle2, Clock, RefreshCw, ShieldCheck } from "lucide-react";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("ALL");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest("/api/v1/orders");
      setOrders(data || []);
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const handleCancel = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this pending limit order? Locked margin will be released back to your virtual wallet.")) return;
    try {
      await apiRequest(`/api/v1/orders/${orderId}`, { method: "DELETE" });
      await loadOrders();
      if (selectedOrder?.id === orderId) {
        setIsDetailOpen(false);
      }
    } catch (err: any) {
      alert(err.message || "Failed to cancel order");
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "OPEN") return o.status === "OPEN" || o.status === "PENDING";
    if (activeTab === "FILLED") return o.status === "FILLED";
    if (activeTab === "CANCELLED") return o.status === "CANCELLED";
    return true;
  });

  return (
    <div className="space-y-5 select-none">
      {/* Page Header */}
      <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Paper Order Book &amp; Executions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail of simulated orders, live execution fills, and virtual margin locks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success">PAPER TRADING ENGINE</Badge>
          <button
            onClick={loadOrders}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            title="Refresh Order Book"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Order Tabs */}
      <Tabs
        tabs={[
          { id: "ALL", label: "All Orders", count: orders.length },
          { id: "OPEN", label: "Open / Pending", count: orders.filter((o) => o.status === "OPEN" || o.status === "PENDING").length },
          { id: "FILLED", label: "Executed", count: orders.filter((o) => o.status === "FILLED").length },
          { id: "CANCELLED", label: "Cancelled", count: orders.filter((o) => o.status === "CANCELLED").length },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Orders Table */}
      {filteredOrders.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Limit Price</TableHead>
              <TableHead className="text-right">Avg Fill Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Placed At</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-bold text-slate-900">
                  <Link href={`/stocks/${order.symbol || "STOCK"}`} className="hover:text-indigo-600">
                    {order.symbol || "STOCK"}
                  </Link>
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      order.side === "BUY"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {order.side}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs text-slate-600">
                  {order.order_type}
                </TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold text-slate-800">
                  {order.quantity}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-slate-800">
                  {order.price ? formatCurrency(order.price) : "Market Best"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs font-bold text-slate-900">
                  {order.average_execution_price ? formatCurrency(order.average_execution_price) : "--"}
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      order.status === "FILLED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : order.status === "CANCELLED"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                    }`}
                  >
                    {order.status}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-slate-500 font-mono">
                  {formatDateTime(order.created_at)}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsDetailOpen(true);
                      }}
                      className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
                      title="Inspect Order Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {(order.status === "OPEN" || order.status === "PENDING") && (
                      <button
                        onClick={() => handleCancel(order.id)}
                        className="p-1 rounded text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200"
                        title="Cancel Pending Limit Order"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="py-14 text-center rounded-2xl border border-dashed border-slate-200 bg-white shadow-card flex flex-col items-center justify-center">
          <div className="p-3 rounded-full bg-slate-100 text-slate-400 mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No orders logged yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
            Simulated paper orders and execution history will appear here.
          </p>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Go to Trading Terminal
          </Link>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Order: ${selectedOrder.symbol || "STOCK"}`}
          description={`ID: ${selectedOrder.id}`}
        >
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 text-[11px] block">Order Side</span>
                <span className="font-bold text-slate-900">{selectedOrder.side}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Status</span>
                <span className="font-bold text-slate-900">{selectedOrder.status}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Order Type</span>
                <span className="font-mono text-slate-800">{selectedOrder.order_type}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Quantity</span>
                <span className="font-mono text-slate-800">{selectedOrder.quantity}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Execution Price</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedOrder.average_execution_price ? formatCurrency(selectedOrder.average_execution_price) : "--"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Filled Quantity</span>
                <span className="font-mono text-slate-800">{selectedOrder.filled_quantity || 0}</span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button size="sm" variant="ghost" onClick={() => setIsDetailOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
