"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/formatters";
import {
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Info,
  Eye,
  EyeOff,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Shield,
  Layers,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [socialNotice, setSocialNotice] = useState<string | null>(null);

  // Mobile 3-Screen Flow State (1: Brand/Intro, 2: Login Form, 3: Welcome)
  const [mobileStep, setMobileStep] = useState<1 | 2 | 3>(1);
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

  // Swipe handling
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchEndX(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > 60;
    const isRightSwipe = distance < -60;

    if (isLeftSwipe && mobileStep === 1) {
      setMobileStep(2);
    } else if (isRightSwipe && mobileStep === 2) {
      setMobileStep(1);
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSocialNotice(null);

    try {
      const data = await apiRequest("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("tradex_token", data.access_token);
        localStorage.setItem("tradex_refresh_token", data.refresh_token);
        if (rememberMe) {
          localStorage.setItem("bullrun_remember_email", email);
        } else {
          localStorage.removeItem("bullrun_remember_email");
        }
      }

      setLoggedInUser(data.user);

      // On mobile: show Screen 3 (Welcome); on desktop: direct route
      if (window.innerWidth < 768) {
        setMobileStep(3);
      } else {
        if (data.user?.roles?.includes("ADMIN")) {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || "Invalid credentials. Please verify and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutofillDemo = () => {
    setEmail("trader1@tradex.com");
    setPassword("Password123!");
    setErrorMessage(null);
  };

  const handleSocialClick = (provider: string) => {
    setSocialNotice(
      `${provider} sign-in is in preview mode. Please use your BullRun email credentials.`
    );
    setTimeout(() => setSocialNotice(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#111827] select-none">
      {/* ============================================================ */}
      {/* 1. MOBILE 3-SCREEN EXPERIENCE (< 768px)                      */}
      {/* ============================================================ */}
      <div
        className="md:hidden min-h-screen flex flex-col justify-between overflow-x-hidden relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top Floating Step Progress Indicator */}
        <div className="pt-4 px-6 flex items-center justify-between z-30">
          {mobileStep > 1 && mobileStep < 3 ? (
            <button
              onClick={() => setMobileStep((prev) => (prev - 1) as 1 | 2)}
              className="p-2 -ml-2 rounded-full text-[#4B5563] hover:text-[#111827] hover:bg-[#F8FAFC] min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
              aria-label="Go to previous step"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-10" />
          )}

          {/* Dots Indicator: ● ○ ○ | ○ ● ○ | ○ ○ ● */}
          <div className="flex items-center gap-2" role="tablist" aria-label="Login flow steps">
            {[1, 2, 3].map((step) => (
              <button
                key={step}
                role="tab"
                aria-selected={mobileStep === step}
                onClick={() => {
                  // Only allow jumping between step 1 & 2 directly, step 3 is reached on login
                  if (step < 3 || loggedInUser) {
                    setMobileStep(step as 1 | 2 | 3);
                  }
                }}
                className={`transition-all duration-300 rounded-full ${
                  mobileStep === step
                    ? "w-6 h-2 bg-[#F97316]"
                    : "w-2 h-2 bg-[#E5E7EB] hover:bg-[#CBD5E1]"
                }`}
                aria-label={`Step ${step}`}
              />
            ))}
          </div>

          <div className="w-10 text-right">
            {mobileStep === 1 && (
              <button
                onClick={() => setMobileStep(2)}
                className="text-xs font-semibold text-[#F97316] hover:underline"
              >
                Skip
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Multi-Screen Slider */}
        <div className="flex-1 flex flex-col relative w-full overflow-hidden">
          <div
            className="flex-1 flex transition-transform duration-300 ease-in-out w-[300%]"
            style={{ transform: `translateX(-${(mobileStep - 1) * (100 / 3)}%)` }}
          >
            {/* -------------------------------------------------------- */}
            {/* SCREEN 1 — BRAND / INTRO                                 */}
            {/* -------------------------------------------------------- */}
            <div className="w-1/3 flex-1 flex flex-col justify-between px-6 pt-4 pb-8">
              {/* Brand Logo & Hero Visual */}
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                {/* Logo Mark */}
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-14 h-14 rounded-[12px] bg-[#0F172A] flex items-center justify-center text-white font-extrabold text-2xl tracking-tight shadow-md">
                    <span>B</span>
                    <span className="text-[#F97316]">R</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-[#111827]">
                      Bull<span className="text-[#F97316]">Run</span>
                    </h1>
                    <span className="text-[11px] font-mono uppercase tracking-widest text-[#6B7280]">
                      Next-Gen Paper Trading
                    </span>
                  </div>
                </div>

                {/* Subtle Market Graph Visual */}
                <div className="w-full max-w-[320px] bg-[#F8FAFC] border border-[#E5E7EB] rounded-[12px] p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between text-left">
                    <div>
                      <span className="text-[11px] font-bold text-[#111827] block">NIFTY 50</span>
                      <span className="text-xs font-mono font-bold text-[#111827] tabular-nums">
                        ₹23,350.25
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-[4px] bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] text-[10px] font-bold font-mono">
                      +1.24% ▲
                    </span>
                  </div>

                  {/* Stylized SVG Chart Line */}
                  <div className="h-16 w-full relative">
                    <svg
                      viewBox="0 0 280 60"
                      className="w-full h-full overflow-visible"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F97316" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#F97316" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,45 Q35,40 70,30 T140,22 T210,12 T280,5"
                        fill="none"
                        stroke="#F97316"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M0,45 Q35,40 70,30 T140,22 T210,12 T280,5 L280,60 L0,60 Z"
                        fill="url(#chartGradient)"
                      />
                      <circle cx="280" cy="5" r="4" fill="#F97316" />
                    </svg>
                  </div>

                  <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between text-[10px] text-[#6B7280]">
                    <span className="flex items-center gap-1 font-semibold text-[#16A34A]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                      Virtual ₹1,00,000 Live
                    </span>
                    <span>Zero Financial Risk</span>
                  </div>
                </div>

                {/* Tagline & Feature Highlights */}
                <div className="space-y-2">
                  <h2 className="text-xl font-extrabold text-[#111827] tracking-tight">
                    Invest Smarter. <span className="text-[#F97316]">Trade Better.</span>
                  </h2>
                  <p className="text-xs text-[#4B5563] max-w-[280px] mx-auto leading-relaxed">
                    Master real Indian stock market mechanics with high-speed simulations and audited ledger accounting.
                  </p>
                </div>

                <div className="space-y-2 text-left w-full max-w-[280px]">
                  <div className="flex items-center gap-2 text-xs text-[#374151]">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                    <span>Real-time NSE &amp; BSE market prices</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#374151]">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                    <span>Instant ₹1,00,000 virtual trading wallet</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#374151]">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                    <span>Audited double-entry ledger execution</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 space-y-3">
                <Button
                  onClick={() => setMobileStep(2)}
                  className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold text-sm rounded-[10px] py-3.5 min-h-[48px] shadow-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
                >
                  <span>Continue to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <p className="text-center text-[11px] text-[#6B7280]">
                  Swipe left or tap to continue
                </p>
              </div>
            </div>

            {/* -------------------------------------------------------- */}
            {/* SCREEN 2 — LOGIN FORM                                    */}
            {/* -------------------------------------------------------- */}
            <div className="w-1/3 flex-1 flex flex-col justify-between px-6 pt-2 pb-6 overflow-y-auto">
              <div className="space-y-5">
                {/* Header branding */}
                <div className="text-center space-y-1 pt-1">
                  <div className="w-10 h-10 rounded-[10px] bg-[#0F172A] flex items-center justify-center text-white font-black text-base mx-auto shadow-xs">
                    <span>B</span>
                    <span className="text-[#F97316]">R</span>
                  </div>
                  <h2 className="text-xl font-bold text-[#111827] pt-1">Welcome Back</h2>
                  <p className="text-xs text-[#6B7280]">
                    Sign in to continue to BullRun
                  </p>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-3 rounded-[8px] bg-rose-50 border border-rose-200 text-[#DC2626] text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Social Notice */}
                {socialNotice && (
                  <div className="p-3 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA] text-[#EA580C] text-xs flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>{socialNotice}</span>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email Input */}
                  <div className="space-y-1">
                    <label
                      htmlFor="mobile-email"
                      className="text-xs font-semibold text-[#374151] block"
                    >
                      Email Address
                    </label>
                    <input
                      id="mobile-email"
                      type="email"
                      autoComplete="email"
                      placeholder="trader@bullrun.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-3.5 py-3 rounded-[8px] border border-[#E5E7EB] text-sm text-[#111827] bg-white placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all min-h-[44px]"
                    />
                  </div>

                  {/* Password Input with Visibility Toggle */}
                  <div className="space-y-1">
                    <label
                      htmlFor="mobile-password"
                      className="text-xs font-semibold text-[#374151] block"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="mobile-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full pl-3.5 pr-11 py-3 rounded-[8px] border border-[#E5E7EB] text-sm text-[#111827] bg-white placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-0 top-0 bottom-0 px-3 flex items-center justify-center text-[#9CA3AF] hover:text-[#111827] min-w-[44px] min-h-[44px]"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me & Forgot Password Row */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#4B5563]">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-[#D1D5DB] text-[#F97316] focus:ring-[#F97316] accent-[#F97316]"
                      />
                      <span>Remember me</span>
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-[#F97316] hover:underline font-semibold"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold text-sm rounded-[8px] py-3 min-h-[46px] shadow-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
                  >
                    {isLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Signing In...</span>
                      </span>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>

                {/* OR Divider */}
                <div className="relative flex items-center justify-center my-3">
                  <div className="border-t border-[#E5E7EB] w-full" />
                  <span className="bg-white px-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider relative z-10">
                    OR
                  </span>
                </div>

                {/* Social Sign In Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSocialClick("Google")}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-[8px] border border-[#E5E7EB] bg-white text-xs font-semibold text-[#374151] hover:bg-[#F8FAFC] min-h-[44px] transition-colors"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSocialClick("Apple")}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-[8px] border border-[#E5E7EB] bg-white text-xs font-semibold text-[#374151] hover:bg-[#F8FAFC] min-h-[44px] transition-colors"
                  >
                    <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.07 1.72-.94 2.74 1 .08 2.03-.49 2.65-1.24z" />
                    </svg>
                    <span>Apple</span>
                  </button>
                </div>

                {/* Demo Sandbox Quick Autofill Badge */}
                <div
                  onClick={handleAutofillDemo}
                  className="p-3 rounded-[8px] bg-[#F8FAFC] border border-[#E5E7EB] text-[#4B5563] text-xs flex items-center justify-between cursor-pointer hover:bg-[#F1F5F9] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#F97316] shrink-0" />
                    <span className="text-[11px]">
                      Quick Test: <strong className="text-[#111827]">trader1@tradex.com</strong>
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-[#F97316] bg-[#FFF7ED] px-2 py-0.5 rounded border border-[#FED7AA]">
                    Autofill
                  </span>
                </div>
              </div>

              {/* Bottom Sign Up Link */}
              <div className="pt-4 text-center">
                <p className="text-xs text-[#6B7280]">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/register"
                    className="text-[#F97316] hover:underline font-bold"
                  >
                    Sign Up
                  </Link>
                </p>
              </div>
            </div>

            {/* -------------------------------------------------------- */}
            {/* SCREEN 3 — WELCOME / PERSONALIZATION                     */}
            {/* -------------------------------------------------------- */}
            <div className="w-1/3 flex-1 flex flex-col justify-between px-6 pt-6 pb-8 text-center">
              <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                {/* Celebration Icon */}
                <div className="w-16 h-16 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center text-[#16A34A] shadow-sm animate-in zoom-in-50 duration-300">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-2xl font-black text-[#111827] tracking-tight">
                    Welcome to BullRun 👋
                  </h2>
                  <p className="text-xs text-[#4B5563] max-w-[260px] mx-auto">
                    Your smarter trading journey starts here. Your sandbox is ready.
                  </p>
                </div>

                {/* Account Summary Card */}
                <div className="w-full max-w-[320px] bg-[#F8FAFC] border border-[#E5E7EB] rounded-[12px] p-4 text-left space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#6B7280]">Virtual Capital</span>
                    <span className="px-2 py-0.5 rounded-[4px] bg-[#F0FDF4] text-[#16A34A] text-[10px] font-bold">
                      ● Active
                    </span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-[#111827] tabular-nums">
                    {formatINR(100000)}
                  </div>

                  <div className="pt-2 border-t border-[#E5E7EB] space-y-1.5 text-xs text-[#4B5563]">
                    <div className="flex items-center justify-between text-[11px]">
                      <span>Account Status</span>
                      <span className="font-semibold text-[#111827]">Phase 1 Sandbox</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span>Market Feeds</span>
                      <span className="font-semibold text-[#16A34A]">NSE &amp; BSE Online</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation CTAs */}
              <div className="space-y-2.5 pt-4">
                <Button
                  onClick={() => router.push("/explore")}
                  className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold text-sm rounded-[10px] py-3.5 min-h-[48px] shadow-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
                >
                  <span>Explore Markets</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard")}
                  className="w-full border-[#E5E7EB] text-[#111827] hover:bg-[#F8FAFC] font-semibold text-sm rounded-[10px] py-3 min-h-[46px] transition-all"
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. DESKTOP EXPERIENCE (>= 768px)                             */}
      {/* ============================================================ */}
      <div className="hidden md:flex min-h-screen items-center justify-center p-4 bg-[#F8FAFC]">
        <div className="w-full max-w-md space-y-5">
          {/* Brand Header */}
          <div className="text-center space-y-1">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-8 h-8 rounded-[8px] bg-[#0F172A] flex items-center justify-center text-white font-extrabold text-sm tracking-tight shadow-xs">
                <span>B</span>
                <span className="text-[#F97316]">R</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-[#111827]">
                Bull<span className="text-[#F97316]">Run</span>
              </span>
            </Link>
            <h2 className="text-lg font-bold text-[#111827] pt-2">Welcome Back</h2>
            <p className="text-xs text-[#6B7280]">
              Sign in to access your virtual paper wallet and trading terminal
            </p>
          </div>

          {/* Form Card */}
          <div className="rounded-[10px] border border-[#E5E7EB] bg-white p-6 space-y-4 shadow-xs">
            {errorMessage && (
              <div className="p-3 rounded-[8px] bg-rose-50 border border-rose-200 text-[#DC2626] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="desktop-email"
                  className="text-xs font-semibold text-[#374151] block"
                >
                  Email Address
                </label>
                <input
                  id="desktop-email"
                  type="email"
                  autoComplete="email"
                  placeholder="trader@bullrun.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-[8px] border border-[#E5E7EB] text-sm text-[#111827] bg-white placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="desktop-password"
                    className="text-xs font-semibold text-[#374151]"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-[#F97316] hover:underline font-semibold"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="desktop-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-[8px] border border-[#E5E7EB] text-sm text-[#111827] bg-white placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 bottom-0 px-3 flex items-center justify-center text-[#9CA3AF] hover:text-[#111827]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isLoading}
                className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold text-xs rounded-[8px] py-2.5"
              >
                {isLoading ? "Signing In..." : "Sign In to BullRun"}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>

            {/* Demo Sandbox Hint */}
            <div
              onClick={handleAutofillDemo}
              className="p-3 rounded-[8px] bg-[#F8FAFC] border border-[#E5E7EB] text-[#4B5563] text-xs flex items-start gap-2 cursor-pointer hover:bg-[#F1F5F9] transition-colors"
            >
              <Info className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#111827]">Phase 1 Sandbox Accounts</span>
                  <span className="text-[10px] text-[#F97316] font-semibold underline">Autofill</span>
                </div>
                <span className="font-mono text-[11px] block">Trader: trader1@tradex.com (Pass: Password123!)</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-[#6B7280]">
            Don&apos;t have an account yet?{" "}
            <Link href="/register" className="text-[#F97316] hover:underline font-semibold">
              Create a free paper account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
