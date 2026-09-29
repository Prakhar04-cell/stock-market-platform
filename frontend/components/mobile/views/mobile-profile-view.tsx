"use client";

import React, { useState } from "react";
import { formatINR } from "@/lib/formatters";
import { MobileProfileSection } from "../mobile-profile-section";

interface UserProfileData {
  id?: string;
  email: string;
  full_name?: string;
  phone?: string;
  pan_number?: string;
  kyc_status?: string;
  city?: string;
}

interface MobileProfileViewProps {
  user: UserProfileData;
  portfolioValue?: number;
  onLogout: () => void;
  onUpdateProfile?: (updated: Partial<UserProfileData>) => void;
}

export function MobileProfileView({
  user,
  portfolioValue = 1482590,
  onLogout,
  onUpdateProfile,
}: MobileProfileViewProps) {
  const [twoFactor, setTwoFactor] = useState(true);
  const [biometrics, setBiometrics] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [newsletter, setNewsletter] = useState(false);

  const [defaultOrderType, setDefaultOrderType] = useState("Limit Order");
  const [defaultSlippage, setDefaultSlippage] = useState("0.5% (Recommended)");

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.full_name || "Rahul Sharma");
  const [editPhone, setEditPhone] = useState(user.phone || "+91 98765 43210");

  const initials = (() => {
    const name = user.full_name || "Rahul Sharma";
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  })();

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile?.({ full_name: editName, phone: editPhone });
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col w-full pb-10">
      {/* 1. Profile Header Banner */}
      <div className="relative bg-surface-container-high px-space-md pt-space-xl pb-space-lg flex flex-col items-center text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />

        {/* Avatar with verified badge */}
        <div className="relative mb-space-sm">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-md overflow-hidden text-headline-md font-bold">
            {initials}
          </div>
          <div
            className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-secondary text-on-secondary flex items-center justify-center ring-2 ring-surface shadow-sm"
            title="KYC Verified"
          >
            <span
              className="material-symbols-outlined text-[14px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check
            </span>
          </div>
        </div>

        {/* User Name & Email */}
        <h1 className="font-headline-md text-headline-md text-on-surface mb-0.5 font-semibold">
          {user.full_name || "Rahul Sharma"}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
          {user.email || "rahul.sharma@bullrun.in"}
        </p>

        {/* KYC Status Pill */}
        <div className="inline-flex items-center gap-space-xs px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-label-md shadow-sm">
          <span
            className="material-symbols-outlined text-[14px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            verified
          </span>
          Verified KYC • Tier 2
        </div>
      </div>

      {/* 2. Main Content Container */}
      <div className="px-space-md py-space-md flex flex-col gap-space-lg max-w-2xl mx-auto w-full">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-space-sm">
          <div className="bg-surface-container p-space-md rounded-lg flex flex-col gap-1 shadow-sm">
            <span className="font-body-sm text-body-sm text-on-surface-variant">Portfolio Value</span>
            <span className="font-tabular-data-lg text-tabular-data-lg text-on-surface font-semibold">
              {formatINR(portfolioValue)}
            </span>
            <span className="font-label-md text-label-md text-secondary flex items-center gap-0.5 mt-1 font-semibold">
              <span className="material-symbols-outlined text-[12px]">trending_up</span> +12.4% this mo
            </span>
          </div>
          <div className="bg-surface-container p-space-md rounded-lg flex flex-col gap-1 shadow-sm">
            <span className="font-body-sm text-body-sm text-on-surface-variant">Active Subscriptions</span>
            <span className="font-tabular-data-lg text-tabular-data-lg text-on-surface font-semibold">
              Pro Trader
            </span>
            <span className="font-label-md text-label-md text-primary flex items-center gap-0.5 mt-1 font-semibold">
              <span className="material-symbols-outlined text-[12px]">workspace_premium</span> Renews in 42d
            </span>
          </div>
        </div>

        {/* 3. Personal Information Section */}
        <MobileProfileSection
          icon="badge"
          title="Personal Information"
          description="Manage your identity and contact details"
          actionText={isEditing ? "Cancel" : "Edit"}
          onActionClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-3 pt-2">
              <div>
                <label className="text-body-sm text-on-surface-variant block mb-1">Full Legal Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface text-on-surface border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary text-body-md"
                />
              </div>
              <div>
                <label className="text-body-sm text-on-surface-variant block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface text-on-surface border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary text-body-md"
                />
              </div>
              <button
                type="submit"
                className="mt-1 py-2 px-4 rounded-lg bg-primary text-on-primary font-label-md text-body-sm shadow-sm hover:opacity-95 transition-opacity"
              >
                Save Changes
              </button>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-2">
              <div className="flex flex-col gap-1">
                <span className="font-body-sm text-body-sm text-on-surface-variant">Full Legal Name</span>
                <span className="font-body-md text-body-md text-on-surface font-medium">
                  {user.full_name || "Rahul Sharma"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-body-sm text-body-sm text-on-surface-variant">Phone Number</span>
                <span className="font-tabular-data text-tabular-data text-on-surface font-medium">
                  {user.phone || "+91 98765 43210"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-body-sm text-body-sm text-on-surface-variant">PAN Card</span>
                <span className="font-tabular-data text-tabular-data text-on-surface font-medium">
                  {user.pan_number || "ABCDE1234F"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-body-sm text-body-sm text-on-surface-variant">Tax Residency</span>
                <span className="font-body-md text-body-md text-on-surface font-medium">
                  {user.city ? `${user.city}, India (IN)` : "India (IN)"}
                </span>
              </div>
            </div>
          )}
        </MobileProfileSection>

        {/* 4. Security & Password Section */}
        <MobileProfileSection
          icon="lock"
          title="Security & Password"
          description="Protect your account with 2FA and strong credentials"
        >
          <div className="flex flex-col gap-space-sm pt-2">
            <div className="flex items-center justify-between py-2 border-b border-surface-container-high">
              <div className="flex flex-col">
                <span className="font-body-md text-body-md text-on-surface font-medium">
                  Change Password
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Last changed 3 months ago
                </span>
              </div>
              <button className="px-4 py-2 rounded-lg bg-surface-variant text-on-surface font-label-md text-label-md hover:bg-surface-variant/80 transition-colors">
                Update
              </button>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-surface-container-high">
              <div className="flex flex-col">
                <span className="font-body-md text-body-md text-on-surface font-medium">
                  Two-Factor Authentication (2FA)
                </span>
                <span className="font-body-sm text-body-sm text-secondary font-medium">
                  {twoFactor ? "Authenticator App Enabled" : "Disabled"}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={twoFactor}
                  onChange={(e) => setTwoFactor(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex flex-col">
                <span className="font-body-md text-body-md text-on-surface font-medium">
                  Biometric Login
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  FaceID / Fingerprint for fast trading
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={biometrics}
                  onChange={(e) => setBiometrics(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>
          </div>
        </MobileProfileSection>

        {/* 5. Active Sessions Section */}
        <MobileProfileSection
          icon="devices"
          title="Active Sessions"
          description="Devices currently logged into your account"
          actionText="Revoke All"
          actionDanger={true}
          onActionClick={() => {}}
        >
          <div className="flex flex-col gap-space-sm pt-2">
            {/* Current Device */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface shadow-sm">
              <div className="flex items-center gap-space-md">
                <span className="material-symbols-outlined text-[24px] text-primary">
                  smartphone
                </span>
                <div className="flex flex-col">
                  <span className="font-body-md text-body-md text-on-surface font-medium flex items-center gap-2">
                    iPhone 15 Pro{" "}
                    <span className="px-2 py-0.5 rounded text-[10px] bg-secondary-container text-on-secondary-container font-label-md">
                      Current
                    </span>
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Mumbai, India • Active now
                  </span>
                </div>
              </div>
            </div>

            {/* Other Device */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface shadow-sm">
              <div className="flex items-center gap-space-md">
                <span className="material-symbols-outlined text-[24px] text-on-surface-variant">
                  laptop_mac
                </span>
                <div className="flex flex-col">
                  <span className="font-body-md text-body-md text-on-surface font-medium">
                    MacBook Pro 16&quot;
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Bengaluru, India • 2 hours ago
                  </span>
                </div>
              </div>
              <button className="text-error font-label-md text-label-md px-2 py-1 hover:bg-error-container/20 rounded">
                Logout
              </button>
            </div>
          </div>
        </MobileProfileSection>

        {/* 6. Notification Preferences Section */}
        <MobileProfileSection
          icon="notifications_active"
          title="Notification Preferences"
          description="Choose how and when you want to be alerted"
        >
          <div className="flex flex-col gap-space-sm pt-2">
            <div className="flex items-center justify-between py-2 border-b border-surface-container-high">
              <div className="flex flex-col">
                <span className="font-body-md text-body-md text-on-surface font-medium">
                  Price Alerts &amp; Volatility
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Instant push notifications for watched assets
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={priceAlerts}
                  onChange={(e) => setPriceAlerts(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-surface-container-high">
              <div className="flex flex-col">
                <span className="font-body-md text-body-md text-on-surface font-medium">
                  Order Execution Updates
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Get notified when limit/market orders fill
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={orderUpdates}
                  onChange={(e) => setOrderUpdates(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex flex-col">
                <span className="font-body-md text-body-md text-on-surface font-medium">
                  Weekly Market Newsletter
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Deep dives into crypto and stock macro trends
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={newsletter}
                  onChange={(e) => setNewsletter(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>
          </div>
        </MobileProfileSection>

        {/* 7. Trading Preferences Section */}
        <MobileProfileSection
          icon="candlestick_chart"
          title="Trading Preferences"
          description="Configure default execution parameters"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-2">
            <div className="flex flex-col gap-1.5">
              <label className="font-body-sm text-body-sm text-on-surface-variant">
                Default Order Type
              </label>
              <select
                value={defaultOrderType}
                onChange={(e) => setDefaultOrderType(e.target.value)}
                className="px-3 py-2.5 rounded-lg bg-surface text-on-surface font-body-md focus:outline-none focus:ring-2 focus:ring-primary shadow-sm border border-outline-variant/30"
              >
                <option>Limit Order</option>
                <option>Market Order</option>
                <option>Stop Limit</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-body-sm text-body-sm text-on-surface-variant">
                Default Slippage Tolerance
              </label>
              <select
                value={defaultSlippage}
                onChange={(e) => setDefaultSlippage(e.target.value)}
                className="px-3 py-2.5 rounded-lg bg-surface text-on-surface font-body-md focus:outline-none focus:ring-2 focus:ring-primary shadow-sm border border-outline-variant/30"
              >
                <option>0.5% (Recommended)</option>
                <option>0.1% (Strict)</option>
                <option>1.0% (Flexible)</option>
              </select>
            </div>
          </div>
        </MobileProfileSection>

        {/* 8. Logout Action */}
        <div className="pt-space-sm pb-space-lg flex flex-col items-center">
          <button
            onClick={onLogout}
            className="w-full py-3.5 px-space-md rounded-lg bg-error-container text-on-error-container font-headline-sm text-headline-sm flex items-center justify-center gap-space-sm shadow-sm hover:opacity-90 active:scale-98 transition-all font-semibold"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Secure Logout
          </button>
          <span className="font-body-sm text-body-sm text-on-surface-variant mt-3 select-none">
            BullRun v4.2.0 • Secure End-to-End Encryption
          </span>
        </div>
      </div>
    </div>
  );
}
