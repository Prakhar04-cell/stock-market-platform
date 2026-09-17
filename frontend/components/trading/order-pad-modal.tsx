"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { AlertCircle, Lock } from "lucide-react";

export interface OrderPadModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockId: string;
  symbol: string;
  stockName: string;
  defaultSide?: "BUY" | "SELL";
  onOrderPlaced?: () => void;
}

export function OrderPadModal({
  isOpen,
  onClose,
  stockId,
  symbol,
  stockName,
  defaultSide = "BUY",
  onOrderPlaced,
}: OrderPadModalProps) {
  const [side, setSide] = useState<"BUY" | "SELL">(defaultSide);
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT">("LIMIT");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("2500.00");
  const [triggerPrice, setTriggerPrice] = useState("2480.00");

  const numQty = parseFloat(quantity) || 0;
  const numPrice = orderType === "MARKET" ? 2500.0 : parseFloat(price) || 0;
  const estimatedValue = numQty * numPrice;
  const estimatedCharges = estimatedValue > 0 ? 20.0 : 0.0;
  const totalAmount = estimatedValue + estimatedCharges;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${side} Order Pad`}
      description={`${symbol} • ${stockName}`}
      className="max-w-md bg-white text-slate-900 border border-slate-200 shadow-dropdown"
    >
      <div className="space-y-4">
        {/* Phase 1 Disconnected Execution Notice */}
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            <span className="font-bold block">Live Execution Disconnected</span>
            Broker trading gateway is not connected in Phase 1. Real orders cannot be placed.
          </div>
        </div>

        {/* Buy / Sell Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setSide("BUY")}
            className={`py-2 rounded-lg text-xs font-bold transition-all ${
              side === "BUY"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            BUY
          </button>
          <button
            type="button"
            onClick={() => setSide("SELL")}
            className={`py-2 rounded-lg text-xs font-bold transition-all ${
              side === "SELL"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            SELL
          </button>
        </div>

        {/* Order Type Chips */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Order Type
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {(["MARKET", "LIMIT", "STOP", "STOP_LIMIT"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setOrderType(type)}
                className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  orderType === type
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {type === "STOP_LIMIT" ? "SL-M" : type}
              </button>
            ))}
          </div>
        </div>

        {/* Form Fields: Quantity, Price, Trigger Price */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Quantity"
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />

          <Input
            label="Price (₹)"
            type="number"
            step="0.05"
            disabled={orderType === "MARKET"}
            value={orderType === "MARKET" ? "Market Best" : price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>

        {(orderType === "STOP" || orderType === "STOP_LIMIT") && (
          <Input
            label="Trigger Price (₹)"
            type="number"
            step="0.05"
            value={triggerPrice}
            onChange={(e) => setTriggerPrice(e.target.value)}
            hint="Order will be triggered when market hits this price"
          />
        )}

        {/* Order Value Summary */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Estimated Value</span>
            <span className="font-mono font-medium text-slate-700">{formatCurrency(estimatedValue)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Estimated Brokerage & Taxes</span>
            <span className="font-mono font-medium text-slate-700">{formatCurrency(estimatedCharges)}</span>
          </div>
          <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
            <span>Total Capital Required</span>
            <span className="font-mono text-sm">{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {/* Action Button: Strictly Disabled in Phase 1 */}
        <div className="pt-2">
          <Button
            type="button"
            disabled={true}
            className="w-full bg-slate-200 text-slate-500 cursor-not-allowed hover:bg-slate-200"
          >
            <Lock className="w-3.5 h-3.5 mr-2" />
            Trading Unavailable (Connect Provider)
          </Button>
          <p className="text-[11px] text-center text-slate-400 mt-2">
            Broker execution will be activated in Phase 2 with verified exchange APIs.
          </p>
        </div>
      </div>
    </Modal>
  );
}
