"use client";

import { useMemo } from "react";
import type { HourDayHeatmapEntry } from "@/types/dashboard";
import { SectionReveal } from "@/components/dashboard/section-reveal";

interface HourDayHeatmapProps {
  data: HourDayHeatmapEntry[];
}

/**
 * Grid rows, in display order.
 *
 * `key` is the exact string the API sends as `weekday` — the backend maps Polars'
 * 1-7 weekday to these abbreviations (see
 * `backend/processing/stages/analyzers/heatmaps.py`), so the lookup below has to
 * match them character for character. `label` is only ever rendered. They read the
 * same today; keeping them as separate fields is what stops a change to one from
 * silently breaking the other.
 */
const DAYS: { key: string; label: string }[] = [
  { key: "Mon", label: "Mon" },
  { key: "Tue", label: "Tue" },
  { key: "Wed", label: "Wed" },
  { key: "Thu", label: "Thu" },
  { key: "Fri", label: "Fri" },
  { key: "Sat", label: "Sat" },
  { key: "Sun", label: "Sun" },
];

function formatHourLabel(hour: number): string {
  if (hour === 0) return "12a";
  if (hour === 12) return "12p";
  return hour < 12 ? `${hour}a` : `${hour - 12}p`;
}

/** Parse a hex color like "#1DB954" into [r, g, b]. */
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** Convert [r, g, b] back to a hex string. */
function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((c) => Math.round(c).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Linearly interpolate between two hex colors by t in [0, 1]. */
function lerpColor(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t,
  );
}

// Gradient stops: deep green -> bright green -> green-gold -> gold
const COLOR_STOPS = [
  { at: 0, color: "#0d4d1f" },    // deep green
  { at: 0.33, color: "#1DB954" },  // bright green
  { at: 0.66, color: "#7ec850" },  // green-gold
  { at: 1, color: "#F5A623" },     // gold
];

function getHeatColor(value: number, max: number): string {
  // Zero-value: neutral gray, visible on dark bg
  if (max === 0 || value === 0) return "rgba(255,255,255,0.05)";

  // Clamp ratio and enforce minimum opacity via minimum ratio
  const rawRatio = value / max;
  // Map rawRatio from [0,1] to [0.18, 1] to ensure minimum visibility,
  // then use that for color interpolation on [0,1]
  const ratio = 0.18 + rawRatio * 0.82;
  // For color, use the raw ratio so the full gradient is used
  const colorRatio = rawRatio;

  // Find which two stops we sit between
  let lower = COLOR_STOPS[0];
  let upper = COLOR_STOPS[COLOR_STOPS.length - 1];
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    if (colorRatio >= COLOR_STOPS[i].at && colorRatio <= COLOR_STOPS[i + 1].at) {
      lower = COLOR_STOPS[i];
      upper = COLOR_STOPS[i + 1];
      break;
    }
  }

  const segmentT =
    upper.at === lower.at ? 1 : (colorRatio - lower.at) / (upper.at - lower.at);
  const baseColor = lerpColor(lower.color, upper.color, segmentT);

  // Apply opacity via the mapped ratio to ensure minimum 0.18 visibility
  const [r, g, b] = hexToRgb(baseColor);
  return `rgba(${r},${g},${b},${ratio})`;
}

// Legend gradient stops matching the new color scheme
const LEGEND_COLORS = [
  { color: "#0d4d1f", opacity: 0.2 },
  { color: "#0d4d1f", opacity: 0.5 },
  { color: "#1DB954", opacity: 0.65 },
  { color: "#7ec850", opacity: 0.8 },
  { color: "#F5A623", opacity: 1 },
];

export function HourDayHeatmap({ data }: HourDayHeatmapProps) {
  // Hooks must run on every render — keep them above the empty-data guard below.
  const { grid, max } = useMemo(() => {
    const g: Record<string, Record<number, number>> = {};
    let m = 0;
    for (const { key } of DAYS) {
      g[key] = {};
      for (let h = 0; h < 24; h++) g[key][h] = 0;
    }
    for (const entry of data ?? []) {
      const row = g[entry.weekday];
      if (row) {
        row[entry.hour] = entry.hours;
        if (entry.hours > m) m = entry.hours;
      }
    }
    return { grid: g, max: m };
  }, [data]);

  if (!data?.length) return null;

  return (
    <SectionReveal id="heatmap" className="py-24">
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
          {DAYS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1 mb-1">
              <span className="w-14 text-right text-[0.7rem] text-text-muted font-[family-name:var(--font-display)] font-medium pr-2 shrink-0">
                {label}
              </span>
              <div className="flex flex-1 gap-[2px]">
                {Array.from({ length: 24 }, (_, h) => {
                  const val = grid[key]?.[h] ?? 0;
                  return (
                    <div
                      key={h}
                      className="flex-1 min-h-[20px] aspect-square rounded-[3px] transition-all hover:scale-110 hover:z-10 relative group cursor-default"
                      style={{ backgroundColor: getHeatColor(val, max) }}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[rgba(10,10,10,0.92)] border border-green/30 rounded-lg text-[0.6rem] text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                        {label} {formatHourLabel(h)}:{" "}
                        {val > 0 ? `${val.toFixed(1)}h` : "0h"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-4">
            <span className="text-text-muted text-[0.6rem]">Less</span>
            {LEGEND_COLORS.map(({ color, opacity }, i) => {
              const [r, g, b] = hexToRgb(color);
              return (
                <div
                  key={i}
                  className="w-3 h-3 rounded-[2px]"
                  style={{
                    backgroundColor: `rgba(${r},${g},${b},${opacity})`,
                  }}
                />
              );
            })}
            <span className="text-text-muted text-[0.6rem]">More</span>
          </div>
        </div>
      </div>
    </SectionReveal>
  );
}
