"use client";

import React from "react";

interface MobileProfileSectionProps {
  icon: string;
  title: string;
  description: string;
  actionText?: string;
  onActionClick?: () => void;
  actionDanger?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function MobileProfileSection({
  icon,
  title,
  description,
  actionText,
  onActionClick,
  actionDanger = false,
  children,
  className = "",
}: MobileProfileSectionProps) {
  return (
    <section
      className={`bg-surface-container p-space-md rounded-lg shadow-sm flex flex-col gap-space-md ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-sm min-w-0 pr-2">
          <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed shrink-0">
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
          </div>
          <div className="min-w-0 truncate">
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">
              {title}
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
              {description}
            </p>
          </div>
        </div>

        {actionText && (
          <button
            onClick={onActionClick}
            className={`font-label-md text-label-md shrink-0 hover:underline ${
              actionDanger ? "text-error" : "text-primary"
            }`}
          >
            {actionText}
          </button>
        )}
      </div>

      <div className="pt-1">{children}</div>
    </section>
  );
}
