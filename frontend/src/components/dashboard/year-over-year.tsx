"use client";

import { useState } from "react";
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
import { motion, AnimatePresence } from "framer-motion";
import type { YearOverYear as YearOverYearType } from "@/types/dashboard";
import { formatNumber, formatHours } from "@/lib/utils";
import { SectionReveal } from "./section-reveal";

interface YearOverYearProps {
  data: YearOverYearType[];
}

export function YearOverYear({ data }: YearOverYearProps) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  if (!data?.length) return null;

  // Compute summary stats
  const bestYear = data.reduce((best, y) => (y.hours > best.hours ? y : best), data[0]);
  const mostArtistsYear = data.reduce(
    (best, y) => (y.unique_artists > best.unique_artists ? y : best),
    data[0],
  );

  // Total growth %: from first year to last year
  const firstYear = data[0];
  const lastYear = data[data.length - 1];
  const totalGrowthPct =
    firstYear.hours > 0
      ? Math.round(((lastYear.hours - firstYear.hours) / firstYear.hours) * 100)
      : 0;

  const selectedYearData = data.find((y) => y.year === selectedYear) ?? null;

  return (
    <SectionReveal id="yoy">
      {(inView: boolean) => (
        <>
          <div className="mb-12">
            <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-green mb-2.5 block">
              05 — Year Over Year
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-[1.15]">
              How Your Listening <span className="text-gold">Evolved</span>
            </h2>
          </div>

          {/* Summary pills */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="inline-flex items-center gap-2 bg-bg-card border border-border rounded-full px-4 py-2">
              <span className="text-text-muted text-xs">Best Year:</span>
              <span className="font-[family-name:var(--font-display)] text-sm font-bold text-gold">
                {bestYear.year} ({formatHours(bestYear.hours)})
              </span>
            </div>
            <div className="inline-flex items-center gap-2 bg-bg-card border border-border rounded-full px-4 py-2">
              <span className="text-text-muted text-xs">Growth:</span>
              <span
                className={`font-[family-name:var(--font-display)] text-sm font-bold ${
                  totalGrowthPct >= 0 ? "text-green" : "text-red-400"
                }`}
              >
                {totalGrowthPct >= 0 ? "+" : ""}
                {totalGrowthPct}%
              </span>
            </div>
            <div className="inline-flex items-center gap-2 bg-bg-card border border-border rounded-full px-4 py-2">
              <span className="text-text-muted text-xs">Most Artists:</span>
              <span className="font-[family-name:var(--font-display)] text-sm font-bold text-green">
                {mostArtistsYear.year} ({formatNumber(mostArtistsYear.unique_artists)})
              </span>
            </div>
          </div>

          {/* Bar chart */}
          <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={data}
                margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
                onClick={(state) => {
                  if (state?.activeLabel != null) {
                    const clickedYear = Number(state.activeLabel);
                    setSelectedYear((prev) => (prev === clickedYear ? null : clickedYear));
                  }
                }}
              >
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
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar
                  dataKey="hours"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={60}
                  isAnimationActive={inView}
                  animationDuration={1200}
                  animationEasing="ease-out"
                  style={{ cursor: "pointer" }}
                >
                  {data.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        selectedYear === entry.year
                          ? "#F5A623"
                          : i === data.length - 1
                            ? "#F5A623"
                            : "#1DB954"
                      }
                      fillOpacity={
                        selectedYear != null && selectedYear !== entry.year ? 0.4 : 0.8
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Inline detail panel for selected year */}
          <AnimatePresence>
            {selectedYearData && (
              <motion.div
                key={selectedYearData.year}
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="bg-bg-card border border-gold/30 rounded-[var(--radius-card)] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-gold">
                      {selectedYearData.year}
                    </h3>
                    <button
                      onClick={() => setSelectedYear(null)}
                      className="text-text-muted hover:text-text-primary text-xs transition-colors"
                    >
                      Close
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <div className="text-text-muted text-[0.65rem] uppercase tracking-wider mb-1">
                        Hours
                      </div>
                      <div className="font-[family-name:var(--font-display)] text-xl font-extrabold text-green">
                        {formatHours(selectedYearData.hours)}
                      </div>
                    </div>
                    <div>
                      <div className="text-text-muted text-[0.65rem] uppercase tracking-wider mb-1">
                        Streams
                      </div>
                      <div className="font-[family-name:var(--font-display)] text-xl font-extrabold text-text-primary">
                        {formatNumber(selectedYearData.streams)}
                      </div>
                    </div>
                    <div>
                      <div className="text-text-muted text-[0.65rem] uppercase tracking-wider mb-1">
                        Artists
                      </div>
                      <div className="font-[family-name:var(--font-display)] text-xl font-extrabold text-text-primary">
                        {formatNumber(selectedYearData.unique_artists)}
                      </div>
                    </div>
                    <div>
                      <div className="text-text-muted text-[0.65rem] uppercase tracking-wider mb-1">
                        Change
                      </div>
                      <div
                        className={`font-[family-name:var(--font-display)] text-xl font-extrabold ${
                          selectedYearData.change_pct === null
                            ? "text-text-muted"
                            : selectedYearData.change_pct >= 0
                              ? "text-green"
                              : "text-red-400"
                        }`}
                      >
                        {selectedYearData.change_pct === null
                          ? "—"
                          : `${selectedYearData.change_pct >= 0 ? "+" : ""}${selectedYearData.change_pct.toFixed(0)}%`}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </SectionReveal>
  );
}
