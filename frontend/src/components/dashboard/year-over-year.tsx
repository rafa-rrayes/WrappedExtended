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

/** A year counts towards the growth figure once it reaches this share of the peak year. */
const SUBSTANTIAL_YEAR_SHARE = 0.1;

/**
 * Total growth, anchored to the first *substantial* year rather than to `data[0]`.
 *
 * An export's first year is very often a stub — the tail of the year the account was
 * opened, or a few minutes of playback. Dividing by it produced numbers like "+332,726%"
 * (0.2 hours in 2016 → 665 hours today), which is arithmetically true and tells the
 * reader nothing. A year is treated as substantial once it reaches 10% of the user's
 * peak year: a *relative* floor, so it behaves the same for a 5,000-hour listener and a
 * 200-hour one, and the peak year always clears its own floor, so at least one year
 * always qualifies. The newest year is filtered on the same rule, because an export
 * pulled in January leaves an identical stub at the other end. Both endpoints are named
 * in the label — a growth figure is only interpretable if you can see what it spans.
 *
 * The rule errs towards silence: a listener who ramped up from one genuinely light year
 * loses the pill rather than being handed a four-digit percentage. The chart and the
 * per-year change beneath it still carry that story, so nothing is lost but the boast.
 */
function computeGrowth(
  data: YearOverYearType[],
  peakHours: number,
): { from: number; to: number; pct: number } | null {
  // Sorted here rather than trusted from the caller: the endpoints are the whole point.
  const substantial = data
    .filter((y) => y.hours >= peakHours * SUBSTANTIAL_YEAR_SHARE)
    .sort((a, b) => a.year - b.year);
  const from = substantial[0];
  const to = substantial[substantial.length - 1];

  // One substantial year is not a trend, and a zero baseline is not a divisor.
  if (!from || !to || from.year === to.year || from.hours <= 0) return null;

  return {
    from: from.year,
    to: to.year,
    pct: Math.round(((to.hours - from.hours) / from.hours) * 100),
  };
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

  const growth = computeGrowth(data, bestYear.hours);

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
            {growth && (
              <div className="inline-flex items-center gap-2 bg-bg-card border border-border rounded-full px-4 py-2">
                <span className="text-text-muted text-xs">
                  Growth {growth.from}→{growth.to}:
                </span>
                <span
                  className={`font-[family-name:var(--font-display)] text-sm font-bold ${
                    growth.pct >= 0 ? "text-green" : "text-red-400"
                  }`}
                >
                  {growth.pct >= 0 ? "+" : ""}
                  {formatNumber(growth.pct)}%
                </span>
              </div>
            )}
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
