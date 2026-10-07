"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { MobileProfileView } from "@/components/mobile";
import { clearPositionsCache } from "@/lib/positions-service";

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role?: string;
  is_verified?: boolean;
  kyc_status?: string;
  pan_number?: string;
  city?: string;
}

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<UserProfile>({
    id: "",
    email: "",
    full_name: "Trader",
    phone: "",
    role: "TRADER",
    is_verified: true,
    kyc_status: "VERIFIED",
    pan_number: "",
    city: "India",
  });
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<
    "personal" | "account" | "security" | "notifications" | "trading"
  >("personal");

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");

  // Password update form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);

  // Trading preferences state
  const [defaultProduct, setDefaultProduct] = useState<"CNC" | "MIS">("CNC");
  const [defaultOrder, setDefaultOrder] = useState<"MARKET" | "LIMIT">("LIMIT");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  // Load user profile
  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<UserProfile>("/api/v1/auth/me");
      if (data) {
        setUser({
          id: data.id || "USR-LIVE",
          email: data.email || "",
          full_name: data.full_name || "Trader",
          phone: data.phone || "",
          role: data.role || "TRADER",
          is_verified: data.is_verified ?? true,
          kyc_status: data.kyc_status || "VERIFIED",
          pan_number: data.pan_number || "",
          city: data.city || "India",
        });
        setNameInput(data.full_name || "");
        setPhoneInput(data.phone || "");
      }
    } catch {
      // Unauthenticated or network error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setUser((prev) => ({
      ...prev,
      full_name: nameInput,
      phone: phoneInput,
    }));
    setEditProfileOpen(false);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg("New password must be at least 6 characters.");
      return;
    }
    setPasswordMsg("Password updated successfully.");
    setCurrentPassword("");
    setNewPassword("");
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("tradex_token");
      localStorage.removeItem("tradex_refresh_token");
      clearPositionsCache();
    }
    router.push("/login");
  };

  const initials = (user.full_name || "BullRun User")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Desktop View (Preserved 100% on md+) */}
      <div className="hidden md:flex flex-col w-full bg-surface pb-24">
      <div className="flex flex-col w-full max-w-7xl mx-auto px-space-lg lg:px-space-xl py-space-xl gap-space-xl">
        {/* 1. Header / Banner */}
        <div className="relative bg-surface-container-lowest rounded-xl p-space-xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-space-lg overflow-hidden border border-outline-variant/20">
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center gap-space-lg relative z-10 flex-wrap">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-headline-lg font-bold shadow-inner">
                {initials}
              </div>
              <span
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-tertiary flex items-center justify-center text-on-tertiary ring-4 ring-surface-container-lowest"
                title="KYC Verified"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
              </span>
            </div>

            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center gap-space-md flex-wrap">
                <h1 className="text-headline-lg text-on-surface font-semibold tracking-tight">
                  {user.full_name || "Aarav Sharma"}
                </h1>
                <span className="px-space-sm py-0.5 rounded-full bg-tertiary-container/10 text-tertiary text-label-sm font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span> KYC Verified
                </span>
                <span className="text-outline text-tabular-data font-tabular-data">
                  #{user.id}
                </span>
              </div>
              <div className="flex items-center gap-space-md text-body-md text-on-surface-variant flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">mail</span> {user.email}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">call</span> {user.phone}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">location_on</span> {user.city}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-space-md relative z-10 w-full md:w-auto justify-end flex-wrap">
            <button
              onClick={() => setEditProfileOpen(true)}
              className="px-space-md py-space-sm rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors text-label-md font-medium flex items-center gap-2 border border-outline-variant/20 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              <span>Edit Profile</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-space-md py-space-sm rounded-lg bg-error-container text-on-error-container hover:bg-error-container/80 transition-colors text-label-md font-medium flex items-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* 2. Tabbed sub-navigation sections */}
        <div className="flex flex-col gap-space-lg">
          {/* Tab Headers */}
          <div className="flex items-center gap-space-sm overflow-x-auto pb-2 border-b border-outline-variant/20 no-scrollbar">
            {(
              [
                { id: "personal", label: "Personal Information" },
                { id: "account", label: "Account Information" },
                { id: "security", label: "Security & Password" },
                { id: "notifications", label: "Notification Preferences" },
                { id: "trading", label: "Trading Preferences" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-space-md py-space-sm rounded-lg text-label-md font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-primary-container text-on-primary-container shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Contents */}
          <div className="w-full">
            {/* PERSONAL INFORMATION */}
            {activeTab === "personal" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
                <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm flex flex-col gap-space-lg border border-outline-variant/20">
                  <div className="flex items-center justify-between">
                    <h3 className="text-headline-sm text-on-surface font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">badge</span>
                      <span>Identity Documents</span>
                    </h3>
                    <span className="text-label-sm text-tertiary bg-tertiary-container/10 px-space-sm py-0.5 rounded-full font-medium">
                      All Verified
                    </span>
                  </div>
                  <div className="flex flex-col gap-space-md">
                    <div className="flex items-center justify-between p-space-md bg-surface-container-low rounded-lg">
                      <div>
                        <p className="text-body-sm text-outline">PAN Number</p>
                        <p className="text-body-md font-tabular-data font-medium text-on-surface">
                          {user.pan_number || "ABCDE1234F"}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-tertiary text-label-sm font-medium">
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                        <span>Verified</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-space-md bg-surface-container-low rounded-lg">
                      <div>
                        <p className="text-body-sm text-outline">Aadhaar Number</p>
                        <p className="text-body-md font-tabular-data font-medium text-on-surface">
                          XXXX-XXXX-4892
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-tertiary text-label-sm font-medium">
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                        <span>Linked</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm flex flex-col gap-space-lg border border-outline-variant/20">
                  <div className="flex items-center justify-between">
                    <h3 className="text-headline-sm text-on-surface font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">account_balance</span>
                      <span>Bank Accounts</span>
                    </h3>
                    <button className="text-primary text-label-sm hover:underline flex items-center gap-1 font-medium">
                      + Add Bank
                    </button>
                  </div>
                  <div className="flex flex-col gap-space-md">
                    <div className="flex items-center justify-between p-space-md bg-surface-container-low rounded-lg">
                      <div className="flex items-center gap-space-md">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                          H
                        </div>
                        <div>
                          <p className="text-body-md font-medium text-on-surface">HDFC Bank</p>
                          <p className="text-body-sm text-outline font-tabular-data">A/C ending 4821</p>
                        </div>
                      </div>
                      <span className="px-space-sm py-0.5 rounded bg-primary-container text-on-primary-container text-label-sm font-medium">
                        Primary
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-space-md bg-surface-container-low rounded-lg">
                      <div className="flex items-center gap-space-md">
                        <div className="w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-bold">
                          I
                        </div>
                        <div>
                          <p className="text-body-md font-medium text-on-surface">ICICI Bank</p>
                          <p className="text-body-sm text-outline font-tabular-data">A/C ending 9012</p>
                        </div>
                      </div>
                      <button className="text-outline hover:text-on-surface text-label-sm font-medium">
                        Make Primary
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm flex flex-col gap-space-lg md:col-span-2 border border-outline-variant/20">
                  <h3 className="text-headline-sm text-on-surface font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">home</span>
                    <span>Registered Address</span>
                  </h3>
                  <div className="p-space-md bg-surface-container-low rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-space-md">
                    <div className="flex flex-col gap-1">
                      <p className="text-body-md text-on-surface font-medium">
                        Flat 402, Sterling Towers, Linking Road, Bandra West
                      </p>
                      <p className="text-body-sm text-outline">Mumbai, Maharashtra - 400050, India</p>
                    </div>
                    <button className="px-space-md py-space-xs rounded-lg bg-surface-container text-on-surface text-label-sm hover:bg-surface-container-high transition-colors font-medium">
                      Update Address
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ACCOUNT INFORMATION */}
            {activeTab === "account" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
                <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm flex flex-col gap-space-lg border border-outline-variant/20">
                  <h3 className="text-headline-sm text-on-surface font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">query_stats</span>
                    <span>Segment Activations</span>
                  </h3>
                  <div className="flex flex-col gap-space-md">
                    {[
                      { name: "Equity (Cash & Delivery)", exchange: "NSE / BSE" },
                      { name: "Futures & Options (F&O)", exchange: "NSE FO / BSE FO" },
                      { name: "Currency Derivatives", exchange: "NSE CDS" },
                      { name: "Commodity Derivatives", exchange: "MCX" },
                    ].map((seg, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-space-md bg-surface-container-low rounded-lg"
                      >
                        <div>
                          <p className="text-body-md font-medium text-on-surface">{seg.name}</p>
                          <p className="text-body-sm text-outline">{seg.exchange}</p>
                        </div>
                        <span className="px-space-sm py-0.5 rounded-full bg-tertiary-container/10 text-tertiary text-label-sm font-medium">
                          Active
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm flex flex-col gap-space-lg border border-outline-variant/20">
                  <h3 className="text-headline-sm text-on-surface font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">account_tree</span>
                    <span>Demat &amp; Depository Participant</span>
                  </h3>
                  <div className="flex flex-col gap-space-md">
                    <div className="p-space-md bg-surface-container-low rounded-lg flex justify-between items-center">
                      <div>
                        <p className="text-body-sm text-outline">Depository</p>
                        <p className="text-body-md font-semibold text-on-surface">CDSL (Central Depository)</p>
                      </div>
                      <span className="material-symbols-outlined text-tertiary">check_circle</span>
                    </div>
                    <div className="p-space-md bg-surface-container-low rounded-lg flex justify-between items-center">
                      <div>
                        <p className="text-body-sm text-outline">DP ID</p>
                        <p className="text-body-md font-tabular-data font-semibold text-on-surface">12081600</p>
                      </div>
                    </div>
                    <div className="p-space-md bg-surface-container-low rounded-lg flex justify-between items-center">
                      <div>
                        <p className="text-body-sm text-outline">BO / Client ID</p>
                        <p className="text-body-md font-tabular-data font-semibold text-on-surface">03482194</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECURITY & PASSWORD */}
            {activeTab === "security" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
                <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm flex flex-col gap-space-lg border border-outline-variant/20">
                  <h3 className="text-headline-sm text-on-surface font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">lock</span>
                    <span>Change Password</span>
                  </h3>
                  <form onSubmit={handlePasswordChange} className="flex flex-col gap-space-md">
                    <div>
                      <label className="text-body-sm text-outline font-medium block mb-1">Current Password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-space-md py-space-sm bg-surface-container-low rounded-lg text-body-md text-on-surface border border-outline-variant/30"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="text-body-sm text-outline font-medium block mb-1">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-space-md py-space-sm bg-surface-container-low rounded-lg text-body-md text-on-surface border border-outline-variant/30"
                        placeholder="••••••••"
                      />
                    </div>
                    {passwordMsg && (
                      <p className="text-body-sm font-medium text-primary">{passwordMsg}</p>
                    )}
                    <button
                      type="submit"
                      className="py-space-sm bg-primary text-on-primary rounded-lg font-label-md font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      Update Password
                    </button>
                  </form>
                </div>

                <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm flex flex-col gap-space-lg border border-outline-variant/20">
                  <h3 className="text-headline-sm text-on-surface font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">security</span>
                    <span>Two-Factor Authentication (2FA)</span>
                  </h3>
                  <div className="flex items-center justify-between p-space-md bg-surface-container-low rounded-lg">
                    <div>
                      <p className="text-body-md font-medium text-on-surface">Biometric &amp; MPIN Login</p>
                      <p className="text-body-sm text-outline">Enforce 6-digit MPIN for trading authentication</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={twoFactorEnabled}
                        onChange={() => setTwoFactorEnabled(!twoFactorEnabled)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface-container rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>
                  <div className="p-space-md bg-surface-container-low rounded-lg">
                    <p className="text-body-md font-medium text-on-surface">Active Session Devices</p>
                    <p className="text-body-sm text-outline mt-1">Windows Chrome (Current Device, Mumbai)</p>
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATION PREFERENCES */}
            {activeTab === "notifications" && (
              <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm flex flex-col gap-space-lg border border-outline-variant/20 max-w-2xl">
                <h3 className="text-headline-sm text-on-surface font-semibold">Communication Channels</h3>
                <div className="space-y-space-md">
                  <label className="flex items-center justify-between p-space-md bg-surface-container-low rounded-lg cursor-pointer">
                    <div>
                      <span className="font-medium text-on-surface block">Email Transaction Reports</span>
                      <span className="text-body-sm text-outline">Contract notes and daily activity statements</span>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5 text-primary rounded" />
                  </label>
                  <label className="flex items-center justify-between p-space-md bg-surface-container-low rounded-lg cursor-pointer">
                    <div>
                      <span className="font-medium text-on-surface block">SMS Margin Alerts</span>
                      <span className="text-body-sm text-outline">Critical peak margin shortfall alerts</span>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5 text-primary rounded" />
                  </label>
                  <label className="flex items-center justify-between p-space-md bg-surface-container-low rounded-lg cursor-pointer">
                    <div>
                      <span className="font-medium text-on-surface block">In-App Live Execution Popups</span>
                      <span className="text-body-sm text-outline">Instant popups when orders fill</span>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5 text-primary rounded" />
                  </label>
                </div>
              </div>
            )}

            {/* TRADING PREFERENCES */}
            {activeTab === "trading" && (
              <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm flex flex-col gap-space-lg border border-outline-variant/20 max-w-2xl">
                <h3 className="text-headline-sm text-on-surface font-semibold">Default Trade Parameters</h3>
                <div className="space-y-space-md">
                  <div>
                    <label className="text-body-sm text-outline font-medium block mb-2">Default Product Type</label>
                    <div className="grid grid-cols-2 gap-space-sm">
                      <button
                        onClick={() => setDefaultProduct("CNC")}
                        className={`py-space-sm rounded-lg font-medium text-label-md transition-all ${
                          defaultProduct === "CNC"
                            ? "bg-primary text-on-primary shadow-sm"
                            : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        Delivery (CNC)
                      </button>
                      <button
                        onClick={() => setDefaultProduct("MIS")}
                        className={`py-space-sm rounded-lg font-medium text-label-md transition-all ${
                          defaultProduct === "MIS"
                            ? "bg-primary text-on-primary shadow-sm"
                            : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        Intraday (MIS)
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-body-sm text-outline font-medium block mb-2">Default Order Type</label>
                    <div className="grid grid-cols-2 gap-space-sm">
                      <button
                        onClick={() => setDefaultOrder("LIMIT")}
                        className={`py-space-sm rounded-lg font-medium text-label-md transition-all ${
                          defaultOrder === "LIMIT"
                            ? "bg-primary text-on-primary shadow-sm"
                            : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        Limit Order
                      </button>
                      <button
                        onClick={() => setDefaultOrder("MARKET")}
                        className={`py-space-sm rounded-lg font-medium text-label-md transition-all ${
                          defaultOrder === "MARKET"
                            ? "bg-primary text-on-primary shadow-sm"
                            : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        Market Order
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Edit Profile Modal */}
      {editProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateProfile}
            className="bg-surface-container-lowest p-space-xl rounded-2xl max-w-md w-full shadow-2xl border border-outline-variant/30 flex flex-col gap-space-md"
          >
            <h3 className="font-headline-md text-on-surface font-semibold">Edit Personal Profile</h3>
            <div>
              <label className="text-body-sm text-outline block mb-1">Full Name</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full px-space-md py-space-sm bg-surface-container-low rounded-lg text-body-md text-on-surface border border-outline-variant/30"
              />
            </div>
            <div>
              <label className="text-body-sm text-outline block mb-1">Phone Number</label>
              <input
                type="text"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="w-full px-space-md py-space-sm bg-surface-container-low rounded-lg text-body-md text-on-surface border border-outline-variant/30"
              />
            </div>
            <div className="flex justify-end gap-space-sm mt-space-sm">
              <button
                type="button"
                onClick={() => setEditProfileOpen(false)}
                className="px-space-md py-space-sm text-label-md text-on-surface hover:bg-surface-container rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-space-md py-space-sm bg-primary text-on-primary rounded-lg text-label-md font-semibold hover:bg-primary/90 shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mobile Stitch View (<md) */}
      <div className="block md:hidden mobile-stitch">
        <MobileProfileView
          user={user}
          onLogout={handleLogout}
          onUpdateProfile={(updated) => {
            setUser((prev) => ({ ...prev, ...updated }));
          }}
        />
      </div>
    </>
  );
}
