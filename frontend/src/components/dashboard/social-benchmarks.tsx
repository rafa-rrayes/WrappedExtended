"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/constants";

interface BenchmarkComparison {
  value: number;
  percentile: number;
  benchmarks: Record<string, number>;
}

interface BenchmarksData {
  comparisons: Record<string, BenchmarkComparison>;
  has_real_data: boolean;
}

interface SocialBenchmarksProps {
  dashboardId: string;
}

const METRIC_LABELS: Record<string, { label: string; format: (v: number) => string }> = {
  total_hours: { label: "Listening Hours", format: (v) => `${Math.round(v)}h` },
  total_streams: { label: "Total Streams", format: (v) => v.toLocaleString() },
  unique_artists: { label: "Unique Artists", format: (v) => v.toLocaleString() },
  unique_tracks: { label: "Unique Tracks", format: (v) => v.toLocaleString() },
};

export function SocialBenchmarks({ dashboardId }: SocialBenchmarksProps) {
  const [data, setData] = useState<BenchmarksData | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    fetch(`${API_BASE_URL}/dashboards/${dashboardId}/benchmarks/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData(d))
      .catch(() => {});
  }, [dashboardId]);

  if (!data) return null;

  return (
    <section id="benchmarks" className="py-10">
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-text-primary mb-1">
        How You Compare
      </h2>
      <p className="text-text-muted text-sm mb-8">
        Your stats vs other listeners{!data.has_real_data && " (estimated benchmarks)"}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.entries(data.comparisons).map(([metric, comp]) => {
          const meta = METRIC_LABELS[metric];
          if (!meta) return null;
          return (
            <div
              key={metric}
              className="bg-bg-card border border-border rounded-[var(--radius-card)] p-5"
            >
              <div className="text-text-muted text-xs uppercase tracking-wider mb-2">
                {meta.label}
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-bold text-text-primary font-[family-name:var(--font-display)]">
                  {meta.format(comp.value)}
                </span>
                <span className="text-green text-sm font-semibold">
                  Top {100 - comp.percentile}%
                </span>
              </div>

              {/* Percentile bar */}
              <div className="relative h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full rounded-full bg-green"
                  style={{ width: `${comp.percentile}%` }}
                />
                <div
                  className="absolute top-0 w-0.5 h-full bg-text-primary"
                  style={{ left: `${comp.percentile}%` }}
                />
              </div>

              <div className="flex justify-between text-[0.6rem] text-text-muted mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
