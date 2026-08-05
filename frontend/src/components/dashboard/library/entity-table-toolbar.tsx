"use client";

import { useEffect, useRef, useState } from "react";
import type { EntitySort, EntityType, SortOrder } from "@/types/dashboard";
import { cn, formatNumber } from "@/lib/utils";
import { sortOptionsFor } from "./entity-columns";
import { ENTITY_META } from "./entity-meta";

const DEBOUNCE_MS = 300;

interface EntityTableToolbarProps {
  type: EntityType;
  /** The committed search term from the URL. */
  query: string;
  onQueryChange: (q: string) => void;
  sort: EntitySort;
  order: SortOrder;
  onSortChange: (sort: EntitySort) => void;
  /** Total matching entities; undefined while the first page is still loading. */
  count?: number;
  /** True when the request in flight is a refresh over already-rendered data. */
  busy?: boolean;
}

export function EntityTableToolbar({
  type,
  query,
  onQueryChange,
  sort,
  order,
  onSortChange,
  count,
  busy,
}: EntityTableToolbarProps) {
  const meta = ENTITY_META[type];
  const sortOptions = sortOptionsFor(type);

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <SearchInput
        placeholder={meta.searchPlaceholder}
        value={query}
        onChange={onQueryChange}
        busy={busy}
      />

      {/* Below md the table header is replaced by cards, so sorting needs its own control. */}
      <div className="flex items-center gap-2 md:hidden">
        <label className="sr-only" htmlFor="library-sort">
          Sort by
        </label>
        <select
          id="library-sort"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as EntitySort)}
          className="h-9 rounded-[var(--radius-sm)] border border-border bg-bg-card px-2 text-sm text-text-primary outline-none focus:border-green/40"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onSortChange(sort)}
          aria-label={order === "asc" ? "Sort descending" : "Sort ascending"}
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-bg-card text-text-secondary transition-colors hover:text-text-primary"
        >
          <SortArrow order={order} className="text-green" />
        </button>
      </div>

      <p className="text-sm text-text-muted sm:ml-auto">
        {count === undefined ? (
          <span className="inline-block h-4 w-24 animate-pulse rounded bg-bg-elevated align-middle" />
        ) : (
          <>
            {formatNumber(count)} {count === 1 ? meta.singular : meta.plural}
            {query ? " matched" : ""}
          </>
        )}
      </p>
    </div>
  );
}

/**
 * Debounced search box.
 *
 * The input keeps its own draft so typing stays at 60fps, and commits to the URL 300ms
 * after the last keystroke. `committedRef` tracks the value that is (or is about to be) in
 * the URL, which is what lets the component tell an external change — a back button, the
 * "clear search" action in the empty state — apart from its own echo, and adopt the former
 * without clobbering what the user is currently typing.
 */
function SearchInput({
  placeholder,
  value,
  onChange,
  busy,
}: {
  placeholder: string;
  value: string;
  onChange: (q: string) => void;
  busy?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const committedRef = useRef(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (value === committedRef.current) return;
    committedRef.current = value;
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (draft.trim() === committedRef.current) return;
    const id = window.setTimeout(() => {
      committedRef.current = draft.trim();
      onChangeRef.current(draft);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [draft]);

  return (
    <div className="relative w-full sm:max-w-xs">
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-[var(--radius-sm)] border border-border bg-bg-card pl-9 pr-9 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-green/40"
      />
      {draft && (
        <button
          type="button"
          onClick={() => setDraft("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-muted transition-colors hover:text-text-primary"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
      {busy && !draft && (
        <span className="absolute right-3 top-1/2 h-2 w-2 -translate-y-1/2 animate-pulse rounded-full bg-green" />
      )}
    </div>
  );
}

export function SortArrow({ order, className }: { order: SortOrder; className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      {order === "asc" ? <path d="M12 19V5M6 11l6-6 6 6" /> : <path d="M12 5v14M6 13l6 6 6-6" />}
    </svg>
  );
}
