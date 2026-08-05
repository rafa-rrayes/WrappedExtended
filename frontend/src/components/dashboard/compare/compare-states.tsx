"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PERIOD_A_COLOR, PERIOD_B_COLOR } from "./period-format";

/**
 * Loading, error and empty states for the compare route.
 *
 * The comparison endpoint re-runs the entire analyzer suite over two date ranges on demand
 * — seconds, not milliseconds — so a bare spinner would read as a hang. The progress bar
 * below is explicitly a *time* estimate, not server-reported progress (the endpoint reports
 * none): it eases toward 94% and only ever completes when the data actually lands, and the
 * elapsed counter keeps it honest.
 */
export function CompareProgress({ message }: { message: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsed(Date.now() - startedAt), 200);
    return () => window.clearInterval(timer);
  }, []);

  const percent = Math.min(94, 100 * (1 - Math.exp(-elapsed / 7000)));
  const seconds = Math.floor(elapsed / 1000);

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-bg-card p-4">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="text-text-secondary">{message}</span>
        <span className="tabular-nums text-text-muted">{seconds}s</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`Working — ${seconds} seconds elapsed`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-200 ease-out"
          style={{
            width: `${percent}%`,
            background: `linear-gradient(90deg, ${PERIOD_A_COLOR}, ${PERIOD_B_COLOR})`,
          }}
        />
      </div>
      <p className="mt-2 text-[0.7rem] text-text-muted">
        Both periods run through every analyzer server-side, so this takes a few seconds the
        first time a pair is requested. Repeat visits are instant.
      </p>
    </div>
  );
}

export function CompareSkeleton() {
  return (
    <div className="space-y-6">
      <CompareProgress message="Crunching both periods…" />

      {/* Every block below stands in for a real section, at its real breakpoint, so the
          page does not re-flow when the comparison lands. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[104px] rounded-[var(--radius-card)]" />
        ))}
      </div>

      {/* Temporal overlay. */}
      <Skeleton className="h-[360px] rounded-[var(--radius-card)]" />

      {/* Distribution pairs — `lg`, matching DistributionCompare's own grid. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[320px] rounded-[var(--radius-card)]" />
        <Skeleton className="h-[320px] rounded-[var(--radius-card)]" />
      </div>

      {/* Ranking diff. */}
      <Skeleton className="h-[420px] rounded-[var(--radius-card)]" />
    </div>
  );
}

export function CompareError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-bg-card p-8 text-center">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05]">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="text-gold"
          aria-hidden="true"
        >
          <path d="M12 8v5M12 16.5v.01" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </div>
      <h2 className="mb-2 font-[family-name:var(--font-display)] text-lg font-bold text-text-primary">
        Couldn&apos;t compare these periods
      </h2>
      <p className="mx-auto mb-6 max-w-md text-sm text-text-secondary">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full bg-green px-6 py-2.5 text-sm font-semibold text-bg-deep transition-opacity hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}

/** One (or both) of the chosen ranges came back with nothing in it. */
export function EmptyPeriodNotice({
  emptySlots,
  labelA,
  labelB,
}: {
  emptySlots: ("A" | "B")[];
  labelA: string;
  labelB: string;
}) {
  const both = emptySlots.length === 2;
  const which = both
    ? `${labelA} and ${labelB} both`
    : emptySlots[0] === "A"
      ? `Period A (${labelA})`
      : `Period B (${labelB})`;

  return (
    <div className="rounded-[var(--radius-card)] border border-gold/25 bg-gold-dim p-6 text-center">
      <h2 className="mb-2 font-[family-name:var(--font-display)] text-base font-bold text-gold">
        Nothing to compare yet
      </h2>
      <p className="mx-auto max-w-lg text-sm text-text-secondary">
        {which} {both ? "contain" : "contains"} no listening at all, so there is no
        comparison to draw. Pick a range inside your export&apos;s data — the presets above
        are all guaranteed to have something in them.
      </p>
    </div>
  );
}

/** The export never told us its date span, so there is nothing to build periods from. */
export function NoRangeNotice() {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-bg-card p-8 text-center">
      <h2 className="mb-2 font-[family-name:var(--font-display)] text-lg font-bold text-text-primary">
        No date range on this dashboard
      </h2>
      <p className="mx-auto max-w-md text-sm text-text-secondary">
        Comparing periods needs to know when your listening history starts and ends, and
        this dashboard doesn&apos;t report either. Re-uploading the export usually fixes it.
      </p>
    </div>
  );
}
