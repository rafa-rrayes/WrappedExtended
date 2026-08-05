"use client";

import { useEffect, useState } from "react";
import { ApiError, apiClient } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);

    // Goes through `apiClient` rather than a bare `fetch`: it carries the access token,
    // refreshes it when it has expired, and throws an `ApiError` we can actually show —
    // where the old hand-rolled call silently rendered nothing on any failure.
    apiClient
      .getBenchmarks(dashboardId)
      .then((result: BenchmarksData) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Couldn't reach the benchmarks service.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [dashboardId]);

  const comparisons = data ? Object.entries(data.comparisons ?? {}) : [];

  if (error || (data && comparisons.length === 0)) {
    return (
      <section id="benchmarks" className="py-10">
        <BenchmarksHeading />
        <div className="rounded-[var(--radius-card)] border border-dashed border-border bg-bg-card/40 px-6 py-8 text-center text-sm text-text-muted">
          {error ?? "There aren't enough other listeners yet to compare you against."}
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section id="benchmarks" className="py-10" aria-busy="true">
        <BenchmarksHeading />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[132px] rounded-[var(--radius-card)]" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section id="benchmarks" className="py-10">
      <BenchmarksHeading estimated={!data.has_real_data} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {comparisons.map(([metric, comp]) => {
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

/** One heading for all four states, so the section never jumps as it resolves. */
function BenchmarksHeading({ estimated }: { estimated?: boolean }) {
  return (
    <>
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-text-primary mb-1">
        How You Compare
      </h2>
      <p className="text-text-muted text-sm mb-8">
        Your stats vs other listeners{estimated && " (estimated benchmarks)"}
      </p>
    </>
  );
}
