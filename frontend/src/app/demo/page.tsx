"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import type { DashboardDetail } from "@/types/dashboard";

const DEMO_SLUG = process.env.NEXT_PUBLIC_DEMO_SLUG ?? "demo";

export default function DemoPage() {
  const [data, setData] = useState<DashboardDetail | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .getPublicDashboard(DEMO_SLUG)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen pt-14">
        <div className="max-w-[1280px] mx-auto px-6 py-12">
          <div className="space-y-6">
            <div className="h-8 w-48 bg-bg-card/60 rounded animate-pulse" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-bg-card/60 rounded-[var(--radius-card)] animate-pulse"
                />
              ))}
            </div>
            <div className="h-64 bg-bg-card/60 rounded-[var(--radius-card)] animate-pulse" />
            <div className="h-64 bg-bg-card/60 rounded-[var(--radius-card)] animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen pt-14 flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold mb-4">
            Demo Dashboard Unavailable
          </h1>
          <p className="text-text-secondary mb-8 max-w-md mx-auto">
            The demo dashboard is not available right now. Upload your own
            Spotify data to see what WrapEx can do.
          </p>
          <Link
            href="/upload"
            className="bg-green hover:bg-green/90 text-bg-deep font-semibold px-8 py-3 rounded-full transition-all"
          >
            Upload Your Data
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-14">
      {/* Demo banner */}
      <div className="sticky top-14 z-40 bg-gold/10 border-b border-gold/20 backdrop-blur-sm">
        <div className="max-w-[1280px] mx-auto px-6 py-2.5 flex items-center justify-between gap-4">
          <p className="text-sm text-gold font-medium">
            This is a demo dashboard with sample data
          </p>
          <Link
            href="/upload"
            className="shrink-0 bg-gold hover:bg-gold/90 text-bg-deep font-semibold text-xs px-4 py-1.5 rounded-full transition-all"
          >
            Upload Your Own Data
          </Link>
        </div>
      </div>

      <DashboardContent data={data} />
    </main>
  );
}
