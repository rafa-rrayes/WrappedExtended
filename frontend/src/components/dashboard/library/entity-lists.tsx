"use client";

import Link from "next/link";
import { formatNumber } from "@/lib/utils";
import type { EntityCompanion } from "@/types/dashboard";
import { formatHoursCompact } from "./entity-meta";

export interface RankedRow {
  /** Stable key and display label. */
  name: string;
  hours: number;
  plays: number;
  /** When set, the row links here (already carries `?from&to`). */
  href?: string;
}

/**
 * Top-tracks / album-breakdown list.
 *
 * A proportional bar behind each row does the job a second chart would: it shows how much
 * of the entity's total each row accounts for without spending another 200px of height.
 */
export function EntityRankedList({ rows }: { rows: RankedRow[] }) {
  if (!rows.length) {
    return <p className="py-6 text-center text-sm text-text-muted">Nothing to show here.</p>;
  }

  const max = Math.max(...rows.map((row) => row.hours), 0.0001);

  return (
    <ol className="space-y-1">
      {rows.map((row, index) => {
        const content = (
          <>
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 rounded-[var(--radius-sm)] bg-green/[0.09]"
              style={{ width: `${Math.max(2, (row.hours / max) * 100)}%` }}
            />
            <span className="relative w-6 shrink-0 text-right text-xs font-semibold tabular-nums text-text-muted">
              {index + 1}
            </span>
            <span className="relative min-w-0 flex-1 truncate text-sm text-text-primary">
              {row.name}
            </span>
            <span className="relative shrink-0 text-xs tabular-nums text-text-muted">
              {formatNumber(row.plays)} plays
            </span>
            <span className="relative w-14 shrink-0 text-right text-sm font-semibold tabular-nums text-green">
              {formatHoursCompact(row.hours)}
            </span>
          </>
        );

        return (
          <li key={`${index}-${row.name}`}>
            {row.href ? (
              <Link
                href={row.href}
                className="relative flex items-center gap-3 overflow-hidden rounded-[var(--radius-sm)] px-2.5 py-2 transition-colors hover:bg-white/[0.04]"
              >
                {content}
              </Link>
            ) : (
              <div className="relative flex items-center gap-3 overflow-hidden rounded-[var(--radius-sm)] px-2.5 py-2">
                {content}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * "Often listened alongside" — the artists that show up in the same sessions.
 * Rendered as chips rather than a list: it is an associative jump-off, not a ranking.
 */
export function EntityCompanions({
  companions,
  hrefFor,
}: {
  companions: EntityCompanion[];
  hrefFor: (artistName: string) => string;
}) {
  if (!companions.length) {
    return (
      <p className="py-6 text-center text-sm text-text-muted">
        No other artists turned up in the same sessions.
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {companions.map((companion) => (
        <li key={companion.artist_name}>
          <Link
            href={hrefFor(companion.artist_name)}
            className="flex items-center gap-2 rounded-full border border-border bg-bg-elevated px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-green/30 hover:text-green"
          >
            <span className="max-w-[220px] truncate">{companion.artist_name}</span>
            <span className="tabular-nums text-text-muted">
              {formatNumber(companion.shared_sessions)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
