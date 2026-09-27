"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SetUpMpinPage() {
  const router = useRouter();

  const [mpin, setMpin] = useState<string[]>(["", "", "", "", "", ""]);
  const [confirmMpin, setConfirmMpin] = useState<string[]>(["", "", "", "", "", ""]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const mpinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmMpinRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleInputChange = (
    value: string,
    index: number,
    isConfirm: boolean
  ) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    if (isConfirm) {
      const copy = [...confirmMpin];
      copy[index] = digit;
      setConfirmMpin(copy);
      if (digit && index < 5) {
        confirmMpinRefs.current[index + 1]?.focus();
      }
    } else {
      const copy = [...mpin];
      copy[index] = digit;
      setMpin(copy);
      if (digit && index < 5) {
        mpinRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    isConfirm: boolean
  ) => {
    if (e.key === "Backspace") {
      if (isConfirm) {
        if (!confirmMpin[index] && index > 0) {
          confirmMpinRefs.current[index - 1]?.focus();
        }
      } else {
        if (!mpin[index] && index > 0) {
          mpinRefs.current[index - 1]?.focus();
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const mpinStr = mpin.join("");
    const confirmStr = confirmMpin.join("");

    if (mpinStr.length < 6 || confirmStr.length < 6) {
      setErrorMessage("Please enter all 6 digits for both MPIN fields.");
      return;
    }

    if (mpinStr !== confirmStr) {
      setErrorMessage("MPIN and Confirm MPIN do not match. Please try again.");
      return;
    }

    if (mpinStr === "123456" || mpinStr === "000000" || mpinStr === "111111") {
      setErrorMessage("Please choose a less predictable PIN (avoid 123456 or repeated digits).");
      return;
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("bullrun_mpin_configured", "true");
    }

    setIsSuccess(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 1200);
  };

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-4rem)] items-center justify-center p-space-md lg:p-space-xl bg-surface">
      <div className="w-full max-w-5xl bg-surface-container-lowest rounded-xl shadow-xl overflow-hidden flex flex-col lg:flex-row border border-outline-variant/20">
        {/* Left Split: Deep Indigo Gradient with Security Highlights */}
        <div className="lg:w-5/12 bg-primary-container p-space-xl flex flex-col justify-between text-on-primary relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-tertiary/20 blur-2xl pointer-events-none"></div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-white/10 backdrop-blur-md text-label-sm font-medium mb-space-lg text-on-primary-container">
              <span className="material-symbols-outlined text-[16px]">lock_reset</span>
              <span>Account Security</span>
            </div>
            <h1 className="font-headline-xl text-on-primary mb-space-md font-semibold tracking-tight">
              Instant, Secure Access
            </h1>
            <p className="font-body-lg text-on-primary/80 leading-relaxed">
              Your MPIN secures your portfolio transactions and enables one-touch trading across all BullRun terminals without compromising on institutional-grade cryptography.
            </p>
          </div>

          <div className="relative z-10 space-y-space-md my-space-xl">
            <div className="flex items-start gap-space-md bg-white/5 p-space-md rounded-xl backdrop-blur-sm border border-white/10">
              <div className="p-space-xs rounded-lg bg-white/10 text-on-primary shrink-0">
                <span className="material-symbols-outlined text-[20px]">shield</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-on-primary font-semibold">256-Bit Encryption</h3>
                <p className="font-body-sm text-on-primary/70">
                  End-to-end local hashing protects your keys from interception.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-space-md bg-white/5 p-space-md rounded-xl backdrop-blur-sm border border-white/10">
              <div className="p-space-xs rounded-lg bg-white/10 text-on-primary shrink-0">
                <span className="material-symbols-outlined text-[20px]">bolt</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-on-primary font-semibold">Lightning Execution</h3>
                <p className="font-body-sm text-on-primary/70">
                  Bypass standard SMS OTPs during high-volatility market windows.
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-space-md border-t border-white/10 flex items-center justify-between text-body-sm text-on-primary/60">
            <span>BullRun Security Engine</span>
            <span>v4.2.0-stable</span>
          </div>
        </div>

        {/* Right Split: MPIN Setup Form */}
        <div className="lg:w-7/12 p-space-xl lg:p-12 flex flex-col justify-center bg-surface-container-lowest">
          <div className="max-w-md mx-auto w-full">
            {/* Header */}
            <div className="mb-space-lg">
              <div className="w-12 h-12 rounded-xl bg-primary-container/10 text-primary flex items-center justify-center mb-space-md">
                <span className="material-symbols-outlined text-[24px]">vpn_key</span>
              </div>
              <h2 className="font-headline-lg text-on-surface font-semibold mb-space-xs">
                Set up your 6-Digit MPIN
              </h2>
              <p className="font-body-md text-on-surface-variant">
                Create a secure 6-digit MPIN for lightning-fast logins without entering passwords.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-space-md p-space-md bg-error-container text-on-error-container rounded-xl text-body-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {isSuccess && (
              <div className="mb-space-md p-space-md bg-tertiary-container/20 text-tertiary rounded-xl text-body-sm flex items-center gap-2 font-medium">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                <span>MPIN successfully configured! Redirecting to Dashboard...</span>
              </div>
            )}

            {/* Form Fields */}
            <form className="space-y-space-lg" onSubmit={handleSubmit}>
              {/* Enter MPIN Section */}
              <div>
                <label className="block font-label-md text-on-surface font-medium mb-space-sm">
                  Enter 6-Digit MPIN
                </label>
                <div className="flex gap-space-sm justify-between">
                  {mpin.map((val, idx) => (
                    <input
                      key={`mpin-${idx}`}
                      ref={(el) => {
                        mpinRefs.current[idx] = el;
                      }}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={val}
                      onChange={(e) => handleInputChange(e.target.value, idx, false)}
                      onKeyDown={(e) => handleKeyDown(e, idx, false)}
                      className="w-12 h-12 text-center text-headline-md font-semibold bg-surface-container-low rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-on-surface transition-all border border-outline-variant/30"
                      required
                    />
                  ))}
                </div>
              </div>

              {/* Confirm MPIN Section */}
              <div>
                <label className="block font-label-md text-on-surface font-medium mb-space-sm">
                  Confirm 6-Digit MPIN
                </label>
                <div className="flex gap-space-sm justify-between">
                  {confirmMpin.map((val, idx) => (
                    <input
                      key={`confirm-${idx}`}
                      ref={(el) => {
                        confirmMpinRefs.current[idx] = el;
                      }}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={val}
                      onChange={(e) => handleInputChange(e.target.value, idx, true)}
                      onKeyDown={(e) => handleKeyDown(e, idx, true)}
                      className="w-12 h-12 text-center text-headline-md font-semibold bg-surface-container-low rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-on-surface transition-all border border-outline-variant/30"
                      required
                    />
                  ))}
                </div>
              </div>

              {/* Helper Note */}
              <div className="flex items-center gap-space-xs text-body-sm text-outline">
                <span className="material-symbols-outlined text-[16px]">info</span>
                <span>Avoid sequential numbers (e.g., 123456) or repeated digits.</span>
              </div>

              {/* Action Button */}
              <button
                className="w-full py-space-md bg-primary text-on-primary font-label-md font-semibold rounded-lg shadow-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-space-sm"
                type="submit"
              >
                <span>Secure &amp; Proceed to Dashboard</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </form>

            {/* Security Reassurance Footnote */}
            <div className="mt-space-xl pt-space-lg border-t border-outline-variant/20 flex items-center justify-center gap-space-lg text-body-sm text-outline">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[16px] text-tertiary">verified_user</span>
                <span>256-bit Encryption</span>
              </div>
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[16px] text-tertiary">bolt</span>
                <span>Instant Activation</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
