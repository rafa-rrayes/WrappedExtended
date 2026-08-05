import Link from "next/link";

/**
 * Shared 404 for everything under a dashboard.
 *
 * The entity detail routes call `notFound()` when a name in the URL matches nothing in the
 * export — a stale bookmark, a hand-edited path, or an artist that only exists in a date
 * range the reader has since narrowed past. It renders inside the shell, so the sidebar is
 * right there and the miss costs a single click rather than a trip back through the app.
 */
export default function DashboardNotFound() {
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
          album, it may not appear in the streaming history you uploaded.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboards"
            className="rounded-full bg-green px-6 py-2.5 text-sm font-semibold text-bg-deep transition-opacity hover:opacity-90"
          >
            All dashboards
          </Link>
        </div>
      </div>
    </main>
  );
}
