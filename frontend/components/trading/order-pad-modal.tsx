"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { apiRequest } from "@/lib/api-client";
import { useMarketWebSocket, WsPriceUpdate } from "@/lib/market-ws";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

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
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT">("MARKET");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("2500.00");
  const [triggerPrice, setTriggerPrice] = useState("2480.00");
  const [ltp, setLtp] = useState<number | null>(null);
  const [showChargesDetails, setShowChargesDetails] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setSide(defaultSide);
  }, [defaultSide]);

  // Fetch live market quote for symbol when modal opens
  useEffect(() => {
    if (!isOpen || !symbol) return;
    setSuccessMessage(null);
    setErrorMessage(null);

    async function fetchQuote() {
      try {
        const quote = await apiRequest(`/api/v1/market/quote/${encodeURIComponent(symbol)}`);
        if (quote && quote.ltp) {
          const numLtp = typeof quote.ltp === "string" ? parseFloat(quote.ltp) : quote.ltp;
          setLtp(numLtp);
          setPrice(numLtp.toFixed(2));
        }
      } catch {
        // Leave previous or null
      }
    }

    fetchQuote();
  }, [isOpen, symbol]);

  // Subscribe to live websocket updates while modal is open
  useMarketWebSocket(isOpen ? symbol : undefined, (update: WsPriceUpdate) => {
    const val = typeof update.ltp === "string" ? parseFloat(update.ltp) : update.ltp;
    if (val) {
      setLtp(val);
      if (orderType === "MARKET") {
        setPrice(val.toFixed(2));
      }
    }
  });

  const numQty = Math.max(1, parseFloat(quantity) || 1);
  const effectivePrice = orderType === "MARKET" ? (ltp || parseFloat(price) || 0) : (parseFloat(price) || 0);
  const turnover = numQty * effectivePrice;

  // Regulatory simulated charges calculation matching backend charge engine
  const chargesBreakdown = useMemo(() => {
    if (turnover <= 0) {
      return {
        brokerage: 0,
        stt: 0,
        turnoverCharges: 0,
        stampDuty: 0,
        sebiCharges: 0,
        gst: 0,
        totalCharges: 0,
      };
    }

    const brokerage = Math.min(20, turnover * 0.0005);
    const stt = side === "BUY" ? turnover * 0.001 : turnover * 0.001; // Delivery 0.1%
    const turnoverCharges = turnover * 0.0000345; // NSE 0.00345%
    const stampDuty = side === "BUY" ? turnover * 0.00015 : 0; // 0.015% on BUY
    const sebiCharges = turnover * 0.000001; // ₹10 per crore
    const gst = (brokerage + turnoverCharges) * 0.18; // 18% on brokerage + turnover
    const totalCharges = brokerage + stt + turnoverCharges + stampDuty + sebiCharges + gst;

    return {
      brokerage,
      stt,
      turnoverCharges,
      stampDuty,
      sebiCharges,
      gst,
      totalCharges,
    };
  }, [turnover, side]);

  const totalRequired = side === "BUY" ? turnover + chargesBreakdown.totalCharges : turnover - chargesBreakdown.totalCharges;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload: any = {
        stock_id: stockId,
        order_type: orderType,
        side: side,
        quantity: numQty,
      };

      if (orderType === "LIMIT" || orderType === "STOP_LIMIT") {
        payload.price = parseFloat(price);
      }
      if (orderType === "STOP" || orderType === "STOP_LIMIT") {
        payload.stop_price = parseFloat(triggerPrice);
      }

      const res = await apiRequest("/api/v1/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.status === "FILLED") {
        setSuccessMessage(`Order Executed! ${side} ${numQty} ${symbol} filled at ₹${parseFloat(res.average_execution_price || effectivePrice).toFixed(2)}.`);
      } else {
        setSuccessMessage(`Order Placed! Limit ${side} ${numQty} ${symbol} @ ₹${price} is now ${res.status}.`);
      }

      if (onOrderPlaced) {
        onOrderPlaced();
      }

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to place paper order. Please check available balance/holdings.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${side} Order Pad`}
      description={`${symbol} • ${stockName}`}
      className="max-w-md bg-white text-slate-900 border border-slate-200 shadow-dropdown"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Paper Trading Banner */}
        <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <div className="text-xs text-indigo-900">
              <span className="font-bold">Paper Trading Simulation</span>
              <p className="text-[11px] text-indigo-700">Virtual balance • No real money used</p>
            </div>
          </div>
          <Badge variant="success">VIRTUAL</Badge>
        </div>

        {/* Success / Error Banners */}
        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

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

          <div>
            <Input
              label={orderType === "MARKET" ? "Market Price (LTP)" : "Limit Price (₹)"}
              type="number"
              step="0.05"
              disabled={orderType === "MARKET"}
              value={orderType === "MARKET" ? (ltp ? `₹${ltp.toFixed(2)}` : "Market Best") : price}
              onChange={(e) => setPrice(e.target.value)}
            />
            {ltp && orderType === "MARKET" && (
              <span className="text-[10px] text-emerald-600 font-mono font-medium block mt-1">
                Streaming LTP: ₹{ltp.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {(orderType === "STOP" || orderType === "STOP_LIMIT") && (
          <Input
            label="Trigger Price (₹)"
            type="number"
            step="0.05"
            value={triggerPrice}
            onChange={(e) => setTriggerPrice(e.target.value)}
            hint="Order will trigger when market touches this price"
          />
        )}

        {/* Order Value & Itemized Charges Summary */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Estimated Value</span>
            <span className="font-mono font-semibold text-slate-700">{formatCurrency(turnover)}</span>
          </div>

          <div className="flex justify-between items-center text-slate-500">
            <button
              type="button"
              onClick={() => setShowChargesDetails(!showChargesDetails)}
              className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors"
            >
              <span>Regulatory Taxes &amp; Brokerage</span>
              {showChargesDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <span className="font-mono font-semibold text-slate-700">
              {formatCurrency(chargesBreakdown.totalCharges)}
            </span>
          </div>

          {/* Collapsible itemized charges */}
          {showChargesDetails && (
            <div className="pt-2 pb-1 border-t border-slate-200/60 space-y-1 text-[11px] text-slate-500 font-mono">
              <div className="flex justify-between">
                <span>Brokerage (₹20 or 0.05%)</span>
                <span>{formatCurrency(chargesBreakdown.brokerage)}</span>
              </div>
              <div className="flex justify-between">
                <span>STT / CTT (0.1%)</span>
                <span>{formatCurrency(chargesBreakdown.stt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Exchange Turnover Charges</span>
                <span>{formatCurrency(chargesBreakdown.turnoverCharges)}</span>
              </div>
              {side === "BUY" && (
                <div className="flex justify-between">
                  <span>Stamp Duty (0.015%)</span>
                  <span>{formatCurrency(chargesBreakdown.stampDuty)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>SEBI Turnover Fees</span>
                <span>{formatCurrency(chargesBreakdown.sebiCharges)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST (18% on Brokerage+Turnover)</span>
                <span>{formatCurrency(chargesBreakdown.gst)}</span>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
            <span>{side === "BUY" ? "Total Margin Required" : "Estimated Net Credit"}</span>
            <span className="font-mono text-sm">{formatCurrency(totalRequired)}</span>
          </div>
        </div>

        {/* Action Button: Fully Functional Virtual Paper Execution */}
        <div className="pt-1">
          <Button
            type="submit"
            isLoading={isSubmitting}
            className={`w-full text-white font-bold text-xs py-2.5 shadow-sm transition-colors ${
              side === "BUY"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            Place Paper {side} Order ({numQty} Shares)
          </Button>
          <p className="text-[10px] text-center text-slate-400 mt-2 font-mono">
            Guaranteed safe simulation • Orders are executed virtually against live quotes
          </p>
        </div>
      </form>
    </Modal>
  );
}
