"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  TrendingUp,
  TrendingDown,
  Info,
  Layers,
  ChevronDown,
  BarChart3,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface OIAnalysisWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: string;
  onSelectStrike?: (strike: number, type: "CE" | "PE") => void;
}

interface StrikeOIData {
  strike: number;
  callOI: number;
  putOI: number;
  callLTP: number;
  putLTP: number;
}

export function OIAnalysisWidget({
  isOpen,
  onClose,
  initialIndex = "NIFTY",
  onSelectStrike,
}: OIAnalysisWidgetProps) {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [selectedExpiry, setSelectedExpiry] = useState("22 Sep 2026");
  const [activeTab, setActiveTab] = useState<"chart" | "table">("chart");
  const [hoveredStrike, setHoveredStrike] = useState<StrikeOIData | null>(null);

  const spotPrices: Record<string, number> = {
    NIFTY: 23284.90,
    SENSEX: 74389.08,
    BANKNIFTY: 56118.00,
  };

  const spot = spotPrices[selectedIndex] || 23284.90;

  // Generate clean strike chain for visual demonstration
  const strikeData: StrikeOIData[] = useMemo(() => {
    const list: StrikeOIData[] = [];
    const step = selectedIndex === "SENSEX" ? 200 : selectedIndex === "BANKNIFTY" ? 100 : 50;
    const baseStrike = Math.round(spot / step) * step;
    const range = 6;

    for (let i = -range; i <= range; i++) {
      const strike = baseStrike + i * step;
      const diff = (strike - spot) / step;

      const callOI = Math.max(12, Math.round((85 - Math.abs(diff - 2) * 11) * 10) / 10);
      const putOI = Math.max(10, Math.round((95 - Math.abs(diff + 2) * 12) * 10) / 10);

      list.push({
        strike,
        callOI,
        putOI,
        callLTP: Math.max(25, Math.round((120 - diff * 15) * 10) / 10),
        putLTP: Math.max(25, Math.round((120 + diff * 15) * 10) / 10),
      });
    }
    return list;
  }, [selectedIndex, spot]);

  const totalCallOI = useMemo(() => strikeData.reduce((a, b) => a + b.callOI, 0), [strikeData]);
  const totalPutOI = useMemo(() => strikeData.reduce((a, b) => a + b.putOI, 0), [strikeData]);
  const pcr = totalCallOI > 0 ? (totalPutOI / totalCallOI).toFixed(2) : "1.00";
  const maxOI = useMemo(() => Math.max(...strikeData.flatMap((d) => [d.callOI, d.putOI])), [strikeData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl h-[84vh] bg-white border border-slate-200 rounded-2xl shadow-dropdown flex flex-col overflow-hidden text-slate-900">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-4">
            <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                Open Interest (OI) Analysis
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Simulation
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Put-Call Ratio, Max Pain distribution &amp; strike open interest
              </p>
            </div>

            {/* Index Selector */}
            <div className="hidden sm:flex items-center gap-1 ml-4 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {["NIFTY", "SENSEX", "BANKNIFTY"].map((idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    selectedIndex === idx
                      ? "bg-white text-indigo-600 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {idx}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setActiveTab("chart")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  activeTab === "chart" ? "bg-white text-indigo-600 shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Chart
              </button>
              <button
                onClick={() => setActiveTab("table")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  activeTab === "table" ? "bg-white text-indigo-600 shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Table
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sentiment Summary Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-2.5 bg-slate-50/80 border-b border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 text-[11px] block">Put-Call Ratio (PCR)</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono font-semibold text-slate-900 text-sm tabular-nums">{pcr}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                BULLISH
              </span>
            </div>
          </div>
          <div>
            <span className="text-slate-500 text-[11px] block">Max Pain Strike</span>
            <span className="font-mono font-semibold text-indigo-600 text-sm tabular-nums">
              {Math.round(spot / 50) * 50}
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[11px] block">Total Call OI</span>
            <span className="font-mono font-semibold text-rose-600 text-sm tabular-nums">
              {totalCallOI.toFixed(1)} L
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[11px] block">Total Put OI</span>
            <span className="font-mono font-semibold text-emerald-600 text-sm tabular-nums">
              {totalPutOI.toFixed(1)} L
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {activeTab === "chart" ? (
            <div className="space-y-3">
              {/* Legend */}
              <div className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-600">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                    <span className="font-medium">Call OI (Resistance)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                    <span className="font-medium">Put OI (Support)</span>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-slate-500">
                  Spot: {spot.toFixed(2)}
                </span>
              </div>

              {/* Comparative OI Bar Chart */}
              <div className="space-y-1.5 bg-white border border-slate-200 rounded-xl p-3">
                {strikeData.map((s) => {
                  const callWidth = (s.callOI / maxOI) * 100;
                  const putWidth = (s.putOI / maxOI) * 100;

                  return (
                    <div
                      key={s.strike}
                      onMouseEnter={() => setHoveredStrike(s)}
                      className="flex items-center text-xs py-1 px-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      {/* Call OI Bar */}
                      <div className="flex-1 flex items-center justify-end gap-2 pr-2">
                        <span className="text-[11px] font-mono text-slate-500">{s.callOI}L</span>
                        <div className="w-36 bg-slate-100 h-3 rounded flex justify-end overflow-hidden">
                          <div style={{ width: `${callWidth}%` }} className="bg-rose-500 rounded" />
                        </div>
                      </div>

                      {/* Center Strike */}
                      <div className="w-20 text-center font-mono font-semibold text-xs text-slate-800 shrink-0">
                        {s.strike}
                      </div>

                      {/* Put OI Bar */}
                      <div className="flex-1 flex items-center justify-start gap-2 pl-2">
                        <div className="w-36 bg-slate-100 h-3 rounded flex justify-start overflow-hidden">
                          <div style={{ width: `${putWidth}%` }} className="bg-emerald-500 rounded" />
                        </div>
                        <span className="text-[11px] font-mono text-slate-500">{s.putOI}L</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase font-medium border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 text-right">Call OI</th>
                    <th className="py-2 px-3 text-right">LTP (₹)</th>
                    <th className="py-2 px-3 text-center bg-slate-100 text-slate-700">Strike</th>
                    <th className="py-2 px-3 text-left">LTP (₹)</th>
                    <th className="py-2 px-3 text-left">Put OI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {strikeData.map((row) => (
                    <tr key={row.strike} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-right text-rose-600 font-medium tabular-nums">{row.callOI}L</td>
                      <td className="py-2 px-3 text-right text-slate-700 tabular-nums">{row.callLTP.toFixed(2)}</td>
                      <td className="py-2 px-3 text-center font-semibold text-slate-900 bg-slate-50 tabular-nums">{row.strike}</td>
                      <td className="py-2 px-3 text-left text-slate-700 tabular-nums">{row.putLTP.toFixed(2)}</td>
                      <td className="py-2 px-3 text-left text-emerald-600 font-medium tabular-nums">{row.putOI}L</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Phase 1 Sandbox model for derivative open interest visualization.</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
