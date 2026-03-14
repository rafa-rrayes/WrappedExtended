"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/lib/context/auth-context";
import { useToast } from "@/lib/context/toast-context";
import { apiClient } from "@/lib/api-client";
import type { Payment } from "@/types/api";

function AccountContent() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    apiClient
      .getPayments()
      .then((data) => setPayments(data.slice(0, 3)))
      .catch(() => {})
      .finally(() => setLoadingPayments(false));
  }, []);

  async function handleDeleteAccount() {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    try {
      await apiClient.deleteAccount();
      await logout();
      router.push("/");
      toast("Account deleted.", "success");
    } catch {
      toast("Failed to delete account.", "error");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Profile */}
      <section className="bg-bg-card/60 border border-border rounded-[var(--radius-card)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-[family-name:var(--font-display)] font-bold text-lg">
            Profile
          </h2>
          <Link
            href="/settings"
            className="text-sm text-green hover:text-green/80 transition-colors"
          >
            Edit in Settings
          </Link>
        </div>
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
            <span className="text-text-muted">Display Name</span>
            <span className="text-text-secondary">
              {user?.display_name || "\u2014"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Timezone</span>
            <span className="text-text-secondary">
              {user?.timezone || "UTC"}
            </span>
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

      {/* Payments */}
      <section className="bg-bg-card/60 border border-border rounded-[var(--radius-card)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-[family-name:var(--font-display)] font-bold text-lg">
            Payments
          </h2>
          <Link
            href="/account/payments"
            className="text-sm text-green hover:text-green/80 transition-colors"
          >
            View all
          </Link>
        </div>
        {loadingPayments ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-10 bg-bg-card/40 rounded animate-pulse"
              />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <p className="text-sm text-text-muted">No payments yet.</p>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-text-secondary">
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-text-primary font-medium">
                    ${(p.amount_cents / 100).toFixed(2)}
                  </span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    p.status === "completed"
                      ? "bg-green/10 text-green"
                      : p.status === "failed"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-yellow-500/10 text-yellow-400"
                  }`}
                >
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Data Usage */}
      <section className="bg-bg-card/60 border border-border rounded-[var(--radius-card)] p-6">
        <h2 className="font-[family-name:var(--font-display)] font-bold text-lg mb-4">
          Data Usage
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Uploads</span>
            <span className="text-text-secondary">
              {user?.upload_count ?? 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Payment status</span>
            <span className={user?.has_paid ? "text-green" : "text-text-muted"}>
              {user?.has_paid ? "Unlocked" : "Not yet paid"}
            </span>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-bg-card/60 border border-red-500/30 rounded-[var(--radius-card)] p-6">
        <h2 className="font-[family-name:var(--font-display)] font-bold text-lg mb-2 text-red-400">
          Danger Zone
        </h2>
        <p className="text-sm text-text-muted mb-4">
          Permanently delete your account and all associated data. This action
          cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold text-sm px-6 py-2.5 rounded-[var(--radius-sm)] transition-all border border-red-500/30"
          >
            Delete Account
          </button>
        ) : (
          <div className="space-y-3 max-w-md">
            <p className="text-sm text-red-400">
              Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="w-full bg-bg-card border border-red-500/30 rounded-[var(--radius-sm)] px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-red-500 transition-colors text-sm"
            />
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={confirmText !== "DELETE" || deleting}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold text-sm px-6 py-2.5 rounded-[var(--radius-sm)] transition-all disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Permanently Delete"}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setConfirmText("");
                }}
                className="text-sm text-text-muted hover:text-text-secondary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default function AccountPage() {
  return (
    <AuthGuard>
      <main className="min-h-screen pt-14">
        <div className="max-w-[1280px] mx-auto px-6 py-12">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold mb-8">
            My Account
          </h1>
          <AccountContent />
        </div>
      </main>
    </AuthGuard>
  );
}
