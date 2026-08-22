import { RouteNotFoundCard } from "@/components/dashboard/shell/route-states";

/** 404 inside the demo shell — an unknown path or an entity not in the sample export. */
export default function DemoNotFound() {
  return <RouteNotFoundCard escapeHref="/demo" escapeLabel="Back to the demo" />;
}
