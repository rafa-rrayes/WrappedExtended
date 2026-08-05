"use client";

/**
 * The shell's loading state.
 *
 * It renders the real chrome — sidebar rail, top bar, card grid — so the page does not
 * reflow when the data lands, and doubles as the Suspense fallback for the layout.
 */
export function ShellSkeleton() {
  return (
    <div className="min-h-screen bg-bg-deep pt-14">
      <aside className="fixed left-0 top-14 bottom-0 z-40 hidden w-[240px] flex-col border-r border-border bg-bg-primary/80 px-2 py-4 md:flex">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 px-3 py-2.5">
            <Block className="h-4 w-4 rounded" />
            <Block className="h-3 flex-1 rounded" />
          </div>
        ))}
      </aside>

      <div className="md:pl-[240px]">
        <div className="sticky top-14 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg-primary/85 px-5">
          <Block className="h-4 w-40 rounded" />
          <div className="ml-auto flex gap-2">
            <Block className="h-7 w-24 rounded-[var(--radius-sm)]" />
            <Block className="h-7 w-32 rounded-[var(--radius-sm)]" />
          </div>
        </div>

        <div className="mx-auto max-w-[1280px] px-5 py-8">
          <Block className="mb-6 h-8 w-64 rounded" />
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
    </div>
  );
}

function Block({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-white/[0.05] ${className ?? ""}`} />;
}

export function ShellError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-deep px-6 pt-14">
      <div className="w-full max-w-md rounded-[var(--radius-card)] border border-border bg-bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05]">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="text-gold"
          >
            <path d="M12 8v5M12 16.5v.01" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </div>
        <h1 className="mb-2 font-[family-name:var(--font-display)] text-lg font-bold text-text-primary">
          Couldn&apos;t load this dashboard
        </h1>
        <p className="mb-6 text-sm text-text-secondary">
          {message ?? "Something went wrong while fetching your listening data."}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-[var(--radius-sm)] bg-green px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
