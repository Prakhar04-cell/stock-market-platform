"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Mail, ArrowRight, AlertCircle, Info } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await apiRequest("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("tradex_token", data.access_token);
        localStorage.setItem("tradex_refresh_token", data.refresh_token);
      }

      if (data.user?.roles?.includes("ADMIN")) {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid credentials. Please verify and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8FAFC] text-[#111827] select-none">
      <div className="w-full max-w-md space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-[8px] bg-[#0F172A] flex items-center justify-center text-white font-extrabold text-sm tracking-tight">
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
        <div className="rounded-[10px] border border-[#E5E7EB] bg-white p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-[8px] bg-rose-50 border border-rose-200 text-[#DC2626] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="trader@bullrun.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#374151]">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#F97316] hover:underline font-semibold"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              size="lg"
              isLoading={isLoading}
              className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold text-xs rounded-[8px]"
            >
              Sign In to BullRun
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          {/* Demo Sandbox Hint */}
          <div className="p-3 rounded-[8px] bg-[#F8FAFC] border border-[#E5E7EB] text-[#4B5563] text-xs flex items-start gap-2">
            <Info className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-[#111827] block">Phase 1 Sandbox Accounts</span>
              <span className="font-mono text-[11px]">Trader: trader1@tradex.com (Pass: Password123!)</span>
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
  );
}
