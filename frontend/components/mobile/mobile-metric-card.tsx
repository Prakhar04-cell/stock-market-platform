"use client";

import React from "react";

interface MobileMetricCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  icon?: string;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

export function MobileMetricCard({
  title,
  value,
  change,
  isPositive = true,
  icon,
  subtitle,
  onClick,
  className = "",
}: MobileMetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={`flex flex-col p-space-md rounded-xl bg-surface-container-low shadow-sm gap-space-xs relative overflow-hidden ${
        onClick ? "cursor-pointer hover:bg-surface-container transition-colors" : ""
      } ${className}`}
    >
      {/* Background Watermark Icon */}
      {icon && (
        <div
          className={`absolute -right-2 -bottom-2 ${
            isPositive ? "text-secondary/10" : "text-error/10"
          }`}
        >
          <span
            className="material-symbols-outlined text-[48px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
        </div>
      )}

      <span className="font-label-md text-on-surface-variant text-body-sm truncate">
        {title}
      </span>
      <span className="font-tabular-data-lg text-on-surface font-semibold truncate">
        {value}
      </span>

      {change && (
        <span
          className={`inline-flex items-center gap-0.5 font-tabular-data text-body-sm font-medium ${
            isPositive ? "text-secondary" : "text-error"
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">
            {isPositive ? "arrow_drop_up" : "arrow_drop_down"}
          </span>
          {change}
        </span>
      )}

      {subtitle && (
        <span className="text-body-sm text-on-surface-variant truncate">
          {subtitle}
        </span>
      )}
    </div>
  );
}
