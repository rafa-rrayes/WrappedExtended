"use client";

import { useMemo, useState, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { PlatformHour, ContentTypeDistribution } from "@/types/dashboard";
import { formatHours } from "@/lib/utils";
import { SectionReveal } from "@/components/dashboard/section-reveal";

interface PlatformBreakdownProps {
  platformHours?: PlatformHour[];
  contentTypes?: ContentTypeDistribution[];
}

const COLORS = [
  "#1DB954",
  "#F5A623",
  "#E91E63",
  "#9C27B0",
  "#00BCD4",
  "#FF5722",
  "#8BC34A",
  "#607D8B",
];

const MAX_SLICES = 6;

interface AggregatedPlatform {
  platform: string;
  hours: number;
  pct: number;
}

/**
 * A share that is real but tiny must not print as "0.0%" — next to "58.2h" that reads as
 * a rounding bug rather than as a small number. The symmetric guard keeps the other row
 * from claiming a flat "100.0%" while its counterpart admits to being non-zero.
 */
function formatPct(pct: number): string {
  if (pct > 0 && pct < 0.1) return "<0.1%";
  if (pct < 100 && pct > 99.9) return ">99.9%";
  return `${pct.toFixed(1)}%`;
}

export function PlatformBreakdown({
  platformHours,
  contentTypes,
}: PlatformBreakdownProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Aggregate platforms: top 6, rest into "Other"
  const aggregatedPlatforms = useMemo<AggregatedPlatform[]>(() => {
    if (!platformHours?.length) return [];

    // Sort descending by hours
    const sorted = [...platformHours].sort((a, b) => b.hours - a.hours);

    if (sorted.length <= MAX_SLICES) return sorted;

    const top = sorted.slice(0, MAX_SLICES);
    const rest = sorted.slice(MAX_SLICES);

    const otherHours = rest.reduce((sum, p) => sum + p.hours, 0);
    const otherPct = rest.reduce((sum, p) => sum + p.pct, 0);

    return [
      ...top,
      { platform: "Other", hours: otherHours, pct: otherPct },
    ];
  }, [platformHours]);

  const totalHours = useMemo(
    () => aggregatedPlatforms.reduce((sum, p) => sum + p.hours, 0),
    [aggregatedPlatforms],
  );

  /*
   * The backend's `pct` on a content type is a share of *stream count*, not of hours
   * (`distributions.py`: `safe_div(music.height, total)`), so printing it beside
   * `formatHours(ct.hours)` sets two different metrics side by side: a handful of
   * hour-long podcast episodes is a visible slice of hours and a rounding error's worth
   * of streams, which is how "58.2h (0.0%)" happens. Recompute the share from hours here
   * — both the number and the bar below it — so the pair is internally consistent. The
   * stream-count share stays available on `ct.pct` for anyone who wants it.
   */
  const contentTypeRows = useMemo(() => {
    if (!contentTypes?.length) return [];
    const totalContentHours = contentTypes.reduce((sum, ct) => sum + ct.hours, 0);
    return contentTypes.map((ct) => ({
      ...ct,
      hoursPct: totalContentHours > 0 ? (ct.hours / totalContentHours) * 100 : 0,
    }));
  }, [contentTypes]);

  const handlePieEnter = useCallback((_: unknown, index: number) => {
    setActiveIndex(index);
  }, []);

  const handlePieLeave = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const handleLegendEnter = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const handleLegendLeave = useCallback(() => {
    setActiveIndex(null);
  }, []);

  if (!platformHours?.length && !contentTypes?.length) return null;

  return (
    <SectionReveal id="platforms" className="py-24">
      {(inView) => (
        <>
          <div className="mb-12">
            <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-green mb-2.5 block">
              12 — Platform Breakdown
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-[1.15]">
              Where You <span className="text-gold">Play</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Platform donut */}
            {aggregatedPlatforms.length > 0 && (
              <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
                <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-secondary mb-4 tracking-wide uppercase">
                  Devices
                </h3>

                {/* Donut chart with center label */}
                <div className="relative">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={aggregatedPlatforms}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="hours"
                        nameKey="platform"
                        strokeWidth={0}
                        isAnimationActive={inView}
                        onMouseEnter={handlePieEnter}
                        onMouseLeave={handlePieLeave}
                      >
                        {aggregatedPlatforms.map((_, i) => (
                          <Cell
                            key={i}
                            fill={COLORS[i % COLORS.length]}
                            fillOpacity={
                              activeIndex === null || activeIndex === i
                                ? 0.85
                                : 0.25
                            }
                            style={{ transition: "fill-opacity 0.2s ease" }}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "rgba(10,10,10,0.92)",
                          border: "1px solid rgba(29,185,84,0.3)",
                          borderRadius: 8,
                        }}
                        formatter={(value: number) => [
                          formatHours(value),
                          "Hours",
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Center label overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      {activeIndex !== null ? (
                        <>
                          <div className="text-text-primary text-sm font-semibold leading-tight max-w-[100px] truncate">
                            {aggregatedPlatforms[activeIndex]?.platform}
                          </div>
                          <div className="text-text-secondary text-xs mt-0.5">
                            {formatHours(
                              aggregatedPlatforms[activeIndex]?.hours ?? 0,
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-text-primary text-lg font-bold leading-tight">
                            {formatHours(totalHours)}
                          </div>
                          <div className="text-text-muted text-[0.65rem] mt-0.5">
                            total
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Custom legend: 2-column grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
                  {aggregatedPlatforms.map((p, i) => (
                    <div
                      key={p.platform}
                      className="flex items-center gap-2 cursor-default transition-opacity duration-200"
                      style={{
                        opacity:
                          activeIndex === null || activeIndex === i ? 1 : 0.35,
                      }}
                      onMouseEnter={() => handleLegendEnter(i)}
                      onMouseLeave={handleLegendLeave}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                      <span className="text-text-primary text-xs truncate">
                        {p.platform}
                      </span>
                      <span className="text-text-muted text-[0.65rem] ml-auto shrink-0">
                        {formatPct(p.pct)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Content type */}
            {contentTypes && contentTypes.length > 0 && (
              <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
                <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-secondary mb-4 tracking-wide uppercase">
                  Content Types
                </h3>
                <div className="space-y-4 mt-6">
                  {contentTypeRows.map((ct, i) => (
                    <div key={ct.type}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-text-primary text-sm font-medium capitalize">
                          {ct.type}
                        </span>
                        <span className="text-text-secondary text-sm">
                          {formatHours(ct.hours)} ({formatPct(ct.hoursPct)})
                        </span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${ct.hoursPct}%`,
                            backgroundColor: COLORS[i % COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </SectionReveal>
  );
}
