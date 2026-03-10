"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { MonthlyHour, YearlyStat } from "@/types/dashboard";
import { formatHours } from "@/lib/utils";

interface ListeningTimelineProps {
  monthlyHours: MonthlyHour[];
  yearlyStats?: YearlyStat[];
}

export function ListeningTimeline({ monthlyHours, yearlyStats }: ListeningTimelineProps) {
  if (!monthlyHours?.length) return null;

  const formatMonth = (m: string) => {
    const [year, month] = m.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[parseInt(month) - 1]} '${year.slice(2)}`;
  };

  // Show every ~6th label to avoid overlap
  const tickInterval = Math.max(1, Math.floor(monthlyHours.length / 12));

  return (
    <section id="timeline" className="py-24 opacity-0 animate-[fadeUp_0.8s_ease_forwards]">
      <div className="mb-12">
        <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-green mb-2.5 block">
          04 — Listening Timeline
        </span>
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-[1.15]">
          Your Music <span className="text-gold">Journey</span> Over Time
        </h2>
      </div>

      <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
        <ResponsiveContainer width="100%" height={360}>
          <AreaChart data={monthlyHours} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1DB954" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#1DB954" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
              interval={tickInterval}
              tick={{ fontSize: 11, fill: "#555" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `${v}h`}
              tick={{ fontSize: 11, fill: "#555" }}
              axisLine={false}
              tickLine={false}
              width={45}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(10,10,10,0.92)",
                border: "1px solid rgba(29,185,84,0.3)",
                borderRadius: 8,
              }}
              labelFormatter={formatMonth}
              formatter={(value: number) => [formatHours(value), "Hours"]}
            />
            <Area
              type="monotone"
              dataKey="hours"
              stroke="#1DB954"
              strokeWidth={2}
              fill="url(#greenGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Yearly summary cards */}
      {yearlyStats && yearlyStats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
          {yearlyStats.map((y) => (
            <div
              key={y.year}
              className="bg-bg-card border border-border rounded-[var(--radius-card)] p-4 text-center"
            >
              <div className="font-[family-name:var(--font-display)] text-lg font-bold text-text-secondary">
                {y.year}
              </div>
              <div className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-green [text-shadow:0_0_30px_rgba(29,185,84,0.15)] mt-1">
                {formatHours(y.hours)}
              </div>
              <div className="text-text-muted text-[0.65rem] mt-1">
                {y.unique_artists} artists
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
