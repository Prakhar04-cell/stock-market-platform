"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest, setAuthTokens } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, AlertCircle, ShieldCheck } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await apiRequest("/api/v1/auth/register", {
        method: "POST",
        body: {
          email: email.trim().toLowerCase(),
          password,
          first_name: firstName.trim() || undefined,
          last_name: lastName.trim() || undefined,
        },
      });

      if (typeof window !== "undefined") {
        setAuthTokens(data.access_token, data.refresh_token);
      }

      router.push("/dashboard");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create account. Please verify input.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
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
          throw new Error("Unable to obtain Google sign-up authorization URL.");
        }
      }
    } catch (err: any) {
      setIsGoogleLoading(false);
      setErrorMessage(err.message || "Google registration is currently unavailable. Please sign up with email.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8FAFC] text-[#111827] select-none">
      <div className="w-full max-w-md space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-[8px] bg-[#0F172A] flex items-center justify-center text-white font-semibold text-sm tracking-tight">
              <span>B</span>
              <span className="text-[#F97316]">R</span>
            </div>
            <span className="text-xl font-semibold tracking-tight text-[#111827]">
              Bull<span className="text-[#F97316]">Run</span>
            </span>
          </Link>
          <h2 className="text-lg font-semibold text-[#111827] pt-2">Create Paper Trading Account</h2>
          <p className="text-xs text-[#6B7280] font-normal">
            Get instant ₹1,00,000 virtual capital to simulate Indian stock trades
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-[10px] border border-[#E5E7EB] bg-white p-6 space-y-4 shadow-sm">
          {errorMessage && (
            <div className="p-3 rounded-[8px] bg-rose-50 border border-rose-200 text-[#DC2626] text-xs flex items-center gap-2 font-normal">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Continue with Google */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={isGoogleLoading || isLoading}
            className="w-full py-2.5 px-4 bg-white hover:bg-neutral-50 text-neutral-800 rounded-[8px] font-medium text-xs border border-[#E5E7EB] shadow-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-60"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
            <div className="flex-grow border-t border-[#E5E7EB]"></div>
            <span className="flex-shrink mx-3 text-[11px] text-[#9CA3AF] uppercase font-medium">or with email</span>
            <div className="flex-grow border-t border-[#E5E7EB]"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                placeholder="Prakhar"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <Input
                label="Last Name"
                placeholder="Singh"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <Input
              label="Email Address"
              type="email"
              placeholder="trader@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              hint="Must contain uppercase, lowercase, digit and symbol"
            />

            <Button
              type="submit"
              size="lg"
              isLoading={isLoading}
              className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white font-medium text-xs rounded-[8px]"
            >
              Get Free ₹1,00,000 &amp; Start Trading
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          <div className="pt-2 flex items-center gap-2 text-xs text-[#6B7280] font-normal">
            <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
            <span>Zero real financial risk. 100% simulated sandbox.</span>
          </div>
        </div>

        <p className="text-center text-xs text-[#6B7280]">
          Already have an account?{" "}
          <Link href="/login" className="text-[#F97316] hover:underline font-medium">
            Sign In here
          </Link>
        </p>
      </div>
    </div>
  );
}
