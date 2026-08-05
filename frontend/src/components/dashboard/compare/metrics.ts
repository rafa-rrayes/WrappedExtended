import type { CompareDelta } from "@/types/dashboard";
import { formatHours, formatNumber } from "@/lib/utils";

/**
 * How each headline metric should be read.
 *
 * The important bit is `sentiment`. Colouring every rise green is the obvious mistake this
 * page could make: a skip rate that climbs from 18% to 26% is a *worse* year, and painting
 * it green would quietly lie. So direction and desirability are kept apart —
 * `deltaTone()` combines them, and anything we can't confidently judge (shuffle usage, any
 * metric a future backend adds) stays neutral rather than guessing.
 */
export type MetricSentiment = "up-is-good" | "down-is-good" | "neutral";

export type MetricUnit = "hours" | "count" | "percent";

export interface MetricMeta {
  key: string;
  label: string;
  unit: MetricUnit;
  sentiment: MetricSentiment;
  /** Surfaced in the UI whenever the direction isn't plain "more is better". */
  note?: string;
}

export const COMPARE_METRICS: readonly MetricMeta[] = [
  {
    key: "total_hours",
    label: "Hours listened",
    unit: "hours",
    sentiment: "up-is-good",
  },
  {
    key: "total_streams",
    label: "Streams",
    unit: "count",
    sentiment: "up-is-good",
  },
  {
    key: "unique_artists",
    label: "Unique artists",
    unit: "count",
    sentiment: "up-is-good",
  },
  {
    key: "unique_tracks",
    label: "Unique tracks",
    unit: "count",
    sentiment: "up-is-good",
  },
  {
    key: "skip_pct",
    label: "Skip rate",
    unit: "percent",
    sentiment: "down-is-good",
    note: "Lower is better — a falling skip rate shows green.",
  },
  {
    key: "shuffle_pct",
    label: "Shuffle",
    unit: "percent",
    sentiment: "neutral",
    note: "Neither better nor worse — shown without a verdict.",
  },
];

function humanise(key: string): string {
  const words = key.replace(/_pct$/, " %").split("_").join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Known metric, or a neutral stand-in so a new backend delta key still renders. */
export function metricMeta(key: string): MetricMeta {
  return (
    COMPARE_METRICS.find((metric) => metric.key === key) ?? {
      key,
      label: humanise(key),
      unit: key.endsWith("_pct") ? "percent" : "count",
      sentiment: "neutral",
    }
  );
}

/** Declared metrics first, in their curated order; unrecognised keys appended. */
export function orderedDeltaKeys(deltas: Record<string, CompareDelta>): string[] {
  const known = COMPARE_METRICS.map((metric) => metric.key).filter((key) => key in deltas);
  const extra = Object.keys(deltas)
    .filter((key) => !known.includes(key))
    .sort();
  return [...known, ...extra];
}

export type Tone = "positive" | "negative" | "neutral";

/** −1 / 0 / +1, with a dead zone so float dust doesn't read as a change. */
export function changeDirection(delta: CompareDelta): -1 | 0 | 1 {
  if (delta.abs > 0.0001) return 1;
  if (delta.abs < -0.0001) return -1;
  return 0;
}

export function deltaTone(meta: MetricMeta, delta: CompareDelta): Tone {
  const direction = changeDirection(delta);
  if (direction === 0 || meta.sentiment === "neutral") return "neutral";
  const roseAndRisingIsGood = direction > 0 && meta.sentiment === "up-is-good";
  const fellAndFallingIsGood = direction < 0 && meta.sentiment === "down-is-good";
  return roseAndRisingIsGood || fellAndFallingIsGood ? "positive" : "negative";
}

/**
 * What we print when a number isn't one.
 *
 * `delta.pct` is null by contract whenever period A is zero, but a division that went
 * through anyway — or a truncated payload — can still hand us a NaN or an Infinity. Every
 * one of those renders as this em dash: "+Infinity%" and "NaN%" are worse than admitting
 * the figure is undefined, and they are the two strings this module must never emit.
 */
const UNDEFINED_CHANGE = "—";

export function formatMetricValue(meta: MetricMeta, value: number): string {
  if (!Number.isFinite(value)) return UNDEFINED_CHANGE;
  if (meta.unit === "hours") return formatHours(value);
  if (meta.unit === "percent") return `${value.toFixed(1)}%`;
  return formatNumber(Math.round(value));
}

function signed(value: number, digits: number): string {
  const rounded = Number(value.toFixed(digits));
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";
  return `${sign}${Math.abs(rounded).toFixed(digits)}`;
}

function signedAmount(meta: MetricMeta, value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatMetricValue(meta, Math.abs(value))}`;
}

export interface ChangeDisplay {
  /** Headline change, already signed. */
  primary: string;
  /** Supporting figure — the other half of the relative/absolute pair. */
  secondary: string | null;
  /** Native tooltip, used to explain an undefined percentage. */
  title?: string;
}

/**
 * Render a delta the way the metric deserves.
 *
 * Percentages get **percentage points** as the headline: skip rate 20% → 25% is +5 pp, and
 * calling that "+25%" (which is what `delta.pct` literally is) is the classic percent-of-a-
 * percent trap. Counts and hours get the relative change up top with the absolute beneath.
 * `pct` is null whenever A is zero, and then we show "—" rather than an infinity.
 */
export function formatMetricChange(meta: MetricMeta, delta: CompareDelta): ChangeDisplay {
  // A non-finite figure is folded into the same "we don't have this" case as the
  // backend's explicit null, so neither branch below can ever format one.
  const pct = Number.isFinite(delta.pct) ? (delta.pct as number) : null;
  const abs = Number.isFinite(delta.abs) ? delta.abs : null;

  if (meta.unit === "percent") {
    return {
      primary: abs === null ? UNDEFINED_CHANGE : `${signed(abs, 1)} pp`,
      secondary: pct === null ? null : `${signed(pct, 0)}% relative`,
    };
  }

  if (pct === null) {
    return {
      primary: UNDEFINED_CHANGE,
      secondary: abs === null ? null : signedAmount(meta, abs),
      title: `No ${meta.label.toLowerCase()} in period A, so a percentage change is undefined.`,
    };
  }

  return {
    primary: `${signed(pct, Math.abs(pct) >= 10 ? 0 : 1)}%`,
    secondary: abs === null ? null : signedAmount(meta, abs),
  };
}
