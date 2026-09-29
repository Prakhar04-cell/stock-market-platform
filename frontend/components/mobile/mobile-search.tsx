"use client";

import React from "react";

interface MobileSearchProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  onFilterClick?: () => void;
  onCalendarClick?: () => void;
  showCalendar?: boolean;
}

export function MobileSearch({
  value,
  onChange,
  placeholder = "Search symbols, assets, or keywords...",
  onFilterClick,
  onCalendarClick,
  showCalendar = false,
}: MobileSearchProps) {
  return (
    <div className="flex gap-space-sm items-center w-full">
      <div className="relative flex-1">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
          <span className="material-symbols-outlined text-[20px]">search</span>
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-11 pr-10 py-3 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary text-body-md transition-all shadow-sm font-tabular-data"
        />
        {value ? (
          <button
            onClick={() => onChange("")}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-outline hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        ) : onFilterClick && !showCalendar ? (
          <button
            onClick={onFilterClick}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-outline hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[20px]">tune</span>
          </button>
        ) : null}
      </div>

      {showCalendar && (
        <>
          {onFilterClick && (
            <button
              onClick={onFilterClick}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors shrink-0"
              aria-label="Filter"
            >
              <span className="material-symbols-outlined text-[20px]">filter_list</span>
            </button>
          )}
          {onCalendarClick && (
            <button
              onClick={onCalendarClick}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors shrink-0"
              aria-label="Date filter"
            >
              <span className="material-symbols-outlined text-[20px]">calendar_today</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
