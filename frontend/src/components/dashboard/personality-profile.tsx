"use client";

import { useMemo } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { calculatePersonality } from "@/lib/utils/personality-calculator";
import type { DashboardData } from "@/types/dashboard";

interface PersonalityProfileProps {
  data: DashboardData;
}

const TIER_COLORS: Record<string, string> = {
  "The Archaeologist": "#1DB954",
  "The Devotee": "#F5A623",
  "The Moonlit Listener": "#7B68EE",
  "The Marathon Runner": "#FF6B6B",
  "The Perfectionist": "#4ECDC4",
  "The Architect": "#45B7D1",
};

export function PersonalityProfile({ data }: PersonalityProfileProps) {
  const profile = useMemo(() => calculatePersonality(data), [data]);

  const radarData = profile.traits.map((t) => ({
    trait: t.name,
    score: t.score,
    fullMark: 100,
  }));

  const color = TIER_COLORS[profile.dominantType] ?? "#1DB954";

  return (
    <section id="personality" className="py-10">
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-text-primary mb-1">
        Your Listening Personality
      </h2>
      <p className="text-text-muted text-sm mb-8">
        Based on your listening patterns and habits
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis
                dataKey="trait"
                tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />
              <Radar
                dataKey="score"
                stroke={color}
                fill={color}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Type Card */}
        <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6 flex flex-col justify-center">
          <div
            className="text-5xl font-bold mb-3 font-[family-name:var(--font-display)]"
            style={{ color }}
          >
            {profile.dominantType}
          </div>
          <p className="text-text-secondary text-lg mb-6">
            {profile.typeDescription}
          </p>

          <div className="space-y-3">
            {profile.traits.map((trait) => (
              <div key={trait.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-secondary">{trait.name}</span>
                  <span className="text-text-muted">{trait.score}</span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${trait.score}%`,
                      backgroundColor: color,
                      opacity: 0.4 + (trait.score / 100) * 0.6,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
