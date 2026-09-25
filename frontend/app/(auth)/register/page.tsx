"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, ArrowRight, AlertCircle, ShieldCheck } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await apiRequest("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
        }),
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("tradex_token", data.access_token);
        localStorage.setItem("tradex_refresh_token", data.refresh_token);
      }

      router.push("/dashboard");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create account. Please verify input.");
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
          <h2 className="text-lg font-bold text-[#111827] pt-2">Create Paper Trading Account</h2>
          <p className="text-xs text-[#6B7280]">
            Get instant ₹1,00,000 virtual capital to simulate Indian stock trades
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
                required
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
              className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold text-xs rounded-[8px]"
            >
              Get Free ₹1,00,000 &amp; Start Trading
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          <div className="pt-2 flex items-center gap-2 text-xs text-[#6B7280]">
            <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
            <span>Zero real financial risk. 100% simulated sandbox.</span>
          </div>
        </div>

        <p className="text-center text-xs text-[#6B7280]">
          Already have an account?{" "}
          <Link href="/login" className="text-[#F97316] hover:underline font-semibold">
            Sign In here
          </Link>
        </p>
      </div>
    </div>
  );
}
