"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, AlertCircle } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const t = searchParams.get("token");
    if (t) setToken(t);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await apiRequest("/api/v1/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token,
          new_password: newPassword,
        }),
      });
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reset password. Invalid or expired token.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8FAFC] text-[#111827] select-none">
      <div className="w-full max-w-md space-y-6">
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
          <h2 className="text-lg font-semibold text-[#111827] pt-2">Set New Password</h2>
          <p className="text-xs text-[#6B7280] font-normal">Create a secure password for your trading account</p>
        </div>

        <div className="rounded-[10px] border border-[#E5E7EB] bg-white p-6 shadow-xs">
          {success ? (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-[#F0FDF4] text-[#16A34A] flex items-center justify-center mx-auto border border-[#BBF7D0]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-[#111827]">Password Updated Successfully</h3>
              <p className="text-xs text-[#6B7280] font-normal">
                Your password has been reset. Redirecting to sign in...
              </p>
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
                label="Reset Security Token"
                placeholder="Paste recovery token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />

              <Input
                label="New Password"
                type="password"
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <Button
                type="submit"
                size="lg"
                isLoading={isLoading}
                className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white font-medium text-xs shadow-xs rounded-[8px]"
              >
                Update Password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-xs text-slate-400">Loading reset form...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
