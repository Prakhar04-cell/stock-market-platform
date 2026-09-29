"use client";

import React from "react";

export function MobileLoadingState({ message = "Loading market data..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center text-outline gap-3 min-h-[220px]">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <span className="text-body-sm font-medium">{message}</span>
    </div>
  );
}

export function MobileEmptyState({
  icon = "inbox",
  title = "No data available",
  description = "Items will appear here once available.",
  actionText,
  onAction,
}: {
  icon?: string;
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-surface-container-low rounded-xl gap-2 shadow-sm my-2">
      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-outline mb-1">
        <span className="material-symbols-outlined text-[26px]">{icon}</span>
      </div>
      <h3 className="font-headline-sm text-on-surface font-semibold text-body-lg">
        {title}
      </h3>
      <p className="text-body-sm text-on-surface-variant max-w-xs">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-2 px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-body-sm shadow-sm hover:opacity-95 active:scale-95 transition-all"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

export function MobileErrorState({
  title = "Failed to load",
  description = "Something went wrong fetching data. Please try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center bg-error-container/20 border border-error-container rounded-xl gap-2 my-2">
      <span className="material-symbols-outlined text-error text-[28px]">
        error
      </span>
      <h4 className="font-headline-sm text-error font-semibold text-body-md">
        {title}
      </h4>
      <p className="text-body-sm text-on-surface-variant max-w-xs">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-3.5 py-1.5 rounded-lg bg-surface text-on-surface font-label-md text-body-sm shadow-sm hover:bg-surface-variant transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
