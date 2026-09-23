"use client";

import React from "react";
import Link from "next/link";
import { TrendingUp, ShieldCheck, HelpCircle, FileText, Activity } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full bg-[#FFFFFF] border-t border-[#E5E7EB] text-[#111827] mt-auto">
      {/* Main Footer Links */}
      <div className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand & Overview */}
          <div className="col-span-2 lg:col-span-1">
            <Link href="/dashboard" className="flex items-center gap-2 mb-4 group">
              <div className="w-8 h-8 rounded-lg bg-[#111827] flex items-center justify-center text-white font-bold text-base tracking-wider transition-transform group-hover:scale-105">
                TX
              </div>
              <span className="text-xl font-bold tracking-tight text-[#111827]">
                Trade<span className="text-[#4F46E5]">X</span>
              </span>
            </Link>
            <p className="text-xs text-[#6B7280] leading-relaxed mb-4">
              Modern high-speed trading and financial discovery platform. Real-time market data, interactive charts, and institutional-grade paper trading execution.
            </p>
            <div className="flex items-center gap-2 text-xs font-medium text-[#00A86B]">
              <span className="w-2 h-2 rounded-full bg-[#00A86B] animate-pulse" />
              <span>Platform Systems Operational</span>
            </div>
          </div>

          {/* TRADEX */}
          <div>
            <h4 className="text-xs font-semibold text-[#111827] tracking-wider uppercase mb-4">
              TradeX
            </h4>
            <ul className="space-y-2.5 text-xs text-[#6B7280]">
              <li>
                <Link href="/dashboard" className="hover:text-[#111827] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#111827] transition-colors">
                  Pricing & Brokerage
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#111827] transition-colors">
                  Market Blog
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#111827] transition-colors">
                  Help & Support
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#111827] transition-colors">
                  Trust & Safety
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
            <h4 className="text-xs font-semibold text-[#111827] tracking-wider uppercase mb-4">
              Products
            </h4>
            <ul className="space-y-2.5 text-xs text-[#6B7280]">
              <li>
                <Link href="/stocks/NIFTY%2050" className="hover:text-[#111827] transition-colors">
                  Stocks & Equities
                </Link>
              </li>
              <li>
                <Link href="/terminal" className="hover:text-[#111827] transition-colors flex items-center gap-1.5">
                  <span>Trading Terminal</span>
                  <span className="text-[10px] bg-[#EEF2FF] text-[#4F46E5] px-1.5 py-0.5 rounded font-semibold">PRO</span>
                </Link>
              </li>
              <li>
                <Link href="/explore#etfs" className="hover:text-[#111827] transition-colors">
                  Exchange Traded Funds (ETFs)
                </Link>
              </li>
              <li>
                <Link href="/explore#bonds" className="hover:text-[#111827] transition-colors">
                  Bonds & Fixed Income
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
                <Link href="/explore#screener" className="hover:text-[#111827] transition-colors">
                  Market Screener
                </Link>
              </li>
            </ul>
          </div>

          {/* TOOLS */}
          <div>
            <h4 className="text-xs font-semibold text-[#111827] tracking-wider uppercase mb-4">
              Tools & Analytics
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
                  System Health & Feeds
                </Link>
              </li>
            </ul>
          </div>

          {/* LEGAL */}
          <div>
            <h4 className="text-xs font-semibold text-[#111827] tracking-wider uppercase mb-4">
              Legal & Compliance
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
            <ShieldCheck className="w-4 h-4 text-[#4F46E5] flex-shrink-0 mt-0.5" />
            <span>Risk Disclosure on Derivatives & Securities Trading</span>
          </div>
          <p>
            Securities trading and investment in equity shares, exchange-traded funds, mutual funds, and derivative instruments involve significant financial risk including loss of capital. Investors should independently assess market risk and consult certified financial advisors before transacting. TradeX provides simulated paper trading execution for education, algorithmic strategy validation, and real-time market data streaming.
          </p>
        </div>

        {/* Bottom Bar: Copyright & Platform Version */}
        <div className="mt-6 pt-6 border-t border-[#F3F4F6] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9CA3AF]">
          <div>
            © {new Date().getFullYear()} TradeX Technologies Inc. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00A86B]" />
              TradeX Terminal v3.4.0 (Production)
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
