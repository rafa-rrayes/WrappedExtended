"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import type {
  HourlyCount,
  WeekdayCount,
  DailyActivity,
  SeasonalPattern,
} from "@/types/dashboard";
import { formatNumber } from "@/lib/utils";
import { SectionReveal } from "./section-reveal";

interface WhenYouListenProps {
  hourlyDistribution: HourlyCount[];
  weekdayDistribution: WeekdayCount[];
  dailyActivity?: DailyActivity[];
  seasonalPatterns?: SeasonalPattern[];
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

export function WhenYouListen({
  hourlyDistribution,
  weekdayDistribution,
  dailyActivity,
  seasonalPatterns,
}: WhenYouListenProps) {
  if (!hourlyDistribution?.length && !weekdayDistribution?.length) return null;

  const maxStreams = Math.max(...hourlyDistribution.map((h) => h.streams));
  const maxWeekdayHours = Math.max(...weekdayDistribution.map((d) => d.hours));

  return (
    <SectionReveal id="when">
      {(inView: boolean) => (
        <>
          <div className="mb-12">
            <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-green mb-2.5 block">
              06 — When You Listen
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-[1.15]">
              Your Listening <span className="text-gold">Schedule</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hourly distribution — purple */}
            {hourlyDistribution.length > 0 && (
              <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
                <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-secondary mb-4 tracking-wide uppercase">
                  By Hour of Day
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={hourlyDistribution}
                    margin={{ top: 5, right: 5, bottom: 0, left: -10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis
                      dataKey="hour"
                      tickFormatter={formatHourLabel}
                      interval={2}
                      tick={{ fontSize: 10, fill: "#555" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#555" }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(10,10,10,0.92)",
                        border: "1px solid rgba(156,39,176,0.3)",
                        borderRadius: 8,
                      }}
                      labelFormatter={(h) => formatHourLabel(h as number)}
                      formatter={(value: number) => [formatNumber(value), "Streams"]}
                    />
                    <Bar
                      dataKey="streams"
                      radius={[3, 3, 0, 0]}
                      isAnimationActive={inView}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    >
                      {hourlyDistribution.map((entry) => (
                        <Cell
                          key={entry.hour}
                          fill="#9C27B0"
                          fillOpacity={0.3 + (entry.streams / maxStreams) * 0.7}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Weekday distribution — green with fill opacity pattern */}
            {weekdayDistribution.length > 0 && (
              <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
                <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-secondary mb-4 tracking-wide uppercase">
                  By Day of Week
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={weekdayDistribution}
                    margin={{ top: 5, right: 5, bottom: 0, left: -10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis
                      dataKey="day_name"
                      tickFormatter={(d) => d.slice(0, 3)}
                      tick={{ fontSize: 11, fill: "#555" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `${v}h`}
                      tick={{ fontSize: 10, fill: "#555" }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(10,10,10,0.92)",
                        border: "1px solid rgba(29,185,84,0.3)",
                        borderRadius: 8,
                      }}
                      formatter={(value: number) => [
                        `${(value as number).toFixed(1)}h`,
                        "Hours",
                      ]}
                    />
                    <Bar
                      dataKey="hours"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={inView}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    >
                      {weekdayDistribution.map((entry, i) => (
                        <Cell
                          key={i}
                          fill="#1DB954"
                          fillOpacity={0.4 + (entry.hours / maxWeekdayHours) * 0.6}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Daily activity pattern — cyan */}
            {dailyActivity && dailyActivity.length > 0 && (
              <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
                <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-secondary mb-4 tracking-wide uppercase">
                  Average Daily Pattern
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart
                    data={dailyActivity}
                    margin={{ top: 5, right: 5, bottom: 0, left: -10 }}
                  >
                    <defs>
                      <linearGradient id="activityGradCyan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00BCD4" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#00BCD4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis
                      dataKey="hour"
                      tickFormatter={formatHourLabel}
                      interval={3}
                      tick={{ fontSize: 10, fill: "#555" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `${v}m`}
                      tick={{ fontSize: 10, fill: "#555" }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(10,10,10,0.92)",
                        border: "1px solid rgba(0,188,212,0.3)",
                        borderRadius: 8,
                      }}
                      labelFormatter={(h) => formatHourLabel(h as number)}
                      formatter={(value: number) => [
                        `${(value as number).toFixed(1)} min`,
                        "Avg",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="avg_minutes"
                      stroke="#00BCD4"
                      strokeWidth={2}
                      fill="url(#activityGradCyan)"
                      isAnimationActive={inView}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Seasonal patterns — warm orange */}
            {seasonalPatterns && seasonalPatterns.length > 0 && (
              <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
                <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-secondary mb-4 tracking-wide uppercase">
                  Seasonal Patterns
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={seasonalPatterns}
                    margin={{ top: 5, right: 5, bottom: 0, left: -10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis
                      dataKey="month_name"
                      tickFormatter={(m) => m.slice(0, 3)}
                      tick={{ fontSize: 10, fill: "#555" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `${v}h`}
                      tick={{ fontSize: 10, fill: "#555" }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(10,10,10,0.92)",
                        border: "1px solid rgba(255,87,34,0.3)",
                        borderRadius: 8,
                      }}
                      formatter={(value: number) => [
                        `${(value as number).toFixed(1)}h avg`,
                        "Hours",
                      ]}
                    />
                    <Bar
                      dataKey="avg_hours"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={inView}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    >
                      {seasonalPatterns.map((_, i) => {
                        const ratio = i / (seasonalPatterns.length - 1 || 1);
                        // Interpolate from #FF5722 (deep orange) to #F5A623 (gold)
                        const r = Math.round(255 + (245 - 255) * ratio);
                        const g = Math.round(87 + (166 - 87) * ratio);
                        const b = Math.round(34 + (35 - 34) * ratio);
                        return <Cell key={i} fill={`rgb(${r},${g},${b})`} fillOpacity={0.8} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </SectionReveal>
  );
}
