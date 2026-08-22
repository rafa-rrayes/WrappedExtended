import { PublicDashboardRoute } from "@/components/dashboard/shell/public-dashboard-route";

/** Every `/demo/*` view — the switch lives in `PublicDashboardRoute`. */
export default function DemoRoute() {
  return <PublicDashboardRoute />;
}
