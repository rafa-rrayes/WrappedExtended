"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface MoodEntry {
  month: string;
  mood_score: number;
  energy: number;
  engagement: number;
  immersion: number;
  exploration: number;
  total_hours: number;
}

interface MoodTimelineProps {
  data: MoodEntry[];
}

export function MoodTimeline({ data }: MoodTimelineProps) {
  if (!data?.length) return null;

  return (
    <section id="mood" className="py-10">
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-text-primary mb-1">
        Mood Timeline
      </h2>
      <p className="text-text-muted text-sm mb-8">
        Estimated mood based on listening behavior patterns
      </p>

      <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="month"
              tick={{ fill: "var(--color-text-muted)", fontSize: 10 }}
              tickFormatter={(v) => v.slice(2)}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "var(--color-text-muted)", fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--color-text-primary)" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: "var(--color-text-muted)" }}
            />
            <Area
              type="monotone"
              dataKey="mood_score"
              stroke="#1DB954"
              fill="#1DB954"
              fillOpacity={0.15}
              strokeWidth={2}
              name="Overall Mood"
            />
            <Area
              type="monotone"
              dataKey="energy"
              stroke="#F5A623"
              fill="none"
              strokeWidth={1}
              strokeDasharray="4 4"
              name="Energy"
            />
            <Area
              type="monotone"
              dataKey="engagement"
              stroke="#7B68EE"
              fill="none"
              strokeWidth={1}
              strokeDasharray="4 4"
              name="Engagement"
            />
          </AreaChart>
        </ResponsiveContainer>

        <p className="text-[0.65rem] text-text-muted mt-4 opacity-60">
          Mood estimates are derived from listening time-of-day, skip rates, session length, and artist diversity.
          They do not reflect actual emotional states.
        </p>
      </div>
    </section>
  );
}
