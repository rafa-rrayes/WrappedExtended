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
 *
 * The same shell serves three URL spaces — the owner's `/dashboard/{id}`, a public
 * `/shared/{slug}` and `/demo` — so nothing below the layout may spell out a route
 * prefix. Links are built from `basePath`, and anything only the owner may do (share,
 * export, re-run the ML models, switch dashboards) is gated on `isOwner`.
 */
export interface DashboardContextValue {
  dashboardId: string;
  /** URL prefix every in-dashboard link hangs off: `/dashboard/{id}`, `/shared/{slug}`, `/demo`. */
  basePath: string;
  /** False on the public routes, where the viewer is a guest of whoever made this public. */
  isOwner: boolean;
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
  basePath,
  isOwner,
  dashboard,
  refresh,
  children,
}: {
  dashboardId: string;
  basePath: string;
  isOwner: boolean;
  dashboard: DashboardDetail;
  refresh: () => void;
  children: React.ReactNode;
}) {
  const value = useMemo<DashboardContextValue>(
    () => ({
      dashboardId,
      basePath,
      isOwner,
      dashboard,
      stats: dashboard.dashboard_data,
      bounds: {
        min: toIsoDate(dashboard.date_range_start),
        max: toIsoDate(dashboard.date_range_end),
      },
      refresh,
    }),
    [dashboardId, basePath, isOwner, dashboard, refresh],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboardContext(): DashboardContextValue {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error(
      "useDashboardContext must be used inside a dashboard shell (/dashboard/[dashboardId], /shared/[slug] or /demo).",
    );
  }
  return context;
}
