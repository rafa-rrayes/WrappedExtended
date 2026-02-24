import useSWR from "swr";
import type { DashboardDetail } from "@/types/dashboard";
import { apiClient } from "@/lib/api-client";

export function useDashboard(id: string) {
  return useSWR<DashboardDetail>(
    id ? `/dashboards/${id}` : null,
    () => apiClient.getDashboard(id)
  );
}
