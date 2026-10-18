"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest, setAuthTokens } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();

  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const remembered = localStorage.getItem("bullrun_remember_email");
      if (remembered) {
        setIdentifier(remembered);
      }
      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get("oauth_error");
      if (oauthError) {
        setErrorMessage(
          oauthError === "access_denied"
            ? "Google sign-in was cancelled. Please try again."
            : `Google authentication could not be completed: ${oauthError}`
        );
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const endpoint = authMode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/register";
      const payload =
        authMode === "login"
          ? { email: identifier.trim().toLowerCase(), password }
          : {
              email: identifier.trim().toLowerCase(),
              password,
              first_name: firstName.trim() || undefined,
              last_name: lastName.trim() || undefined,
            };

      const data = await apiRequest(endpoint, {
        method: "POST",
        body: payload,
      });

      if (typeof window !== "undefined") {
        if (data.access_token) {
          setAuthTokens(data.access_token, data.refresh_token);
        }
        if (rememberMe) {
          localStorage.setItem("bullrun_remember_email", identifier.trim().toLowerCase());
        } else {
          localStorage.removeItem("bullrun_remember_email");
        }
      }

      if (data.user?.roles?.includes("ADMIN") || data.user?.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || (authMode === "login" ? "Invalid email or password." : "Failed to register account.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      const state = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("bullrun_oauth_state", state);
        const redirectUri = `${window.location.origin}/auth/callback/google`;
        const res = await apiRequest(
          `/api/v1/auth/google/url?redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`
        );
        if (res?.url) {
          window.location.href = res.url;
        } else {
          throw new Error("Unable to obtain Google sign-in authorization URL.");
        }
      }
    } catch (err: any) {
      setIsGoogleLoading(false);
      setErrorMessage(
        err.message || "Google OAuth is currently unavailable. Please sign in with email and password."
      );
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const demoEmail = "demo@bullrun.in";
      const demoPassword = "DemoPassword123!";

      let data;
      try {
        data = await apiRequest("/api/v1/auth/login", {
          method: "POST",
          body: { email: demoEmail, password: demoPassword },
        });
      } catch (loginErr: any) {
        // If demo account does not exist in database, provision it
        data = await apiRequest("/api/v1/auth/register", {
          method: "POST",
          body: {
            email: demoEmail,
            password: demoPassword,
            first_name: "Demo",
            last_name: "Trader",
          },
        });
      }

      if (data?.access_token) {
        setAuthTokens(data.access_token, data.refresh_token);
        router.push("/dashboard");
      }
    } catch (err: any) {
      setErrorMessage("Could not initialize demo sandbox session: " + (err.message || "Network error"));
    } finally {
      setIsLoading(false);
    }
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
            <span>© 2026 BullRun Financial Tech</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tertiary-fixed"></span>
              <span>All systems normal</span>
            </div>
          </div>
        </div>

        {/* Right Side: Clean Login & Authentication Form (7 cols on lg) */}
        <div className="lg:col-span-7 bg-surface-container-lowest flex flex-col justify-between p-8 lg:p-16 overflow-y-auto">
          <div className="max-w-md w-full mx-auto space-y-6">
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
                  onClick={() => {
                    setAuthMode(authMode === "login" ? "signup" : "login");
                    setErrorMessage(null);
                  }}
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
                onClick={() => {
                  setAuthMode("login");
                  setErrorMessage(null);
                }}
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
                onClick={() => {
                  setAuthMode("signup");
                  setErrorMessage(null);
                }}
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
            <div className="space-y-5">
              <div className="space-y-1.5">
                <h2 className="font-headline-lg text-on-surface font-semibold">
                  {authMode === "login" ? "Welcome back" : "Create Account"}
                </h2>
                <p className="text-body-md text-outline">
                  {authMode === "login"
                    ? "Enter your credentials to access your secure trading portfolio."
                    : "Join over 250,000 traders with high-frequency paper execution."}
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-error-container text-on-error-container text-body-sm flex items-center gap-2 border border-error/20">
                  <span className="material-symbols-outlined text-[20px] shrink-0 text-error">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Continue with Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading}
                className="w-full py-3 px-4 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-xl font-semibold border border-outline-variant/30 shadow-xs flex items-center justify-center gap-3 transition-all hover:shadow cursor-pointer disabled:opacity-60"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.24C.45 8.16 0 9.94 0 12s.45 3.84 1.24 5.41l4.04-3.13z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.59l4.04 3.13c.95-2.83 3.6-4.97 6.72-4.97z"
                  />
                </svg>
                <span>{isGoogleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
              </button>

              {/* Divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-outline-variant/30"></div>
                <span className="flex-shrink mx-4 text-label-sm text-outline">or with email</span>
                <div className="flex-grow border-t border-outline-variant/30"></div>
              </div>

              {/* Traditional Auth Form */}
              <form className="space-y-4" onSubmit={handleSubmit}>
                {authMode === "signup" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-label-md text-on-surface font-medium">First Name</label>
                      <input
                        className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary transition-all border border-outline-variant/30"
                        placeholder="Arjun"
                        required
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-label-md text-on-surface font-medium">Last Name</label>
                      <input
                        className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary transition-all border border-outline-variant/30"
                        placeholder="Sharma"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-label-md text-on-surface font-medium">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <input
                      className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary transition-all border border-outline-variant/30"
                      placeholder="trader@domain.com"
                      required
                      type="email"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-label-md text-on-surface font-medium">
                      Password
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
                      placeholder="Minimum 8 characters"
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

                  <Link
                    href="/forgot-password"
                    className="text-body-sm text-primary hover:underline font-medium"
                  >
                    Forgot Password?
                  </Link>
                </div>

                <button
                  disabled={isLoading || isGoogleLoading}
                  className="w-full py-3.5 bg-primary hover:bg-primary/90 text-on-primary text-label-md rounded-xl font-semibold shadow-md shadow-primary/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
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
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-outline-variant/30"></div>
                <span className="flex-shrink mx-4 text-body-sm text-outline">or explore instantly</span>
                <div className="flex-grow border-t border-outline-variant/30"></div>
              </div>

              {/* Quick Demo Access Button */}
              <button
                onClick={handleDemoLogin}
                disabled={isLoading || isGoogleLoading}
                className="w-full py-3 bg-surface-container-low hover:bg-surface-container text-primary rounded-xl text-label-md font-semibold border border-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                <span>Continue with Instant Paper Trading Demo</span>
              </button>
            </div>
          </div>

          <div className="max-w-md w-full mx-auto pt-6 text-center text-body-sm text-outline">
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
