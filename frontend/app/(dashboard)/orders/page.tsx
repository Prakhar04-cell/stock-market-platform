"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { ProviderStatusBanner } from "@/components/trading/provider-status-banner";
import { Layers, Eye, Ban, CheckCircle2, Clock } from "lucide-react";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("ALL");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest("/api/v1/orders");
      setOrders(data);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleCancel = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
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
      <ProviderStatusBanner />

      {/* Page Header */}
      <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Order Book &amp; Executions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail of simulated orders, fill prices, and order lifecycle states.
          </p>
        </div>
        <Badge variant="unconfigured">ENGINE OFFLINE</Badge>
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
              <TableHead>Status</TableHead>
              <TableHead>Placed At</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-bold text-slate-900">
                  {order.symbol || "STOCK"}
                </TableCell>
                <TableCell>
                  <Badge variant={order.side === "BUY" ? "success" : "danger"}>
                    {order.side}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs text-slate-600">
                  {order.order_type}
                </TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold text-slate-800">
                  {order.quantity}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-slate-800">
                  {order.price ? formatCurrency(order.price) : "Market"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      order.status === "FILLED"
                        ? "success"
                        : order.status === "CANCELLED"
                        ? "danger"
                        : "unconfigured"
                    }
                  >
                    {order.status}
                  </Badge>
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
                        title="Cancel Order"
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
        /* Section 25 Empty State */
        <div className="py-14 text-center rounded-2xl border border-dashed border-slate-200 bg-white shadow-card flex flex-col items-center justify-center">
          <div className="p-3 rounded-full bg-slate-100 text-slate-400 mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No orders yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
            Simulated paper orders and execution history will be logged here.
          </p>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
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
