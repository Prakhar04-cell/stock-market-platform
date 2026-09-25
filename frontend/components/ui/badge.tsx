import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "danger" | "warning" | "info" | "neutral" | "unconfigured";
}

export function Badge({ className, variant = "neutral", children, ...props }: BadgeProps) {
  const variants = {
    success: "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]",
    danger: "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]",
    warning: "bg-[#FFF7ED] text-[#F97316] border-[#FDBA74]",
    info: "bg-[#F8FAFC] text-[#0F172A] border-[#E5E7EB]",
    neutral: "bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]",
    unconfigured: "bg-[#FFF7ED] text-[#EA580C] border-[#FDBA74] font-medium",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border select-none",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
