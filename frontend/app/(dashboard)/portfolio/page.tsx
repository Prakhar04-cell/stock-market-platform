"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PortfolioRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "positions") {
        router.replace("/positions");
      } else {
        router.replace("/holdings");
      }
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex items-center gap-space-sm text-outline">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        <span>Loading portfolio...</span>
      </div>
    </div>
  );
}
