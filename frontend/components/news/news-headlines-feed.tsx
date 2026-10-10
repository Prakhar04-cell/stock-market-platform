"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ExternalLink, RefreshCw, AlertCircle, Info, Newspaper } from "lucide-react";
import {
  fetchMarketNews,
  NewsHeadlineItem,
  NewsFeedResponse,
} from "@/lib/news-service";

interface NewsHeadlinesFeedProps {
  symbol?: string;
  title?: string;
  maxItems?: number;
  showRefresh?: boolean;
  className?: string;
  onClearSymbolFilter?: () => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const published = new Date(dateString).getTime();
    if (isNaN(published)) return "Recent";
    const now = Date.now();
    const diffSec = Math.floor((now - published) / 1000);

    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateString).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Recent";
  }
}

export function NewsHeadlinesFeed({
  symbol,
  title,
  maxItems = 6,
  showRefresh = true,
  className = "",
  onClearSymbolFilter,
}: NewsHeadlinesFeedProps) {
  const [data, setData] = useState<NewsFeedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const displayTitle =
    title || (symbol ? `${symbol.toUpperCase()} Headlines` : "Market Headlines");

  const loadNews = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const res = await fetchMarketNews(symbol, maxItems);
        setData(res);
        if (isManualRefresh) {
          // Cooldown 20 seconds on manual refresh to protect the 100 req/day quota
          setCooldownSeconds(20);
        }
      } catch (err: any) {
        setData({
          items: [],
          total: 0,
          page: 1,
          limit: maxItems,
          cached: false,
          provider: "Marketaux",
          status: "provider_error",
          message: err.message || "Failed to load financial headlines.",
          retrieved_at: new Date().toISOString(),
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [symbol, maxItems]
  );

  useEffect(() => {
    loadNews(false);
  }, [loadNews]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const headlines: NewsHeadlineItem[] = data?.items?.slice(0, maxItems) || [];

  return (
    <div
      className={`bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md border border-outline-variant/20 select-none ${className}`}
    >
      {/* 1. Feed Header */}
      <div className="flex items-center justify-between gap-2 border-b border-surface-container-high pb-space-xs">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-on-surface tracking-tight">
            {displayTitle}
          </h2>
          {data?.cached && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-mono font-medium"
              title="Served from cached response to optimize API quota"
            >
              Cached
            </span>
          )}
        </div>

        {showRefresh && (
          <button
            onClick={() => loadNews(true)}
            disabled={isRefreshing || isLoading || cooldownSeconds > 0}
            className="flex items-center gap-1 text-[11px] font-medium text-on-surface-variant hover:text-on-surface disabled:opacity-50 transition-colors p-1 rounded hover:bg-surface-container-low"
            title={
              cooldownSeconds > 0
                ? `Refresh available in ${cooldownSeconds}s`
                : "Refresh latest market headlines"
            }
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">
              {cooldownSeconds > 0 ? `${cooldownSeconds}s` : "Refresh"}
            </span>
          </button>
        )}
      </div>

      {/* 2. Loading Skeleton */}
      {isLoading ? (
        <div className="flex flex-col gap-3 py-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex flex-col gap-2 p-2">
              <div className="w-full h-4 bg-surface-container-high rounded"></div>
              <div className="w-2/3 h-3 bg-surface-container-high rounded"></div>
              <div className="flex items-center gap-2 pt-1">
                <div className="w-16 h-3 bg-surface-container-high rounded"></div>
                <div className="w-12 h-3 bg-surface-container-high rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : data?.status === "no_token" ? (
        /* 3. Provider Not Configured State */
        <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-start gap-3">
          <Info className="w-4 h-4 text-on-surface-variant shrink-0 mt-0.5" />
          <div className="text-xs text-on-surface-variant space-y-1">
            <p className="font-semibold text-on-surface">Live News Feed Ready</p>
            <p className="leading-relaxed">
              To activate live financial news, add your free{" "}
              <code className="px-1 py-0.5 rounded bg-surface-container font-mono text-primary text-[11px]">
                MARKETAUX_API_TOKEN
              </code>{" "}
              in your backend environment variables.
            </p>
          </div>
        </div>
      ) : data?.status === "rate_limited" && headlines.length === 0 ? (
        /* 4. Quota Exhausted State */
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-semibold">Daily Request Limit Reached</p>
            <p className="leading-relaxed">
              Marketaux free-tier limit (100 requests/day) has been reached. Live updates
              will automatically resume tomorrow.
            </p>
          </div>
        </div>
      ) : headlines.length === 0 ? (
        /* 5. Empty State */
        <div className="py-8 px-4 text-center flex flex-col items-center justify-center gap-2">
          <Newspaper className="w-8 h-8 text-on-surface-variant/40" />
          <p className="text-xs font-semibold text-on-surface">
            {symbol ? `No recent headlines found for ${symbol}` : "No market headlines found"}
          </p>
          <p className="text-[11px] text-on-surface-variant max-w-xs">
            {symbol
              ? "No recent articles specifically match this ticker in the current news stream."
              : "Financial headlines will appear here as they are published."}
          </p>
          {symbol && onClearSymbolFilter && (
            <button
              onClick={onClearSymbolFilter}
              className="mt-2 px-3 py-1 text-xs font-medium bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors shadow-xs"
            >
              View General Market News
            </button>
          )}
        </div>
      ) : (
        /* 6. Headline List */
        <div className="flex flex-col divide-y divide-surface-container-high/60">
          {headlines.map((item) => (
            <a
              key={item.id}
              href={item.original_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group py-2.5 px-2 -mx-2 rounded-lg hover:bg-surface-container-low/70 transition-colors flex flex-col gap-1.5"
            >
              {/* Primary Visual: Headline */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xs sm:text-sm font-medium text-on-surface group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                  {item.headline}
                </h3>
                <ExternalLink className="w-3.5 h-3.5 text-on-surface-variant/40 group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
              </div>

              {/* Supporting Metadata: Publisher, Time, Related Ticker */}
              <div className="flex items-center gap-2 text-[11px] text-on-surface-variant flex-wrap">
                <span className="font-semibold text-on-surface/80">
                  {item.publisher}
                </span>
                <span>•</span>
                <span className="font-mono text-on-surface-variant">
                  {formatRelativeTime(item.published_at)}
                </span>

                {item.related_symbols && item.related_symbols.length > 0 && (
                  <div className="flex items-center gap-1 ml-auto">
                    {item.related_symbols.slice(0, 2).map((sym) => (
                      <span
                        key={sym}
                        className="px-1.5 py-0.2 bg-primary/10 text-primary rounded font-mono text-[10px] font-semibold"
                      >
                        {sym}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      )}

      {/* 7. Footer: Source Attribution & Link Notice */}
      <div className="pt-space-xs border-t border-surface-container-high/40 flex items-center justify-between text-[11px] text-on-surface-variant">
        <span>Source: Marketaux / Publisher Syndication</span>
        <span className="text-[10px] opacity-75">Opens in new tab</span>
      </div>
    </div>
  );
}
