"use client";

import { RouteErrorCard } from "@/components/dashboard/shell/route-states";

/**
 * Error boundary for every `/dashboard/[dashboardId]/*` route.
 *
 * It sits *inside* the segment's layout, so a chart that throws on a malformed payload
 * takes down the one panel it belongs to — the sidebar, topbar and date picker stay put.
 * Without this file the nearest boundary is the root `app/error.tsx`, which replaces the
 * entire application shell with a bare page.
 */
export default function DashboardError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorCard {...props} escapeHref="/dashboards" escapeLabel="All dashboards" />;
}
