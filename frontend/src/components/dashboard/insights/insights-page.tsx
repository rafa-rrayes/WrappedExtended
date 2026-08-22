"use client";

import { useDashboardContext } from "@/components/dashboard/shell/dashboard-context";
import { ApiError } from "@/lib/api-client";
import { ViewPage } from "@/components/dashboard/views/view-shell";
import { useMlInsights } from "./use-ml-insights";
import { MlInsightsView } from "./ml-insights-view";
import {
  MlEmptyState,
  MlFailedState,
  MlFetchError,
  MlLoadState,
  MlNotice,
  MlPendingState,
} from "./ml-status-views";

/**
 * The Insights view — the ML suite's front end. Rendered by the owner's
 * `/dashboard/[id]/insights` route and by the public `/shared` and `/demo` shells.
 *
 * The whole page is a state machine over the one `status` field the endpoint returns:
 * `unavailable` (nothing run yet) → `pending` (polling) → `ready` or `failed`. The
 * dashboard payload itself comes from the shell's context; this view only ever fetches
 * the ML result.
 *
 * `pending` and `failed` each come in two flavours, because the backend keeps the last
 * successful payload attached through a re-run: with insights in hand they are a banner
 * over the real views, and only without one do they take over the page.
 *
 * Reading is open to anyone the dashboard is open to; *starting* a run is the owner's
 * alone (the compute endpoint is `IsAuthenticated` + owner-only), so `canRun` follows
 * `isOwner` and hides every run/re-run control from a guest.
 */
export function InsightsPage() {
  const { dashboardId, basePath, isOwner } = useDashboardContext();
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
          basePath={basePath}
          insights={insights}
          onRerun={start}
          canRun={isOwner}
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
                These are the previous results — they&apos;ll update on their own when the
                new run lands.
              </MlNotice>
            ) : data.status === "failed" ? (
              <MlNotice tone="warning" title="The latest run didn't finish.">
                {data.error_message ??
                  (isOwner
                    ? "Everything below is from your last successful analysis. Re-running usually clears it."
                    : "Everything below is from the last successful analysis.")}
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
          canRun={isOwner}
          isStarting={isStarting}
          startError={startError}
        />
      ) : isLoading ? (
        <MlLoadState />
      ) : (
        /* `unavailable`, or a `ready` with nothing in it — both mean "there is no analysis
           to show", and both are fixed by the owner running one. */
        <MlEmptyState
          onRun={start}
          canRun={isOwner}
          isStarting={isStarting}
          error={startError}
        />
      )}
    </ViewPage>
  );
}
