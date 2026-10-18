"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequest, setAuthTokens } from "@/lib/api-client";
import { AlertCircle, CheckCircle2, Loader2, ArrowRight } from "lucide-react";

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    async function processOAuthCallback() {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      // 1. Check for provider error
      if (error) {
        setStatus("error");
        setErrorMessage(
          error === "access_denied"
            ? "Sign in with Google was cancelled."
            : errorDescription || `Google authentication returned error: ${error}`
        );
        return;
      }

      // 2. Validate code parameter
      if (!code) {
        setStatus("error");
        setErrorMessage("Missing authorization code from Google redirect. Please try signing in again.");
        return;
      }

      // 3. Validate anti-CSRF state token
      const storedState = typeof window !== "undefined" ? sessionStorage.getItem("bullrun_oauth_state") : null;
      if (storedState && state && storedState !== state) {
        setStatus("error");
        setErrorMessage("Security verification failed: OAuth state mismatch. Please initiate sign in again.");
        return;
      }

      try {
        const redirectUri = `${window.location.origin}/auth/callback/google`;
        const data = await apiRequest("/api/v1/auth/google", {
          method: "POST",
          body: {
            code,
            redirect_uri: redirectUri,
            state: state || undefined,
          },
        });

        if (!isSubscribed) return;

        if (data?.access_token) {
          setAuthTokens(data.access_token, data.refresh_token);
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("bullrun_oauth_state");
          }
          setStatus("success");

          const targetRoute =
            data.user?.roles?.includes("ADMIN") || data.user?.role === "ADMIN" ? "/admin" : "/dashboard";

          setTimeout(() => {
            router.push(targetRoute);
          }, 800);
        } else {
          throw new Error("Authentication response was missing expected security tokens.");
        }
      } catch (err: any) {
        if (!isSubscribed) return;
        setStatus("error");
        setErrorMessage(err.message || "Failed to complete Google authentication. Please try again.");
      }
    }

    processOAuthCallback();

    return () => {
      isSubscribed = false;
    };
  }, [searchParams, router]);

  return (
    <div className="w-full max-w-md p-8 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xl space-y-6 text-center">
      {/* Brand Header */}
      <div className="flex items-center justify-center gap-2">
        <span className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-sm tracking-tight shadow-md">
          BR
        </span>
        <span className="font-headline-sm tracking-tight text-on-surface font-semibold text-xl">
          Bull<span className="text-primary font-bold">Run</span>
        </span>
      </div>

      {status === "loading" && (
        <div className="space-y-4 py-6">
          <div className="flex justify-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-on-surface">Securing Your BullRun Session</h2>
            <p className="text-body-sm text-outline">
              Verifying Google credentials and initializing paper trading portfolio...
            </p>
          </div>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4 py-6">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-500/20">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-on-surface">Authenticated Successfully</h2>
            <p className="text-body-sm text-outline">Redirecting to your trading dashboard...</p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-5 py-4">
          <div className="w-12 h-12 rounded-full bg-error-container text-on-error-container flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-error" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-on-surface">Google Sign-In Failed</h2>
            <p className="text-body-sm text-outline max-w-sm mx-auto">
              {errorMessage || "An unexpected error occurred during Google authentication."}
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full py-3 px-4 bg-primary text-on-primary font-semibold rounded-xl text-label-md hover:bg-primary/90 transition-all shadow-md shadow-primary/20 gap-2"
            >
              <span>Return to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface text-on-surface">
      <Suspense
        fallback={
          <div className="w-full max-w-md p-8 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 text-center space-y-4">
            <div className="flex justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <p className="text-body-sm text-outline">Loading authentication parameters...</p>
          </div>
        }
      >
        <GoogleCallbackContent />
      </Suspense>
    </div>
  );
}
