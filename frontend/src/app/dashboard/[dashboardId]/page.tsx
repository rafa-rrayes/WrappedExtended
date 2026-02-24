"use client";

import { useParams } from "next/navigation";
import { useDashboard } from "@/lib/hooks/use-dashboard";
import { HeroStats } from "@/components/dashboard/hero-stats";
import { TopArtistsChart } from "@/components/dashboard/top-artists-chart";
import { TopTracksTable } from "@/components/dashboard/top-tracks-table";
import { SideNav } from "@/components/layout/side-nav";

export default function DashboardPage() {
  const params = useParams<{ dashboardId: string }>();
  const { data, error, isLoading } = useDashboard(params.dashboardId);

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

  const stats = data.dashboard_data;

  return (
    <>
      <SideNav />
      <HeroStats
        totalHours={data.total_hours}
        totalStreams={data.total_streams}
        uniqueArtists={data.unique_artists}
        uniqueTracks={data.unique_tracks}
        dateRangeStart={data.date_range_start}
        dateRangeEnd={data.date_range_end}
      />
      <div className="max-w-[1280px] mx-auto px-6 pb-20">
        <TopArtistsChart artists={stats.top_artists ?? []} />
        <TopTracksTable tracks={stats.top_tracks ?? []} />
        {/* Additional sections will be added here */}
      </div>
    </>
  );
}
