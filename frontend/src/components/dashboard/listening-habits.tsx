"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type {
  CompletionDistribution,
  ListeningStreaks,
} from "@/types/dashboard";
import { formatNumber } from "@/lib/utils";

interface ListeningHabitsProps {
  shufflePct?: number;
  skipPct?: number;
  offlinePct?: number;
  incognitoPct?: number;
  completion?: CompletionDistribution;
  streaks?: ListeningStreaks;
}

function PercentRing({ value, label, color }: { value: number; label: string; color: string }) {
  const circumference = 2 * Math.PI * 36;
  const strokeDash = (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={`${strokeDash} ${circumference}`}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
          {value.toFixed(0)}%
        </span>
      </div>
      <span className="text-text-muted text-[0.65rem] mt-2 font-medium tracking-wide uppercase">
        {label}
      </span>
    </div>
  );
}

export function ListeningHabits({
  shufflePct,
  skipPct,
  offlinePct,
  incognitoPct,
  completion,
  streaks,
}: ListeningHabitsProps) {
  const hasRings = shufflePct != null || skipPct != null || offlinePct != null || incognitoPct != null;
  const hasCompletion = completion && completion.total > 0;
  const hasStreaks = streaks != null;

  if (!hasRings && !hasCompletion && !hasStreaks) return null;

  const completionData = hasCompletion
    ? [
        { name: "Completed", value: completion!.completed },
        { name: "Skipped", value: completion!.skipped },
      ]
    : [];

  return (
    <section id="habits" className="py-24 opacity-0 animate-[fadeUp_0.8s_ease_forwards]">
      <div className="mb-12">
        <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-green mb-2.5 block">
          11 — Listening Habits
        </span>
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-[1.15]">
          How You <span className="text-gold">Listen</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Percent rings */}
        {hasRings && (
          <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
            <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-secondary mb-6 tracking-wide uppercase">
              Playback Stats
            </h3>
            <div className="flex flex-wrap justify-center gap-6">
              {shufflePct != null && <PercentRing value={shufflePct} label="Shuffle" color="#1DB954" />}
              {skipPct != null && <PercentRing value={skipPct} label="Skipped" color="#E91E63" />}
              {offlinePct != null && <PercentRing value={offlinePct} label="Offline" color="#F5A623" />}
              {incognitoPct != null && <PercentRing value={incognitoPct} label="Incognito" color="#9C27B0" />}
            </div>
          </div>
        )}

        {/* Completion donut */}
        {hasCompletion && (
          <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
            <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-secondary mb-4 tracking-wide uppercase">
              Track Completion
            </h3>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={completionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    <Cell fill="#1DB954" />
                    <Cell fill="#E91E63" fillOpacity={0.6} />
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "rgba(10,10,10,0.92)",
                      border: "1px solid rgba(29,185,84,0.3)",
                      borderRadius: 8,
                    }}
                    formatter={(value: number) => [formatNumber(value), ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green" />
                  <span className="text-text-secondary text-sm">
                    Completed ({((completion!.completed / completion!.total) * 100).toFixed(0)}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#E91E63] opacity-60" />
                  <span className="text-text-secondary text-sm">
                    Skipped ({((completion!.skipped / completion!.total) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Listening streaks */}
        {hasStreaks && (
          <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6 lg:col-span-2">
            <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-secondary mb-6 tracking-wide uppercase">
              Listening Streaks
            </h3>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-green [text-shadow:0_0_30px_rgba(29,185,84,0.15)]">
                  {streaks!.current_streak}
                </div>
                <div className="text-text-muted text-xs mt-1 uppercase tracking-wider">
                  Current Streak (days)
                </div>
              </div>
              <div>
                <div className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-gold [text-shadow:0_0_30px_rgba(245,166,35,0.15)]">
                  {streaks!.longest_streak}
                </div>
                <div className="text-text-muted text-xs mt-1 uppercase tracking-wider">
                  Longest Streak (days)
                </div>
              </div>
              <div>
                <div className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-text-secondary">
                  {streaks!.avg_streak.toFixed(1)}
                </div>
                <div className="text-text-muted text-xs mt-1 uppercase tracking-wider">
                  Average Streak (days)
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
