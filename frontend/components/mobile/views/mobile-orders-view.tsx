"use client";

import React, { useState, useMemo } from "react";
import { MobileSearch } from "../mobile-search";
import { MobileTabBar } from "../mobile-tab-bar";
import { MobileOrderRow } from "../mobile-order-row";
import { MobileEmptyState, MobileLoadingState } from "../mobile-states";

export interface MobileOrderData {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  order_type: string;
  product_type?: string;
  quantity: number;
  filled_quantity?: number;
  price?: number;
  average_execution_price?: number;
  status: string;
  created_at: string;
}

interface MobileOrdersViewProps {
  orders: MobileOrderData[];
  isLoading?: boolean;
  onNewOrder: () => void;
  onCancelOrder: (id: string) => void;
  cancellingId?: string | null;
}

export function MobileOrdersView({
  orders,
  isLoading = false,
  onNewOrder,
  onCancelOrder,
  cancellingId,
}: MobileOrdersViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "open" | "completed" | "cancelled" | "rejected">("all");

  // Tab counts
  const counts = useMemo(() => {
    const open = orders.filter((o) => ["OPEN", "PENDING", "TRIGGER_PENDING"].includes(o.status.toUpperCase())).length;
    const completed = orders.filter((o) => ["FILLED", "COMPLETED"].includes(o.status.toUpperCase())).length;
    const cancelled = orders.filter((o) => o.status.toUpperCase() === "CANCELLED").length;
    const rejected = orders.filter((o) => o.status.toUpperCase() === "REJECTED").length;
    return { open, completed, cancelled, rejected };
  }, [orders]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    let list = [...orders];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((o) => o.symbol.toLowerCase().includes(q) || o.id.toLowerCase().includes(q));
    }

    if (activeTab === "open") {
      list = list.filter((o) => ["OPEN", "PENDING", "TRIGGER_PENDING"].includes(o.status.toUpperCase()));
    } else if (activeTab === "completed") {
      list = list.filter((o) => ["FILLED", "COMPLETED"].includes(o.status.toUpperCase()));
    } else if (activeTab === "cancelled") {
      list = list.filter((o) => o.status.toUpperCase() === "CANCELLED");
    } else if (activeTab === "rejected") {
      list = list.filter((o) => o.status.toUpperCase() === "REJECTED");
    }

    return list;
  }, [orders, searchQuery, activeTab]);

  return (
    <div className="flex flex-col w-full pb-12">
      {/* 1. Top Summary & Search Header */}
      <div className="px-space-md pt-space-md pb-space-sm flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <h1 className="font-headline-md text-on-surface font-semibold">Order Book</h1>
            <p className="text-body-sm text-on-surface-variant truncate">
              Track, modify, and manage your trading history in real-time.
            </p>
          </div>
          <button
            onClick={onNewOrder}
            className="flex items-center gap-space-xs px-3 py-2 rounded-lg bg-primary text-on-primary font-label-md shadow-sm active:scale-95 transition-all shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add_chart</span>
            <span>New Order</span>
          </button>
        </div>

        {/* 2. Search & Filter Bar */}
        <MobileSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by symbol (e.g., RELIANCE, TCS)..."
          showCalendar={true}
          onFilterClick={() => {}}
          onCalendarClick={() => {}}
        />

        {/* 3. Tabs for Order Categories */}
        <MobileTabBar
          tabs={[
            { id: "all", label: "All Orders" },
            { id: "open", label: "Open", badge: counts.open },
            { id: "completed", label: "Completed" },
            { id: "cancelled", label: "Cancelled" },
            { id: "rejected", label: "Rejected" },
          ]}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as any)}
          variant="pill"
        />
      </div>

      {/* 4. Orders List Content */}
      <div className="px-space-md flex flex-col gap-space-sm pt-space-xs">
        {isLoading && filteredOrders.length === 0 ? (
          <MobileLoadingState message="Fetching order book records..." />
        ) : filteredOrders.length === 0 ? (
          <MobileEmptyState
            icon="receipt_long"
            title="No orders found"
            description={
              searchQuery
                ? `No orders matching "${searchQuery}".`
                : `No ${activeTab === "all" ? "" : activeTab} orders available in your account.`
            }
            actionText="Place New Order"
            onAction={onNewOrder}
          />
        ) : (
          filteredOrders.map((ord) => (
            <MobileOrderRow
              key={ord.id}
              id={ord.id}
              symbol={ord.symbol}
              side={ord.side}
              orderType={ord.order_type}
              productType={ord.product_type}
              quantity={ord.quantity}
              filledQuantity={ord.filled_quantity}
              price={ord.price}
              avgExecutionPrice={ord.average_execution_price}
              status={ord.status}
              createdAt={ord.created_at}
              onCancel={onCancelOrder}
              isCancelling={cancellingId === ord.id}
            />
          ))
        )}
      </div>

      {/* 5. Footer info & Export */}
      <div className="px-space-md pt-space-md text-center">
        <span className="text-body-sm text-outline">
          Showing orders from the last 30 days. Need older records?{" "}
          <span className="text-primary font-medium hover:underline cursor-pointer">
            Export CSV
          </span>
        </span>
      </div>
    </div>
  );
}
