"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  EntityHourlyPoint,
  EntityMonthlyPoint,
  EntityPlatformSlice,
  EntityWeekdayPoint,
} from "@/types/dashboard";
import { CHART_TOOLTIP_STYLE } from "@/lib/chart-config";
import { formatHours, formatNumber } from "@/lib/utils";
import { formatHour, formatMonthLong, formatMonthShort, rampColor } from "./entity-meta";

const AXIS_TICK = { fontSize: 11, fill: "#555" } as const;

/** The card every chart on the detail page sits in. */
export function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[var(--radius-card)] border border-border bg-bg-card p-5 ${className ?? ""}`}
    >
      <header className="mb-4">
        <h2 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-text-muted">
      {label}
    </div>
  );
}

/** Hours per month for this entity — the shape of a listening habit over time. */
export function EntityMonthlyChart({ data }: { data: EntityMonthlyPoint[] }) {
  // Gradients live in the document's SVG defs, so a fixed id would collide with the other
  // charts mounted on the same page.
  const gradientId = useId().replace(/[^\w-]/g, "");

  if (!data.length) return <EmptyChart label="No monthly activity in this range." />;

  const tickInterval = Math.max(0, Math.floor(data.length / 10));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1DB954" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#1DB954" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="month"
          tickFormatter={formatMonthShort}
          interval={tickInterval}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(value: number) => `${value}h`}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={42}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          labelFormatter={formatMonthLong}
          formatter={(value: number, name) =>
            name === "hours" ? [formatHours(value), "Hours"] : [formatNumber(value), "Plays"]
          }
        />
        <Area
          type="monotone"
          dataKey="hours"
          stroke="#1DB954"
          strokeWidth={2}
          fill={`url(#${gradientId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Streams by hour of day, 0–23. */
export function EntityHourlyChart({ data }: { data: EntityHourlyPoint[] }) {
  if (!data.length) return <EmptyChart label="No hourly data in this range." />;

  // The API only returns hours that were actually played; fill the gaps so the axis reads
  // as a day rather than as a list of whatever happened to be non-zero.
  const byHour = new Map(data.map((point) => [point.hour, point.streams]));
  const filled = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    streams: byHour.get(hour) ?? 0,
  }));
  const peak = Math.max(...filled.map((point) => point.streams));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={filled} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="hour"
          tickFormatter={(hour: number) => (hour % 6 === 0 ? formatHour(hour) : "")}
          interval={0}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={36} />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          contentStyle={CHART_TOOLTIP_STYLE}
          labelFormatter={(hour: number) => formatHour(hour)}
          formatter={(value: number) => [formatNumber(value), "Streams"]}
        />
        <Bar dataKey="streams" radius={[3, 3, 0, 0]}>
          {filled.map((point) => (
            <Cell
              key={point.hour}
              // The peak hour is the point of the chart; the rest recede behind it.
              fill={point.streams === peak && peak > 0 ? "#F5A623" : "#1DB954"}
              fillOpacity={point.streams === peak && peak > 0 ? 0.95 : 0.55}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Plays by day of week. Backend sends Monday=1…Sunday=7 with its own `day_name`. */
export function EntityWeekdayChart({ data }: { data: EntityWeekdayPoint[] }) {
  if (!data.length) return <EmptyChart label="No weekday data in this range." />;

  // Sort by the backend's weekday number rather than trusting response order, and label
  // from `day_name` rather than indexing a local array — Polars counts Monday as 1, which
  // is off by one from JavaScript's Sunday-first convention.
  const sorted = [...data].sort((a, b) => a.weekday - b.weekday);
  const peak = Math.max(...sorted.map((point) => point.plays));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={sorted} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="day_name"
          tickFormatter={(name: string) => name.slice(0, 3)}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={36} />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value: number) => [formatNumber(value), "Plays"]}
        />
        <Bar dataKey="plays" radius={[3, 3, 0, 0]}>
          {sorted.map((point) => (
            <Cell
              key={point.weekday}
              fill={point.plays === peak && peak > 0 ? "#F5A623" : "#1DB954"}
              fillOpacity={point.plays === peak && peak > 0 ? 0.95 : 0.55}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const MAX_PLATFORM_SLICES = 6;

/** Where this entity was played, as a donut with a long tail folded into "Other". */
export function EntityPlatformChart({ data }: { data: EntityPlatformSlice[] }) {
  if (!data.length) return <EmptyChart label="No platform data in this export." />;

  const sorted = [...data].sort((a, b) => b.count - a.count);
  const head = sorted.slice(0, MAX_PLATFORM_SLICES);
  const tail = sorted.slice(MAX_PLATFORM_SLICES);
  const slices =
    tail.length > 0
      ? [...head, { platform: "Other", count: tail.reduce((sum, s) => sum + s.count, 0) }]
      : head;
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ResponsiveContainer width="100%" height={180} className="max-w-[200px]">
        <PieChart>
          <Pie
            data={slices}
            dataKey="count"
            nameKey="platform"
            innerRadius={45}
            outerRadius={78}
            paddingAngle={2}
            stroke="none"
          >
            {slices.map((slice, index) => (
              <Cell
                key={slice.platform}
                fill={rampColor(index, slices.length)}
                fillOpacity={0.85}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            formatter={(value: number, name) => [
              `${formatNumber(value)} (${total ? Math.round((value / total) * 100) : 0}%)`,
              String(name),
            ]}
          />
        </PieChart>
      </ResponsiveContainer>

      <ul className="w-full min-w-0 flex-1 space-y-1.5">
        {slices.map((slice, index) => (
          <li key={slice.platform} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: rampColor(index, slices.length) }}
            />
            <span className="min-w-0 flex-1 truncate text-text-secondary">{slice.platform}</span>
            <span className="shrink-0 tabular-nums text-text-muted">
              {total ? Math.round((slice.count / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
