"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { useMemo } from "react";
import type { SongMonthlyBreakdown } from "@/types/dashboard";

interface SongObsessionProps {
  data: SongMonthlyBreakdown[];
}

const PALETTE = ["#1DB954", "#F5A623", "#E91E63", "#9C27B0", "#00BCD4", "#FF5722"];

export function SongObsession({ data }: SongObsessionProps) {
  if (!data?.length) return null;

  const top5 = data.slice(0, 5);

  const chartData = useMemo(() => {
    // Collect all months
    const monthSet = new Set<string>();
    for (const song of top5) {
      for (const d of song.data) monthSet.add(d.month);
    }
    const months = Array.from(monthSet).sort();

    return months.map((month) => {
      const point: Record<string, number | string> = { month };
      for (const song of top5) {
        const entry = song.data.find((d) => d.month === month);
        point[song.track_name] = entry?.plays ?? 0;
      }
      return point;
    });
  }, [top5]);

  const formatMonth = (m: string) => {
    const [year, month] = m.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[parseInt(month) - 1]} '${year.slice(2)}`;
  };

  const tickInterval = Math.max(1, Math.floor(chartData.length / 10));

  return (
    <section id="obsession" className="py-24 opacity-0 animate-[fadeUp_0.8s_ease_forwards]">
      <div className="mb-12">
        <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-green mb-2.5 block">
          10 — Song Obsessions
        </span>
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-[1.15]">
          The Rise & Fall of Your <span className="text-gold">Obsessions</span>
        </h2>
      </div>

      <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
              interval={tickInterval}
              tick={{ fontSize: 10, fill: "#555" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#555" }}
              axisLine={false}
              tickLine={false}
              width={35}
              label={{
                value: "plays",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 10, fill: "#555" },
              }}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(10,10,10,0.92)",
                border: "1px solid rgba(29,185,84,0.3)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={formatMonth}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
              iconType="circle"
              iconSize={8}
            />
            {top5.map((song, i) => (
              <Line
                key={song.track_name}
                type="monotone"
                dataKey={song.track_name}
                stroke={PALETTE[i]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: PALETTE[i], strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
