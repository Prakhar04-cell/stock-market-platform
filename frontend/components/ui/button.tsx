import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "emerald";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-[8px] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none";

    const variants = {
      primary: "bg-[#F97316] hover:bg-[#EA580C] text-white shadow-none focus:ring-[#F97316]/40 active:scale-[0.98]",
      emerald: "bg-[#16A34A] hover:bg-[#15803D] text-white font-medium shadow-none focus:ring-emerald-500 active:scale-[0.98]",
      secondary: "bg-white hover:bg-[#F8FAFC] text-[#111827] border border-[#E5E7EB] hover:border-[#D1D5DB] focus:ring-slate-300",
      outline: "bg-transparent border border-[#E5E7EB] hover:bg-[#F8FAFC] text-[#111827] focus:ring-slate-300",
      ghost: "text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6] focus:ring-slate-300",
      danger: "bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-none focus:ring-rose-500 active:scale-[0.98]",
    };

    const sizes = {
      sm: "text-xs px-3 py-1.5 h-8 gap-1.5",
      md: "text-xs px-3.5 py-2 h-9 gap-2",
      lg: "text-sm px-4 py-2.5 h-10 gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
