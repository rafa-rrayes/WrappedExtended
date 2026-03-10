"use client";

import { useRef, useEffect, useMemo } from "react";
import type { CalendarHeatmapEntry } from "@/types/dashboard";

interface CalendarHeatmapProps {
  data: CalendarHeatmapEntry[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

export function CalendarHeatmap({ data }: CalendarHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { years, maxHours } = useMemo(() => {
    if (!data?.length) return { years: [], maxHours: 0 };

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

  useEffect(() => {
    if (!containerRef.current || !years.length) return;
    const container = containerRef.current;
    container.innerHTML = "";

    const cellSize = 12;
    const cellGap = 2;
    const step = cellSize + cellGap;

    for (const { year, days } of years) {
      const yearDiv = document.createElement("div");
      yearDiv.style.marginBottom = "24px";

      const label = document.createElement("div");
      label.textContent = String(year);
      label.style.cssText = `font-family: var(--font-display); font-size: 14px; font-weight: 700; color: #999; margin-bottom: 8px;`;
      yearDiv.appendChild(label);

      const jan1 = new Date(year, 0, 1);
      const dec31 = new Date(year, 11, 31);
      const startDay = (jan1.getDay() + 6) % 7; // Monday = 0
      const totalDays = Math.round((dec31.getTime() - jan1.getTime()) / 86400000) + 1;
      const totalWeeks = Math.ceil((totalDays + startDay) / 7);

      const svgWidth = totalWeeks * step + 30;
      const svgHeight = 7 * step + 30;

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", String(svgWidth));
      svg.setAttribute("height", String(svgHeight));
      svg.style.display = "block";

      // Day labels
      DAYS.forEach((d, i) => {
        if (!d) return;
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", "0");
        text.setAttribute("y", String(20 + i * step + cellSize / 2));
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("font-size", "9");
        text.setAttribute("fill", "#555");
        text.setAttribute("font-family", "var(--font-display)");
        text.textContent = d;
        svg.appendChild(text);
      });

      // Month labels
      let lastMonth = -1;
      for (let w = 0; w < totalWeeks; w++) {
        const dayIndex = w * 7 - startDay;
        const date = new Date(year, 0, 1 + dayIndex);
        const month = date.getMonth();
        if (month !== lastMonth && date.getFullYear() === year) {
          lastMonth = month;
          const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
          text.setAttribute("x", String(30 + w * step));
          text.setAttribute("y", "10");
          text.setAttribute("font-size", "9");
          text.setAttribute("fill", "#555");
          text.setAttribute("font-family", "var(--font-display)");
          text.textContent = MONTHS[month];
          svg.appendChild(text);
        }
      }

      // Cells
      for (let d = 0; d < totalDays; d++) {
        const date = new Date(year, 0, 1 + d);
        const dow = (date.getDay() + 6) % 7; // Monday = 0
        const weekNum = Math.floor((d + startDay) / 7);
        const dateStr = date.toISOString().split("T")[0];
        const hours = days.get(dateStr) ?? 0;

        let fill: string;
        if (hours === 0) {
          fill = "rgba(29, 185, 84, 0.04)";
        } else {
          const ratio = Math.min(hours / (maxHours * 0.7), 1);
          const opacity = 0.15 + ratio * 0.85;
          fill = `rgba(29, 185, 84, ${opacity})`;
        }

        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", String(30 + weekNum * step));
        rect.setAttribute("y", String(20 + dow * step));
        rect.setAttribute("width", String(cellSize));
        rect.setAttribute("height", String(cellSize));
        rect.setAttribute("rx", "2");
        rect.setAttribute("fill", fill);
        rect.style.cursor = "default";

        // Tooltip via title
        const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
        title.textContent = `${dateStr}: ${hours.toFixed(1)}h`;
        rect.appendChild(title);

        svg.appendChild(rect);
      }

      yearDiv.appendChild(svg);
      container.appendChild(yearDiv);
    }
  }, [years, maxHours]);

  if (!data?.length) return null;

  return (
    <section id="calendar" className="py-24 opacity-0 animate-[fadeUp_0.8s_ease_forwards]">
      <div className="mb-12">
        <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-green mb-2.5 block">
          08 — Calendar Heatmap
        </span>
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-[1.15]">
          Every Day You <span className="text-gold">Pressed Play</span>
        </h2>
      </div>

      <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6 overflow-x-auto">
        <div ref={containerRef} />

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-4">
          <span className="text-text-muted text-[0.6rem]">Less</span>
          {[0.04, 0.2, 0.4, 0.65, 0.9].map((opacity) => (
            <div
              key={opacity}
              className="w-3 h-3 rounded-[2px]"
              style={{ backgroundColor: `rgba(29, 185, 84, ${opacity})` }}
            />
          ))}
          <span className="text-text-muted text-[0.6rem]">More</span>
        </div>
      </div>
    </section>
  );
}
