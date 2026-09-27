"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();

  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [identifier, setIdentifier] = useState("trader@bullrun.in");
  const [password, setPassword] = useState("password123");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const endpoint = authMode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/register";
      const payload =
        authMode === "login"
          ? { email: identifier, password }
          : { email: identifier, password, full_name: "BullRun Trader" };

      const data = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (typeof window !== "undefined") {
        if (data.access_token) {
          localStorage.setItem("tradex_token", data.access_token);
        }
        if (data.refresh_token) {
          localStorage.setItem("tradex_refresh_token", data.refresh_token);
        }
        if (rememberMe) {
          localStorage.setItem("bullrun_remember_email", identifier);
        }
      }

      if (data.user?.roles?.includes("ADMIN") || data.user?.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid credentials. Please verify your email and password.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setIdentifier("demo@bullrun.in");
    setPassword("demopass123");
    if (typeof window !== "undefined") {
      localStorage.setItem("tradex_token", "demo_jwt_session_token");
      localStorage.setItem("tradex_refresh_token", "demo_refresh_token");
    }
    router.push("/dashboard");
  };

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-4rem)] bg-surface text-on-surface">
      <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 w-full min-h-[calc(100vh-4rem)]">
        {/* Left Side: Immersive Brand & Market Stats (5 cols on lg) */}
        <div className="lg:col-span-5 bg-primary relative overflow-hidden flex flex-col justify-between p-8 lg:p-12 text-on-primary">
          {/* Decorative background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-primary-fixed-variant opacity-90 pointer-events-none"></div>
          <div className="absolute -right-24 -top-24 w-96 h-96 bg-tertiary/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-secondary/30 rounded-full blur-3xl pointer-events-none"></div>

          {/* Top Content: Brand & Tagline */}
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-on-primary/10 rounded-full backdrop-blur-md text-label-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-tertiary-fixed animate-ping"></span>
              <span>Institutional Grade Security</span>
            </div>
            <h1 className="font-headline-xl text-on-primary tracking-tight leading-tight">
              Trade smarter, faster, and secure with BullRun.
            </h1>
            <p className="text-body-lg text-on-primary-container max-w-md">
              Experience lightning-fast execution, real-time analytics, and advanced algorithmic tools built for modern investors.
            </p>
          </div>

          {/* Middle: Live Ticker & Candlestick Preview Graphics */}
          <div className="relative z-10 my-8 space-y-4">
            {/* Live Ticker Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-on-primary/5 backdrop-blur-md rounded-xl space-y-1 border border-on-primary/10">
                <div className="flex items-center justify-between text-body-sm text-on-primary-container">
                  <span>NIFTY 50</span>
                  <span className="text-tertiary-fixed font-medium">+1.24%</span>
                </div>
                <div className="font-headline-sm text-on-primary tabular-nums font-semibold">25,790.95</div>
                <div className="h-6 w-full pt-2">
                  <svg className="w-full h-full text-tertiary-fixed" fill="none" viewBox="0 0 100 20">
                    <path
                      d="M0 15 L20 12 L40 18 L60 8 L80 10 L100 4"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="2"
                    ></path>
                  </svg>
                </div>
              </div>

              <div className="p-4 bg-on-primary/5 backdrop-blur-md rounded-xl space-y-1 border border-on-primary/10">
                <div className="flex items-center justify-between text-body-sm text-on-primary-container">
                  <span>SENSEX</span>
                  <span className="text-tertiary-fixed font-medium">+0.98%</span>
                </div>
                <div className="font-headline-sm text-on-primary tabular-nums font-semibold">84,544.30</div>
                <div className="h-6 w-full pt-2">
                  <svg className="w-full h-full text-tertiary-fixed" fill="none" viewBox="0 0 100 20">
                    <path
                      d="M0 12 L20 14 L40 9 L60 12 L80 5 L100 2"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="2"
                    ></path>
                  </svg>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="pt-4 grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-on-primary/5 rounded-lg flex flex-col items-center justify-center border border-on-primary/10">
                <span className="material-symbols-outlined text-[20px] text-tertiary-fixed mb-1">
                  verified_user
                </span>
                <span className="text-label-sm text-on-primary font-medium">SEBI Regulated</span>
              </div>
              <div className="p-3 bg-on-primary/5 rounded-lg flex flex-col items-center justify-center border border-on-primary/10">
                <span className="material-symbols-outlined text-[20px] text-tertiary-fixed mb-1">lock</span>
                <span className="text-label-sm text-on-primary font-medium">256-Bit SSL</span>
              </div>
              <div className="p-3 bg-on-primary/5 rounded-lg flex flex-col items-center justify-center border border-on-primary/10">
                <span className="material-symbols-outlined text-[20px] text-tertiary-fixed mb-1">bolt</span>
                <span className="text-label-sm text-on-primary font-medium">Zero Brokerage</span>
              </div>
            </div>
          </div>

          {/* Footer Trust Quote */}
          <div className="relative z-10 pt-4 text-body-sm text-on-primary-container flex items-center justify-between">
            <span>© 2025 BullRun Financial Tech</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tertiary-fixed"></span>
              <span>All systems normal</span>
            </div>
          </div>
        </div>

        {/* Right Side: Clean Login & Authentication Form (7 cols on lg) */}
        <div className="lg:col-span-7 bg-surface-container-lowest flex flex-col justify-between p-8 lg:p-16 overflow-y-auto">
          <div className="max-w-md w-full mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold">
                  BR
                </span>
                <span className="font-headline-sm tracking-tight text-on-surface font-semibold">BullRun</span>
              </div>
              <div className="text-right">
                <span className="text-body-sm text-outline">
                  {authMode === "login" ? "New to BullRun?" : "Already registered?"}
                </span>
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
                  className="ml-1 text-label-md text-primary hover:underline font-semibold"
                >
                  {authMode === "login" ? "Open Account" : "Sign In"}
                </button>
              </div>
            </div>

            {/* Auth Tabs: Sign In vs Quick Register */}
            <div className="flex p-1 bg-surface-container-low rounded-xl border border-outline-variant/20">
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className={`flex-1 py-2 text-label-md rounded-lg font-medium transition-all ${
                  authMode === "login"
                    ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className={`flex-1 py-2 text-label-md rounded-lg font-medium transition-all ${
                  authMode === "signup"
                    ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Quick Register
              </button>
            </div>

            {/* Main Form Container */}
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="font-headline-lg text-on-surface font-semibold">
                  {authMode === "login" ? "Welcome back" : "Create Account"}
                </h2>
                <p className="text-body-md text-outline">
                  {authMode === "login"
                    ? "Enter your credentials to access your secure trading portfolio."
                    : "Join over 250,000 traders with high-frequency order execution."}
                </p>
              </div>

              {errorMessage && (
                <div className="p-space-md rounded-xl bg-error-container text-on-error-container text-body-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Login Form Form Elements */}
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <label className="block text-label-md text-on-surface font-medium">
                    Mobile Number / Client ID / Email
                  </label>
                  <div className="relative flex items-center">
                    <input
                      className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary transition-all border border-outline-variant/30"
                      placeholder="Enter mobile or email address"
                      required
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-label-md text-on-surface font-medium">
                      Password or 6-Digit MPIN
                    </label>
                    <Link
                      href="/set-up-mpin"
                      className="text-body-sm text-primary hover:underline font-medium"
                    >
                      Use MPIN
                    </Link>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      className="w-full pl-4 pr-12 py-3 bg-surface-container-low rounded-xl text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary transition-all border border-outline-variant/30"
                      placeholder="••••••••"
                      required
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 p-1 text-outline hover:text-on-surface transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary border-outline"
                      type="checkbox"
                    />
                    <span className="text-body-md text-on-surface-variant">Remember this device</span>
                  </label>
                </div>

                <button
                  disabled={isLoading}
                  className="w-full py-3.5 bg-primary hover:bg-primary/90 text-on-primary text-label-md rounded-xl font-semibold shadow-md shadow-primary/20 flex items-center justify-center gap-2 transition-all"
                  type="submit"
                >
                  <span>
                    {isLoading
                      ? "Authenticating..."
                      : authMode === "login"
                      ? "Proceed to Secure Login"
                      : "Create Free Account"}
                  </span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </form>

              {/* Divider */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-outline-variant/30"></div>
                <span className="flex-shrink mx-4 text-body-sm text-outline">or explore instantly</span>
                <div className="flex-grow border-t border-outline-variant/30"></div>
              </div>

              {/* Quick Demo Access Button */}
              <button
                onClick={handleDemoLogin}
                className="w-full py-3 bg-surface-container-low hover:bg-surface-container text-primary rounded-xl text-label-md font-semibold border border-primary/20 transition-all flex items-center justify-center gap-2"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                <span>Continue with Instant Paper Trading Demo</span>
              </button>
            </div>
          </div>

          <div className="max-w-md w-full mx-auto pt-8 text-center text-body-sm text-outline">
            <span>By proceeding, you agree to BullRun&apos;s </span>
            <a href="#" className="text-primary hover:underline">Terms of Service</a>
            <span> and </span>
            <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
          </div>
        </div>
      </div>
    </div>
  );
}
