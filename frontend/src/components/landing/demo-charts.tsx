"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Cell,
} from "recharts";

/* ── Demo data ─────────────────────────────────────────── */

const TOP_ARTISTS = [
  { name: "Tyler, The Creator", hours: 312 },
  { name: "Frank Ocean", hours: 287 },
  { name: "Radiohead", hours: 245 },
  { name: "Tame Impala", hours: 198 },
  { name: "SZA", hours: 176 },
  { name: "Kendrick Lamar", hours: 164 },
  { name: "The Weeknd", hours: 152 },
  { name: "Mac Miller", hours: 141 },
];

const MONTHLY_LISTENING = [
  { month: "Jan", hours: 62 },
  { month: "Feb", hours: 48 },
  { month: "Mar", hours: 71 },
  { month: "Apr", hours: 85 },
  { month: "May", hours: 93 },
  { month: "Jun", hours: 78 },
  { month: "Jul", hours: 110 },
  { month: "Aug", hours: 105 },
  { month: "Sep", hours: 88 },
  { month: "Oct", hours: 96 },
  { month: "Nov", hours: 115 },
  { month: "Dec", hours: 124 },
];

const LISTENING_HABITS = [
  { habit: "Morning", value: 45, fullMark: 100 },
  { habit: "Afternoon", value: 72, fullMark: 100 },
  { habit: "Evening", value: 88, fullMark: 100 },
  { habit: "Night", value: 65, fullMark: 100 },
  { habit: "Weekend", value: 82, fullMark: 100 },
  { habit: "Weekday", value: 58, fullMark: 100 },
];

const HEATMAP_DATA = (() => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const data: { day: string; hour: number; value: number }[] = [];
  days.forEach((day) => {
    for (let h = 0; h < 24; h++) {
      let base = 0;
      // Simulate realistic listening patterns
      if (h >= 8 && h <= 10) base = 30 + Math.random() * 25; // morning commute
      else if (h >= 12 && h <= 13) base = 20 + Math.random() * 20; // lunch
      else if (h >= 17 && h <= 22) base = 50 + Math.random() * 45; // evening peak
      else if (h >= 23 || h <= 2) base = 15 + Math.random() * 30; // late night
      else if (h >= 3 && h <= 7) base = Math.random() * 8; // sleeping
      else base = 10 + Math.random() * 15;
      // Weekends get a boost
      if (day === "Sat" || day === "Sun") base *= 1.3;
      data.push({ day, hour: h, value: Math.round(base) });
    }
  });
  return data;
})();

/* ── Color helpers ─────────────────────────────────────── */

function barColor(index: number, total: number) {
  const r = Math.round(29 + (245 - 29) * (index / (total - 1)));
  const g = Math.round(185 + (166 - 185) * (index / (total - 1)));
  const b = Math.round(84 + (35 - 84) * (index / (total - 1)));
  return `rgb(${r},${g},${b})`;
}

function heatColor(value: number) {
  if (value < 10) return "rgba(29,185,84,0.08)";
  if (value < 25) return "rgba(29,185,84,0.2)";
  if (value < 45) return "rgba(29,185,84,0.4)";
  if (value < 65) return "rgba(29,185,84,0.6)";
  if (value < 80) return "rgba(245,166,35,0.6)";
  return "rgba(245,166,35,0.85)";
}

/* ── Custom tooltip ────────────────────────────────────── */

function ChartTooltip({
  active,
  payload,
  label,
  suffix = "",
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(10,10,10,0.92)",
        border: "1px solid rgba(29,185,84,0.3)",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
      }}
    >
      <p style={{ color: "#999", marginBottom: 2 }}>{label}</p>
      <p style={{ color: "#ececec", fontWeight: 700 }}>
        {payload[0].value}
        {suffix}
      </p>
    </div>
  );
}

/* ── Animated counter ──────────────────────────────────── */

function AnimatedNumber({
  target,
  duration = 1800,
  inView,
}: {
  target: number;
  duration?: number;
  inView: boolean;
}) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [inView, target, duration]);

  return <>{value.toLocaleString()}</>;
}

/* ── Heatmap widget ────────────────────────────────────── */

