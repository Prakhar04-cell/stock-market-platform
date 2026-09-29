"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { useMarketWebSocket, WsPriceUpdate } from "@/lib/market-ws";
import { OrderPadModal } from "@/components/trading/order-pad-modal";
import { formatINR, formatPercentage } from "@/lib/formatters";

interface StrikeData {
  strike: number;
  call: {
    oi: number;
    oiChange: number;
    volume: number;
    iv: number;
    bid: number;
    ask: number;
    ltp: number;
    changePercent: number;
  };
  put: {
    oi: number;
    oiChange: number;
    volume: number;
    iv: number;
    bid: number;
    ask: number;
    ltp: number;
    changePercent: number;
  };
}

const UNDERLYING_CONFIGS: Record<
  string,
  { spot: number; strikeStep: number; baseStrike: number; vwap: number; maxPain: number }
> = {
  NIFTY: { spot: 25790.95, strikeStep: 50, baseStrike: 25800, vwap: 25745.2, maxPain: 25800 },
  BANKNIFTY: { spot: 53793.2, strikeStep: 100, baseStrike: 53800, vwap: 53680.0, maxPain: 53800 },
  FINNIFTY: { spot: 24350.5, strikeStep: 50, baseStrike: 24350, vwap: 24310.0, maxPain: 24350 },
  RELIANCE: { spot: 2980.5, strikeStep: 20, baseStrike: 2980, vwap: 2975.2, maxPain: 2980 },
  TCS: { spot: 4210.8, strikeStep: 50, baseStrike: 4200, vwap: 4195.0, maxPain: 4200 },
};

