"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface select-none">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex items-center justify-between px-space-lg lg:px-space-xl border-b border-outline-variant/20">
        <div className="flex items-center gap-space-lg">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold text-label-md">
              BR
            </div>
            <span className="font-headline-sm tracking-tight text-on-surface font-semibold">BullRun</span>
          </Link>
          <nav className="hidden xl:flex items-center gap-space-xs ml-space-lg">
            <Link
              href="/dashboard"
              className="px-space-md py-space-xs text-body-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/explore"
              className="px-space-md py-space-xs text-body-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors font-medium"
            >
              Explore Markets
            </Link>
            <Link
              href="/terminal"
              className="px-space-md py-space-xs text-body-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors font-medium"
            >
              Trading Terminal
            </Link>
            <Link
              href="/option-chain"
              className="px-space-md py-space-xs text-body-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors font-medium"
            >
              Option Chain
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-space-sm">
          <div className="hidden sm:flex items-center gap-space-xs px-space-sm py-space-xs bg-tertiary-container/10 rounded-full text-tertiary text-label-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
            <span>LIVE NSE &amp; BSE</span>
          </div>
          <Link
            href="/login"
            className="px-space-md py-space-xs text-label-md font-medium text-on-surface hover:bg-surface-container rounded-lg transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="px-space-md py-space-xs bg-primary hover:bg-primary/90 text-on-primary text-label-md font-semibold rounded-lg transition-colors shadow-sm"
          >
            Open Free Account
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 pt-16">
        <section className="px-space-lg lg:px-space-xl pt-16 pb-20 lg:pt-24 lg:pb-32 flex flex-col items-center text-center bg-surface relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="max-w-4xl mx-auto space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-space-md py-1 rounded-full bg-primary-fixed text-primary text-label-sm font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
              <span>Next-Gen Indian Stock Trading Architecture</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-on-surface leading-[1.12]">
              Trade Smarter, Faster, and Secure <span className="text-primary">with BullRun</span>
            </h1>

            <p className="text-base sm:text-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
              Experience lightning-fast execution, real-time Level-2 market depth, TradingView charts, and institutional risk management across NSE and BSE equities.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-space-md pt-4">
              <Link
                href="/login"
                className="w-full sm:w-auto px-space-xl py-space-md bg-primary hover:bg-primary/90 text-on-primary font-semibold text-label-md rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2"
              >
                <span>Start Trading Now</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
              <Link
                href="/explore"
                className="w-full sm:w-auto px-space-xl py-space-md bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold text-label-md rounded-xl transition-all"
              >
                Explore Live Markets
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-body-md text-on-surface-variant font-medium">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[20px]">verified_user</span>
                <span>SEBI Compliant Ledger</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[20px]">bolt</span>
                <span>Sub-10ms Upstox Gateway</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[20px]">account_balance_wallet</span>
                <span>₹10,00,000 Virtual Capital</span>
              </span>
            </div>
          </div>
        </section>

        {/* Feature Highlights Bento Grid */}
        <section className="px-space-lg lg:px-space-xl py-16 max-w-7xl mx-auto w-full">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-label-sm uppercase tracking-wider text-outline font-semibold">
              Built for Performance
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-on-surface mt-2">
              Everything You Need to Master the Markets
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
            <div className="bg-surface-container-lowest p-space-xl rounded-2xl shadow-sm border border-outline-variant/20 flex flex-col justify-between">
              <div className="w-12 h-12 rounded-xl bg-primary-container/10 text-primary flex items-center justify-center mb-space-md">
                <span className="material-symbols-outlined text-[24px]">candlestick_chart</span>
              </div>
              <h3 className="font-headline-sm font-semibold text-on-surface mb-2">
                TradingView Lightweight Charts
              </h3>
              <p className="text-body-md text-on-surface-variant leading-relaxed">
                Full-featured interactive candlesticks, volume bars, EMA, RSI, and custom timeframe aggregation.
              </p>
            </div>

            <div className="bg-surface-container-lowest p-space-xl rounded-2xl shadow-sm border border-outline-variant/20 flex flex-col justify-between">
              <div className="w-12 h-12 rounded-xl bg-tertiary-container/10 text-tertiary flex items-center justify-center mb-space-md">
                <span className="material-symbols-outlined text-[24px]">stream</span>
              </div>
              <h3 className="font-headline-sm font-semibold text-on-surface mb-2">
                Real-Time WebSocket Engine
              </h3>
              <p className="text-body-md text-on-surface-variant leading-relaxed">
                Live streaming tick-by-tick market data backed by primary broker feed with automatic fallback failover.
              </p>
            </div>

            <div className="bg-surface-container-lowest p-space-xl rounded-2xl shadow-sm border border-outline-variant/20 flex flex-col justify-between">
              <div className="w-12 h-12 rounded-xl bg-secondary-container text-secondary flex items-center justify-center mb-space-md">
                <span className="material-symbols-outlined text-[24px]">security</span>
              </div>
              <h3 className="font-headline-sm font-semibold text-on-surface mb-2">
                Double-Entry Ledger Audit
              </h3>
              <p className="text-body-md text-on-surface-variant leading-relaxed">
                Bank-grade transaction accounting with virtual margin calculation, charges simulation, and zero real risk.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-outline-variant/20 bg-surface-container-lowest py-space-xl px-space-lg lg:px-space-xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-space-md text-body-sm text-outline">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-primary text-on-primary text-xs font-bold flex items-center justify-center">
              BR
            </span>
            <span className="text-on-surface font-semibold">BullRun Trading Platform</span>
            <span>• © 2025</span>
          </div>
          <div className="flex items-center gap-space-lg">
            <Link href="/dashboard" className="hover:text-primary transition-colors">
              Dashboard
            </Link>
            <Link href="/explore" className="hover:text-primary transition-colors">
              Explore
            </Link>
            <Link href="/terminal" className="hover:text-primary transition-colors">
              Terminal
            </Link>
            <Link href="/admin" className="hover:text-primary transition-colors">
              Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
