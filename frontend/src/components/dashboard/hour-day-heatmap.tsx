"use client";

import { useMemo } from "react";
import type { HourDayHeatmapEntry } from "@/types/dashboard";

interface HourDayHeatmapProps {
  data: HourDayHeatmapEntry[];
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatHourLabel(hour: number): string {
  if (hour === 0) return "12a";
  if (hour === 12) return "12p";
  return hour < 12 ? `${hour}a` : `${hour - 12}p`;
}

function getHeatColor(value: number, max: number): string {
  if (max === 0 || value === 0) return "rgba(29, 185, 84, 0.03)";
  const ratio = value / max;
  if (ratio < 0.25) return `rgba(29, 185, 84, ${0.08 + ratio * 0.4})`;
  if (ratio < 0.5) return `rgba(29, 185, 84, ${0.2 + (ratio - 0.25) * 1.2})`;
  if (ratio < 0.75) return `rgba(29, 185, 84, ${0.5 + (ratio - 0.5) * 1.0})`;
  return `rgba(29, 185, 84, ${0.75 + (ratio - 0.75) * 1.0})`;
}

export function HourDayHeatmap({ data }: HourDayHeatmapProps) {
  if (!data?.length) return null;

  const { grid, max } = useMemo(() => {
    const g: Record<string, Record<number, number>> = {};
    let m = 0;
    for (const day of DAYS) {
      g[day] = {};
      for (let h = 0; h < 24; h++) g[day][h] = 0;
    }
    for (const entry of data) {
      const day = entry.weekday;
      if (g[day]) {
        g[day][entry.hour] = entry.hours;
        if (entry.hours > m) m = entry.hours;
      }
    }
    return { grid: g, max: m };
  }, [data]);

  return (
    <section id="heatmap" className="py-24 opacity-0 animate-[fadeUp_0.8s_ease_forwards]">
      <div className="mb-12">
        <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-green mb-2.5 block">
          07 — Hour × Day Heatmap
        </span>
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-[1.15]">
          Your Weekly <span className="text-gold">Rhythm</span>
        </h2>
      </div>

      <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6 overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Hour labels */}
          <div className="flex ml-16 mb-1">
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                className="flex-1 text-center text-[0.6rem] text-text-muted font-[family-name:var(--font-display)]"
              >
                {h % 3 === 0 ? formatHourLabel(h) : ""}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {DAYS.map((day, di) => (
            <div key={day} className="flex items-center gap-1 mb-1">
              <span className="w-14 text-right text-[0.7rem] text-text-muted font-[family-name:var(--font-display)] font-medium pr-2 shrink-0">
                {DAY_SHORT[di]}
              </span>
              <div className="flex flex-1 gap-[2px]">
                {Array.from({ length: 24 }, (_, h) => {
                  const val = grid[day]?.[h] ?? 0;
                  return (
                    <div
                      key={h}
                      className="flex-1 aspect-square rounded-[3px] transition-all hover:scale-110 hover:z-10 relative group cursor-default"
                      style={{ backgroundColor: getHeatColor(val, max) }}
                    >
                      {val > 0 && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[rgba(10,10,10,0.92)] border border-green/30 rounded-lg text-[0.6rem] text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                          {DAY_SHORT[di]} {formatHourLabel(h)}: {val.toFixed(1)}h
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-4">
            <span className="text-text-muted text-[0.6rem]">Less</span>
            {[0.05, 0.2, 0.4, 0.6, 0.85].map((opacity) => (
              <div
                key={opacity}
                className="w-3 h-3 rounded-[2px]"
                style={{ backgroundColor: `rgba(29, 185, 84, ${opacity})` }}
              />
            ))}
            <span className="text-text-muted text-[0.6rem]">More</span>
          </div>
        </div>
      </div>
    </section>
  );
}
