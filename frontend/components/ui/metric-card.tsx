import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface MetricCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  change?: string;
  isPositive?: boolean;
  icon?: LucideIcon;
  statusBadge?: React.ReactNode;
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  isPositive,
  icon: Icon,
  statusBadge,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/90 bg-white p-4 shadow-card transition-all hover:border-slate-300",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <div className="text-xl font-bold tracking-tight text-slate-900 font-mono">{value}</div>
        {statusBadge}
      </div>

      {(subtitle || change) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {change && (
            <span
              className={cn(
                "font-semibold text-[11px] font-mono",
                isPositive === true && "text-emerald-600",
                isPositive === false && "text-rose-600",
                isPositive === undefined && "text-slate-500"
              )}
            >
              {change}
            </span>
          )}
          {subtitle && <span className="text-[11px] text-slate-500 truncate">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
