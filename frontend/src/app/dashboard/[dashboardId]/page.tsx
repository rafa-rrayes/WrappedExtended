"use client";

import { useParams } from "next/navigation";
import { useDashboard } from "@/lib/hooks/use-dashboard";
import { AuthGuard } from "@/components/auth/auth-guard";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { SideNav } from "@/components/layout/side-nav";

export default function DashboardPage() {
  const params = useParams<{ dashboardId: string }>();
  const { data, error, isLoading, mutate } = useDashboard(params.dashboardId);

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-text-muted">Loading dashboard...</div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-red-400">Failed to load dashboard.</div>
      </main>
    );
  }

  return (
    <AuthGuard>
      <SideNav />
      <DashboardContent data={data} showSharePanel onUpdate={() => mutate()} />
    </AuthGuard>
  );
}
