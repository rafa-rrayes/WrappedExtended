"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { apiClient, ApiError } from "@/lib/api-client";
import type { MLResponse } from "@/types/dashboard";

const POLL_INTERVAL_MS = 3000;

export interface UseMlInsights {
  data: MLResponse | undefined;
  /** Transport-level failure (network, 401, 500) — distinct from `status === "failed"`. */
  error: unknown;
  isLoading: boolean;
  /** True between clicking "Run analysis" and the enqueue request coming back. */
  isStarting: boolean;
  /** Message from a failed enqueue attempt. */
  startError: string | null;
  /** Enqueue the Celery job and flip the UI into its polling state. */
  start: () => Promise<void>;
  refresh: () => void;
}

/**
 * The Insights page's single source of truth.
 *
 * The endpoint answers with a status rather than a 404, so a run in flight is a normal
 * response we poll on — and polling stops the moment the status leaves `pending`, because
 * a 3s interval against a multi-megabyte `ready` payload would be a self-inflicted DDoS.
 */
export function useMlInsights(dashboardId: string): UseMlInsights {
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR<MLResponse>(
    dashboardId ? `/dashboards/${dashboardId}/ml` : null,
    () => apiClient.getMLInsights(dashboardId),
    {
      refreshInterval: (latest) => (latest?.status === "pending" ? POLL_INTERVAL_MS : 0),
      revalidateOnFocus: false,
      // A queued run can outlive the tab being backgrounded; reconnecting should pick the
      // result up rather than wait for the next interval tick.
      revalidateOnReconnect: true,
      keepPreviousData: true,
    },
  );

  const start = useCallback(async () => {
    setIsStarting(true);
    setStartError(null);
    try {
      const response = await apiClient.computeMLInsights(dashboardId);
      // Seed `pending` locally so polling begins on this render rather than after the
      // next revalidation round-trip — keeping any existing payload, which is what the
      // backend does too: a re-run never blanks the results you already had.
      await mutate(
        (current) => ({
          status: response.status ?? "pending",
          insights: current?.insights ?? null,
        }),
        false,
      );
      await mutate();
    } catch (err) {
      setStartError(
        err instanceof ApiError ? err.message : "Could not start the analysis. Try again.",
      );
    } finally {
      setIsStarting(false);
    }
  }, [dashboardId, mutate]);

  const refresh = useCallback(() => {
    void mutate();
  }, [mutate]);

  return { data, error, isLoading, isStarting, startError, start, refresh };
}
