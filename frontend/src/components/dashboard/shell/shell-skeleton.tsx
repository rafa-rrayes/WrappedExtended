"use client";

import Link from "next/link";

/**
 * The shell's loading state.
 *
 * It renders the real chrome — sidebar rail, top bar, card grid — so the page does not
 * reflow when the data lands, and doubles as the Suspense fallback for the layout. Every
 * dimension here is copied from the component it stands in for; `--shell-sidebar-w` is
 * declared locally at the expanded width because that is also what `DashboardShell` paints
 * on its first frame, before it can read the collapsed preference out of localStorage.
 */
export function ShellSkeleton() {
  return (
    <div
      className="min-h-screen bg-bg-deep pt-14"
      style={{ "--shell-sidebar-w": "240px" } as React.CSSProperties}
      role="status"
      aria-label="Loading dashboard"
    >
      <aside
        className="fixed bottom-0 left-0 top-14 z-40 hidden w-[var(--shell-sidebar-w)] flex-col border-r border-border bg-bg-primary/80 px-2 py-4 md:flex"
        aria-hidden="true"
      >
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 px-3 py-2.5">
            <Block className="h-4 w-4 rounded" />
            <Block className="h-3 flex-1 rounded" />
          </div>
        ))}
      </aside>

      <div className="md:pl-[var(--shell-sidebar-w)]" aria-hidden="true">
        <div className="sticky top-14 z-30 flex h-14 items-center gap-2 border-b border-border bg-bg-primary/85 px-3 sm:px-5">
          <Block className="h-4 w-40 rounded" />
          <div className="ml-auto flex shrink-0 gap-2">
            <Block className="h-7 w-9 rounded-[var(--radius-sm)] lg:w-24" />
            <Block className="h-7 w-32 rounded-[var(--radius-sm)]" />
          </div>
        </div>

        {/* Matches ViewPage's container so the first real render lands in the same place. */}
        <div className="mx-auto w-full max-w-[1280px] px-5 pb-24 pt-8 sm:px-6">
          <div className="mb-6 border-b border-border pb-6">
            <Block className="mb-2 h-3 w-24 rounded" />
            <Block className="h-9 w-72 max-w-full rounded" />
          </div>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Block key={index} className="h-24 rounded-[var(--radius-card)]" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Block className="h-72 rounded-[var(--radius-card)]" />
            <Block className="h-72 rounded-[var(--radius-card)]" />
          </div>
        </div>
      </div>

      <span className="sr-only">Loading your dashboard…</span>
    </div>
  );
}

function Block({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-white/[0.05] ${className ?? ""}`} />;
}

const OWNER_MISSING = {
  title: "This dashboard doesn't exist",
  body: "The link may be out of date, or the dashboard may have been deleted.",
};
const OWNER_ESCAPE = { href: "/dashboards", label: "All dashboards" };

/**
 * Terminal state for the shell's own fetch.
 *
 * A 404 is not a failure the reader can retry their way out of — the dashboard is gone, or
 * belongs to someone else, or was never made public — so it gets different copy and a
 * different action from a transient network or server error. The public shells pass their
 * own `missing` copy and `escape` link; the defaults are the owner's.
 */
export function ShellError({
  message,
  status,
  onRetry,
  missing: missingCopy = OWNER_MISSING,
  escape = OWNER_ESCAPE,
}: {
  message?: string;
  status?: number;
  onRetry: () => void;
  missing?: { title: string; body: string };
  escape?: { href: string; label: string };
}) {
  const missing = status === 404;

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-deep px-6 pt-14">
      <div className="w-full max-w-md rounded-[var(--radius-card)] border border-border bg-bg-card p-8 text-center">
        <span
          className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] text-gold"
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
            {missing ? (
              <>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </>
            ) : (
              <>
                <path d="M12 8v5M12 16.5v.01" />
                <circle cx="12" cy="12" r="9" />
              </>
            )}
          </svg>
        </span>

        <h1 className="mb-2 font-[family-name:var(--font-display)] text-lg font-bold text-text-primary">
          {missing ? missingCopy.title : "Couldn't load this dashboard"}
        </h1>
        <p className="mb-6 text-sm text-text-secondary">
          {missing
            ? missingCopy.body
            : (message ?? "Something went wrong while fetching the listening data.")}
        </p>

        {missing ? (
          <Link
            href={escape.href}
            className="inline-block rounded-full bg-green px-6 py-2.5 text-sm font-semibold text-bg-deep transition-opacity hover:opacity-90"
          >
            {escape.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full bg-green px-6 py-2.5 text-sm font-semibold text-bg-deep transition-opacity hover:opacity-90"
          >
            Try again
          </button>
        )}
      </div>
    </main>
  );
}
