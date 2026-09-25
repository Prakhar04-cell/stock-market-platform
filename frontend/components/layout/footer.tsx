"use client";

import React from "react";
import Link from "next/link";
import { TrendingUp, ShieldCheck, HelpCircle, FileText, Activity, CheckCircle2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full bg-[#FFFFFF] border-t border-[#E5E7EB] text-[#111827] mt-auto">
      {/* Main Footer Links */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand & Overview */}
          <div className="col-span-2 lg:col-span-1">
            <Link href="/dashboard" className="flex items-center gap-2.5 mb-3 group">
              <div className="w-8 h-8 rounded-[8px] bg-[#0F172A] flex items-center justify-center text-white font-extrabold text-sm tracking-tight group-hover:bg-[#F97316] transition-colors">
                BR
              </div>
              <span className="text-xl font-extrabold tracking-tight text-[#111827]">
                Bull<span className="text-[#F97316]">Run</span>
              </span>
            </Link>
            <p className="text-xs text-[#6B7280] leading-relaxed mb-4">
              Modern high-speed trading and financial discovery platform. Real-time market data, interactive charts, and institutional-grade paper trading execution.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#16A34A]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>Platform Systems Operational</span>
            </div>
          </div>

          {/* BULLRUN */}
          <div>
            <h4 className="text-xs font-bold text-[#111827] tracking-wider uppercase mb-4">
              BullRun
            </h4>
            <ul className="space-y-2.5 text-xs text-[#6B7280]">
              <li>
                <Link href="/dashboard" className="hover:text-[#111827] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#111827] transition-colors">
                  Pricing &amp; Brokerage
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#111827] transition-colors">
                  Market Blog
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#111827] transition-colors">
                  Help &amp; Support
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#111827] transition-colors">
                  Trust &amp; Safety
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#111827] transition-colors">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>

          {/* PRODUCTS */}
          <div>
            <h4 className="text-xs font-bold text-[#111827] tracking-wider uppercase mb-4">
              Products
            </h4>
            <ul className="space-y-2.5 text-xs text-[#6B7280]">
              <li>
                <Link href="/stocks/NIFTY%2050" className="hover:text-[#111827] transition-colors">
                  Stocks &amp; Equities
                </Link>
              </li>
              <li>
                <Link href="/terminal" className="hover:text-[#111827] transition-colors flex items-center gap-1.5">
                  <span>Trading Terminal</span>
                  <span className="text-[10px] bg-[#FFF7ED] text-[#EA580C] px-1.5 py-0.5 rounded-[4px] font-bold">PRO</span>
                </Link>
              </li>
              <li>
                <Link href="/explore#etfs" className="hover:text-[#111827] transition-colors">
                  Exchange Traded Funds (ETFs)
                </Link>
              </li>
              <li>
                <Link href="/explore#bonds" className="hover:text-[#111827] transition-colors">
                  Bonds &amp; Fixed Income
                </Link>
              </li>
              <li>
                <Link href="/explore#ipo" className="hover:text-[#111827] transition-colors">
                  Initial Public Offerings (IPO)
                </Link>
              </li>
              <li>
                <Link href="/explore#commodities" className="hover:text-[#111827] transition-colors">
                  Commodities
                </Link>
              </li>
              <li>
                <Link href="/explore#screens" className="hover:text-[#111827] transition-colors">
                  Market Screener
                </Link>
              </li>
            </ul>
          </div>

          {/* TOOLS */}
          <div>
            <h4 className="text-xs font-bold text-[#111827] tracking-wider uppercase mb-4">
              Tools &amp; Analytics
            </h4>
            <ul className="space-y-2.5 text-xs text-[#6B7280]">
              <li>
                <Link href="/terminal" className="hover:text-[#111827] transition-colors">
                  Trading Terminal
                </Link>
              </li>
              <li>
                <Link href="/explore#screens" className="hover:text-[#111827] transition-colors">
                  Technical Screens
                </Link>
              </li>
              <li>
                <Link href="/portfolio" className="hover:text-[#111827] transition-colors">
                  Portfolio Analytics
                </Link>
              </li>
              <li>
                <Link href="/watchlist" className="hover:text-[#111827] transition-colors">
                  Multi-Asset Watchlists
                </Link>
              </li>
              <li>
                <Link href="/admin/monitoring" className="hover:text-[#111827] transition-colors">
                  System Health &amp; Feeds
                </Link>
              </li>
            </ul>
          </div>

          {/* LEGAL */}
          <div>
            <h4 className="text-xs font-bold text-[#111827] tracking-wider uppercase mb-4">
              Legal &amp; Compliance
            </h4>
            <ul className="space-y-2.5 text-xs text-[#6B7280]">
              <li>
                <Link href="/dashboard" className="hover:text-[#111827] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#111827] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#111827] transition-colors">
                  Risk Disclosure Document
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#111827] transition-colors">
                  Regulatory Disclaimers
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#111827] transition-colors">
                  Cybersecurity Policy
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#111827] transition-colors">
                  Investor Grievance Redressal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Regulatory Risk Disclaimer Banner */}
        <div className="mt-10 pt-6 border-t border-[#E5E7EB] text-[11px] text-[#6B7280] leading-relaxed">
          <div className="flex items-start gap-2 mb-2 font-medium text-[#111827]">
            <ShieldCheck className="w-4 h-4 text-[#F97316] flex-shrink-0 mt-0.5" />
            <span className="font-bold">Risk Disclosure on Derivatives &amp; Securities Trading</span>
          </div>
          <p>
            Securities trading and investment in equity shares, exchange-traded funds, mutual funds, and derivative instruments involve significant financial risk including loss of capital. Investors should independently assess market risk and consult certified financial advisors before transacting. BullRun provides simulated paper trading execution for education, algorithmic strategy validation, and real-time market data streaming.
          </p>
        </div>

        {/* Bottom Bar: Copyright & Platform Version */}
        <div className="mt-6 pt-6 border-t border-[#E5E7EB] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9CA3AF]">
          <div>
            © {new Date().getFullYear()} BullRun Technologies Inc. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
              BullRun Terminal v3.4.0 (Production)
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
