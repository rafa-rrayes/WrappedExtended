"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { SongMonthlyBreakdown } from "@/types/dashboard";
import { SectionReveal } from "@/components/dashboard/section-reveal";

interface SongObsessionProps {
  data: SongMonthlyBreakdown[];
}

const PALETTE = ["#1DB954", "#F5A623", "#E91E63", "#9C27B0", "#00BCD4", "#FF5722"];

export function SongObsession({ data }: SongObsessionProps) {
  const [hiddenLines, setHiddenLines] = useState<Set<string>>(new Set());

  // Hooks must run on every render — keep them above the empty-data guard below.
  // top5 is derived inside a memo so the dep is stable, not a fresh array each render.
  const top5 = useMemo(() => (data ?? []).slice(0, 5), [data]);

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

  if (!data?.length) return null;

  const formatMonth = (m: string) => {
    const [year, month] = m.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[parseInt(month) - 1]} '${year.slice(2)}`;
  };

  const tickInterval = Math.max(1, Math.floor(chartData.length / 10));

  const toggleLine = (trackName: string) => {
    setHiddenLines((prev) => {
      const next = new Set(prev);
      if (next.has(trackName)) {
        next.delete(trackName);
      } else {
        next.add(trackName);
      }
      return next;
    });
  };

  return (
    <SectionReveal id="obsession" className="py-24">
      {(inView) => (
        <>
          <div className="mb-12">
            <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-[#E91E63] mb-2.5 block">
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
                {top5.map((song, i) => {
                  if (hiddenLines.has(song.track_name)) return null;
                  return (
                    <Line
                      key={song.track_name}
                      type="monotone"
                      dataKey={song.track_name}
                      stroke={PALETTE[i]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, stroke: PALETTE[i], strokeWidth: 2 }}
                      isAnimationActive={inView}
                      animationDuration={1200}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>

            {/* Custom legend */}
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 pt-3">
              {top5.map((song, i) => {
                const isHidden = hiddenLines.has(song.track_name);
                return (
                  <button
                    key={song.track_name}
                    onClick={() => toggleLine(song.track_name)}
                    className="flex items-center gap-1.5 text-[0.7rem] transition-opacity hover:opacity-80"
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: PALETTE[i],
                        opacity: isHidden ? 0.3 : 1,
                      }}
                    />
                    <span
                      className={
                        isHidden
                          ? "line-through text-text-muted"
                          : "text-text-secondary"
                      }
                    >
                      {song.track_name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </SectionReveal>
  );
}
