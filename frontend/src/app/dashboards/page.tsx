"use client";

import Link from "next/link";
import { AuthGuard } from "@/components/auth/auth-guard";
import { DashboardCard } from "@/components/dashboards/dashboard-card";
import { useDashboards } from "@/lib/hooks/use-dashboards";
import { apiClient } from "@/lib/api-client";

function DashboardsContent() {
  const { data: dashboards, error, isLoading, mutate } = useDashboards();

  async function handleDelete(id: string) {
    if (!confirm("Delete this dashboard? This cannot be undone.")) return;
    try {
      await apiClient.deleteDashboard(id);
      mutate();
    } catch {
      // Best effort
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6 animate-pulse h-48"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-red-400">Failed to load dashboards.</p>;
  }

  if (!dashboards?.length) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary mb-6">
          You haven&apos;t created any dashboards yet.
        </p>
        <Link
          href="/upload"
          className="bg-green hover:bg-green/90 text-bg-deep font-semibold px-8 py-3 rounded-full transition-all"
        >
          Upload Your Data
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {dashboards.map((d) => (
        <DashboardCard key={d.id} dashboard={d} onDelete={handleDelete} />
      ))}
    </div>
  );
}

export default function DashboardsPage() {
  return (
    <AuthGuard>
      <main className="min-h-screen pt-14">
        <div className="max-w-[1280px] mx-auto px-6 py-12">
          <div className="flex items-center justify-between mb-8">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold">
              My Dashboards
            </h1>
            <Link
              href="/upload"
              className="bg-green hover:bg-green/90 text-bg-deep font-semibold text-sm px-6 py-2.5 rounded-full transition-all"
            >
              New Upload
            </Link>
          </div>
          <DashboardsContent />
        </div>
      </main>
    </AuthGuard>
  );
}
