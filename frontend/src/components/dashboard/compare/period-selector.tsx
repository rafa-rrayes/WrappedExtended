"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  dayCount,
  formatPeriodLabel,
  formatShortDate,
  PERIOD_A_COLOR,
  PERIOD_B_COLOR,
  type Period,
} from "./period-format";
import type { ComparePreset } from "./use-compare-periods";

interface PeriodSelectorProps {
  dashboardId: string;
  a: Period;
  b: Period;
  min: string;
  max: string;
  presets: ComparePreset[];
  activePresetId: string | null;
  onChange: (periods: { a: Period; b: Period }) => void;
}

export function PeriodSelector({
  dashboardId,
  a,
  b,
  min,
  max,
  presets,
  activePresetId,
  onChange,
}: PeriodSelectorProps) {
  const daysA = dayCount(a);
  const daysB = dayCount(b);
  // Nothing is wrong with unequal periods — but every chart below has to work around it,
  // so it's stated up front instead of being discovered in a tooltip.
  const uneven = Math.abs(daysA - daysB) > Math.max(daysA, daysB) * 0.05;

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-bg-card p-4 sm:p-5">
      {presets.length > 0 && (
        <>
          <h2 className="mb-2 text-[0.6rem] font-medium uppercase tracking-[0.14em] text-text-muted">
            Presets
          </h2>
          <div className="mb-5 flex flex-wrap gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChange({ a: preset.a, b: preset.b })}
                aria-pressed={preset.id === activePresetId}
                className={cn(
                  "rounded-[var(--radius-sm)] px-2.5 py-1 text-xs transition-colors",
                  preset.id === activePresetId
                    ? "bg-green/15 text-green"
                    : "bg-white/[0.04] text-text-secondary hover:bg-white/[0.08] hover:text-text-primary",
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <PeriodEditor
          slot="A"
          period={a}
          color={PERIOD_A_COLOR}
          min={min}
          max={max}
          dashboardId={dashboardId}
          onChange={(next) => onChange({ a: next, b })}
        />

        <button
          type="button"
          onClick={() => onChange({ a: b, b: a })}
          className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white/[0.04] text-text-secondary transition-colors hover:bg-white/[0.08] hover:text-text-primary"
          aria-label="Swap period A and period B"
          title="Swap A and B"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 8h11l-3-3M20 16H9l3 3" />
          </svg>
        </button>

        <PeriodEditor
          slot="B"
          period={b}
          color={PERIOD_B_COLOR}
          min={min}
          max={max}
          dashboardId={dashboardId}
          onChange={(next) => onChange({ a, b: next })}
        />
      </div>

      <p className="mt-3 text-[0.7rem] text-text-muted">
        {daysA.toLocaleString()} days vs {daysB.toLocaleString()} days.{" "}
        {uneven
          ? "The periods differ in length, so totals below favour the longer one — the shape charts are normalised for that."
          : "Comparable lengths, so totals can be read directly."}
      </p>
    </section>
  );
}

function PeriodEditor({
  slot,
  period,
  color,
  min,
  max,
  dashboardId,
  onChange,
}: {
  slot: "A" | "B";
  period: Period;
  color: string;
  min: string;
  max: string;
  dashboardId: string;
  onChange: (period: Period) => void;
}) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-border bg-bg-elevated/60 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: color }}
          aria-hidden="true"
        />
        <span className="text-[0.6rem] font-medium uppercase tracking-[0.14em] text-text-muted">
          Period {slot}
        </span>
        <span className="ml-auto truncate font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
          {formatPeriodLabel(period)}
        </span>
      </div>

      <div className="flex items-end gap-2">
        <DateInput
          label="From"
          value={period.start}
          min={min}
          max={period.end}
          onChange={(value) => onChange({ start: value || period.start, end: period.end })}
        />
        <span className="pb-1.5 text-text-muted">–</span>
        <DateInput
          label="To"
          value={period.end}
          min={period.start}
          max={max}
          onChange={(value) => onChange({ start: period.start, end: value || period.end })}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="truncate text-[0.65rem] text-text-muted">
          {formatShortDate(period.start)} → {formatShortDate(period.end)}
        </span>
        <Link
          href={`/dashboard/${dashboardId}?from=${period.start}&to=${period.end}`}
          className="shrink-0 text-[0.65rem] text-text-secondary underline-offset-2 transition-colors hover:text-green hover:underline"
        >
          Open in dashboard
        </Link>
      </div>
    </div>
  );
}

function DateInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min: string;
  max: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-0 flex-1">
      <span className="mb-1 block text-[0.65rem] text-text-muted">{label}</span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[var(--radius-sm)] border border-border bg-white/[0.04] px-2 py-1.5 text-xs text-text-primary outline-none transition-colors [color-scheme:dark] focus:border-green/50"
      />
    </label>
  );
}
