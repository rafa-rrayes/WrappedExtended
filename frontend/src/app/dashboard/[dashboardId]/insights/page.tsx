"use client";

import { useDashboardContext } from "@/components/dashboard/shell/dashboard-context";
import { ApiError } from "@/lib/api-client";
import { ViewPage } from "@/components/dashboard/views/view-shell";
import { useMlInsights } from "@/components/dashboard/insights/use-ml-insights";
import { MlInsightsView } from "@/components/dashboard/insights/ml-insights-view";
import {
  MlEmptyState,
  MlFailedState,
  MlFetchError,
  MlLoadState,
  MlNotice,
  MlPendingState,
} from "@/components/dashboard/insights/ml-status-views";

/**
 * The Insights route — the ML suite's front end.
 *
 * The whole page is a state machine over the one `status` field the endpoint returns:
 * `unavailable` (nothing run yet) → `pending` (polling) → `ready` or `failed`. The
 * dashboard payload itself comes from the shell's context; this route only ever fetches
 * the ML result.
 *
 * `pending` and `failed` each come in two flavours, because the backend keeps the last
 * successful payload attached through a re-run: with insights in hand they are a banner
 * over the real views, and only without one do they take over the page.
 */
export default function InsightsPage() {
  const { dashboardId } = useDashboardContext();
  const { data, error, isLoading, isStarting, startError, start, refresh } =
    useMlInsights(dashboardId);

  const insights = data?.insights ?? null;
  const isRunning = data?.status === "pending";

  return (
    <ViewPage>
      {/* Transport failure — distinct from a run that failed, and the only case with no
          usable `status` at all. */}
      {error && !data ? (
        <MlFetchError
          message={error instanceof ApiError ? error.message : undefined}
          onRetry={refresh}
        />
      ) : !data ? (
        <MlLoadState />
      ) : insights && (data.status === "ready" || isRunning || data.status === "failed") ? (
        <MlInsightsView
          dashboardId={dashboardId}
          insights={insights}
          onRerun={start}
          isRerunning={isStarting}
          isRunning={isRunning}
          rerunError={startError}
          notice={
            isRunning ? (
              <MlNotice
                tone="running"
                title="Re-running the analysis."
                action={
                  <button
                    type="button"
                    onClick={refresh}
                    className="shrink-0 text-xs text-text-muted underline-offset-4 transition-colors hover:text-text-secondary hover:underline"
                  >
                    Check now
                  </button>
                }
              >
                These are your previous results — they&apos;ll update on their own when the
                new run lands.
              </MlNotice>
            ) : data.status === "failed" ? (
              <MlNotice tone="warning" title="The latest run didn't finish.">
                {data.error_message ??
                  "Everything below is from your last successful analysis. Re-running usually clears it."}
              </MlNotice>
            ) : null
          }
        />
      ) : isRunning ? (
        <MlPendingState onRefresh={refresh} />
      ) : data.status === "failed" ? (
        <MlFailedState
          message={data.error_message}
          onRetry={start}
          isStarting={isStarting}
          startError={startError}
        />
      ) : isLoading ? (
        <MlLoadState />
      ) : (
        /* `unavailable`, or a `ready` with nothing in it — both mean "there is no analysis
           to show", and both are fixed by running one. */
        <MlEmptyState onRun={start} isStarting={isStarting} error={startError} />
      )}
    </ViewPage>
  );
}
