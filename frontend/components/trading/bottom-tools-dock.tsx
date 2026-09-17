"use client";

import React from "react";
import { Zap, BarChart2, Layers, Compass, DollarSign } from "lucide-react";

export interface BottomToolsDockProps {
  onOpenOI: () => void;
  onOpenOptionChain: () => void;
  onOpenScalper: () => void;
  onOpenScreener: () => void;
  onOpenFIIDII: () => void;
  className?: string;
}

export function BottomToolsDock({
  onOpenOI,
  onOpenOptionChain,
  onOpenScalper,
  onOpenScreener,
  onOpenFIIDII,
  className = "",
}: BottomToolsDockProps) {
  const tools = [
    {
      id: "scalper",
      label: "Scalper",
      icon: Zap,
      color: "text-amber-700 bg-amber-50 border-amber-200",
      action: onOpenScalper,
      badge: "Fast",
    },
    {
      id: "oi-analysis",
      label: "OI Analysis",
      icon: BarChart2,
      color: "text-indigo-700 bg-indigo-50 border-indigo-200",
      action: onOpenOI,
      badge: "Live",
    },
    {
      id: "option-chain",
      label: "Option Chain",
      icon: Layers,
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      action: onOpenOptionChain,
    },
    {
      id: "screener",
      label: "Screener",
      icon: Compass,
      color: "text-purple-700 bg-purple-50 border-purple-200",
      action: onOpenScreener,
    },
    {
      id: "fii-dii",
      label: "FII / DII Cash",
      icon: DollarSign,
      color: "text-sky-700 bg-sky-50 border-sky-200",
      action: onOpenFIIDII,
    },
  ];

  return (
    <div
      className={`flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-dropdown select-none ${className}`}
    >
      <div className="flex items-center gap-1 px-1">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pl-1">
          Pro Tools
        </span>
      </div>

      <div className="h-4 w-px bg-slate-200 mx-0.5" />

      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.id}
            onClick={tool.action}
            className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200 active:scale-95"
          >
            <div className={`p-1 rounded-lg border ${tool.color} transition-transform group-hover:scale-105`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <span>{tool.label}</span>

            {tool.badge && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {tool.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
