"use client";

import { motion } from "framer-motion";
import type { StatisticsSummary, DiversityScore } from "@/types/dashboard";
import { SectionReveal } from "@/components/dashboard/section-reveal";
import { useAnimatedCounter } from "@/lib/hooks/use-animated-counter";

interface DeepStatsProps {
  summary?: StatisticsSummary;
  diversity?: DiversityScore;
}

function msToMinSec(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function AnimatedStat({
  value,
  suffix,
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const { ref, display } = useAnimatedCounter(value, { decimals: value % 1 !== 0 ? 1 : 0 });
  return (
    <span ref={ref} className={className}>
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  );
}

export function DeepStats({ summary, diversity }: DeepStatsProps) {
  if (!summary && !diversity) return null;

  return (
    <SectionReveal id="stats" className="py-24">
      {() => (
        <>
          <div className="mb-12">
            <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-green mb-2.5 block">
              16 — Deep Stats
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-[1.15]">
              The <span className="text-gold">Numbers</span> Behind the Music
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Statistics summary grid */}
            {summary && (
              <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
                <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-secondary mb-6 tracking-wide uppercase">
                  By the Numbers
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-green">
                      <AnimatedStat value={summary.avg_daily_hours} suffix="h" />
                    </div>
                    <div className="text-text-muted text-[0.65rem] uppercase tracking-wider mt-0.5">
                      Avg Daily Listening
                    </div>
                  </div>
                  <div>
                    <div className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-text-primary">
                      <AnimatedStat value={Math.round(summary.avg_daily_streams)} />
                    </div>
                    <div className="text-text-muted text-[0.65rem] uppercase tracking-wider mt-0.5">
                      Avg Daily Streams
                    </div>
                  </div>
                  <div>
                    <div className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-text-primary">
                      {msToMinSec(summary.avg_track_ms)}
                    </div>
                    <div className="text-text-muted text-[0.65rem] uppercase tracking-wider mt-0.5">
                      Avg Track Length
                    </div>
                  </div>
                  <div>
                    <div className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-text-primary">
                      {msToMinSec(summary.median_track_ms)}
                    </div>
                    <div className="text-text-muted text-[0.65rem] uppercase tracking-wider mt-0.5">
                      Median Track Length
                    </div>
                  </div>
                  <div>
                    <div className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-gold">
                      <AnimatedStat value={summary.total_days_active} />
                    </div>
                    <div className="text-text-muted text-[0.65rem] uppercase tracking-wider mt-0.5">
                      Days Active
                    </div>
                  </div>
                  <div>
                    <div className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-text-primary">
                      <AnimatedStat value={summary.total_unique_albums} />
                    </div>
                    <div className="text-text-muted text-[0.65rem] uppercase tracking-wider mt-0.5">
                      Unique Albums
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Diversity score */}
            {diversity && (
              <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
                <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-secondary mb-6 tracking-wide uppercase">
                  Musical Diversity
                </h3>
                <div className="space-y-5">
                  {/* Diversity meter */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-text-secondary text-xs">Diversity Score</span>
                      <span className="font-[family-name:var(--font-display)] text-sm font-bold text-green">
                        {(diversity.normalized_entropy * 100).toFixed(0)}/100
                      </span>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden relative">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${diversity.normalized_entropy * 100}%`,
                          background: "linear-gradient(90deg, #1DB954, #F5A623)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="text-center">
                      <div className="font-[family-name:var(--font-display)] text-lg font-bold text-text-primary">
                        {diversity.shannon_entropy.toFixed(2)}
                      </div>
                      <div className="text-text-muted text-[0.6rem] uppercase tracking-wider mt-0.5">
                        Shannon Entropy
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-[family-name:var(--font-display)] text-lg font-bold text-text-primary">
                        {(diversity.gini_coefficient * 100).toFixed(0)}%
                      </div>
                      <div className="text-text-muted text-[0.6rem] uppercase tracking-wider mt-0.5">
                        Gini Coefficient
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-[family-name:var(--font-display)] text-lg font-bold text-gold">
                        {diversity.top10_concentration.toFixed(0)}%
                      </div>
                      <div className="text-text-muted text-[0.6rem] uppercase tracking-wider mt-0.5">
                        Top 10 Share
                      </div>
                    </div>
                  </div>

                  <p className="text-text-muted text-[0.65rem] leading-relaxed">
                    {diversity.normalized_entropy > 0.7
                      ? "You have eclectic taste — your listening is spread across many artists."
                      : diversity.normalized_entropy > 0.4
                      ? "You balance favorites with exploration — a healthy mix of familiar and new."
                      : "You know what you like — your listening is focused on a core set of artists."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </SectionReveal>
  );
}
