"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api-client";

/**
 * The two terminal states a *route inside the shell* can land in. Each shell (owner,
 * `/shared/[slug]`, `/demo`) mounts them from its own `error.tsx` / `not-found.tsx`, so
 * they render inside the chrome — the sidebar, top bar and date picker stay put and the
 * miss costs one click rather than a trip back through the app. Only the escape link
 * differs per shell, because "All dashboards" means nothing to a guest.
 */

export function RouteErrorCard({
  error,
  reset,
  escapeHref,
  escapeLabel,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  escapeHref: string;
  escapeLabel: string;
}) {
  // The digest is the only handle on a server-side stack trace, and it is otherwise
  // invisible to anyone debugging from a screenshot.
  useEffect(() => {
    console.error("[dashboard] render failed", error);
  }, [error]);

  const status = error instanceof ApiError ? error.status : null;

  return (
    <main className="mx-auto w-full max-w-[1280px] px-5 pb-24 pt-8 sm:px-6">
      <div className="mx-auto max-w-lg rounded-[var(--radius-card)] border border-border bg-bg-card p-8 text-center">
        <span
          className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-gold-dim text-gold"
          aria-hidden="true"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M12 8v5M12 16.5v.01" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </span>

        <h1 className="mb-2 font-[family-name:var(--font-display)] text-xl font-bold text-text-primary">
          This section couldn&apos;t be rendered
        </h1>

        {/* `ApiError` carries the backend's own `detail` string; anything else is a genuine
            render crash, where the raw message is noise to the reader. */}
        <p className="mb-6 text-sm text-text-secondary">
          {status
            ? error.message
            : "Something in this view failed while drawing the listening data. The rest of the dashboard is unaffected."}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-green px-6 py-2.5 text-sm font-semibold text-bg-deep transition-opacity hover:opacity-90"
          >
            Try again
          </button>
          <Link
            href={escapeHref}
            className="rounded-full border border-border px-6 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:border-text-muted hover:text-text-primary"
          >
            {escapeLabel}
          </Link>
        </div>

        {error.digest && (
          <p className="mt-6 font-mono text-[0.7rem] text-text-muted">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}

/**
 * The entity detail routes call `notFound()` when a name in the URL matches nothing in the
 * export — a stale bookmark, a hand-edited path, or an artist that only exists in a date
 * range the reader has since narrowed past. The public catch-all routes also land here for
 * a segment that isn't a dashboard view at all.
 */
export function RouteNotFoundCard({
  escapeHref,
  escapeLabel,
}: {
  escapeHref: string;
  escapeLabel: string;
}) {
  return (
    <main className="mx-auto w-full max-w-[1280px] px-5 pb-24 pt-8 sm:px-6">
      <div className="mx-auto max-w-lg rounded-[var(--radius-card)] border border-border bg-bg-card p-8 text-center">
        <span
          className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-bg-elevated text-text-muted"
          aria-hidden="true"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>

        <h1 className="mb-2 font-[family-name:var(--font-display)] text-xl font-bold text-text-primary">
          Not in this export
        </h1>
        <p className="mb-6 text-sm text-text-secondary">
          Nothing here matches that address. If you followed a link to an artist, track or
          album, it may not appear in this streaming history.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href={escapeHref}
            className="rounded-full bg-green px-6 py-2.5 text-sm font-semibold text-bg-deep transition-opacity hover:opacity-90"
          >
            {escapeLabel}
          </Link>
        </div>
      </div>
    </main>
  );
}
