"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type { CompareResponse } from "@/types/dashboard";
import { ApiError, apiClient } from "@/lib/api-client";
import { toIsoDate, useDateRange } from "@/lib/hooks/use-date-range";
import { useDashboardContext } from "@/components/dashboard/shell/dashboard-context";
import {
  ScopeIgnoredNotice,
  ViewHeader,
  ViewPage,
} from "@/components/dashboard/views/view-shell";
import { cn } from "@/lib/utils";
import { CompareSection, PeriodLegend } from "./compare-section";
import {
  CompareError,
  CompareProgress,
  CompareSkeleton,
  EmptyPeriodNotice,
  NoRangeNotice,
} from "./compare-states";
import { DeltaHeadline } from "./delta-headline";
import { DistributionCompare } from "./distribution-compare";
import {
  formatPeriodLabel,
  PERIOD_A_COLOR,
  PERIOD_B_COLOR,
  type Period,
} from "./period-format";
import { PeriodSelector } from "./period-selector";
import { buildRankingDiff } from "./ranking-diff";
import { RankingDiffPanel } from "./ranking-diff-panel";
import { buildCompareSummary } from "./summary";
import { TemporalOverlay } from "./temporal-overlay";
import { useComparePeriods } from "./use-compare-periods";

/**
 * "How did my 2023 differ from my 2024?" — the screen for the backend's long-standing but
 * never-rendered two-period comparison.
 *
 * The dashboard payload itself comes from the shell's context, never refetched here; the
 * only network call this route makes is the compare endpoint, keyed by the two periods so
 * SWR can hand back an instant result when you flip between pairs you've already seen.
 */
export function ComparePage() {
  const { dashboardId, basePath, stats, bounds } = useDashboardContext();

  // `bounds` is the authority, but a dashboard row with null dates can still describe its
  // span inside the analyzer output — fall back to that before giving up on the page.
  const effectiveBounds = useMemo(
    () => ({
      min: toIsoDate(bounds.min) ?? toIsoDate(stats?.date_range_start),
      max: toIsoDate(bounds.max) ?? toIsoDate(stats?.date_range_end),
    }),
    [bounds.min, bounds.max, stats?.date_range_start, stats?.date_range_end],
  );

  const { a, b, presets, activePresetId, setPeriods } = useComparePeriods(effectiveBounds);
  // Only to detect the shell's global filter; this page deliberately doesn't obey it.
  const { isFiltered } = useDateRange(effectiveBounds);

  const min = effectiveBounds.min;
  const max = effectiveBounds.max;
  const periods = a && b ? { a, b } : null;
  const swrKey = periods
    ? `/dashboards/${dashboardId}/compare?a=${periods.a.start}..${periods.a.end}&b=${periods.b.start}..${periods.b.end}`
    : null;

  const { data, error, isValidating, mutate } = useSWR<CompareResponse>(
    swrKey,
    periods === null ? null : createLoader(dashboardId, periods),
    {
      // Every call re-runs the full analyzer suite twice server-side, so background
      // revalidation is pure waste here: the answer for a fixed pair of dates can't change.
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      keepPreviousData: true,
      dedupingInterval: 600_000,
      errorRetryCount: 1,
    },
  );

  return (
    <ViewPage>
      <ViewHeader
        eyebrow="Compare"
        title={
          <>
            Two periods, <span className="text-gold">side by side</span>
          </>
        }
        description="Pick any two spans of your history and see what actually moved — the totals, the rankings, and the shape of the listening itself."
        actions={
          <ScopeIgnoredNotice
            isFiltered={isFiltered}
            title="Compare draws its own two periods, so the top-bar date filter would only be a third, conflicting range."
          >
            Date filter not applied
          </ScopeIgnoredNotice>
        }
      />

      {periods === null || min === null || max === null ? (
        <NoRangeNotice />
      ) : (
        <>
          <PeriodSelector
            basePath={basePath}
            a={periods.a}
            b={periods.b}
            min={min}
            max={max}
            presets={presets}
            activePresetId={activePresetId}
            onChange={setPeriods}
          />

          <div className="mt-6">
            {error ? (
              <CompareError
                message={
                  error instanceof ApiError
                    ? error.message
                    : "Something went wrong while comparing these two periods."
                }
                onRetry={() => {
                  void mutate();
                }}
              />
            ) : !data ? (
              <CompareSkeleton />
            ) : (
              <>
                {isValidating && (
                  <div className="mb-4">
                    <CompareProgress
                      key={swrKey ?? "compare"}
                      message="Recomputing for the periods you picked…"
                    />
                  </div>
                )}
                <div
                  className={cn("transition-opacity", isValidating && "opacity-40")}
                  aria-busy={isValidating}
                >
                  <CompareResults data={data} />
                </div>
              </>
            )}
          </div>
        </>
      )}
    </ViewPage>
  );
}