function HeatmapWidget() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[420px]">
        <div className="flex gap-[2px] mb-1 ml-9">
          {Array.from({ length: 24 }, (_, h) => (
            <span
              key={h}
              className="text-[8px] text-text-muted w-[16px] text-center"
            >
              {h % 4 === 0 ? `${h}` : ""}
            </span>
          ))}
        </div>
        {days.map((day) => (
          <div key={day} className="flex items-center gap-[2px] mb-[2px]">
            <span className="text-[9px] text-text-muted w-8 text-right pr-1">
              {day}
            </span>
            {HEATMAP_DATA.filter((d) => d.day === day).map((cell) => (
              <div
                key={cell.hour}
                className="w-[16px] h-[16px] rounded-[2px] transition-colors"
                style={{ background: heatColor(cell.value) }}
                title={`${day} ${cell.hour}:00 — ${cell.value} min`}
              />
            ))}
          </div>
        ))}
        <div className="flex items-center gap-1 mt-2 ml-9">
          <span className="text-[8px] text-text-muted">Less</span>
          {[0.08, 0.2, 0.4, 0.6].map((op) => (
            <div
              key={op}
              className="w-[12px] h-[12px] rounded-[2px]"
              style={{ background: `rgba(29,185,84,${op})` }}
            />
          ))}
          {[0.6, 0.85].map((op) => (
            <div
              key={op}
              className="w-[12px] h-[12px] rounded-[2px]"
              style={{ background: `rgba(245,166,35,${op})` }}
            />
          ))}
          <span className="text-[8px] text-text-muted">More</span>
        </div>
      </div>
    </div>
  );
}

/* ── Mini genre/platform widget ────────────────────────── */

const PLATFORM_DATA = [
  { name: "Mobile", pct: 58, color: "#1DB954" },
  { name: "Desktop", pct: 31, color: "#F5A623" },
  { name: "Web", pct: 8, color: "#999" },
  { name: "Other", pct: 3, color: "#555" },
];

