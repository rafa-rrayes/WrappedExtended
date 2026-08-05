/**
 * Date arithmetic and human labels for a comparison period.
 *
 * The backend hands back `label: "2023-01-01 to 2023-12-31"` — correct and unreadable.
 * Every heading on this page runs the raw start/end through `formatPeriodLabel` instead
 * and keeps the exact dates as a subtitle, so "2023" stays a chip you can scan while the
 * literal span is still one glance away.
 *
 * All arithmetic is done in UTC on `YYYY-MM-DD` strings: the API speaks calendar dates,
 * and routing them through a local-time `Date` is how a range silently loses a day.
 */

const MS_PER_DAY = 86_400_000;

/** A closed date interval, both ends inclusive, `YYYY-MM-DD`. */
export interface Period {
  start: string;
  end: string;
}

/**
 * Series colours for the two periods.
 *
 * Green (older, the baseline) and gold (newer, the subject) are the house colours and both
 * clear WCAG AA as strokes on `#0c0c0c`. They map onto the same "latest year is gold"
 * convention the year-over-year chart already uses, so the pairing reads as familiar
 * rather than arbitrary. Note that they are *identity* colours here: green never means
 * "good" on this page — that job belongs to the delta tones in `metrics.ts`.
 */
export const PERIOD_A_COLOR = "#1DB954";
export const PERIOD_B_COLOR = "#F5A623";

function toUtc(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(iso: string, days: number): string {
  return new Date(toUtc(iso).getTime() + days * MS_PER_DAY).toISOString().slice(0, 10);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Month arithmetic that clamps the day rather than overflowing (Mar 31 − 1mo → Feb 28). */
export function addMonths(iso: string, months: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const targetYear = target.getUTCFullYear();
  const targetMonth = target.getUTCMonth();
  const clampedDay = Math.min(day, daysInMonth(targetYear, targetMonth));
  return new Date(Date.UTC(targetYear, targetMonth, clampedDay)).toISOString().slice(0, 10);
}

/** The same month/day in another year, clamping Feb 29 onto Feb 28 in common years. */
export function sameDayInYear(iso: string, year: number): string {
  const [, month, day] = iso.split("-").map(Number);
  const clampedDay = Math.min(day, daysInMonth(year, month - 1));
  return new Date(Date.UTC(year, month - 1, clampedDay)).toISOString().slice(0, 10);
}

/** Inclusive length: 2024-01-01 → 2024-01-01 is one day, not zero. */
export function dayCount(period: Period): number {
  return Math.round((toUtc(period.end).getTime() - toUtc(period.start).getTime()) / MS_PER_DAY) + 1;
}

export function samePeriod(left: Period, right: Period): boolean {
  return left.start === right.start && left.end === right.end;
}

/** "12 Mar 2024" — unambiguous across locales, short enough for a card subtitle. */
export function formatShortDate(iso: string): string {
  return toUtc(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function monthName(iso: string): string {
  return toUtc(iso).toLocaleDateString(undefined, { month: "short", timeZone: "UTC" });
}

function isFirstOfMonth(iso: string): boolean {
  return iso.slice(8, 10) === "01";
}

function isLastOfMonth(iso: string): boolean {
  const [year, month, day] = iso.split("-").map(Number);
  return day === daysInMonth(year, month - 1);
}

/**
 * The tightest honest name for a span: "2024", "Mar–Aug 2024", "Mar 2023 – Aug 2024",
 * or the two dates when it doesn't snap to month boundaries.
 */
export function formatPeriodLabel(period: Period): string {
  const { start, end } = period;
  const startYear = start.slice(0, 4);
  const endYear = end.slice(0, 4);

  if (start === `${startYear}-01-01` && end === `${startYear}-12-31`) return startYear;

  if (isFirstOfMonth(start) && isLastOfMonth(end)) {
    if (startYear === endYear) {
      const months = start.slice(5, 7) === end.slice(5, 7)
        ? monthName(start)
        : `${monthName(start)}–${monthName(end)}`;
      return `${months} ${startYear}`;
    }
    return `${monthName(start)} ${startYear} – ${monthName(end)} ${endYear}`;
  }

  return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}

/** "Mar '24" for a `YYYY-MM` bucket, matching the timeline chart's axis style. */
export function formatMonthBucket(month: string): string {
  const [year, monthPart] = month.split("-");
  if (!year || !monthPart) return month;
  const label = monthName(`${year}-${monthPart}-01`);
  return `${label} '${year.slice(2)}`;
}

/** 1.2k / 18.4k / 1.1M — axis ticks have no room for a full thousands separator. */
export function formatCompact(value: number): string {
  const magnitude = Math.abs(value);
  if (magnitude >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (magnitude >= 1_000) return `${(value / 1_000).toFixed(magnitude >= 10_000 ? 0 : 1)}k`;
  return String(Math.round(value));
}
