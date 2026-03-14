"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/auth-guard";
import { apiClient } from "@/lib/api-client";
import type { Payment } from "@/types/api";

function PaymentsContent() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .getPayments()
      .then(setPayments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 bg-bg-card/60 rounded-[var(--radius-card)] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="bg-bg-card/60 border border-border rounded-[var(--radius-card)] p-12 text-center">
        <p className="text-text-muted mb-4">No payments yet.</p>
        <Link
          href="/upload"
          className="text-sm text-green hover:text-green/80 transition-colors"
        >
          Upload your first dashboard &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-bg-card/60 border border-border rounded-[var(--radius-card)] overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-4 text-xs font-[family-name:var(--font-display)] font-bold uppercase tracking-wider text-text-muted border-b border-border">
        <div className="p-4">Date</div>
        <div className="p-4">Amount</div>
        <div className="p-4">Status</div>
        <div className="p-4">Receipt</div>
      </div>

      {/* Rows */}
      {payments.map((payment, i) => (
        <div
          key={payment.id}
          className={`grid grid-cols-4 text-sm ${i < payments.length - 1 ? "border-b border-border" : ""}`}
        >
          <div className="p-4 text-text-secondary">
            {new Date(payment.created_at).toLocaleDateString()}
          </div>
          <div className="p-4 text-text-primary font-medium">
            ${(payment.amount_cents / 100).toFixed(2)}{" "}
            <span className="text-text-muted uppercase text-xs">
              {payment.currency}
            </span>
          </div>
          <div className="p-4">
            <span
              className={`text-xs px-2.5 py-1 rounded-full ${
                payment.status === "completed"
                  ? "bg-green/10 text-green"
                  : payment.status === "failed"
                    ? "bg-red-500/10 text-red-400"
                    : "bg-yellow-500/10 text-yellow-400"
              }`}
            >
              {payment.status}
            </span>
          </div>
          <div className="p-4">
            {payment.receipt_url ? (
              <a
                href={payment.receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green hover:text-green/80 transition-colors"
              >
                View &rarr;
              </a>
            ) : (
              <span className="text-text-muted text-xs">&mdash;</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PaymentHistoryPage() {
  return (
    <AuthGuard>
      <main className="min-h-screen pt-14">
        <div className="max-w-[1280px] mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-8">
            <Link
              href="/account"
              className="text-text-muted hover:text-text-secondary transition-colors"
            >
              Account
            </Link>
            <span className="text-text-muted">/</span>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold">
              Payment History
            </h1>
          </div>
          <PaymentsContent />
        </div>
      </main>
    </AuthGuard>
  );
}
