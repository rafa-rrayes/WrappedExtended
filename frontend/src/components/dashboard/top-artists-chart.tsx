"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ArtistStat } from "@/types/dashboard";

interface TopArtistsChartProps {
  artists: ArtistStat[];
}

function getBarColor(index: number, total: number): string {
  const ratio = index / (total - 1 || 1);
  const r = Math.round(29 + (245 - 29) * ratio);
  const g = Math.round(185 + (166 - 185) * ratio);
  const b = Math.round(84 + (35 - 84) * ratio);
  return `rgb(${r},${g},${b})`;
}

export function TopArtistsChart({ artists }: TopArtistsChartProps) {
  if (!artists.length) return null;

  return (
    <section id="artists" className="py-24">
      <div className="mb-12">
        <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-green mb-2.5 block">
          01 — Top Artists
        </span>
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-[1.15]">
          The Artists That <span className="text-gold">Defined</span> Your Sound
        </h2>
      </div>

      <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
        <ResponsiveContainer width="100%" height={artists.length * 40 + 40}>
          <BarChart data={artists} layout="vertical" margin={{ left: 100 }}>
            <XAxis type="number" tickFormatter={(v) => `${v}h`} />
            <YAxis
              type="category"
              dataKey="artist_name"
              width={100}
              tick={{ fontSize: 11, fontWeight: 600, fill: "#bbb" }}
            />
            <Tooltip
              formatter={(value: number) => [`${value} hours`, "Listening Time"]}
              contentStyle={{
                background: "rgba(10,10,10,0.92)",
                border: "1px solid rgba(29,185,84,0.3)",
                borderRadius: 8,
              }}
            />
            <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
              {artists.map((_, i) => (
                <Cell key={i} fill={getBarColor(i, artists.length)} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
