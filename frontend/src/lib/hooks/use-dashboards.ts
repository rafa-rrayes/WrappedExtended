import useSWR from "swr";
import type { DashboardSummary } from "@/types/dashboard";
import { apiClient } from "@/lib/api-client";

export function useDashboards() {
  return useSWR<DashboardSummary[]>("/dashboards", () =>
    apiClient.getDashboards(),
  );
}
