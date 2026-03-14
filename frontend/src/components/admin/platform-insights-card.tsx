"use client";

import { Card } from "@/components/ui/card";
import type { PlatformInsights } from "@/types/admin";

interface PlatformInsightsCardProps {
  data: PlatformInsights;
}

export function PlatformInsightsCard({ data }: PlatformInsightsCardProps) {
  const stats = [
    { label: "Avg Hours", value: data.avg_total_hours.toLocaleString("en-US", { maximumFractionDigits: 1 }) },
    { label: "Avg Streams", value: data.avg_total_streams.toLocaleString("en-US", { maximumFractionDigits: 0 }) },
    { label: "Avg Artists", value: data.avg_unique_artists.toLocaleString("en-US", { maximumFractionDigits: 0 }) },
    { label: "Avg Tracks", value: data.avg_unique_tracks.toLocaleString("en-US", { maximumFractionDigits: 0 }) },
    { label: "Public Dashboards", value: data.total_public_dashboards.toString() },
  ];

  return (
    <Card className="p-6">
      <h3 className="font-[family-name:var(--font-display)] text-lg font-bold mb-4">
        Platform Insights
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-xl font-bold text-green">{stat.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
