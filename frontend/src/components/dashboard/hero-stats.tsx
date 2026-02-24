"use client";

import { formatNumber } from "@/lib/utils";

interface HeroStatsProps {
  totalHours: number;
  totalStreams: number;
  uniqueArtists: number;
  uniqueTracks: number;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
}

export function HeroStats({
  totalHours,
  totalStreams,
  uniqueArtists,
  uniqueTracks,
  dateRangeStart,
  dateRangeEnd,
}: HeroStatsProps) {
  const startYear = dateRangeStart ? new Date(dateRangeStart).getFullYear() : "?";
  const endYear = dateRangeEnd ? new Date(dateRangeEnd).getFullYear() : "?";
  const years = dateRangeStart && dateRangeEnd
    ? new Date(dateRangeEnd).getFullYear() - new Date(dateRangeStart).getFullYear() + 1
    : 0;

  const stats = [
    { value: Math.round(totalHours), label: "hours", sub: `${Math.round(totalHours / 24)} days of music` },
    { value: totalStreams, label: "streams", sub: `since ${startYear}` },
    { value: uniqueArtists, label: "artists", sub: "explored" },
    { value: uniqueTracks, label: "tracks", sub: "played" },
    { value: years, label: "years", sub: `${startYear} — ${endYear}` },
  ];

  return (
    <section id="hero" className="min-h-screen flex flex-col items-center justify-center text-center relative px-6 overflow-hidden">
      {/* Radial glow */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle,rgba(29,185,84,0.08)_0%,transparent_70%)] pointer-events-none" />

      <span className="font-[family-name:var(--font-display)] text-xs font-semibold tracking-[0.2em] uppercase text-green border border-green/30 px-5 py-2 rounded-full mb-10 animate-[fadeUp_0.8s_ease_forwards_0.2s] opacity-0">
        Spotify Extended Streaming History
      </span>

      <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.5rem,6vw,5rem)] font-extrabold leading-[1.05] mb-3 animate-[fadeUp_0.8s_ease_forwards_0.4s] opacity-0 bg-gradient-to-br from-text-primary to-text-secondary bg-clip-text text-transparent">
        Your Sonic Universe
      </h1>

      <p className="text-lg text-text-secondary font-light mb-14 animate-[fadeUp_0.8s_ease_forwards_0.6s] opacity-0">
        {years} years of music, decoded and visualized
      </p>

      <div className="grid grid-cols-5 gap-8 w-full max-w-[960px] animate-[fadeUp_0.8s_ease_forwards_0.8s] opacity-0 max-lg:grid-cols-3 max-md:grid-cols-2">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="font-[family-name:var(--font-display)] text-[clamp(2.2rem,4.5vw,3.8rem)] font-extrabold text-green leading-none mb-1 [text-shadow:0_0_40px_rgba(29,185,84,0.2)]">
              {formatNumber(s.value)}
            </div>
            <div className="text-xs text-text-muted font-medium tracking-wider uppercase">
              {s.label}
            </div>
            <div className="text-[0.7rem] text-text-muted mt-0.5 font-light">
              {s.sub}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
