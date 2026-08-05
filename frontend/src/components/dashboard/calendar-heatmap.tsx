"use client";

import { useState, useMemo } from "react";
import type { CalendarHeatmapEntry } from "@/types/dashboard";
import { SectionReveal } from "@/components/dashboard/section-reveal";

interface CalendarHeatmapProps {
  data: CalendarHeatmapEntry[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

const ALL_YEARS = "all" as const;
type YearSelection = number | typeof ALL_YEARS;

function getCellColor(hours: number, maxHours: number): string {
  if (hours === 0) return "rgba(255, 255, 255, 0.04)";
  const ratio = Math.min(hours / (maxHours * 0.7), 1);
  if (ratio < 0.5) {
    // deep green to bright green
    const r = Math.round(10 + ratio * 2 * (29 - 10));
    const g = Math.round(80 + ratio * 2 * (185 - 80));
    const b = Math.round(30 + ratio * 2 * (84 - 30));
    return `rgb(${r}, ${g}, ${b})`;
  }
  // bright green to gold
  const t = (ratio - 0.5) * 2;
  const r = Math.round(29 + t * (245 - 29));
  const g = Math.round(185 + t * (166 - 185));
  const b = Math.round(84 + t * (35 - 84));
  return `rgb(${r}, ${g}, ${b})`;
}

interface YearData {
  year: number;
  days: Map<string, number>;
}

interface YearGridProps {
  yearData: YearData;
  maxHours: number;
  cellSize: number;
  cellGap: number;
  showLabel?: boolean;
}

function YearGrid({ yearData, maxHours, cellSize, cellGap, showLabel }: YearGridProps) {
  const { year, days } = yearData;
  const step = cellSize + cellGap;

  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);
  const startDay = (jan1.getDay() + 6) % 7; // Monday = 0
  const totalDays = Math.round((dec31.getTime() - jan1.getTime()) / 86400000) + 1;
  const totalWeeks = Math.ceil((totalDays + startDay) / 7);

  const labelOffset = cellSize >= 10 ? 30 : 0;
  const monthLabelOffset = cellSize >= 10 ? 20 : 0;
  const svgWidth = totalWeeks * step + labelOffset;
  const svgHeight = 7 * step + monthLabelOffset;

  // Precompute month label positions
  const monthLabels: { x: number; label: string }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < totalWeeks; w++) {
    const dayIndex = w * 7 - startDay;
    const date = new Date(year, 0, 1 + dayIndex);
    const month = date.getMonth();
    if (month !== lastMonth && date.getFullYear() === year) {
      lastMonth = month;
      monthLabels.push({ x: labelOffset + w * step, label: MONTHS[month] });
    }
  }

  // Precompute all cells
  const cells: { x: number; y: number; fill: string; tooltip: string }[] = [];
  for (let d = 0; d < totalDays; d++) {
    const date = new Date(year, 0, 1 + d);
    const dow = (date.getDay() + 6) % 7;
    const weekNum = Math.floor((d + startDay) / 7);
    const dateStr = date.toISOString().split("T")[0];
    const hours = days.get(dateStr) ?? 0;

    cells.push({
      x: labelOffset + weekNum * step,
      y: monthLabelOffset + dow * step,
      fill: getCellColor(hours, maxHours),
      tooltip: `${dateStr}: ${hours.toFixed(1)}h`,
    });
  }

  return (
    <div>
      {showLabel && (
        <div
          className="font-[family-name:var(--font-display)] text-[14px] font-bold text-text-muted mb-2"
        >
          {year}
        </div>
      )}
      <svg width={svgWidth} height={svgHeight} style={{ display: "block" }}>
        {/* Day labels (only for normal-sized cells) */}
        {cellSize >= 10 &&
          DAYS.map((d, i) =>
            d ? (
              <text
                key={`day-${i}`}
                x={0}
                y={monthLabelOffset + i * step + cellSize / 2}
                dominantBaseline="middle"
                fontSize={9}
                fill="#555"
                fontFamily="var(--font-display)"
              >
                {d}
              </text>
            ) : null
          )}

        {/* Month labels (only for normal-sized cells) */}
        {cellSize >= 10 &&
          monthLabels.map((m) => (
            <text
              key={`month-${m.label}-${m.x}`}
              x={m.x}
              y={10}
              fontSize={9}
              fill="#555"
              fontFamily="var(--font-display)"
            >
              {m.label}
            </text>
          ))}

        {/* Cells */}
        {cells.map((cell) => (
          <rect
            key={cell.tooltip}
            x={cell.x}
            y={cell.y}
            width={cellSize}
            height={cellSize}
            rx={2}
            fill={cell.fill}
            style={{ cursor: "default" }}
          >
            <title>{cell.tooltip}</title>
          </rect>
        ))}
      </svg>
    </div>
  );
}

