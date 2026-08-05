"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The non-happy paths shared by the library and detail routes.
 *
 * All three use the same panel so an empty search, a dead backend and a bad URL read as
 * variations of one thing rather than three unrelated screens.
 */

function StatePanel({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-border bg-bg-card px-6 py-14 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] text-text-muted">
        {icon}
      </div>
      <h2 className="mb-2 font-[family-name:var(--font-display)] text-lg font-bold text-text-primary">
        {title}
      </h2>
      {children && <div className="max-w-md text-sm text-text-secondary">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function LibraryEmpty({
  query,
  plural,
  isFiltered,
  onClearSearch,
}: {
  query: string;
  plural: string;
  isFiltered: boolean;
  onClearSearch: () => void;
}) {
  if (query) {
    return (
      <StatePanel
        icon={<SearchIcon />}
        title={`No ${plural} match “${query}”`}
        action={
          <button
            type="button"
            onClick={onClearSearch}
            className="rounded-[var(--radius-sm)] bg-green px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
          >
            Clear search
          </button>
        }
      >
        Try a shorter term — search matches any part of the name.
        {isFiltered && " The active date filter is also narrowing these results."}
      </StatePanel>
    );
  }

  return (
    <StatePanel icon={<SearchIcon />} title={`No ${plural} in range`}>
      {isFiltered
        ? "Nothing was played in the selected date range. Widen it from the picker in the top bar."
        : `This export doesn't contain any ${plural}.`}
    </StatePanel>
  );
}

/**
 * Page number past the end of the result set — reachable by narrowing the date filter or
 * the search while deep in the list, and by editing `?page=` by hand.
 */
export function LibraryOutOfRange({
  plural,
  onReset,
}: {
  plural: string;
  onReset: () => void;
}) {
  return (
    <StatePanel
      icon={<SearchIcon />}
      title="You're past the last page"
      action={
        <button
          type="button"
          onClick={onReset}
          className="rounded-[var(--radius-sm)] bg-green px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
        >
          Back to the first page
        </button>
      }
    >
      There are fewer {plural} to show than there were — the filters changed under this page
      number.
    </StatePanel>
  );
}

export function LibraryError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <StatePanel
      icon={<AlertIcon />}
      title="Couldn't load this list"
      action={
        <button
          type="button"
          onClick={onRetry}
          className="rounded-[var(--radius-sm)] bg-green px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
        >
          Try again
        </button>
      }
    >
      {message ?? "Something went wrong while fetching your listening data."}
    </StatePanel>
  );
}

export function EntityNotFound({
  name,
  singular,
  backHref,
  backLabel,
  isFiltered,
}: {
  name: string;
  singular: string;
  backHref: string;
  backLabel: string;
  isFiltered: boolean;
}) {
  return (
    <StatePanel
      icon={<AlertIcon />}
      title={`No ${singular} called “${name}”`}
      action={
        <Link
          href={backHref}
          className="inline-block rounded-[var(--radius-sm)] bg-green px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
        >
          Back to {backLabel}
        </Link>
      }
    >
      {isFiltered
        ? "Nothing under this name was played in the selected date range — try clearing the date filter in the top bar."
        : "It isn't in this export. The link may be out of date, or the name may have been spelled differently."}
    </StatePanel>
  );
}

function SearchIcon() {
  return (
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
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
      className="text-gold"
    >
      <path d="M12 8v5M12 16.5v.01" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
