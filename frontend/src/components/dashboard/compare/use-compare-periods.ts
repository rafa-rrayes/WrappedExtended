"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toIsoDate, type DateRangeBounds } from "@/lib/hooks/use-date-range";
import { addDays, addMonths, dayCount, sameDayInYear, samePeriod, type Period } from "./period-format";

/**
 * The two comparison periods, stored in the URL exactly like the global date filter is.
 *
 * `?a_start=&a_end=&b_start=&b_end=` is the whole state: a comparison you find interesting
 * is a link you can send, and a reload lands on the same two periods. Writes follow the
 * same discipline as `useDateRange` — `router.replace` (so Back means "the page before",
 * not "the previous period I tried"), `scroll: false`, and unrelated params preserved so
 * the shell's `?from&to` survives a period change.
 *
 * Missing or malformed params fall back to a sensible default rather than erroring: a
 * bare `/compare` URL is the common case, and it should render a real comparison
 * immediately instead of an empty form.
 */

export interface ComparePreset {
  id: string;
  label: string;
  a: Period;
  b: Period;
}

export interface UseComparePeriodsResult {
  /** The older/baseline period. Null only when the export has no usable date range. */
  a: Period | null;
  /** The newer/subject period. */
  b: Period | null;
  /** True when both periods came from the URL rather than from the default. */
  isExplicit: boolean;
  setPeriods: (periods: { a: Period; b: Period }) => void;
  presets: ComparePreset[];
  activePresetId: string | null;
}

const MAX_YEAR_PAIRS = 4;

