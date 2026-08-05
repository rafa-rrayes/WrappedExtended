"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * The four things the Insights route can be showing before any chart exists:
 * nothing run yet, a run in flight, a run that failed, and the first fetch.
 */

/** What the run actually does — reused by the empty state and the progress state. */
const MODEL_STEPS = [
  {
    name: "Taste map",
    detail: "PPMI co-occurrence + truncated SVD over your listening sessions",
  },
  {
    name: "Listening modes",
    detail: "Session feature engineering, then KMeans over the session profiles",
  },
  {
    name: "Skip drivers",
    detail: "Gradient boosting with permutation importance on 12 play features",
  },
  {
    name: "Forecast & anomalies",
    detail: "Holt-Winters seasonal forecast plus IsolationForest on daily totals",
  },
  {
    name: "Next-artist model",
    detail: "Sequence model over artist transitions, when the deep stack is enabled",
  },
] as const;

export function MlEmptyState({
  onRun,
  isStarting,
  error,
}: {
  onRun: () => void;
  isStarting: boolean;
  error: string | null;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-bg-card p-6 sm:p-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,420px)] lg:items-center">
        <div>
          <span className="mb-2 block font-[family-name:var(--font-display)] text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-green">
            Machine learning
          </span>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold leading-tight text-text-primary sm:text-3xl">
            Train five models on <span className="text-green">your</span> listening history
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-secondary">
            Your dashboard counts what you played. This goes further: it learns the shape of
            your taste from the order you played things in — which artists live next to each
            other in your head, what kind of listener you are in a given session, what makes
            you hit skip, and where your listening is heading next.
          </p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-secondary">
            Everything runs on your own data, on our servers, once. It takes a couple of
            minutes — you can leave this page and come back.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button onClick={onRun} disabled={isStarting} className="px-7 py-2.5 text-sm">
              {isStarting ? "Starting…" : "Run analysis"}
            </Button>
            <span className="text-xs text-text-muted">Takes ~1–3 minutes</span>
          </div>

          {error ? (
            <p className="mt-3 text-sm text-gold" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <ul className="space-y-2.5">
          {MODEL_STEPS.map((step) => (
            <li
              key={step.name}
              className="rounded-[var(--radius-sm)] border border-border bg-bg-elevated/40 p-3.5"
            >
              <p className="text-sm font-semibold text-text-primary">{step.name}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{step.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function MlPendingState({ onRefresh }: { onRefresh: () => void }) {
  const elapsed = useElapsedSeconds();

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-bg-card p-6 sm:p-10">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-2 border-green/20 border-t-green" />
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-text-primary sm:text-2xl">
          Training your models
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Five models are fitting against your full streaming history. This page updates
          itself the moment they finish — leaving and coming back is fine.
        </p>
        <p className="mt-1 text-xs tabular-nums text-text-muted">
          Running for {formatElapsed(elapsed)}
        </p>
      </div>

      <ul className="mx-auto mt-8 max-w-2xl space-y-2.5">
        {MODEL_STEPS.map((step, index) => (
          <li
            key={step.name}
            className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-border bg-bg-elevated/40 p-3.5"
          >
            <span
              className="mt-1 h-2 w-2 shrink-0 rounded-full bg-green"
              style={{
                animation: "pulse 1.6s ease-in-out infinite",
                animationDelay: `${index * 0.22}s`,
              }}
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-text-primary">
                {step.name}
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-text-muted">
                {step.detail}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onRefresh}
          className="text-xs text-text-muted underline-offset-4 transition-colors hover:text-text-secondary hover:underline"
        >
          Check now
        </button>
      </div>
    </div>
  );
}

export function MlFailedState({
  message,
  onRetry,
  isStarting,
  startError,
}: {
  message?: string;
  onRetry: () => void;
  isStarting: boolean;
  startError: string | null;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-bg-card p-6 sm:p-10">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-gold/10 text-gold">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 8v5M12 16.5v.01" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-text-primary">
          The analysis didn&apos;t finish
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          {message ??
            "Something went wrong while training the models on your history. Running it again usually clears it."}
        </p>
        <div className="mt-6">
          <Button onClick={onRetry} disabled={isStarting} className="px-7 py-2.5 text-sm">
            {isStarting ? "Starting…" : "Run it again"}
          </Button>
        </div>
        {startError ? (
          <p className="mt-3 text-sm text-gold" role="alert">
            {startError}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The banner shown above a *populated* view when a re-run is in flight or has failed.
 *
 * The backend keeps the last good payload visible in both cases, so these are not
 * full-page states — the charts below stay perfectly usable.
 */
export function MlNotice({
  tone,
  title,
  children,
  action,
}: {
  tone: "running" | "warning";
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius-sm)] border px-4 py-3",
        tone === "running"
          ? "border-green/20 bg-green-dim"
          : "border-gold/25 bg-gold-dim",
      )}
      role="status"
    >
      {tone === "running" ? (
        <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-green/25 border-t-green" />
      ) : (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
      )}
      <span className="min-w-0 flex-1 text-sm">
        <span
          className={cn(
            "font-semibold",
            tone === "running" ? "text-green" : "text-gold",
          )}
        >
          {title}
        </span>
        {children ? (
          <span className="ml-1.5 text-text-secondary">{children}</span>
        ) : null}
      </span>
      {action}
    </div>
  );
}

export function MlLoadState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-[420px] rounded-[var(--radius-card)]" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-[var(--radius-card)]" />
        <Skeleton className="h-56 rounded-[var(--radius-card)]" />
      </div>
    </div>
  );
}

export function MlFetchError({
  message,
  onRetry,
  className,
}: {
  message?: string;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-border bg-bg-card p-8 text-center",
        className,
      )}
    >
      <h1 className="font-[family-name:var(--font-display)] text-lg font-bold text-text-primary">
        Couldn&apos;t load your insights
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
        {message ?? "The insights service didn't respond. Check your connection and retry."}
      </p>
      <div className="mt-5">
        <Button variant="outline" onClick={onRetry} className="px-6 py-2 text-sm">
          Try again
        </Button>
      </div>
    </div>
  );
}

/** Seconds since this component mounted, ticking once a second. */
function useElapsedSeconds(): number {
  const startedAt = useRef(Date.now());
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return seconds;
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}
