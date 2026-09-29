"use client";

import React from "react";
import { formatINR, formatStockPrice } from "@/lib/formatters";

interface MobileOrderRowProps {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  orderType: string;
  productType?: string;
  quantity: number;
  filledQuantity?: number;
  price?: number;
  avgExecutionPrice?: number;
  status: string;
  createdAt: string;
  onCancel?: (id: string) => void;
  onModify?: (id: string) => void;
  isCancelling?: boolean;
}

export function MobileOrderRow({
  id,
  symbol,
  side,
  orderType,
  productType = "CNC",
  quantity,
  filledQuantity,
  price,
  avgExecutionPrice,
  status,
  createdAt,
  onCancel,
  onModify,
  isCancelling,
}: MobileOrderRowProps) {
  const isBuy = side.toUpperCase() === "BUY";
  const stUpper = status.toUpperCase();

  const isOpen = stUpper === "OPEN" || stUpper === "PENDING" || stUpper === "TRIGGER_PENDING";
  const isFilled = stUpper === "FILLED" || stUpper === "COMPLETED";
  const isCancelled = stUpper === "CANCELLED";
  const isRejected = stUpper === "REJECTED";

  const orderTime = (() => {
    try {
      const d = new Date(createdAt);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return "--:--:--";
    }
  })();

  const shortId = id.startsWith("ORD-") ? id : `#ORD-${id.slice(0, 6)}`;

  return (
    <div className="bg-surface-container-low rounded-xl p-space-md shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col gap-space-sm transition-all hover:shadow-md">
      {/* Top Header: Side, Symbol, ID, Status Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-sm min-w-0">
          <span
            className={`px-2 py-0.5 rounded font-label-md text-[11px] font-bold ${
              isBuy
                ? "bg-secondary-container text-on-secondary-container"
                : "bg-error-container text-on-error-container"
            }`}
          >
            {side}
          </span>
          <span className="font-headline-sm text-on-surface font-tabular-data font-semibold truncate">
            {symbol}
          </span>
          <span className="text-body-sm text-outline font-tabular-data truncate">
            {shortId}
          </span>
        </div>

        {/* Status Pill */}
        {isOpen && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-md text-[11px] shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Pending Limit
          </span>
        )}
        {isFilled && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-[11px] shrink-0 font-medium">
            Completed
          </span>
        )}
        {isCancelled && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-md text-[11px] shrink-0">
            Cancelled
          </span>
        )}
        {isRejected && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-error-container text-on-error-container font-label-md text-[11px] shrink-0">
            Rejected
          </span>
        )}
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-4 gap-space-sm pt-1 pb-1 text-tabular-data text-xs sm:text-body-sm">
        <div>
          <span className="block text-body-sm text-outline font-body-md text-[11px]">Type / Prod</span>
          <span className="font-medium text-on-surface">
            {orderType} / {productType === "CNC" ? "Delivery" : "Intraday"}
          </span>
        </div>
        <div>
          <span className="block text-body-sm text-outline font-body-md text-[11px]">Qty</span>
          <span className="font-medium text-on-surface">
            {filledQuantity !== undefined && filledQuantity > 0 ? `${filledQuantity}/` : ""}
            {quantity} Shrs
          </span>
        </div>
        <div>
          <span className="block text-body-sm text-outline font-body-md text-[11px]">
            {isFilled ? "Exec. Price" : "Price"}
          </span>
          <span className="font-medium text-on-surface">
            {isFilled && avgExecutionPrice
              ? formatStockPrice(avgExecutionPrice)
              : price
              ? formatStockPrice(price)
              : "Market"}
          </span>
        </div>
        <div className="text-right">
          <span className="block text-body-sm text-outline font-body-md text-[11px]">Time</span>
          <span className="font-medium text-on-surface">{orderTime}</span>
        </div>
      </div>

      {/* Bottom Footer & Contextual Actions */}
      {isOpen && (
        <div className="flex items-center justify-between pt-1 border-t border-surface-container">
          <span className="text-body-sm text-outline text-[11px]">
            Trigger: Good Till Cancelled
          </span>
          <div className="flex gap-space-sm">
            <button
              onClick={() => onModify?.(id)}
              className="px-3 py-1 rounded-lg bg-surface-container text-on-surface font-label-md text-body-sm hover:bg-surface-container-high transition-colors"
            >
              Modify
            </button>
            <button
              disabled={isCancelling}
              onClick={() => onCancel?.(id)}
              className="px-3 py-1 rounded-lg bg-error-container text-on-error-container font-label-md text-body-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              {isCancelling ? "Cancelling..." : "Cancel"}
            </button>
          </div>
        </div>
      )}

      {isFilled && (
        <div className="flex items-center justify-between pt-1 border-t border-surface-container text-body-sm">
          <span className="text-outline text-[11px]">Executed via NSE Exchange</span>
          <span className="text-secondary font-label-md text-[11px] font-bold">
            Filled 100%
          </span>
        </div>
      )}

      {isCancelled && (
        <div className="flex items-center justify-between pt-1 border-t border-surface-container text-body-sm">
          <span className="text-outline text-[11px]">Cancelled by User</span>
          <span className="text-outline text-[11px]">Expired session</span>
        </div>
      )}

      {isRejected && (
        <div className="flex items-center justify-between pt-1 border-t border-surface-container text-body-sm">
          <span className="text-error text-[11px] truncate max-w-[200px]">
            Reason: Insufficient margin balance
          </span>
          <span className="text-primary font-label-md text-[11px] cursor-pointer">
            Details
          </span>
        </div>
      )}
    </div>
  );
}