export default function OptionChainPage() {
  const router = useRouter();

  const [selectedAsset, setSelectedAsset] = useState<"NIFTY" | "BANKNIFTY" | "FINNIFTY" | "RELIANCE" | "TCS">("NIFTY");
  const [selectedExpiry, setSelectedExpiry] = useState("25 Apr 2024 (Current)");
  const [strikeRange, setStrikeRange] = useState<number>(10); // ±10 strikes
  const [viewMode, setViewMode] = useState<"BOTH" | "CALLS" | "PUTS">("BOTH");
  const [strikeFilter, setStrikeFilter] = useState("");

  const [spotPrice, setSpotPrice] = useState<number>(UNDERLYING_CONFIGS.NIFTY.spot);

  // Order Pad modal
  const [orderModalStock, setOrderModalStock] = useState<{
    symbol: string;
    stockId: string;
    side: "BUY" | "SELL";
  } | null>(null);

  // Sync spot price when asset changes
  useEffect(() => {
    setSpotPrice(UNDERLYING_CONFIGS[selectedAsset].spot);
    async function fetchSpot() {
      try {
        const q = await apiRequest<{ ltp?: number }>(`/api/v1/market/quote/${selectedAsset}`);
        if (q?.ltp) {
          setSpotPrice(Number(q.ltp));
        }
      } catch {
        // Fallback to base strike center
      }
    }
    fetchSpot();
  }, [selectedAsset]);

  // WebSocket Live Updates
  useMarketWebSocket(selectedAsset, (update: WsPriceUpdate) => {
    if (update.ltp) {
      setSpotPrice(Number(update.ltp));
    }
  });

  const config = UNDERLYING_CONFIGS[selectedAsset];

  // Generate dynamic Option Chain around spot
  const strikesList: StrikeData[] = useMemo(() => {
    const center = Math.round(spotPrice / config.strikeStep) * config.strikeStep;
    const count = 15;
    const items: StrikeData[] = [];

    for (let i = -count; i <= count; i++) {
      const strike = center + i * config.strikeStep;
      const dist = (strike - spotPrice) / config.strikeStep;

      // Realistic Call pricing
      const callIntrinsic = Math.max(0, spotPrice - strike);
      const callTimeVal = Math.max(10, 85 - Math.abs(dist) * 4);
      const callLtp = Number((callIntrinsic + callTimeVal).toFixed(2));
      const callChg = (12 - dist * 1.5).toFixed(2);

      // Realistic Put pricing
      const putIntrinsic = Math.max(0, strike - spotPrice);
      const putTimeVal = Math.max(10, 85 - Math.abs(dist) * 4);
      const putLtp = Number((putIntrinsic + putTimeVal).toFixed(2));
      const putChg = (-8 + dist * 1.8).toFixed(2);

      items.push({
        strike,
        call: {
          oi: Math.round(Math.max(1000, 2450000 - Math.abs(dist) * 120000)),
          oiChange: Math.round((142000 - dist * 12000)),
          volume: Math.round(Math.max(5000, 850000 - Math.abs(dist) * 50000)),
          iv: Number((13.5 + Math.abs(dist) * 0.25).toFixed(1)),
          bid: Number((callLtp * 0.998).toFixed(2)),
          ask: Number((callLtp * 1.002).toFixed(2)),
          ltp: callLtp,
          changePercent: Number(callChg),
        },
        put: {
          oi: Math.round(Math.max(1000, 2850000 - Math.abs(dist) * 140000)),
          oiChange: Math.round((-45000 + dist * 15000)),
          volume: Math.round(Math.max(5000, 920000 - Math.abs(dist) * 48000)),
          iv: Number((14.2 + Math.abs(dist) * 0.22).toFixed(1)),
          bid: Number((putLtp * 0.998).toFixed(2)),
          ask: Number((putLtp * 1.002).toFixed(2)),
          ltp: putLtp,
          changePercent: Number(putChg),
        },
      });
    }

    return items;
  }, [spotPrice, config]);

  // Filter strikes
  const filteredStrikes = useMemo(() => {
    let list = strikesList;
    if (strikeRange > 0) {
      const center = Math.round(spotPrice / config.strikeStep) * config.strikeStep;
      list = list.filter((s) => Math.abs((s.strike - center) / config.strikeStep) <= strikeRange);
    }
    if (strikeFilter.trim()) {
      list = list.filter((s) => s.strike.toString().includes(strikeFilter.trim()));
    }
    return list;
  }, [strikesList, strikeRange, spotPrice, config.strikeStep, strikeFilter]);

  return (
    <div className="flex flex-col w-full min-h-screen bg-surface text-on-surface pb-24">
      <div className="flex flex-col px-space-lg lg:px-space-xl py-space-md gap-space-lg">
        {/* Top Bar: Asset Selector & Expiry Pills */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          {/* Underlying Assets */}
          <div className="flex items-center gap-space-sm overflow-x-auto pb-space-xs no-scrollbar">
            {(["NIFTY", "BANKNIFTY", "FINNIFTY", "RELIANCE", "TCS"] as const).map((asset) => (
              <button
                key={asset}
                onClick={() => setSelectedAsset(asset)}
                className={`px-space-md py-space-xs rounded-lg font-label-md transition-all whitespace-nowrap ${
                  selectedAsset === asset
                    ? "bg-primary text-on-primary shadow-sm font-semibold"
                    : "bg-surface-container-low hover:bg-surface-container text-on-surface-variant"
                }`}
              >
                {asset}
              </button>
            ))}
          </div>

          {/* Expiry Date Selector Pills */}
          <div className="flex items-center gap-space-xs overflow-x-auto pb-space-xs no-scrollbar">
            <span className="text-label-sm text-outline mr-space-xs uppercase tracking-wider font-tabular-data">
              Expiry:
            </span>
            {[
              "25 Apr 2024 (Current)",
              "02 May 2024",
              "09 May 2024",
              "30 May 2024",
              "27 Jun 2024",
            ].map((exp) => (
              <button
                key={exp}
                onClick={() => setSelectedExpiry(exp)}
                className={`px-space-md py-space-xs rounded-full font-label-sm whitespace-nowrap transition-colors ${
                  selectedExpiry === exp
                    ? "bg-primary-container text-on-primary-container font-semibold shadow-sm"
                    : "bg-surface-container-low hover:bg-surface-container text-on-surface-variant"
                }`}
              >
                {exp}
              </button>
            ))}
          </div>
        </div>

        {/* Live Underlying Spot Price Summary Card (6 Bento metrics) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-gutter">
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/20 flex flex-col justify-between">
            <span className="text-label-sm text-outline">Spot Price</span>
            <div className="flex items-baseline gap-space-xs mt-space-xs">
              <span className="text-headline-sm font-semibold text-on-surface font-tabular-data">
                {formatINR(spotPrice)}
              </span>
            </div>
            <span className="text-body-sm text-tertiary font-medium mt-1">+124.50 (+0.56%)</span>
          </div>

          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/20 flex flex-col justify-between">
            <span className="text-label-sm text-outline">VWAP</span>
            <div className="flex items-baseline gap-space-xs mt-space-xs">
              <span className="text-headline-sm font-semibold text-on-surface font-tabular-data">
                {formatINR(config.vwap)}
              </span>
            </div>
            <span className="text-body-sm text-outline mt-1">Volume Weighted</span>
          </div>

          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/20 flex flex-col justify-between">
            <span className="text-label-sm text-outline">PCR (Put-Call Ratio)</span>
            <div className="flex items-baseline gap-space-xs mt-space-xs">
              <span className="text-headline-sm font-semibold text-tertiary font-tabular-data">1.18</span>
              <span className="text-label-sm bg-tertiary-container/20 text-tertiary px-1.5 py-0.5 rounded font-medium">
                Bullish
              </span>
            </div>
            <span className="text-body-sm text-outline mt-1 truncate">Strong Call Writing at OTM</span>
          </div>

          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/20 flex flex-col justify-between">
            <span className="text-label-sm text-outline">Max Pain</span>
            <div className="flex items-baseline gap-space-xs mt-space-xs">
              <span className="text-headline-sm font-semibold text-on-surface font-tabular-data">
                {config.maxPain.toLocaleString()}
              </span>
            </div>
            <span className="text-body-sm text-outline mt-1">Strongest OI convergence</span>
          </div>

          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/20 flex flex-col justify-between">
            <span className="text-label-sm text-outline">India VIX</span>
            <div className="flex items-baseline gap-space-xs mt-space-xs">
              <span className="text-headline-sm font-semibold text-on-surface font-tabular-data">12.45</span>
            </div>
            <span className="text-body-sm text-error mt-1">-2.1% (Low Volatility)</span>
          </div>

          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/20 flex flex-col justify-between">
            <span className="text-label-sm text-outline">Day&apos;s Range</span>
            <div className="flex items-baseline gap-space-xs mt-space-xs">
              <span className="text-body-md font-medium text-on-surface font-tabular-data">
                {Math.round(spotPrice * 0.995)} - {Math.round(spotPrice * 1.005)}
              </span>
            </div>
            <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-primary h-full w-[72%]"></div>
            </div>
          </div>
        </div>

        {/* Filters & Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-space-md bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/20">
          <div className="flex items-center gap-space-md flex-wrap">
            <div className="flex items-center gap-space-xs">
              <span className="text-label-sm text-outline">Strikes Range:</span>
              <select
                value={strikeRange}
                onChange={(e) => setStrikeRange(Number(e.target.value))}
                className="bg-surface-container-low text-on-surface text-body-md px-space-sm py-space-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-primary border border-outline-variant/20"
              >
                <option value={5}>±5 Strikes</option>
                <option value={10}>±10 Strikes</option>
                <option value={20}>±20 Strikes</option>
                <option value={0}>All Strikes</option>
              </select>
            </div>
            <div className="flex items-center gap-space-xs">
              <span className="text-label-sm text-outline">View Mode:</span>
              <div className="inline-flex bg-surface-container-low p-1 rounded-lg">
                {(
                  [
                    { id: "BOTH", label: "Calls & Puts" },
                    { id: "CALLS", label: "Calls Only" },
                    { id: "PUTS", label: "Puts Only" },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setViewMode(mode.id)}
                    className={`px-space-md py-1 text-label-sm rounded-md transition-colors ${
                      viewMode === mode.id
                        ? "bg-surface-container-lowest text-on-surface font-semibold shadow-sm"
                        : "text-outline hover:text-on-surface"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-space-md">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-space-sm pointer-events-none">
                <span className="material-symbols-outlined text-outline text-[16px]">filter_list</span>
              </span>
              <input
                className="pl-9 pr-space-md py-1 bg-surface-container-low rounded-lg text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary w-48 border border-outline-variant/20"
                placeholder="Filter strike..."
                value={strikeFilter}
                onChange={(e) => setStrikeFilter(e.target.value)}
                type="text"
              />
            </div>
          </div>
        </div>

        {/* Dual-Sided Option Chain Data Table */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant/20">
          <div className="overflow-x-auto">
            <table className="w-full text-tabular-data whitespace-nowrap">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant text-label-sm border-b border-surface-container">
                  {/* Calls Header */}
                  {(viewMode === "BOTH" || viewMode === "CALLS") && (
                    <th
                      className="py-2.5 px-space-md text-center bg-primary-container/10 text-primary font-semibold tracking-wider"
                      colSpan={6}
                    >
                      CALLS (CE)
                    </th>
                  )}
                  {/* Center Strike */}
                  <th
                    className="py-2.5 px-space-md text-center bg-surface-container-high text-on-surface font-bold tracking-wider border-x border-surface-container"
                    rowSpan={2}
                  >
                    STRIKE
                  </th>
                  {/* Puts Header */}
                  {(viewMode === "BOTH" || viewMode === "PUTS") && (
                    <th
                      className="py-2.5 px-space-md text-center bg-error-container/20 text-error font-semibold tracking-wider"
                      colSpan={6}
                    >
                      PUTS (PE)
                    </th>
                  )}
                </tr>
                <tr className="bg-surface-container-low/50 text-on-surface-variant text-[11px] border-b border-surface-container">
                  {/* Calls Columns */}
                  {(viewMode === "BOTH" || viewMode === "CALLS") && (
                    <>
                      <th className="py-2 px-3 text-right">OI</th>
                      <th className="py-2 px-3 text-right">Chg OI</th>
                      <th className="py-2 px-3 text-right">Volume</th>
                      <th className="py-2 px-3 text-right">IV</th>
                      <th className="py-2 px-3 text-right">LTP (₹)</th>
                      <th className="py-2 px-3 text-right">Chg %</th>
                    </>
                  )}
                  {/* Puts Columns */}
                  {(viewMode === "BOTH" || viewMode === "PUTS") && (
                    <>
                      <th className="py-2 px-3 text-left">Chg %</th>
                      <th className="py-2 px-3 text-left">LTP (₹)</th>
                      <th className="py-2 px-3 text-left">IV</th>
                      <th className="py-2 px-3 text-left">Volume</th>
                      <th className="py-2 px-3 text-left">Chg OI</th>
                      <th className="py-2 px-3 text-left">OI</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container/60">
                {filteredStrikes.map((row) => {
                  const isCallITM = row.strike < spotPrice;
                  const isPutITM = row.strike > spotPrice;
                  const isATM = Math.abs(row.strike - spotPrice) <= config.strikeStep / 2;

                  return (
                    <tr
                      key={row.strike}
                      className={`hover:bg-surface-container-low/80 transition-colors ${
                        isATM ? "bg-secondary-container/20 font-medium" : ""
                      }`}
                    >
                      {/* Calls */}
                      {(viewMode === "BOTH" || viewMode === "CALLS") && (
                        <>
                          <td
                            className={`py-2.5 px-3 text-right font-medium ${
                              isCallITM ? "bg-primary-container/5" : ""
                            }`}
                          >
                            {row.call.oi.toLocaleString()}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right ${
                              row.call.oiChange >= 0 ? "text-tertiary" : "text-error"
                            } ${isCallITM ? "bg-primary-container/5" : ""}`}
                          >
                            {row.call.oiChange >= 0 ? "+" : ""}
                            {row.call.oiChange.toLocaleString()}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right text-outline ${
                              isCallITM ? "bg-primary-container/5" : ""
                            }`}
                          >
                            {row.call.volume.toLocaleString()}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right text-outline ${
                              isCallITM ? "bg-primary-container/5" : ""
                            }`}
                          >
                            {row.call.iv}%
                          </td>
                          <td
                            onClick={() =>
                              setOrderModalStock({
                                symbol: `${selectedAsset} ${row.strike} CE`,
                                stockId: `${selectedAsset}_${row.strike}_CE`,
                                side: "BUY",
                              })
                            }
                            className={`py-2.5 px-3 text-right font-semibold cursor-pointer hover:underline text-primary ${
                              isCallITM ? "bg-primary-container/10" : ""
                            }`}
                          >
                            {formatINR(row.call.ltp)}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-medium ${
                              row.call.changePercent >= 0 ? "text-tertiary" : "text-error"
                            } ${isCallITM ? "bg-primary-container/5" : ""}`}
                          >
                            {row.call.changePercent >= 0 ? "+" : ""}
                            {formatPercentage(row.call.changePercent)}
                          </td>
                        </>
                      )}

                      {/* Center Strike */}
                      <td
                        className={`py-2.5 px-space-md text-center font-bold tracking-wider border-x border-surface-container ${
                          isATM
                            ? "bg-primary text-on-primary"
                            : "bg-surface-container-high text-on-surface"
                        }`}
                      >
                        {row.strike.toLocaleString()}
                      </td>

                      {/* Puts */}
                      {(viewMode === "BOTH" || viewMode === "PUTS") && (
                        <>
                          <td
                            className={`py-2.5 px-3 text-left font-medium ${
                              row.put.changePercent >= 0 ? "text-tertiary" : "text-error"
                            } ${isPutITM ? "bg-error-container/5" : ""}`}
                          >
                            {row.put.changePercent >= 0 ? "+" : ""}
                            {formatPercentage(row.put.changePercent)}
                          </td>
                          <td
                            onClick={() =>
                              setOrderModalStock({
                                symbol: `${selectedAsset} ${row.strike} PE`,
                                stockId: `${selectedAsset}_${row.strike}_PE`,
                                side: "BUY",
                              })
                            }
                            className={`py-2.5 px-3 text-left font-semibold cursor-pointer hover:underline text-error ${
                              isPutITM ? "bg-error-container/10" : ""
                            }`}
                          >
                            {formatINR(row.put.ltp)}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-left text-outline ${
                              isPutITM ? "bg-error-container/5" : ""
                            }`}
                          >
                            {row.put.iv}%
                          </td>
                          <td
                            className={`py-2.5 px-3 text-left text-outline ${
                              isPutITM ? "bg-error-container/5" : ""
                            }`}
                          >
                            {row.put.volume.toLocaleString()}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-left ${
                              row.put.oiChange >= 0 ? "text-tertiary" : "text-error"
                            } ${isPutITM ? "bg-error-container/5" : ""}`}
                          >
                            {row.put.oiChange >= 0 ? "+" : ""}
                            {row.put.oiChange.toLocaleString()}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-left font-medium ${
                              isPutITM ? "bg-error-container/5" : ""
                            }`}
                          >
                            {row.put.oi.toLocaleString()}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Dynamic OrderPadModal */}
      {orderModalStock && (
        <OrderPadModal
          isOpen={true}
          onClose={() => setOrderModalStock(null)}
          symbol={orderModalStock.symbol}
          stockId={orderModalStock.stockId}
          initialSide={orderModalStock.side}
        />
      )}
    </div>
  );
}
