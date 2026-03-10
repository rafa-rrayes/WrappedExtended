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
} from "recharts";
import type { YearOverYear as YearOverYearType } from "@/types/dashboard";
import { formatNumber, formatHours } from "@/lib/utils";

interface YearOverYearProps {
  data: YearOverYearType[];
}

export function YearOverYear({ data }: YearOverYearProps) {
  if (!data?.length) return null;

  return (
    <section id="yoy" className="py-24 opacity-0 animate-[fadeUp_0.8s_ease_forwards]">
      <div className="mb-12">
        <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-green mb-2.5 block">
          05 — Year Over Year
        </span>
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-[1.15]">
          How Your Listening <span className="text-gold">Evolved</span>
        </h2>
      </div>

      {/* YoY cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {data.map((y) => (
          <div
            key={y.year}
            className="bg-bg-card border border-border rounded-[var(--radius-card)] p-5"
          >
            <div className="font-[family-name:var(--font-display)] text-sm font-bold text-text-secondary mb-3">
              {y.year}
            </div>
            <div className="space-y-2">
              <div>
                <div className="font-[family-name:var(--font-display)] text-xl font-extrabold text-green">
                  {formatHours(y.hours)}
                </div>
                <div className="text-text-muted text-[0.65rem]">listening time</div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted text-xs">{formatNumber(y.streams)} streams</span>
                {y.change_pct !== null && (
                  <span
                    className={`font-[family-name:var(--font-display)] text-xs font-bold ${
                      y.change_pct >= 0 ? "text-green" : "text-red-400"
                    }`}
                  >
                    {y.change_pct >= 0 ? "▲" : "▼"} {Math.abs(y.change_pct).toFixed(0)}%
                  </span>
                )}
              </div>
              <div className="text-text-muted text-[0.65rem]">
                {y.unique_artists} artists explored
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 12, fill: "#999", fontWeight: 600 }}
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
              formatter={(value: number) => [formatHours(value), "Hours"]}
            />
            <Bar dataKey="hours" radius={[6, 6, 0, 0]} maxBarSize={60}>
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={i === data.length - 1 ? "#F5A623" : "#1DB954"}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
