"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardData } from "@/types/dashboard";
import { formatHours } from "@/lib/utils";
import { formatMonthBucket, PERIOD_A_COLOR, PERIOD_B_COLOR } from "./period-format";

interface OverlayRow {
  /** 1-based month offset from the start of each period — the shared x-axis. */
  index: number;
  a: number | null;
  b: number | null;
  monthA: string | null;
  monthB: string | null;
}

/**
 * Both periods' monthly hours on one pair of axes.
 *
 * The x-axis is *months into the period*, not calendar time. Two periods of different
 * lengths (or different years) share no calendar axis worth drawing, and the interesting
 * question — did the shape of the year change? — only answers itself when both curves start
 * at the same origin. The tooltip names the real calendar month for each series so the
 * normalisation never hides which month you're actually looking at.
 */
export function TemporalOverlay({
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
  const rows = useMemo<OverlayRow[]>(() => {
    const monthsA = [...(statsA.monthly_hours ?? [])].sort((left, right) =>
      left.month.localeCompare(right.month),
    );
    const monthsB = [...(statsB.monthly_hours ?? [])].sort((left, right) =>
      left.month.localeCompare(right.month),
    );
    const length = Math.max(monthsA.length, monthsB.length);
    return Array.from({ length }, (_, offset) => ({
      index: offset + 1,
      a: monthsA[offset]?.hours ?? null,
      b: monthsB[offset]?.hours ?? null,
      monthA: monthsA[offset]?.month ?? null,
      monthB: monthsB[offset]?.month ?? null,
    }));
  }, [statsA, statsB]);

  if (rows.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-bg-card p-8 text-center text-sm text-text-muted">
        Neither period has monthly data to plot.
      </div>
    );
  }

  const tickInterval = rows.length > 18 ? Math.floor(rows.length / 12) : 0;

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-bg-card p-4 sm:p-6">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="index"
            tickFormatter={(value: number) => `M${value}`}
            interval={tickInterval}
            tick={{ fontSize: 11, fill: "#555" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(value: number) => `${Math.round(value)}h`}
            tick={{ fontSize: 11, fill: "#555" }}
            axisLine={false}
            tickLine={false}
            width={45}
          />
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.12)" }}
            content={<OverlayTooltip labelA={labelA} labelB={labelB} />}
          />
          <Line
            type="monotone"
            dataKey="a"
            name={labelA}
            stroke={PERIOD_A_COLOR}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: PERIOD_A_COLOR, strokeWidth: 2 }}
            connectNulls={false}
            animationDuration={900}
          />
          <Line
            type="monotone"
            dataKey="b"
            name={labelB}
            stroke={PERIOD_B_COLOR}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: PERIOD_B_COLOR, strokeWidth: 2 }}
            connectNulls={false}
            animationDuration={900}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-2 text-center text-[0.7rem] text-text-muted">
        Months since each period began (M1 = the first month of that period)
      </p>
    </div>
  );
}

function OverlayTooltip({
  active,
  payload,
  labelA,
  labelB,
}: {
  active?: boolean;
  payload?: { payload?: OverlayRow }[];
  labelA: string;
  labelB: string;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;

  return (
    <div className="rounded-lg border border-green/30 bg-black/90 px-3 py-2 text-xs shadow-2xl">
      <div className="mb-1 font-semibold text-text-primary">Month {row.index}</div>
      <TooltipRow
        color={PERIOD_A_COLOR}
        label={labelA}
        month={row.monthA}
        hours={row.a}
      />
      <TooltipRow
        color={PERIOD_B_COLOR}
        label={labelB}
        month={row.monthB}
        hours={row.b}
      />
    </div>
  );
}

function TooltipRow({
  color,
  label,
  month,
  hours,
}: {
  color: string;
  label: string;
  month: string | null;
  hours: number | null;
}) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden="true" />
      <span className="text-text-muted">{label}</span>
      <span className="text-text-secondary">{month ? formatMonthBucket(month) : "—"}</span>
      <span className="ml-auto pl-2 font-semibold text-text-primary">
        {hours === null ? "no data" : formatHours(hours)}
      </span>
    </div>
  );
}
