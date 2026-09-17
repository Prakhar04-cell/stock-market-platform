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
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 text-slate-900 select-none">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
              TX
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              Trade<span className="text-indigo-600">X</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-slate-900 pt-2">Reset Your Password</h2>
          <p className="text-xs text-slate-500">Enter your email to receive recovery instructions</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-card">
          {success ? (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Recovery Instructions Sent</h3>
              <p className="text-xs text-slate-500">
                If an account exists for {email}, recovery instructions have been initiated.
              </p>

              {resetToken && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-2 mt-4">
                  <span className="font-bold text-slate-700 block">Dev Sandbox Reset Link:</span>
                  <Link
                    href={`/reset-password?token=${resetToken}`}
                    className="text-indigo-600 font-mono text-[11px] underline block break-all"
                  >
                    Click to reset password with dev token
                  </Link>
                </div>
              )}

              <Link href="/login" className="block pt-3">
                <Button variant="outline" size="sm" className="w-full border-slate-300 text-slate-700 hover:bg-slate-50">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Input
                label="Email Address"
                type="email"
                placeholder="trader@tradex.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />

              <Button
                type="submit"
                size="lg"
                isLoading={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm"
              >
                Send Reset Link
              </Button>
            </form>
          )}
        </div>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
