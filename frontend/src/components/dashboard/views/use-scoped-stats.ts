"use client";

import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { useDateRange } from "@/lib/hooks/use-date-range";
import { useDashboardContext } from "@/components/dashboard/shell/dashboard-context";
import type { DashboardData } from "@/types/dashboard";

/**
 * The stats a view should render, honouring the shell's `?from&to` date filter.
 *
 * Unfiltered, this is the pre-baked payload the layout already holds — no request. With a
 * filter it re-derives the same shape from the Parquet via the query engine, so every
 * chart on the page keeps working unchanged on the narrower slice. A failed or empty
 * response falls back to the all-time payload rather than blanking the page; `failed`
 * lets the view say so instead of silently showing the wrong window.
 */
export interface ScopedStats {
  stats: DashboardData;
  from: string | null;
  to: string | null;
  isFiltered: boolean;
  /** Filtered payload in flight — render skeletons. */
  isLoading: boolean;
  /** Filtered request failed; `stats` is the all-time payload. */
  failed: boolean;
}

export function useScopedStats(): ScopedStats {
  const { dashboardId, stats, bounds } = useDashboardContext();
  const { from, to } = useDateRange(bounds);

  // A half-open range is still a range: fill the missing edge from the export's bounds so
  // "everything after March" doesn't need both fields typed to do anything.
  const start = from ?? bounds.min;
  const end = to ?? bounds.max;
  const isFiltered = (from !== null || to !== null) && start !== null && end !== null;

  const { data, error, isLoading } = useSWR<DashboardData | null>(
    isFiltered ? ["dashboard-scope", dashboardId, start, end] : null,
    async () => {
      const response = await apiClient.timeMachine(dashboardId, {
        start: start as string,
        end: end as string,
      });
      return (response?.period_a as DashboardData | undefined) ?? null;
    },
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  return {
    stats: data ?? stats,
    from,
    to,
    isFiltered,
    isLoading: isFiltered && isLoading,
    failed: isFiltered && Boolean(error),
  };
}
