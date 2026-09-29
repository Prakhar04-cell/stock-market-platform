"use client";

import React from "react";

interface MobileFilterProps {
  categories: string[];
  activeCategory: string;
  onSelect: (cat: string) => void;
  className?: string;
}

export function MobileFilter({
  categories,
  activeCategory,
  onSelect,
  className = "",
}: MobileFilterProps) {
  return (
    <div className={`flex gap-space-sm overflow-x-auto pb-1 no-scrollbar select-none ${className}`}>
      {categories.map((cat) => {
        const isActive = activeCategory === cat;
        return (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={`px-4 py-2 rounded-full font-label-md text-body-sm whitespace-nowrap transition-colors ${
              isActive
                ? "bg-primary text-on-primary shadow-sm"
                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
