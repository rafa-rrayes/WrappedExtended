import { OverviewView } from "@/components/dashboard/views/overview-view";

/**
 * Dashboard index — the landing screen.
 *
 * Auth, the sidebar, the topbar, the date picker and the dashboard fetch all belong to
 * `layout.tsx`; this route only renders its own content.
 */
export default function DashboardOverviewPage() {
  return <OverviewView />;
}
