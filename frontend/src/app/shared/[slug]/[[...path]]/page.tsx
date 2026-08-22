import { PublicDashboardRoute } from "@/components/dashboard/shell/public-dashboard-route";

/** Every `/shared/[slug]/*` view — the switch lives in `PublicDashboardRoute`. */
export default function SharedDashboardRoute() {
  return <PublicDashboardRoute />;
}
