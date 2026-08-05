"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api-client";

/**
 * Error boundary for every `/dashboard/[dashboardId]/*` route.
 *
 * It sits *inside* the segment's layout, so a chart that throws on a malformed payload
 * takes down the one panel it belongs to — the sidebar, topbar and date picker stay put and
 * the reader can navigate to a route that works. Without this file the nearest boundary is
 * the root `app/error.tsx`, which replaces the entire application shell with a bare page.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
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
            : "Something in this view failed while drawing your listening data. The rest of the dashboard is unaffected."}
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
            href="/dashboards"
            className="rounded-full border border-border px-6 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:border-text-muted hover:text-text-primary"
          >
            All dashboards
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