export function CalendarHeatmap({ data }: CalendarHeatmapProps) {
  const { years, maxHours } = useMemo(() => {
    if (!data?.length) return { years: [] as YearData[], maxHours: 0 };

    const byYear = new Map<number, Map<string, number>>();
    let max = 0;

    for (const entry of data) {
      const year = new Date(entry.date).getFullYear();
      if (!byYear.has(year)) byYear.set(year, new Map());
      byYear.get(year)!.set(entry.date, entry.hours);
      if (entry.hours > max) max = entry.hours;
    }

    const sortedYears = Array.from(byYear.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, days]) => ({ year, days }));

    return { years: sortedYears, maxHours: max };
  }, [data]);

  // Open on every year rather than the most recent one. The newest year is a partial year
  // for most of the calendar — landing on a half-empty grid reads as missing data, where
  // the full history is the section's whole point. The year picker is right there for
  // anyone who wants to drill in.
  const [selectedYear, setSelectedYear] = useState<YearSelection>(ALL_YEARS);

  const visibleYears = useMemo(() => {
    if (selectedYear === ALL_YEARS) return years;
    return years.filter((y) => y.year === selectedYear);
  }, [years, selectedYear]);

  if (!data?.length) return null;

  const isAllYears = selectedYear === ALL_YEARS;
  const cellSize = isAllYears ? 8 : 12;
  const cellGap = isAllYears ? 1 : 2;

  return (
    <SectionReveal id="calendar">
      <div className="mb-12">
        <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-green mb-2.5 block">
          08 — Calendar Heatmap
        </span>
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-[1.15]">
          Every Day You <span className="text-gold">Pressed Play</span>
        </h2>
      </div>

      {/* Year selector tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {years.map((y) => (
          <button
            key={y.year}
            onClick={() => setSelectedYear(y.year)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold font-[family-name:var(--font-display)] transition-all ${
              selectedYear === y.year
                ? "bg-green/20 text-green border border-green/30"
                : "bg-white/5 text-text-muted border border-transparent hover:bg-white/10"
            }`}
          >
            {y.year}
          </button>
        ))}
        <button
          onClick={() => setSelectedYear(ALL_YEARS)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold font-[family-name:var(--font-display)] transition-all ${
            isAllYears
              ? "bg-green/20 text-green border border-green/30"
              : "bg-white/5 text-text-muted border border-transparent hover:bg-white/10"
          }`}
        >
          All Years
        </button>
      </div>

      <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6 overflow-x-auto">
        <div className={`flex flex-col ${isAllYears ? "gap-4" : "gap-6"}`}>
          {visibleYears.map((yearData) => (
            <YearGrid
              key={yearData.year}
              yearData={yearData}
              maxHours={maxHours}
              cellSize={cellSize}
              cellGap={cellGap}
              showLabel={isAllYears}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-4">
          <span className="text-text-muted text-[0.6rem]">Less</span>
          {[
            "rgba(255, 255, 255, 0.04)",
            "rgb(10, 80, 30)",
            "rgb(20, 133, 57)",
            "rgb(29, 185, 84)",
            "rgb(245, 166, 35)",
          ].map((color) => (
            <div
              key={color}
              className="w-3 h-3 rounded-[2px]"
              style={{ backgroundColor: color }}
            />
          ))}
          <span className="text-text-muted text-[0.6rem]">More</span>
        </div>
      </div>
    </SectionReveal>
  );
}
