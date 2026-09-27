import React from "react";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ProviderStatusBanner() {
  return (
    <div className="rounded-xl border border-amber-200/90 bg-amber-50/70 p-3.5 mb-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-900">TradeX Phase 1 Sandbox Mode</span>
              <Badge variant="unconfigured">MARKET DATA DISCONNECTED</Badge>
            </div>
            <p className="text-xs text-amber-800/90 mt-0.5">
              Live market-data providers (Upstox / Zerodha) and broker execution venues are intentionally unconfigured for Phase 1. Real-time quotes and price movements show disconnected status.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
