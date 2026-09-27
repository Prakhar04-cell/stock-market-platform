"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Shield, Zap, BarChart2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#111827] select-none">
      {/* Navigation Header */}
      <header className="h-14 border-b border-[#E5E7EB] bg-white px-4 sm:px-8 lg:px-12 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[8px] bg-[#0F172A] flex items-center justify-center text-white font-semibold text-sm tracking-tight">
            <span className="text-white">B</span>
            <span className="text-[#F97316]">R</span>
          </div>
          <div>
            <span className="text-base font-semibold tracking-tight text-[#111827] flex items-center">
              Bull<span className="text-[#F97316]">Run</span>
            </span>
            <span className="text-[10px] text-[#6B7280] uppercase tracking-wider block font-mono font-normal">
              Fintech Platform
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#4B5563]">
          <Link href="/explore" className="hover:text-[#F97316] transition-colors">Explore Markets</Link>
          <Link href="/terminal" className="hover:text-[#F97316] transition-colors">Trading Terminal</Link>
          <Link href="/portfolio" className="hover:text-[#F97316] transition-colors">Portfolio</Link>
          <Link href="/admin/monitoring" className="hover:text-[#F97316] transition-colors">Diagnostics</Link>
        </nav>

        <div className="flex items-center gap-2.5">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-xs font-medium text-[#4B5563] hover:text-[#111827] rounded-[8px]">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-medium rounded-[8px]">
              Open Paper Account
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="px-4 sm:px-8 pt-12 pb-16 lg:pt-20 lg:pb-24 flex flex-col items-center text-center bg-white border-b border-[#E5E7EB]">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] border border-[#FED7AA] bg-[#FFF7ED] text-[#EA580C] text-xs font-medium tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F97316]" />
              Phase 1 Foundation Live • Zero Financial Risk
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-[#111827] leading-[1.15]">
              Master Indian Stock Trading <span className="text-[#F97316]">With BullRun</span>
            </h1>

            <p className="text-sm sm:text-base text-[#4B5563] max-w-2xl mx-auto leading-relaxed font-normal">
              BullRun provides an original, high-performance paper-trading architecture. Experience real order-book mechanics, strict double-entry ledger auditing, and comprehensive portfolio analytics with zero real-money exposure.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto bg-[#F97316] hover:bg-[#EA580C] text-white font-medium text-xs rounded-[8px] px-6 py-2.5">
                  Open Free Paper Account
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
              <Link href="/explore">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-[#E5E7EB] text-[#111827] hover:bg-[#F8FAFC] text-xs font-medium rounded-[8px] px-6 py-2.5">
                  Explore Markets
                </Button>
              </Link>
            </div>

            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-[#4B5563] font-normal">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                <span>₹1,00,000 Virtual Capital</span>
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                <span>NSE &amp; BSE Index Ticker Tape</span>
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                <span>Zero Brokerage / Zero Risk</span>
              </span>
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="px-4 sm:px-8 py-14 lg:px-12 max-w-7xl mx-auto w-full">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl font-semibold tracking-tight text-[#111827]">
              Engineered for Modern Indian Traders
            </h2>
            <p className="text-xs text-[#6B7280] mt-1 font-normal">
              Built from scratch with strict financial math, immutable double-entry ledgers, and fast UX.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <article className="p-5 rounded-[10px] border border-[#E5E7EB] bg-white space-y-3">
              <div className="w-9 h-9 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center text-[#EA580C]">
                <BarChart2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-[#111827]">Dual Discovery &amp; Terminal Modes</h3>
              <p className="text-xs text-[#6B7280] leading-relaxed font-normal">
                Seamlessly switch between Groww-style market discovery (top movers, sector breadth, news) and an Upstox Pro-style interactive candlestick trading terminal.
              </p>
            </article>

            <article className="p-5 rounded-[10px] border border-[#E5E7EB] bg-white space-y-3">
              <div className="w-9 h-9 rounded-[8px] bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center text-[#16A34A]">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-[#111827]">Audited Paper Wallet</h3>
              <p className="text-xs text-[#6B7280] leading-relaxed font-normal">
                Every simulated fill updates an audited PostgreSQL double-entry transaction ledger with exact Python Decimal precision, ensuring trustworthy accounting.
              </p>
            </article>

            <article className="p-5 rounded-[10px] border border-[#E5E7EB] bg-white space-y-3">
              <div className="w-9 h-9 rounded-[8px] bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center text-[#EA580C]">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-[#111827]">Truthful Phase 1 Architecture</h3>
              <p className="text-xs text-[#6B7280] leading-relaxed font-normal">
                Never displays fabricated fake prices as real data. Live quotes and broker execution gateways are explicitly declared offline until verified Phase 2 integrations.
              </p>
            </article>
          </div>
        </section>
      </main>

      {/* Clean Professional Footer */}
      <footer className="mt-auto border-t border-[#E5E7EB] bg-[#F8FAFC] px-4 sm:px-8 lg:px-12 py-6 text-xs text-[#6B7280]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#111827]">BullRun</span>
            <span>•</span>
            <span className="font-normal">© 2026 BullRun Technologies Inc. All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center gap-5 font-normal">
            <Link href="/explore" className="hover:text-[#111827] transition-colors">Explore</Link>
            <Link href="/terminal" className="hover:text-[#111827] transition-colors">Terminal</Link>
            <Link href="/portfolio" className="hover:text-[#111827] transition-colors">Portfolio</Link>
            <Link href="/admin/monitoring" className="hover:text-[#111827] transition-colors">Diagnostics</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
