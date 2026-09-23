"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Shield, Zap, TrendingUp, BarChart2, Layers, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 select-none">
      {/* Navigation Header */}
      <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 lg:px-16 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
            TX
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-0.5">
              Trade<span className="text-indigo-600">X</span>
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-mono">
              Fintech Platform
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
          <Link href="/explore" className="hover:text-indigo-600 transition-colors">Explore Markets</Link>
          <Link href="/terminal" className="hover:text-indigo-600 transition-colors">Trading Terminal</Link>
          <Link href="/portfolio" className="hover:text-indigo-600 transition-colors">Portfolio</Link>
          <Link href="/admin/monitoring" className="hover:text-indigo-600 transition-colors">Diagnostics</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-xs">Sign In</Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm">
              Open Paper Account
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-16 pb-20 lg:pt-24 lg:pb-28 flex flex-col items-center text-center bg-gradient-to-b from-slate-50/80 via-white to-white border-b border-slate-100">
        <div className="relative z-10 max-w-4xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-semibold tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            Phase 1 Foundation Live • Zero Financial Risk
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            Master Indian Stock Trading with <span className="text-indigo-600">Precision &amp; Confidence.</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            TradeX provides an original, high-performance paper-trading architecture. Experience real order-book mechanics, strict double-entry ledger auditing, and comprehensive portfolio analytics with zero real-money exposure.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm">
                Open Free Paper Account
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold">
                Explore Terminal Demo
              </Button>
            </Link>
          </div>

          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" /> ₹1,00,000 Virtual Capital
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" /> NSE &amp; BSE Index Ticker Tape
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" /> Zero Brokerage / Zero Risk
            </span>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="px-6 py-16 lg:px-16 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Engineered for Modern Indian Traders
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Built from scratch with strict financial math, immutable double-entry ledgers, and fast UX.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl border border-slate-200/90 bg-white shadow-card space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <BarChart2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Dual Discovery &amp; Terminal Modes</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Seamlessly switch between Groww-style market discovery (top movers, sector breadth, news) and an Upstox Pro-style interactive candlestick trading terminal.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200/90 bg-white shadow-card space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Audited Paper Wallet</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every simulated fill updates an audited PostgreSQL double-entry transaction ledger with exact Python Decimal precision, ensuring trustworthy accounting.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200/90 bg-white shadow-card space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Truthful Phase 1 Architecture</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Never displays fabricated fake prices as real data. Live quotes and broker execution gateways are explicitly declared offline until verified Phase 2 integrations.
            </p>
          </div>
        </div>
      </section>

      {/* Clean Professional Footer (Section 26) */}
      <footer className="mt-auto border-t border-slate-200 bg-slate-50/80 px-6 lg:px-16 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">TradeX</span>
            <span>•</span>
            <span>© 2026 TradeX Technologies Ltd. All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-medium">
            <Link href="/dashboard" className="hover:text-slate-900 transition-colors">About</Link>
            <Link href="/dashboard" className="hover:text-slate-900 transition-colors">Documentation</Link>
            <Link href="/dashboard" className="hover:text-slate-900 transition-colors">Security</Link>
            <Link href="/dashboard" className="hover:text-slate-900 transition-colors">Terms</Link>
            <Link href="/dashboard" className="hover:text-slate-900 transition-colors">Privacy</Link>
            <Link href="/dashboard" className="hover:text-slate-900 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