function PlatformWidget() {
  return (
    <div className="space-y-2.5">
      {PLATFORM_DATA.map((p) => (
        <div key={p.name}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-text-secondary">{p.name}</span>
            <span className="text-text-muted">{p.pct}%</span>
          </div>
          <div className="h-1.5 bg-bg-deep rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${p.pct}%`,
                background: p.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Top tracks mini table ─────────────────────────────── */

const TOP_TRACKS = [
  { rank: 1, title: "Nikes", artist: "Frank Ocean", plays: 847 },
  { rank: 2, title: "New Person, Same Old Mistakes", artist: "Tame Impala", plays: 723 },
  { rank: 3, title: "EARFQUAKE", artist: "Tyler, The Creator", plays: 691 },
  { rank: 4, title: "Kill Bill", artist: "SZA", plays: 654 },
  { rank: 5, title: "Everything In Its Right Place", artist: "Radiohead", plays: 612 },
];

function TopTracksWidget() {
  return (
    <div className="space-y-2">
      {TOP_TRACKS.map((track) => (
        <div
          key={track.rank}
          className="flex items-center gap-3 py-1.5 border-b border-border/50 last:border-0"
        >
          <span
            className="font-[family-name:var(--font-display)] text-xs font-bold w-5 text-center"
            style={{
              color: track.rank <= 3 ? "#F5A623" : "#555",
            }}
          >
            {track.rank}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {track.title}
            </p>
            <p className="text-[10px] text-text-muted truncate">
              {track.artist}
            </p>
          </div>
          <span className="text-xs text-text-muted tabular-nums">
            {track.plays.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Main export ───────────────────────────────────────── */

export default function DemoCharts({ inView }: { inView: boolean }) {
  const [animate, setAnimate] = useState(false);
  const hasTriggered = useRef(false);

  const triggerAnimation = useCallback(() => {
    if (hasTriggered.current) return;
    hasTriggered.current = true;
    setAnimate(true);
  }, []);

  useEffect(() => {
    if (inView) triggerAnimation();
  }, [inView, triggerAnimation]);

  return (
    <div className="space-y-6">
      {/* Hero stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Hours Listened", value: 2847, color: "#1DB954" },
          { label: "Total Streams", value: 48291, color: "#1DB954" },
          { label: "Unique Artists", value: 1432, color: "#F5A623" },
          { label: "Unique Tracks", value: 8761, color: "#F5A623" },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <p
              className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-extrabold"
              style={{
                color: stat.color,
                textShadow: `0 0 30px ${stat.color}33`,
              }}
            >
              <AnimatedNumber target={stat.value} inView={animate} />
            </p>
            <p className="text-[10px] text-text-muted uppercase tracking-wider mt-1">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Charts row 1: Bar + Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Artists Bar Chart */}
        <div className="bg-bg-deep/60 border border-border rounded-[var(--radius-sm)] p-5">
          <p className="text-[10px] uppercase tracking-[0.15em] text-green mb-0.5">
            01 — Top Artists
          </p>
          <h3 className="font-[family-name:var(--font-display)] font-bold text-lg mb-4">
            Most Played <span className="text-gold">Artists</span>
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={TOP_ARTISTS}
              layout="vertical"
              margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 11, fill: "#999" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<ChartTooltip suffix="h" />}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              <Bar
                dataKey="hours"
                radius={[0, 4, 4, 0]}
                isAnimationActive={animate}
                animationDuration={1200}
                animationEasing="ease-out"
              >
                {TOP_ARTISTS.map((_, i) => (
                  <Cell
                    key={i}
                    fill={barColor(i, TOP_ARTISTS.length)}
                    opacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Listening Area Chart */}
        <div className="bg-bg-deep/60 border border-border rounded-[var(--radius-sm)] p-5">
          <p className="text-[10px] uppercase tracking-[0.15em] text-green mb-0.5">
            02 — Timeline
          </p>
          <h3 className="font-[family-name:var(--font-display)] font-bold text-lg mb-4">
            Monthly <span className="text-gold">Listening</span>
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart
              data={MONTHLY_LISTENING}
              margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="demoGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1DB954" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#1DB954" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#555" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#555" }}
                axisLine={false}
                tickLine={false}
                width={35}
                tickFormatter={(v) => `${v}h`}
              />
              <Tooltip
                content={<ChartTooltip suffix=" hours" />}
                cursor={{ stroke: "rgba(29,185,84,0.2)" }}
              />
              <Area
                type="monotone"
                dataKey="hours"
                stroke="#1DB954"
                strokeWidth={2}
                fill="url(#demoGreen)"
                isAnimationActive={animate}
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2: Heatmap + Radar + Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Heatmap */}
        <div className="bg-bg-deep/60 border border-border rounded-[var(--radius-sm)] p-5">
          <p className="text-[10px] uppercase tracking-[0.15em] text-green mb-0.5">
            03 — Patterns
          </p>
          <h3 className="font-[family-name:var(--font-display)] font-bold text-lg mb-4">
            Listening <span className="text-gold">Heatmap</span>
          </h3>
          <HeatmapWidget />
        </div>

        {/* Radar */}
        <div className="bg-bg-deep/60 border border-border rounded-[var(--radius-sm)] p-5">
          <p className="text-[10px] uppercase tracking-[0.15em] text-green mb-0.5">
            04 — Habits
          </p>
          <h3 className="font-[family-name:var(--font-display)] font-bold text-lg mb-4">
            Listening <span className="text-gold">Profile</span>
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={LISTENING_HABITS} cx="50%" cy="50%">
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis
                dataKey="habit"
                tick={{ fontSize: 10, fill: "#999" }}
              />
              <PolarRadiusAxis
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />
              <Radar
                dataKey="value"
                stroke="#1DB954"
                fill="#1DB954"
                fillOpacity={0.15}
                strokeWidth={2}
                isAnimationActive={animate}
                animationDuration={1200}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Compact widgets column */}
        <div className="space-y-4">
          {/* Platform breakdown */}
          <div className="bg-bg-deep/60 border border-border rounded-[var(--radius-sm)] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-green mb-0.5">
              05 — Devices
            </p>
            <h3 className="font-[family-name:var(--font-display)] font-bold text-sm mb-3">
              Platform <span className="text-gold">Split</span>
            </h3>
            <PlatformWidget />
          </div>

          {/* Top tracks mini */}
          <div className="bg-bg-deep/60 border border-border rounded-[var(--radius-sm)] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-green mb-0.5">
              06 — Top Tracks
            </p>
            <h3 className="font-[family-name:var(--font-display)] font-bold text-sm mb-3">
              Most Played <span className="text-gold">Songs</span>
            </h3>
            <TopTracksWidget />
          </div>
        </div>
      </div>
    </div>
  );
}
