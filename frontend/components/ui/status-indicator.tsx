import React from "react";
import { cn } from "@/lib/utils";

export interface StatusIndicatorProps {
  status: "HEALTHY" | "DEGRADED" | "DOWN" | "NOT_CONFIGURED" | string;
  label?: string;
  showText?: boolean;
  className?: string;
}

export function StatusIndicator({ status, label, showText = true, className }: StatusIndicatorProps) {
  const normStatus = status.toUpperCase();

  const configs: Record<string, { dot: string; text: string; label: string }> = {
    HEALTHY: {
      dot: "bg-emerald-500",
      text: "text-emerald-700",
      label: "Healthy",
    },
    DEGRADED: {
      dot: "bg-amber-500",
      text: "text-amber-700",
      label: "Degraded",
    },
    DOWN: {
      dot: "bg-rose-500",
      text: "text-rose-700",
      label: "Down",
    },
    NOT_CONFIGURED: {
      dot: "bg-slate-400",
      text: "text-slate-500",
      label: "Not Configured",
    },
  };

  const current = configs[normStatus] || configs["NOT_CONFIGURED"];

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative flex h-2 w-2">
        {normStatus === "HEALTHY" && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        )}
        <span className={cn("relative inline-flex rounded-full h-2 w-2", current.dot)}></span>
      </span>
      {showText && (
        <span className={cn("text-xs font-semibold tracking-wide uppercase", current.text)}>
          {label || current.label}
        </span>
      )}
    </div>
  );
}
