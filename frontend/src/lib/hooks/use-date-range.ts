"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * The global date filter, stored in the URL rather than in a store.
 *
 * `?from=YYYY-MM-DD&to=YYYY-MM-DD` is the single source of truth, which is what makes a
 * filtered view linkable, shareable and back-button-safe — none of which the old
 * `lib/stores/time-machine` zustand store could do. Every dashboard route reads the same
 * two params, so the filter survives navigation for free.
 *
 * Writes go through `router.replace` with `scroll: false`: replacing keeps the back
 * button meaning "the page I came from" instead of "the previous slider position", and
 * suppressing scroll restoration stops the page from jumping while you drag a date.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const MS_PER_DAY = 86_400_000;

export interface DateRangeBounds {
  /** Earliest selectable date (YYYY-MM-DD), or null when unknown. */
  min: string | null;
  /** Latest selectable date (YYYY-MM-DD), or null when unknown. */
  max: string | null;
}

export interface DateRangePreset {
  label: string;
  from: string;
  to: string;
}

export interface UseDateRangeResult {
  /** Start of the active filter, or null when unfiltered. */
  from: string | null;
  /** End of the active filter, or null when unfiltered. */
  to: string | null;
  isFiltered: boolean;
  setRange: (from: string | null, to: string | null) => void;
  clear: () => void;
  presets: DateRangePreset[];
}

/**
 * Normalise a date-ish value to `YYYY-MM-DD`, or null if it isn't one.
 *
 * Accepts full ISO timestamps (the API returns both shapes depending on the field) and
 * rejects impossible calendar dates like `2025-02-31`, which `new Date()` would happily
 * roll over into March.
 */
export function toIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const candidate = value.slice(0, 10);
  if (!ISO_DATE.test(candidate)) return null;
  const [year, month, day] = candidate.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return candidate;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function shiftDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day) + days * MS_PER_DAY);
  return shifted.toISOString().slice(0, 10);
}

/** Month arithmetic that clamps the day instead of overflowing (Jan 31 − 1mo → Feb 28). */
function shiftMonths(iso: string, months: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const targetYear = target.getUTCFullYear();
  const targetMonth = target.getUTCMonth();
  const clampedDay = Math.min(day, daysInMonth(targetYear, targetMonth));
  return new Date(Date.UTC(targetYear, targetMonth, clampedDay)).toISOString().slice(0, 10);
}

function clamp(iso: string, bounds: DateRangeBounds | undefined): string {
  if (!bounds) return iso;
  if (bounds.min && iso < bounds.min) return bounds.min;
  if (bounds.max && iso > bounds.max) return bounds.max;
  return iso;
}

/** Build the preset list for a set of bounds. Exported so tests/tooling can reuse it. */
export function buildPresets(bounds?: DateRangeBounds): DateRangePreset[] {
  const min = toIsoDate(bounds?.min);
  const max = toIsoDate(bounds?.max);
  // Anchor relative windows to the end of the data, not to today: for an export that
  // stops six months ago, "last 30 days" relative to today would select nothing.
  const anchor = max ?? todayIso();
  const floor = (iso: string) => (min && iso < min ? min : iso);

  const presets: DateRangePreset[] = [
    { label: "Last 30 days", from: floor(shiftDays(anchor, -29)), to: anchor },
    { label: "Last 90 days", from: floor(shiftDays(anchor, -89)), to: anchor },
    { label: "Last 12 months", from: floor(shiftMonths(anchor, -12)), to: anchor },
  ];

  if (min) {
    const firstYear = Number(min.slice(0, 4));
    const lastYear = Number(anchor.slice(0, 4));
    for (let year = lastYear; year >= firstYear; year--) {
      const start = `${year}-01-01`;
      const end = `${year}-12-31`;
      presets.push({
        label: String(year),
        from: start < min ? min : start,
        to: end > anchor ? anchor : end,
      });
    }
    presets.push({ label: "All time", from: min, to: anchor });
  }

  return presets;
}

export function useDateRange(bounds?: DateRangeBounds): UseDateRangeResult {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawFrom = searchParams.get("from");
  const rawTo = searchParams.get("to");

  // Malformed values are ignored rather than thrown on — a hand-edited URL should
  // degrade to "unfiltered", not blow up the whole route.
  const from = toIsoDate(rawFrom);
  const to = toIsoDate(rawTo);

  const boundsMin = toIsoDate(bounds?.min);
  const boundsMax = toIsoDate(bounds?.max);

  const setRange = useCallback(
    (nextFrom: string | null, nextTo: string | null) => {
      const limits: DateRangeBounds = { min: boundsMin, max: boundsMax };
      let start = toIsoDate(nextFrom);
      let end = toIsoDate(nextTo);
      if (start) start = clamp(start, limits);
      if (end) end = clamp(end, limits);
      // A reversed range is a slip of the finger, not an empty result set.
      if (start && end && start > end) [start, end] = [end, start];

      // Unrelated params (a route's own tab/sort/page state) must survive a date change.
      const params = new URLSearchParams(searchParams.toString());
      if (start) params.set("from", start);
      else params.delete("from");
      if (end) params.set("to", end);
      else params.delete("to");

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [boundsMin, boundsMax, pathname, router, searchParams],
  );

  const clear = useCallback(() => setRange(null, null), [setRange]);

  const presets = useMemo(
    () => buildPresets({ min: boundsMin, max: boundsMax }),
    [boundsMin, boundsMax],
  );

  return {
    from,
    to,
    isFiltered: from !== null || to !== null,
    setRange,
    clear,
    presets,
  };
}

/**
 * Build an href that carries the active date filter across a navigation.
 *
 * Every link inside the dashboard shell should go through this, otherwise clicking from
 * a filtered Artists page to Tracks silently drops the filter.
 */
export function useRangeHref(): (path: string) => string {
  const searchParams = useSearchParams();
  const from = toIsoDate(searchParams.get("from"));
  const to = toIsoDate(searchParams.get("to"));

  return useCallback(
    (path: string) => {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const query = params.toString();
      if (!query) return path;
      return path.includes("?") ? `${path}&${query}` : `${path}?${query}`;
    },
    [from, to],
  );
}