function yearPeriod(year: number): Period {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

/**
 * Bring a candidate period inside the data's span, or reject it outright.
 *
 * A reversed range is a slip of the finger and gets swapped; a range that misses the data
 * entirely is dropped, because clamping it would silently select a single edge day and
 * present that as the user's choice.
 */
export function clampPeriod(period: Period, min: string, max: string): Period | null {
  let start = toIsoDate(period.start);
  let end = toIsoDate(period.end);
  if (!start || !end) return null;
  if (start > end) [start, end] = [end, start];
  if (end < min || start > max) return null;
  return {
    start: start < min ? min : start,
    end: end > max ? max : end,
  };
}

/**
 * What to show someone who has never opened this page.
 *
 * The two most recent *complete* calendar years, because those are the only two spans that
 * are comparable without a caveat. Failing that: the two most recent years present (with
 * the partial one clamped), and for a single-year export, the span split down the middle.
 */
export function defaultPeriods(bounds: DateRangeBounds): { a: Period; b: Period } | null {
  const min = toIsoDate(bounds.min);
  const max = toIsoDate(bounds.max);
  if (!min || !max) return null;

  const firstYear = Number(min.slice(0, 4));
  const lastYear = Number(max.slice(0, 4));

  const fullYears: number[] = [];
  for (let year = firstYear; year <= lastYear; year++) {
    if (min <= `${year}-01-01` && max >= `${year}-12-31`) fullYears.push(year);
  }
  if (fullYears.length >= 2) {
    const [older, newer] = fullYears.slice(-2);
    return { a: yearPeriod(older), b: yearPeriod(newer) };
  }

  if (lastYear > firstYear) {
    const a = clampPeriod(yearPeriod(lastYear - 1), min, max);
    const b = clampPeriod(yearPeriod(lastYear), min, max);
    if (a && b) return { a, b };
  }

  const days = dayCount({ start: min, end: max });
  if (days >= 2) {
    const midpoint = addDays(min, Math.floor(days / 2) - 1);
    return { a: { start: min, end: midpoint }, b: { start: addDays(midpoint, 1), end: max } };
  }

  return { a: { start: min, end: max }, b: { start: min, end: max } };
}

/**
 * Pair presets, all derived from the data's own span.
 *
 * Labels read "B vs A" ("2024 vs 2023") because that's how the comparison is spoken.
 * Anything the data can't support is left out rather than clamped into a misleading
 * half-window — comparing "last 90 days" against a 12-day stub would be worse than not
 * offering the button.
 */
export function buildComparePresets(bounds: DateRangeBounds): ComparePreset[] {
  const min = toIsoDate(bounds.min);
  const max = toIsoDate(bounds.max);
  if (!min || !max) return [];

  const firstYear = Number(min.slice(0, 4));
  const lastYear = Number(max.slice(0, 4));
  const presets: ComparePreset[] = [];

  const push = (id: string, label: string, a: Period, b: Period) => {
    const clampedA = clampPeriod(a, min, max);
    const clampedB = clampPeriod(b, min, max);
    if (!clampedA || !clampedB) return;
    const duplicate = presets.some(
      (preset) => samePeriod(preset.a, clampedA) && samePeriod(preset.b, clampedB),
    );
    if (!duplicate) presets.push({ id, label, a: clampedA, b: clampedB });
  };

  // Like-for-like year to date — only worth offering while the latest year is incomplete,
  // which is exactly when the plain "2026 vs 2025" pair would be comparing 8 months to 12.
  if (lastYear > firstYear && max < `${lastYear}-12-31`) {
    push(
      "ytd",
      `${lastYear} vs ${lastYear - 1} to date`,
      { start: `${lastYear - 1}-01-01`, end: sameDayInYear(max, lastYear - 1) },
      { start: `${lastYear}-01-01`, end: max },
    );
  }

  const oldestPairYear = Math.max(firstYear + 1, lastYear - MAX_YEAR_PAIRS + 1);
  for (let year = lastYear; year >= oldestPairYear; year--) {
    push(`years-${year}`, `${year} vs ${year - 1}`, yearPeriod(year - 1), yearPeriod(year));
  }

  if (lastYear - firstYear >= 2) {
    push("span", `${lastYear} vs ${firstYear}`, yearPeriod(firstYear), yearPeriod(lastYear));
  }

  const prior90Start = addDays(max, -179);
  if (prior90Start >= min) {
    push(
      "d90",
      "Last 90 days vs prior 90",
      { start: prior90Start, end: addDays(max, -90) },
      { start: addDays(max, -89), end: max },
    );
  }

  const prior12Start = addDays(addMonths(max, -24), 1);
  if (prior12Start >= min) {
    push(
      "m12",
      "Last 12 months vs prior 12",
      { start: prior12Start, end: addMonths(max, -12) },
      { start: addDays(addMonths(max, -12), 1), end: max },
    );
  }

  return presets;
}

export function useComparePeriods(bounds: DateRangeBounds): UseComparePeriodsResult {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const min = toIsoDate(bounds.min);
  const max = toIsoDate(bounds.max);

  const rawAStart = searchParams.get("a_start");
  const rawAEnd = searchParams.get("a_end");
  const rawBStart = searchParams.get("b_start");
  const rawBEnd = searchParams.get("b_end");

  const resolved = useMemo(() => {
    if (!min || !max) return { a: null, b: null, isExplicit: false };
    const fallback = defaultPeriods({ min, max });
    const fromUrl = (start: string | null, end: string | null) =>
      start && end ? clampPeriod({ start, end }, min, max) : null;

    const urlA = fromUrl(rawAStart, rawAEnd);
    const urlB = fromUrl(rawBStart, rawBEnd);
    return {
      a: urlA ?? fallback?.a ?? null,
      b: urlB ?? fallback?.b ?? null,
      isExplicit: urlA !== null && urlB !== null,
    };
  }, [min, max, rawAStart, rawAEnd, rawBStart, rawBEnd]);

  const setPeriods = useCallback(
    (periods: { a: Period; b: Period }) => {
      if (!min || !max) return;
      const a = clampPeriod(periods.a, min, max);
      const b = clampPeriod(periods.b, min, max);
      if (!a || !b) return;

      const params = new URLSearchParams(searchParams.toString());
      params.set("a_start", a.start);
      params.set("a_end", a.end);
      params.set("b_start", b.start);
      params.set("b_end", b.end);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [min, max, pathname, router, searchParams],
  );

  const presets = useMemo(() => buildComparePresets({ min, max }), [min, max]);

  const activePresetId = useMemo(() => {
    const { a, b } = resolved;
    if (!a || !b) return null;
    return presets.find((preset) => samePeriod(preset.a, a) && samePeriod(preset.b, b))?.id ?? null;
  }, [presets, resolved]);

  return {
    a: resolved.a,
    b: resolved.b,
    isExplicit: resolved.isExplicit,
    setPeriods,
    presets,
    activePresetId,
  };
}
