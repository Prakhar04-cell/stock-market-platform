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
        "rounded-[10px] border border-[#E5E7EB] bg-white p-4 shadow-none transition-all hover:border-[#D1D5DB]",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className="p-1.5 rounded-[6px] bg-[#F8FAFC] border border-[#E5E7EB] text-[#111827]">
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <div className="text-xl font-bold tracking-tight text-[#111827] font-mono tabular-nums">{value}</div>
        {statusBadge}
      </div>

      {(subtitle || change) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {change && (
            <span
              className={cn(
                "font-semibold text-[11px] font-mono tabular-nums",
                isPositive === true && "text-[#16A34A]",
                isPositive === false && "text-[#DC2626]",
                isPositive === undefined && "text-[#4B5563]"
              )}
            >
              {change}
            </span>
          )}
          {subtitle && <span className="text-[11px] text-[#6B7280] truncate">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
