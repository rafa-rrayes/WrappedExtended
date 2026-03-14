import useSWR from "swr";
import type { AdminAnalytics, AnalyticsRange } from "@/types/admin";
import { apiClient } from "@/lib/api-client";

export function useAdminAnalytics(range: AnalyticsRange) {
  return useSWR<AdminAnalytics>(
    `/admin/analytics?range=${range}`,
    () => apiClient.getAdminAnalytics(range),
    { refreshInterval: 60_000 }
  );
}
