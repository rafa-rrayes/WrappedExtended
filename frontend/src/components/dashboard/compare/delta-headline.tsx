"use client";

import type { CompareDelta } from "@/types/dashboard";
import { cn } from "@/lib/utils";
import {
  changeDirection,
  deltaTone,
  formatMetricChange,
  formatMetricValue,
  metricMeta,
  orderedDeltaKeys,
  type Tone,
} from "./metrics";
import { PERIOD_A_COLOR, PERIOD_B_COLOR } from "./period-format";

const TONE_CLASSES: Record<Tone, string> = {
  positive: "border-green/25 bg-green/10 text-green",
  negative: "border-negative/25 bg-negative-dim text-negative",
  neutral: "border-border bg-white/[0.05] text-text-secondary",
};

function directionGlyph(direction: number): string {
  return direction > 0 ? "↑" : direction < 0 ? "↓" : "→";
}

/** Colour alone can't carry the direction, so every chip also says it in text. */
function directionWord(direction: number): string {
  return direction > 0 ? "up" : direction < 0 ? "down" : "unchanged";
}

export function DeltaHeadline({
  deltas,
  labelA,
  labelB,
}: {
  deltas: Record<string, CompareDelta>;
  labelA: string;
  labelB: string;
}) {
  const keys = orderedDeltaKeys(deltas);
  if (keys.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {keys.map((key) => (
        <MetricCard
          key={key}
          metricKey={key}
          delta={deltas[key]}
          labelA={labelA}
          labelB={labelB}
        />
      ))}
    </div>
  );
}

function MetricCard({
  metricKey,
  delta,
  labelA,
  labelB,
}: {
  metricKey: string;
  delta: CompareDelta;
  labelA: string;
  labelB: string;
}) {
  const meta = metricMeta(metricKey);
  const tone = deltaTone(meta, delta);
  const direction = changeDirection(delta);
  const change = formatMetricChange(meta, delta);

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-bg-card p-4 transition-colors hover:bg-bg-card-hover">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-text-muted">
          {meta.label}
        </span>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-[family-name:var(--font-display)] text-xs font-bold",
            TONE_CLASSES[tone],
          )}
          title={change.title}
        >
          <span aria-hidden="true">{directionGlyph(direction)}</span>
          {change.primary}
          <span className="sr-only">
            {directionWord(direction)} from {labelA} to {labelB}
          </span>
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <Value color={PERIOD_A_COLOR} value={formatMetricValue(meta, delta.a)} />
        <span className="text-text-muted" aria-hidden="true">
          →
        </span>
        <Value color={PERIOD_B_COLOR} value={formatMetricValue(meta, delta.b)} strong />
      </div>

      <p className="mt-2 text-[0.7rem] text-text-muted">
        {change.secondary && <span className="text-text-secondary">{change.secondary}</span>}
        {change.secondary && meta.note ? " · " : ""}
        {meta.note}
      </p>
    </div>
  );
}

function Value({
  color,
  value,
  strong,
}: {
  color: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span
        className="h-2 w-2 shrink-0 self-center rounded-full"
        style={{ background: color }}
        aria-hidden="true"
      />
      <span
        className={cn(
          "font-[family-name:var(--font-display)] font-extrabold",
          strong ? "text-lg text-text-primary" : "text-lg text-text-secondary",
        )}
      >
        {value}
      </span>
    </span>
  );
}
