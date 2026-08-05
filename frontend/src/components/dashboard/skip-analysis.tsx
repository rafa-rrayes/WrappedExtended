"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from "recharts";
import type { SkipRateByArtist, SkipRateScatter, TrackCompletionRate } from "@/types/dashboard";
import { SectionReveal } from "./section-reveal";

interface SkipAnalysisProps {
  skipRateByArtist?: SkipRateByArtist[];
  skipRateScatter?: SkipRateScatter[];
  completionRates?: TrackCompletionRate[];
}

/**
 * Interpolate from green (#1DB954) at 0% skipped to pink (#E91E63) at 100% skipped.
 *
 * @param skipRatePct - skip rate on the **0-100 percentage scale** the API returns
 *   (`skips / plays * 100`), not a 0-1 ratio.
 */
function skipRateColor(skipRatePct: number): string {
  const ratio = Math.min(Math.max(skipRatePct, 0), 100) / 100;
  const r = Math.round(29 + (233 - 29) * ratio);
  const g = Math.round(185 + (30 - 185) * ratio);
  const b = Math.round(84 + (99 - 84) * ratio);
  return `rgb(${r},${g},${b})`;
}

export function SkipAnalysis({
  skipRateByArtist,
  skipRateScatter,
  completionRates,
}: SkipAnalysisProps) {
  if (!skipRateByArtist?.length && !skipRateScatter?.length && !completionRates?.length)
    return null;

  return (
    <SectionReveal id="skips" className="py-24">
      {(inView: boolean) => (
        <>
          <div className="mb-12">
            <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-[#E91E63] mb-2.5 block">
              13 — Skip & Completion
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-[1.15]">
              What You <span className="text-gold">Skip</span> & What You Finish
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Skip rate by artist */}
            {skipRateByArtist && skipRateByArtist.length > 0 && (
              <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
                <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-secondary mb-4 tracking-wide uppercase">
                  Skip Rate by Artist
                </h3>
                <ResponsiveContainer width="100%" height={skipRateByArtist.length * 32 + 30}>
                  <BarChart
                    data={skipRateByArtist}
                    layout="vertical"
                    margin={{ left: 80, right: 10, top: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                      domain={[0, "dataMax"]}
                      tick={{ fontSize: 10, fill: "#555" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="artist_name"
                      width={80}
                      tick={{ fontSize: 10, fill: "#999" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(10,10,10,0.92)",
                        border: "1px solid rgba(233,30,99,0.3)",
                        borderRadius: 8,
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, "Skip Rate"]}
                    />
                    <Bar dataKey="skip_rate" radius={[0, 4, 4, 0]} isAnimationActive={inView}>
                      {skipRateByArtist.map((entry, i) => (
                        <Cell key={i} fill={skipRateColor(entry.skip_rate)} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Skip rate scatter */}
            {skipRateScatter && skipRateScatter.length > 0 && (
              <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
                <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-secondary mb-4 tracking-wide uppercase">
                  Plays vs Skip Rate
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis
                      type="number"
                      dataKey="plays"
                      domain={[0, "auto"]}
                      allowDecimals={false}
                      tick={{ fontSize: 10, fill: "#555" }}
                      axisLine={false}
                      tickLine={false}
                      name="Plays"
                    />
                    <YAxis
                      type="number"
                      dataKey="skip_rate"
                      domain={[0, "auto"]}
                      tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                      tick={{ fontSize: 10, fill: "#555" }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                      name="Skip Rate"
                    />
                    <ZAxis range={[30, 120]} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(10,10,10,0.92)",
                        border: "1px solid rgba(233,30,99,0.3)",
                        borderRadius: 8,
                      }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-[rgba(10,10,10,0.92)] border border-[#E91E63]/30 rounded-lg p-3">
                            <div className="font-semibold text-text-primary text-xs">{d.track_name}</div>
                            <div className="text-text-secondary text-[0.65rem]">{d.artist_name}</div>
                            <div className="text-[#E91E63] text-[0.65rem] mt-1">
                              {d.plays} plays · {d.skip_rate.toFixed(1)}% skipped
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Scatter data={skipRateScatter} fill="#E91E63" fillOpacity={0.5} isAnimationActive={inView} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Completion rates */}
            {completionRates && completionRates.length > 0 && (
              <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6 lg:col-span-2">
                <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-secondary mb-4 tracking-wide uppercase">
                  Top Track Completion Rates
                </h3>
                <div className="space-y-3">
                  {completionRates.slice(0, 10).map((track, i) => (
                    <div key={`${track.track_name}-${i}`} className="flex items-center gap-3">
                      <span className="font-[family-name:var(--font-display)] text-sm font-bold text-text-muted w-6 text-right shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-text-primary text-sm font-medium truncate">
                            {track.track_name}
                            <span className="text-text-muted font-normal"> · {track.artist_name}</span>
                          </span>
                          <span className="text-[#E91E63] text-sm font-bold ml-2 shrink-0">
                            {track.avg_completion_pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: inView ? `${track.avg_completion_pct}%` : "0%",
                              background: `linear-gradient(90deg, #1DB954, #E91E63)`,
                            }}
                          />
                        </div>
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
