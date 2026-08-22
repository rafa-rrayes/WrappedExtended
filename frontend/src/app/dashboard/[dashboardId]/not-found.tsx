import { RouteNotFoundCard } from "@/components/dashboard/shell/route-states";

/** Shared 404 for everything under an owner's dashboard — renders inside the shell. */
export default function DashboardNotFound() {
  return <RouteNotFoundCard escapeHref="/dashboards" escapeLabel="All dashboards" />;
}
