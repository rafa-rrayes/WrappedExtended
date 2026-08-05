"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Layout primitives shared by every dashboard route view.
 *
 * The shell (sidebar, topbar, date picker) is rendered by the layout — a view only owns
 * the column of content underneath it, so these components deliberately carry no chrome
 * of their own beyond the page heading.
 */

export function ViewPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={cn("mx-auto w-full max-w-[1280px] px-5 pb-24 pt-8 sm:px-6", className)}>
      {children}
    </main>
  );
}

export function ViewHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
      <div className="min-w-0">
        <span className="mb-2 block font-[family-name:var(--font-display)] text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-green">
          {eyebrow}
        </span>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold leading-[1.15] text-text-primary">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

function formatDay(iso: string | null): string {
  if (!iso) return "—";
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Tells the reader which slice of their history the numbers on screen describe.
 *
 * Silence would be worse than a chip: the topbar date picker is always visible, so a page
 * that ignored it — or failed to apply it — would look like it was lying.
 */
export function ScopeNotice({
  from,
  to,
  isFiltered,
  failed,
}: {
  from: string | null;
  to: string | null;
  isFiltered: boolean;
  failed: boolean;
}) {
  if (!isFiltered) return null;

  if (failed) {
    return (
      <span className="rounded-full border border-gold/30 bg-gold-dim px-3 py-1 text-xs font-medium text-gold">
        Date filter unavailable — showing all time
      </span>
    );
  }

  return (
    <span className="rounded-full border border-green/30 bg-green-dim px-3 py-1 text-xs font-medium text-green">
      {formatDay(from)} → {formatDay(to)}
    </span>
  );
}

/**
 * The counterpart for a route that deliberately does *not* obey the top-bar filter.
 *
 * Compare picks its own two periods, and the Lab, Story and Insights routes all run
 * against the complete history by design. The date picker is visible on every one of them,
 * so the alternative to this chip is a control that silently does nothing — which reads as
 * a bug. Deliberately neutral rather than green: it reports an absence, not a selection.
 */
export function ScopeIgnoredNotice({
  isFiltered,
  children,
  title,
}: {
  isFiltered: boolean;
  children: ReactNode;
  title?: string;
}) {
  if (!isFiltered) return null;

  return (
    <span
      title={title}
      className="rounded-full border border-border bg-bg-elevated px-3 py-1 text-xs font-medium text-text-muted"
    >
      {children}
    </span>
  );
}
