"use client";

import React from "react";

interface MobileActionButtonProps {
  variant?: "buy" | "sell" | "primary" | "surface" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
}

export function MobileActionButton({
  variant = "primary",
  size = "md",
  icon,
  children,
  onClick,
  disabled = false,
  className = "",
  fullWidth = false,
}: MobileActionButtonProps) {
  const variantStyles = {
    buy: "bg-secondary text-on-secondary shadow-sm hover:opacity-90",
    sell: "bg-error text-on-error shadow-sm hover:opacity-90",
    primary: "bg-primary text-on-primary shadow-sm hover:opacity-95",
    surface: "bg-surface-container-high text-on-surface hover:bg-surface-variant",
    ghost: "bg-transparent text-on-surface hover:bg-surface-container",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-body-sm font-label-md rounded-lg",
    md: "px-4 py-2 text-body-md font-label-md rounded-lg",
    lg: "px-space-md py-3.5 text-headline-sm rounded-xl font-semibold",
  };

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none ${
        variantStyles[variant]
      } ${sizeStyles[size]} ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {icon && <span className="material-symbols-outlined text-[18px]">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}
