"use client";

import { useState } from "react";
import { AdminGuard } from "@/components/auth/admin-guard";
import { useAdminAnalytics } from "@/lib/hooks/use-admin-analytics";
import { RangeSelector } from "@/components/admin/range-selector";
import { KPICards } from "@/components/admin/kpi-cards";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { UserGrowthChart } from "@/components/admin/user-growth-chart";
import { UploadTrendChart } from "@/components/admin/upload-trend-chart";
import { UploadFunnelChart } from "@/components/admin/upload-funnel-chart";
import { PlatformInsightsCard } from "@/components/admin/platform-insights-card";
import { RecentActivityTable } from "@/components/admin/recent-activity-table";
import type { AnalyticsRange } from "@/types/admin";

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 bg-bg-card border border-border rounded-[var(--radius-card)]" />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-80 bg-bg-card border border-border rounded-[var(--radius-card)]" />
        ))}
      </div>
      <div className="h-64 bg-bg-card border border-border rounded-[var(--radius-card)]" />
    </div>
  );
}

function AnalyticsDashboard() {
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const { data, isLoading, error } = useAdminAnalytics(range);

  return (
    <main className="min-h-screen bg-bg px-4 py-8 md:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold">
              Admin Analytics
            </h1>
            <p className="text-text-muted text-sm mt-1">Platform overview and metrics</p>
          </div>
          <RangeSelector value={range} onChange={setRange} />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
            Failed to load analytics data
          </div>
        )}

        {isLoading || !data ? (
          <AnalyticsSkeleton />
        ) : (
          <div className="space-y-6">
            <KPICards kpis={data.kpis} />

            <div className="grid md:grid-cols-2 gap-6">
              <RevenueChart data={data.revenue_series} />
              <UserGrowthChart data={data.user_growth_series} />
              <UploadTrendChart data={data.upload_series} />
              <UploadFunnelChart data={data.upload_funnel} />
            </div>

            <PlatformInsightsCard data={data.platform_insights} />
            <RecentActivityTable data={data.recent_activity} />
          </div>
        )}
      </div>
    </main>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <AdminGuard>
      <AnalyticsDashboard />
    </AdminGuard>
  );
}
