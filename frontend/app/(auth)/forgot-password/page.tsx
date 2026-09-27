"use client";

import React, { useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail, CheckCircle2, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await apiRequest("/api/v1/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSuccess(true);
      if (res.reset_token) {
        setResetToken(res.reset_token);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit password reset request.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8FAFC] text-[#111827] select-none">
      <div className="w-full max-w-md space-y-5">
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
          <h2 className="text-lg font-semibold text-[#111827] pt-2">Reset Your Password</h2>
          <p className="text-xs text-[#6B7280] font-normal">Enter your email to receive recovery instructions</p>
        </div>

        <div className="rounded-[10px] border border-[#E5E7EB] bg-white p-6 space-y-4">
          {success ? (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-[#F0FDF4] text-[#16A34A] flex items-center justify-center mx-auto border border-[#BBF7D0]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-[#111827]">Recovery Instructions Sent</h3>
              <p className="text-xs text-[#6B7280] font-normal">
                If an account exists for {email}, recovery instructions have been initiated.
              </p>

              {resetToken && (
                <div className="p-3 bg-[#F8FAFC] rounded-[8px] border border-[#E5E7EB] text-left text-xs space-y-2 mt-4">
                  <span className="font-semibold text-[#111827] block">Dev Sandbox Reset Link:</span>
                  <Link
                    href={`/reset-password?token=${resetToken}`}
                    className="text-[#F97316] font-mono text-[11px] underline block break-all font-normal"
                  >
                    Click to reset password with dev token
                  </Link>
                </div>
              )}

              <Link href="/login" className="block pt-3">
                <Button variant="outline" size="sm" className="w-full border-[#E5E7EB] text-[#111827] hover:bg-[#F8FAFC] rounded-[8px] font-medium">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-[8px] bg-rose-50 border border-rose-200 text-[#DC2626] text-xs flex items-center gap-2 font-normal">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Input
                label="Email Address"
                type="email"
                placeholder="trader@bullrun.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />

              <Button
                type="submit"
                size="lg"
                isLoading={isLoading}
                className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white font-medium text-xs rounded-[8px]"
              >
                Send Reset Link
              </Button>
            </form>
          )}
        </div>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#111827] font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
