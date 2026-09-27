"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Modal } from "@/components/ui/modal";
import { normalizeStockSymbol } from "@/lib/utils";
import { apiRequest } from "@/lib/api-client";
import { useMarketWebSocket, WsPriceUpdate } from "@/lib/market-ws";
import { formatINR, formatStockPrice } from "@/lib/formatters";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Check,
  X,
} from "lucide-react";

export interface OrderPadProps {
  stockId: string;
  symbol: string;
  stockName?: string;
  defaultSide?: "BUY" | "SELL";
  onOrderPlaced?: () => void;
  embedded?: boolean;
  onClose?: () => void;
}

export function OrderPad({
  stockId,
  symbol,
  stockName,
  defaultSide = "BUY",
  onOrderPlaced,
  embedded = false,
  onClose,
}: OrderPadProps) {
  const cleanSymbol = normalizeStockSymbol(symbol);
  const [side, setSide] = useState<"BUY" | "SELL">(defaultSide);
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<string>("");
  const [ltp, setLtp] = useState<number | null>(null);
  const [availableBalance, setAvailableBalance] = useState<number>(100000);
  const [showChargesDetails, setShowChargesDetails] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync defaultSide
  useEffect(() => {
    setSide(defaultSide);
  }, [defaultSide]);

  // Load wallet balance
  const loadWallet = useCallback(async () => {
    try {
      const data = await apiRequest("/api/v1/wallet");
      if (data && data.available_balance !== undefined) {
        setAvailableBalance(Number(data.available_balance));
      }
    } catch {
      // Fallback
    }
  }, []);

  // Fetch initial quote
  const fetchQuote = useCallback(async () => {
    if (!cleanSymbol) return;
    try {
      const quote = await apiRequest(`/api/v1/market/quote/${encodeURIComponent(cleanSymbol)}`);
      if (quote && quote.ltp) {
        const val = Number(quote.ltp);
        setLtp(val);
        if (!price || orderType === "MARKET") {
          setPrice(val.toFixed(2));
        }
      }
    } catch {
      // Leave previous or null
    }
  }, [cleanSymbol, orderType, price]);

  useEffect(() => {
    loadWallet();
    fetchQuote();
  }, [loadWallet, fetchQuote]);

  // Subscribe to live websocket updates
  useMarketWebSocket(cleanSymbol, (update: WsPriceUpdate) => {
    const val = typeof update.ltp === "string" ? parseFloat(update.ltp) : update.ltp;
    if (val && !isNaN(val)) {
      setLtp(val);
      if (orderType === "MARKET") {
        setPrice(val.toFixed(2));
      }
    }
  });

  const effectivePrice = orderType === "MARKET" ? (ltp || parseFloat(price) || 0) : (parseFloat(price) || 0);
  const turnover = quantity * effectivePrice;

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
    const stt = turnover * 0.001; // Delivery 0.1%
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

  const totalAmount = side === "BUY" ? turnover + chargesBreakdown.totalCharges : turnover - chargesBreakdown.totalCharges;

  const handleQuantityStep = (step: number) => {
    setQuantity((prev) => Math.max(1, prev + step));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setConfirmedOrder(null);

    // Honest check: If market price is unavailable for market order
    if (orderType === "MARKET" && (!effectivePrice || effectivePrice <= 0)) {
      setErrorMessage("Live market price unavailable. Please try again.");
      setIsSubmitting(false);
      return;
    }

    try {
      let targetStockId = stockId;
      if (!targetStockId || targetStockId.includes("%") || targetStockId === symbol) {
        targetStockId = cleanSymbol;
      }

      const payload: any = {
        stock_id: targetStockId,
        order_type: orderType,
        side: side,
        quantity: quantity,
      };

      if (orderType === "LIMIT") {
        payload.price = parseFloat(price);
      }

      const res = await apiRequest("/api/v1/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setConfirmedOrder(res);
      await loadWallet();

      if (onOrderPlaced) {
        onOrderPlaced();
      }
    } catch (err: any) {
      const msg = err.message || "Failed to place paper order. Please verify virtual cash balance or holdings.";
      if (msg.includes("MARKET_DATA_UNAVAILABLE")) {
        setErrorMessage("Live market price unavailable. Please try again.");
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`bg-white text-[#111827] select-none ${
        embedded
          ? "border border-[#E5E7EB] rounded-xl p-5 shadow-xs"
          : "p-1"
      }`}
    >
      {/* 1. Header & Paper Trading Badge */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-[#111827]">{cleanSymbol}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F3F4F6] text-[#6B7280] font-mono">
              NSE
            </span>
          </div>
          <span className="text-[11px] text-[#6B7280] block truncate max-w-[200px]">
            {stockName || `${cleanSymbol} Equities`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] bg-[#F0FDF4] border border-[#BBF7D0] text-[#16A34A] text-[10.5px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
          <span>PAPER TRADING</span>
        </div>
      </div>

      {/* 2. Order Confirmation State View */}
      {confirmedOrder ? (
        <div className="py-6 space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-[#F0FDF4] text-[#16A34A] mx-auto flex items-center justify-center border border-[#BBF7D0]">
            <Check className="w-6 h-6 stroke-[3]" />
          </div>

          <div>
            <h4 className="font-semibold text-base text-[#111827]">Order Executed</h4>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Simulated {confirmedOrder.side} executed via Paper Engine
            </p>
          </div>

          <div className="p-3.5 rounded-[8px] bg-[#F8FAFC] border border-[#E5E7EB] text-left text-xs space-y-1.5 font-mono">
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Instrument:</span>
              <span className="font-semibold text-[#111827]">{cleanSymbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Side &amp; Qty:</span>
              <span className="font-semibold text-[#111827]">{confirmedOrder.side} × {confirmedOrder.quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Executed Price:</span>
              <span className="font-semibold text-[#111827]">
                {formatStockPrice(confirmedOrder.average_execution_price || effectivePrice)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Order ID:</span>
              <span className="text-[#F97316] font-medium">{confirmedOrder.id ? confirmedOrder.id.slice(0, 12) : "BR-FILLED"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Status:</span>
              <span className="text-[#16A34A] font-medium">{confirmedOrder.status}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setConfirmedOrder(null);
                if (onClose) onClose();
              }}
              className="flex-1 py-2.5 rounded-[8px] bg-[#F97316] text-white font-semibold text-xs hover:bg-[#EA580C] transition-colors"
            >
              Done
            </button>
            <button
              onClick={() => setConfirmedOrder(null)}
              className="py-2.5 px-3 rounded-[8px] border border-[#E5E7EB] text-xs font-semibold text-[#4B5563] hover:bg-[#F8FAFC]"
            >
              Trade Again
            </button>
          </div>
        </div>
      ) : (
        /* 3. Order Input Form */
        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-2.5 rounded-[8px] bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* BUY / SELL Switch Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-[8px] bg-[#F8FAFC] border border-[#E5E7EB]">
            <button
              type="button"
              onClick={() => setSide("BUY")}
              className={`py-2 rounded-[6px] text-xs font-semibold transition-all ${
                side === "BUY"
                  ? "bg-[#16A34A] text-white shadow-xs"
                  : "text-[#6B7280] hover:text-[#111827]"
              }`}
            >
              BUY
            </button>
            <button
              type="button"
              onClick={() => setSide("SELL")}
              className={`py-2 rounded-[6px] text-xs font-semibold transition-all ${
                side === "SELL"
                  ? "bg-[#DC2626] text-white shadow-xs"
                  : "text-[#6B7280] hover:text-[#111827]"
              }`}
            >
              SELL
            </button>
          </div>

          {/* Order Type Toggle: MARKET / LIMIT */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#4B5563]">Order Type</span>
            <div className="flex items-center gap-1 bg-[#F8FAFC] p-0.5 rounded-[6px] border border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setOrderType("MARKET")}
                className={`px-3 py-1 text-xs font-medium rounded-[4px] transition-all ${
                  orderType === "MARKET"
                    ? "bg-white text-[#111827] shadow-xs font-semibold"
                    : "text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                MARKET
              </button>
              <button
                type="button"
                onClick={() => setOrderType("LIMIT")}
                className={`px-3 py-1 text-xs font-medium rounded-[4px] transition-all ${
                  orderType === "LIMIT"
                    ? "bg-white text-[#111827] shadow-xs font-semibold"
                    : "text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                LIMIT
              </button>
            </div>
          </div>

          {/* Quantity Stepper */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-[#4B5563]">Quantity</span>
              <span className="text-[11px] text-[#6B7280]">Lot: 1</span>
            </div>
            <div className="flex items-center border border-[#E5E7EB] rounded-[8px] overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => handleQuantityStep(-1)}
                className="p-2.5 bg-[#F8FAFC] hover:bg-[#E5E7EB] text-[#4B5563] transition-colors"
                disabled={quantity <= 1}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full text-center font-mono font-medium text-sm text-[#111827] focus:outline-none tabular-nums"
              />
              <button
                type="button"
                onClick={() => handleQuantityStep(1)}
                className="p-2.5 bg-[#F8FAFC] hover:bg-[#E5E7EB] text-[#4B5563] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Price Input (active if LIMIT, otherwise live LTP displayed) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-[#4B5563]">
                {orderType === "MARKET" ? "Market Price (LTP)" : "Limit Price"}
              </span>
              {ltp && (
                <span className="text-xs font-semibold text-[#16A34A] tabular-nums tracking-tight">
                  Live: {formatStockPrice(ltp)}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-xs text-[#6B7280]">
                ₹
              </span>
              <input
                type="number"
                step="0.05"
                disabled={orderType === "MARKET"}
                value={orderType === "MARKET" ? (ltp ? ltp.toFixed(2) : "Fetching...") : price}
                onChange={(e) => setPrice(e.target.value)}
                className={`w-full pl-7 pr-3 py-2 border rounded-[8px] font-semibold text-sm text-[#111827] tabular-nums focus:outline-none transition-all ${
                  orderType === "MARKET"
                    ? "bg-[#F8FAFC] border-[#E5E7EB] text-[#6B7280]"
                    : "bg-white border-[#E5E7EB] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
                }`}
              />
            </div>
          </div>

          {/* Available Virtual Balance */}
          <div className="p-2.5 rounded-[8px] bg-[#F8FAFC] border border-[#E5E7EB] flex justify-between items-center text-xs">
            <span className="text-[#6B7280]">Available Virtual Balance</span>
            <span className="financial-num font-semibold text-sm text-[#111827] tabular-nums tracking-tight">
              {formatINR(availableBalance)}
            </span>
          </div>

          {/* Charges and Totals Breakdown */}
          <div className="space-y-1.5 pt-1 text-xs border-t border-[#E5E7EB]">
            <div className="flex justify-between text-[#6B7280]">
              <span>Estimated Turnover</span>
              <span className="financial-num font-semibold text-xs text-[#111827] tabular-nums">
                {formatINR(turnover)}
              </span>
            </div>

            <div className="flex justify-between text-[#6B7280]">
              <button
                type="button"
                onClick={() => setShowChargesDetails(!showChargesDetails)}
                className="text-[11px] text-[#F97316] hover:underline flex items-center gap-1"
              >
                <span>Charges &amp; Taxes</span>
                {showChargesDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              <span className="financial-num font-semibold text-xs text-[#111827] tabular-nums">
                {formatINR(chargesBreakdown.totalCharges)}
              </span>
            </div>

            {/* Collapsible simulated charges breakdown */}
            {showChargesDetails && (
              <div className="p-2 rounded-[6px] bg-[#F8FAFC] space-y-1 text-[10.5px] text-[#6B7280]">
                <div className="flex justify-between">
                  <span>Simulated Brokerage (max ₹20):</span>
                  <span className="financial-num font-medium">{formatINR(chargesBreakdown.brokerage)}</span>
                </div>
                <div className="flex justify-between">
                  <span>STT / CTT (0.1%):</span>
                  <span className="financial-num font-medium">{formatINR(chargesBreakdown.stt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Exchange Turnover (0.00345%):</span>
                  <span className="financial-num font-medium">{formatINR(chargesBreakdown.turnoverCharges)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (18% on Brokerage+Turnover):</span>
                  <span className="financial-num font-medium">{formatINR(chargesBreakdown.gst)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between text-sm font-medium text-[#111827] pt-1 border-t border-[#E5E7EB]">
              <span>Total Margin Required</span>
              <span className="financial-num font-semibold text-base text-[#111827] tabular-nums tracking-tight">
                {formatINR(totalAmount)}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || quantity < 1}
            className={`w-full py-2.5 rounded-[8px] font-semibold text-xs text-white shadow-xs transition-all ${
              side === "BUY"
                ? "bg-[#16A34A] hover:bg-[#15803d] active:scale-[0.99]"
                : "bg-[#DC2626] hover:bg-[#b91c1c] active:scale-[0.99]"
            } disabled:opacity-50`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Executing Paper Order...
              </span>
            ) : (
              `PLACE ${side} ORDER (PAPER)`
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export interface OrderPadModalProps extends OrderPadProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OrderPadModal({
  isOpen,
  onClose,
  ...props
}: OrderPadModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${props.defaultSide || "BUY"} Order Pad`}
      description="Simulated virtual execution"
      className="max-w-sm bg-white text-[#111827] border border-[#E5E7EB] shadow-dropdown"
    >
      <OrderPad {...props} embedded={false} onClose={onClose} />
    </Modal>
  );
}
