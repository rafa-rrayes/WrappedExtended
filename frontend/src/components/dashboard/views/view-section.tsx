"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Presence check for an optional `stats.*` field.
 *
 * A sparse Spotify export can be missing most of the analyzer output, and every chart
 * quietly returns `null` when its data is absent. Left alone that produces a page with
 * invisible holes in it, so views pair each chart with this check and render an explicit
 * empty card instead.
 */
export function hasStat(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  return true;
}

/** True when at least one of the passed fields carries data. */
export function hasAnyStat(...values: unknown[]): boolean {
  return values.some(hasStat);
}

export function ViewSection({
  title,
  note,
  available,
  children,
}: {
  title: string;
  note?: string;
  available: boolean;
  children: ReactNode;
}) {
  if (!available) return <EmptySection title={title} note={note} />;
  return <>{children}</>;
}

export function EmptySection({ title, note }: { title: string; note?: string }) {
  return (
    <section className="my-4 rounded-[var(--radius-card)] border border-dashed border-border bg-bg-card/40 px-6 py-10 text-center">
      <h2 className="font-[family-name:var(--font-display)] text-base font-bold text-text-secondary">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
        {note ?? "This export doesn't contain the data behind this section."}
      </p>
    </section>
  );
}

/** Placeholder for sections whose data is still being fetched for a filtered range. */
export function SectionSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-10 py-6" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-7 w-72 max-w-full" />
          <Skeleton className="h-64 w-full rounded-[var(--radius-card)]" />
        </div>
      ))}
    </div>
  );
}
