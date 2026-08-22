import useSWR from "swr";
import type { DashboardDetail } from "@/types/dashboard";
import { apiClient } from "@/lib/api-client";

/**
 * A dashboard looked up by its share slug — the public, token-free counterpart of
 * `useDashboard`. Feeds the `/shared/[slug]` and `/demo` shells.
 */
export function usePublicDashboard(slug: string) {
  return useSWR<DashboardDetail>(
    slug ? `/dashboards/shared/${slug}` : null,
    () => apiClient.getPublicDashboard(slug),
    {
      // A 404 here is an answer (not public, or no such slug), not a blip to retry.
      shouldRetryOnError: false,
    },
  );
}
