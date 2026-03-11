"use client";

import { useState } from "react";
import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import { motion } from "framer-motion";
import type { NostalgiaTrack, DiscoveryRate, MusicLifecycle } from "@/types/dashboard";
import { formatNumber } from "@/lib/utils";
import { SectionReveal } from "@/components/dashboard/section-reveal";
import { staggerContainer, staggerItem } from "@/lib/animations";

interface NostalgiaDiscoveryProps {
  nostalgiaTracks?: NostalgiaTrack[];
  discoveryRate?: DiscoveryRate[];
  musicLifecycle?: MusicLifecycle[];
}

const DEFAULT_NOSTALGIA_VISIBLE = 5;
const DEFAULT_LIFECYCLE_VISIBLE = 5;

export function NostalgiaDiscovery({
  nostalgiaTracks,
  discoveryRate,
  musicLifecycle,
}: NostalgiaDiscoveryProps) {
  const [showAllNostalgia, setShowAllNostalgia] = useState(false);
  const [showAllLifecycle, setShowAllLifecycle] = useState(false);

  if (!nostalgiaTracks?.length && !discoveryRate?.length && !musicLifecycle?.length) return null;

  const formatMonth = (m: string) => {
    const [year, month] = m.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[parseInt(month) - 1]} '${year.slice(2)}`;
  };

  const visibleNostalgia = nostalgiaTracks
    ? showAllNostalgia
      ? nostalgiaTracks.slice(0, 8)
      : nostalgiaTracks.slice(0, DEFAULT_NOSTALGIA_VISIBLE)
    : [];
  const canExpandNostalgia =
    nostalgiaTracks != null && nostalgiaTracks.length > DEFAULT_NOSTALGIA_VISIBLE;

  const visibleLifecycle = musicLifecycle
    ? showAllLifecycle
      ? musicLifecycle.slice(0, 10)
      : musicLifecycle.slice(0, DEFAULT_LIFECYCLE_VISIBLE)
    : [];
  const canExpandLifecycle =
    musicLifecycle != null && musicLifecycle.length > DEFAULT_LIFECYCLE_VISIBLE;

  return (
    <SectionReveal id="nostalgia" className="py-24">
      {(inView) => (
        <>
          <div className="mb-12">
            <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-green mb-2.5 block">
              15 — Nostalgia & Discovery
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-[1.15]">
              Tracks That <span className="text-gold">Stood the Test</span> of Time
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Nostalgia tracks */}
            {nostalgiaTracks && nostalgiaTracks.length > 0 && (
              <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
                <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-secondary mb-4 tracking-wide uppercase">
                  Tracks You&apos;ve Loved the Longest
                </h3>
                <motion.div
                  className="space-y-3"
                  variants={staggerContainer}
                  initial="hidden"
                  animate={inView ? "visible" : "hidden"}
                >
                  {visibleNostalgia.map((track, i) => {
                    const firstDate = new Date(track.first_listen);
                    const latestDate = new Date(track.latest_listen);
                    const spanYears = (
                      (latestDate.getTime() - firstDate.getTime()) /
                      (365.25 * 86400000)
                    ).toFixed(1);

                    return (
                      <motion.div
                        key={`${track.track_name}-${i}`}
                        variants={staggerItem}
                        className={`p-3 rounded-[var(--radius-sm)] transition-colors ${
                          i === 0
                            ? "bg-gradient-to-r from-gold/[0.06] to-transparent border border-gold/15"
                            : "bg-white/[0.02] hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-text-primary text-sm truncate">
                              {track.track_name}
                            </div>
                            <div className="text-text-muted text-[0.65rem]">{track.artist_name}</div>
                          </div>
                          <span className="text-green text-xs font-bold shrink-0 ml-2">
                            {formatNumber(track.plays)} plays
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-text-muted text-[0.6rem]">
                            {firstDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                          </span>
                          <div className="flex-1 h-px bg-green/20 relative">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-green" />
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gold" />
                          </div>
                          <span className="text-text-muted text-[0.6rem]">
                            {latestDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                          </span>
                          <span className="text-gold text-[0.6rem] font-bold">{spanYears}y</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
                {canExpandNostalgia && (
                  <button
                    onClick={() => setShowAllNostalgia((prev) => !prev)}
                    className="mt-4 text-sm font-medium text-green hover:text-green/80 transition-colors"
                  >
                    {showAllNostalgia ? "Show fewer" : `Show all ${Math.min(nostalgiaTracks.length, 8)}`}
                  </button>
                )}
              </div>
            )}

            {/* Music lifecycle */}
            {musicLifecycle && musicLifecycle.length > 0 && (
              <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
                <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-secondary mb-4 tracking-wide uppercase">
                  Track Lifecycles
                </h3>
                <motion.div
                  className="space-y-3"
                  variants={staggerContainer}
                  initial="hidden"
                  animate={inView ? "visible" : "hidden"}
                >
                  {visibleLifecycle.map((track, i) => (
                    <motion.div
                      key={`${track.track_name}-${i}`}
                      variants={staggerItem}
                      className="flex items-center gap-3"
                    >
                      <span className="font-[family-name:var(--font-display)] text-xs font-bold text-text-muted w-5 text-right shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-text-primary text-sm truncate">
                          {track.track_name}
                          <span className="text-text-muted font-normal"> · {track.artist_name}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[0.6rem] text-text-muted">
                            Peak: {track.peak_month}
                          </span>
                          <span className="text-[0.6rem] text-green">
                            {track.months_active} months active
                          </span>
                          <span className="text-[0.6rem] text-text-muted">
                            {formatNumber(track.total_plays)} plays
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
                {canExpandLifecycle && (
                  <button
                    onClick={() => setShowAllLifecycle((prev) => !prev)}
                    className="mt-4 text-sm font-medium text-green hover:text-green/80 transition-colors"
                  >
                    {showAllLifecycle ? "Show fewer" : `Show all ${Math.min(musicLifecycle.length, 10)}`}
                  </button>
                )}
              </div>
            )}

            {/* Discovery rate chart */}
            {discoveryRate && discoveryRate.length > 0 && (
              <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6 lg:col-span-2">
                <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-secondary mb-4 tracking-wide uppercase">
                  Discovery Rate
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={discoveryRate} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="discoveryGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F5A623" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#F5A623" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={formatMonth}
                      interval={Math.max(1, Math.floor(discoveryRate.length / 12))}
                      tick={{ fontSize: 10, fill: "#555" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="new"
                      tick={{ fontSize: 10, fill: "#555" }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <YAxis
                      yAxisId="cum"
                      orientation="right"
                      tick={{ fontSize: 10, fill: "#555" }}
                      axisLine={false}
                      tickLine={false}
                      width={50}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(10,10,10,0.92)",
                        border: "1px solid rgba(29,185,84,0.3)",
                        borderRadius: 8,
                      }}
                      labelFormatter={formatMonth}
                    />
                    <Area
                      yAxisId="cum"
                      type="monotone"
                      dataKey="cumulative_tracks"
                      stroke="#F5A623"
                      strokeWidth={2}
                      fill="url(#discoveryGrad)"
                      name="Total Tracks"
                      isAnimationActive={inView}
                      animationDuration={1200}
                    />
                    <Line
                      yAxisId="new"
                      type="monotone"
                      dataKey="new_tracks"
                      stroke="#1DB954"
                      strokeWidth={1.5}
                      dot={false}
                      name="New Tracks"
                      isAnimationActive={inView}
                      animationDuration={1200}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </SectionReveal>
  );
}
