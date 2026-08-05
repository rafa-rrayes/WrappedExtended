"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardData } from "@/types/dashboard";
import { cn, formatNumber } from "@/lib/utils";
import { CompareTooltip, CompareTooltipRow } from "./compare-tooltip";
import { formatCompact, PERIOD_A_COLOR, PERIOD_B_COLOR } from "./period-format";

/**
 * Share is the default reading, deliberately.
 *
 * Two periods rarely have the same length, so raw play counts mostly re-state "B is longer
 * than A" in twenty-four different places. Normalising each period to a share of its own
 * plays answers the question people actually mean — *when* do I listen — and the toggle is
 * there for anyone who wants the absolute counts back.
 */
type Mode = "share" | "absolute";

interface DistributionRow {
  key: string;
  label: string;
  a: number;
  b: number;
}

export function DistributionCompare({
  statsA,
  statsB,
  labelA,
  labelB,
}: {
  statsA: DashboardData;
  statsB: DashboardData;
  labelA: string;
  labelB: string;
}) {
  const [mode, setMode] = useState<Mode>("share");

  const hourly = useMemo(() => buildHourly(statsA, statsB, mode), [statsA, statsB, mode]);
  const weekday = useMemo(() => buildWeekday(statsA, statsB, mode), [statsA, statsB, mode]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <ModeButton current={mode} value="share" onSelect={setMode}>
          Share of plays
        </ModeButton>
        <ModeButton current={mode} value="absolute" onSelect={setMode}>
          Total plays
        </ModeButton>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DistributionChart
          title="Hour of day"
          rows={hourly}
          mode={mode}
          labelA={labelA}
          labelB={labelB}
          tickInterval={2}
        />
        <DistributionChart
          title="Day of week"
          rows={weekday}
          mode={mode}
          labelA={labelA}
          labelB={labelB}
          tickInterval={0}
        />
      </div>
    </div>
  );
}

function ModeButton({
  current,
  value,
  onSelect,
  children,
}: {
  current: Mode;
  value: Mode;
  onSelect: (mode: Mode) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={current === value}
      onClick={() => onSelect(value)}
      className={cn(
        "rounded-[var(--radius-sm)] px-2.5 py-1 text-xs transition-colors",
        current === value
          ? "bg-green/15 text-green"
          : "bg-white/[0.04] text-text-secondary hover:bg-white/[0.08] hover:text-text-primary",
      )}
    >
      {children}
    </button>
  );
}

/** Turn raw counts into whichever unit the toggle asked for. */
function scale(values: { key: string; label: string; a: number; b: number }[], mode: Mode) {
  if (mode === "absolute") return values;
  const totalA = values.reduce((sum, row) => sum + row.a, 0);
  const totalB = values.reduce((sum, row) => sum + row.b, 0);
  return values.map((row) => ({
    ...row,
    a: totalA > 0 ? (row.a / totalA) * 100 : 0,
    b: totalB > 0 ? (row.b / totalB) * 100 : 0,
  }));
}

function buildHourly(statsA: DashboardData, statsB: DashboardData, mode: Mode): DistributionRow[] {
  const mapA = new Map((statsA.hourly_distribution ?? []).map((row) => [row.hour, row.streams]));
  const mapB = new Map((statsB.hourly_distribution ?? []).map((row) => [row.hour, row.streams]));
  const rows = Array.from({ length: 24 }, (_, hour) => ({
    key: String(hour),
    label: String(hour),
    a: mapA.get(hour) ?? 0,
    b: mapB.get(hour) ?? 0,
  }));
  return scale(rows, mode);
}

function buildWeekday(statsA: DashboardData, statsB: DashboardData, mode: Mode): DistributionRow[] {
  // The backend numbers weekdays 1–7 (Mon–Sun) and ships its own `day_name`; trust both
  // rather than re-deriving names from an index and risking a Sunday-first mismatch.
  const names = new Map<number, string>();
  const mapA = new Map<number, number>();
  const mapB = new Map<number, number>();

  for (const row of statsA.weekday_distribution ?? []) {
    names.set(row.weekday, row.day_name);
    mapA.set(row.weekday, row.streams);
  }
  for (const row of statsB.weekday_distribution ?? []) {
    if (!names.has(row.weekday)) names.set(row.weekday, row.day_name);
    mapB.set(row.weekday, row.streams);
  }

  const weekdays = [...new Set([...names.keys(), 1, 2, 3, 4, 5, 6, 7])].sort((x, y) => x - y);
  const rows = weekdays.map((weekday) => ({
    key: String(weekday),
    label: (names.get(weekday) ?? String(weekday)).slice(0, 3),
    a: mapA.get(weekday) ?? 0,
    b: mapB.get(weekday) ?? 0,
  }));
  return scale(rows, mode);
}

function DistributionChart({
  title,
  rows,
  mode,
  labelA,
  labelB,
  tickInterval,
}: {
  title: string;
  rows: DistributionRow[];
  mode: Mode;
  labelA: string;
  labelB: string;
  tickInterval: number;
}) {
  const empty = rows.every((row) => row.a === 0 && row.b === 0);

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-bg-card p-4 sm:p-5">
      <h3 className="mb-3 font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
        {title}
      </h3>
      {empty ? (
        <p className="py-16 text-center text-xs text-text-muted">No data for this breakdown.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={1}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="label"
              interval={tickInterval}
              tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(value: number) =>
                mode === "share" ? `${value.toFixed(0)}%` : formatCompact(value)
              }
              tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              content={<DistributionTooltip mode={mode} labelA={labelA} labelB={labelB} />}
            />
            <Bar dataKey="a" fill={PERIOD_A_COLOR} fillOpacity={0.75} radius={[3, 3, 0, 0]} />
            <Bar dataKey="b" fill={PERIOD_B_COLOR} fillOpacity={0.75} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function DistributionTooltip({
  active,
  payload,
  mode,
  labelA,
  labelB,
}: {
  active?: boolean;
  payload?: { payload?: DistributionRow }[];
  mode: Mode;
  labelA: string;
  labelB: string;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;

  const format = (value: number) =>
    mode === "share" ? `${value.toFixed(1)}%` : `${formatNumber(Math.round(value))} plays`;

  return (
    <CompareTooltip title={row.label}>
      <CompareTooltipRow color={PERIOD_A_COLOR} label={labelA} value={format(row.a)} />
      <CompareTooltipRow color={PERIOD_B_COLOR} label={labelB} value={format(row.b)} />
    </CompareTooltip>
  );
}
