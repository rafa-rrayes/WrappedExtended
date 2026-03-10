"use client";

import { useState } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/lib/context/toast-context";
import { apiClient } from "@/lib/api-client";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
];

const inputClass =
  "w-full bg-bg-card border border-border rounded-[var(--radius-sm)] px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-green transition-colors";

function SettingsContent() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [timezone, setTimezone] = useState(user?.timezone ?? "UTC");
  const [savingProfile, setSavingProfile] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      await apiClient.updateProfile({ display_name: displayName, timezone });
      await refreshUser();
      toast("Profile updated.", "success");
    } catch {
      toast("Failed to update profile.", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      toast("Passwords don't match.", "error");
      return;
    }
    setSavingPassword(true);
    try {
      await apiClient.changePassword(oldPassword, newPassword);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast("Password changed.", "success");
    } catch {
      toast("Failed to change password. Check your current password.", "error");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Profile */}
      <section className="bg-bg-card/60 border border-border rounded-[var(--radius-card)] p-6">
        <h2 className="font-[family-name:var(--font-display)] font-bold text-lg mb-4">
          Profile
        </h2>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="text-sm text-text-secondary mb-1.5 block">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1.5 block">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className={inputClass}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="bg-green hover:bg-green/90 text-bg-deep font-semibold text-sm px-6 py-2.5 rounded-[var(--radius-sm)] transition-all disabled:opacity-50"
          >
            {savingProfile ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </section>

      {/* Security */}
      <section className="bg-bg-card/60 border border-border rounded-[var(--radius-card)] p-6">
        <h2 className="font-[family-name:var(--font-display)] font-bold text-lg mb-4">
          Security
        </h2>
        <div className="space-y-4 max-w-md">
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="Current password"
            className={inputClass}
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (min 8 characters)"
            minLength={8}
            className={inputClass}
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className={inputClass}
          />
          <button
            onClick={handleChangePassword}
            disabled={savingPassword || !oldPassword || !newPassword}
            className="bg-green hover:bg-green/90 text-bg-deep font-semibold text-sm px-6 py-2.5 rounded-[var(--radius-sm)] transition-all disabled:opacity-50"
          >
            {savingPassword ? "Changing..." : "Change Password"}
          </button>
        </div>
      </section>

      {/* Account Info */}
      <section className="bg-bg-card/60 border border-border rounded-[var(--radius-card)] p-6">
        <h2 className="font-[family-name:var(--font-display)] font-bold text-lg mb-4">
          Account Info
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Username</span>
            <span className="text-text-secondary">{user?.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Email</span>
            <span className="text-text-secondary">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Member since</span>
            <span className="text-text-secondary">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString()
                : "\u2014"}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <main className="min-h-screen pt-14">
        <div className="max-w-[1280px] mx-auto px-6 py-12">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold mb-8">
            Settings
          </h1>
          <SettingsContent />
        </div>
      </main>
    </AuthGuard>
  );
}
