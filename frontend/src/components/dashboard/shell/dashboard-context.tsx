"use client";

import { createContext, useContext, useMemo } from "react";
import type { DashboardData, DashboardDetail } from "@/types/dashboard";
import { toIsoDate, type DateRangeBounds } from "@/lib/hooks/use-date-range";

/**
 * The dashboard, fetched once by the layout and shared with every route below it.
 *
 * Child routes must read from here instead of calling `useDashboard` again: the payload
 * is a multi-megabyte JSON blob and refetching it on every navigation is the difference
 * between an instant route change and a spinner.
 */
export interface DashboardContextValue {
  dashboardId: string;
  dashboard: DashboardDetail;
  /** Shorthand for `dashboard.dashboard_data` — the unfiltered, pre-baked stats. */
  stats: DashboardData;
  /** Earliest/latest dates present in this export; feeds date pickers and presets. */
  bounds: DateRangeBounds;
  /** Revalidate the dashboard (after a share toggle, a rename, …). */
  refresh: () => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({
  dashboardId,
  dashboard,
  refresh,
  children,
}: {
  dashboardId: string;
  dashboard: DashboardDetail;
  refresh: () => void;
  children: React.ReactNode;
}) {
  const value = useMemo<DashboardContextValue>(
    () => ({
      dashboardId,
      dashboard,
      stats: dashboard.dashboard_data,
      bounds: {
        min: toIsoDate(dashboard.date_range_start),
        max: toIsoDate(dashboard.date_range_end),
      },
      refresh,
    }),
    [dashboardId, dashboard, refresh],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboardContext(): DashboardContextValue {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error(
      "useDashboardContext must be used inside the /dashboard/[dashboardId] layout.",
    );
  }
  return context;
}