/** Built outside the render body so the fetcher never has to re-narrow a nullable period. */
function createLoader(dashboardId: string, periods: { a: Period; b: Period }) {
  return () =>
    apiClient.getCompare(dashboardId, {
      a_start: periods.a.start,
      a_end: periods.a.end,
      b_start: periods.b.start,
      b_end: periods.b.end,
    });
}

function CompareResults({ data }: { data: CompareResponse }) {
  const statsA = data.period_a?.stats;
  const statsB = data.period_b?.stats;

  const labelA = formatPeriodLabel({ start: data.period_a.start, end: data.period_a.end });
  const labelB = formatPeriodLabel({ start: data.period_b.start, end: data.period_b.end });

  const artistDiff = useMemo(
    () => buildRankingDiff(statsA, statsB, "artists"),
    [statsA, statsB],
  );
  const summary = useMemo(
    () => buildCompareSummary(data, labelA, labelB, artistDiff),
    [data, labelA, labelB, artistDiff],
  );

  const emptySlots: ("A" | "B")[] = [];
  if ((statsA?.total_streams ?? 0) <= 0) emptySlots.push("A");
  if ((statsB?.total_streams ?? 0) <= 0) emptySlots.push("B");

  if (emptySlots.length > 0 || !statsA || !statsB) {
    return (
      <EmptyPeriodNotice
        emptySlots={emptySlots.length > 0 ? emptySlots : ["A", "B"]}
        labelA={labelA}
        labelB={labelB}
      />
    );
  }

  const legend = (
    <PeriodLegend
      labelA={labelA}
      labelB={labelB}
      colorA={PERIOD_A_COLOR}
      colorB={PERIOD_B_COLOR}
    />
  );

  return (
    <div>
      {summary && (
        <p className="rounded-[var(--radius-card)] border border-green/20 bg-gradient-to-r from-green/[0.08] to-transparent p-5 font-[family-name:var(--font-display)] text-[clamp(1rem,2.1vw,1.35rem)] font-bold leading-snug text-text-primary">
          {summary}
        </p>
      )}

      <CompareSection
        eyebrow="01 — Headline"
        title="What changed"
        accent="in the numbers"
        note="Percentages are the change from A to B. Direction is coloured by whether it's actually better — a rising skip rate is not a win, and shuffle is left neutral because it isn't either."
      >
        <DeltaHeadline deltas={data.deltas ?? {}} labelA={labelA} labelB={labelB} />
      </CompareSection>

      <CompareSection
        eyebrow="02 — Shape"
        title="How each period"
        accent="unfolded"
        actions={legend}
        note="Aligned on months since each period began, so two spans of different lengths can still be compared shape-to-shape. Hover for the real calendar month behind each point."
      >
        <TemporalOverlay statsA={statsA} statsB={statsB} labelA={labelA} labelB={labelB} />
      </CompareSection>

      <CompareSection
        eyebrow="03 — Rankings"
        title="Who climbed,"
        accent="who dropped out"
        actions={legend}
        note="Entries are matched by name across both periods; the chip on the right shows how far each one moved."
      >
        <RankingDiffPanel statsA={statsA} statsB={statsB} labelA={labelA} labelB={labelB} />
      </CompareSection>

      <CompareSection
        eyebrow="04 — Rhythm"
        title="When you pressed"
        accent="play"
        actions={legend}
        note="Shown as each period's share of its own plays by default, because the two periods rarely have the same length."
      >
        <DistributionCompare
          statsA={statsA}
          statsB={statsB}
          labelA={labelA}
          labelB={labelB}
        />
      </CompareSection>
    </div>
  );
}
