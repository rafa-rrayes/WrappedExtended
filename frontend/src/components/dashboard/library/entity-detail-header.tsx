"use client";

import Link from "next/link";
import type { EntityDetail, EntityType } from "@/types/dashboard";
import { formatHours, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ENTITY_META, formatDay } from "./entity-meta";

interface EntityDetailHeaderProps {
  detail: EntityDetail;
  type: EntityType;
  /** Library route for this type, with the date filter already applied. */
  backHref: string;
  /** `/dashboard/{id}` with the date filter already applied. */
  dashboardHref: string;
  /** Detail page of the entity's artist, when there is one to link to. */
  artistHref?: string;
}

export function EntityDetailHeader({
  detail,
  type,
  backHref,
  dashboardHref,
  artistHref,
}: EntityDetailHeaderProps) {
  const meta = ENTITY_META[type];

  const tiles: { label: string; value: string; accent?: boolean }[] = [
    { label: "Listening time", value: formatHours(detail.total_hours), accent: true },
    { label: "Plays", value: formatNumber(detail.total_plays) },
    { label: "First listen", value: formatDay(detail.first_listen) },
    { label: "Last listen", value: formatDay(detail.last_listen) },
    {
      label: "Longest streak",
      value:
        detail.longest_streak_days === 1
          ? "1 day"
          : `${formatNumber(detail.longest_streak_days)} days`,
    },
  ];

  // `skip_rate` is null when the export has no skip column at all — showing "0%" there
  // would be a claim the data can't support.
  if (detail.skip_rate !== null && detail.skip_rate !== undefined) {
    tiles.push({ label: "Skip rate", value: `${Math.round(detail.skip_rate * 100)}%` });
  }

  return (
    <header className="mb-6">
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
          <li>
            <Link href={dashboardHref} className="transition-colors hover:text-text-secondary">
              Dashboard
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={backHref} className="transition-colors hover:text-text-secondary">
              {meta.title}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="max-w-[60vw] truncate text-text-secondary" aria-current="page">
            {detail.name}
          </li>
        </ol>
      </nav>

      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-green"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 6l-6 6 6 6" />
        </svg>
        All {meta.plural}
      </Link>

      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.6rem,4vw,2.5rem)] font-extrabold leading-tight text-text-primary">
          {detail.name}
        </h1>
        {detail.rank !== null && (
          <Badge variant="gold" className="mt-2 shrink-0">
            #{detail.rank} by hours
          </Badge>
        )}
      </div>

      {detail.artist_name && (
        <p className="mt-1 text-sm text-text-secondary">
          {artistHref ? (
            <Link href={artistHref} className="transition-colors hover:text-green">
              {detail.artist_name}
            </Link>
          ) : (
            detail.artist_name
          )}
        </p>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-[var(--radius-card)] border border-border bg-bg-card px-4 py-3"
          >
            <dt className="text-[0.65rem] uppercase tracking-wider text-text-muted">
              {tile.label}
            </dt>
            <dd
              className={`mt-1 font-[family-name:var(--font-display)] text-lg font-extrabold ${
                tile.accent ? "text-green" : "text-text-primary"
              }`}
            >
              {tile.value}
            </dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
