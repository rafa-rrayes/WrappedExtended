"use client";

import { motion } from "framer-motion";
import { useAnimatedCounter } from "@/lib/hooks/use-animated-counter";
import { staggerContainer, staggerItem } from "@/lib/animations";

interface HeroStatsProps {
  totalHours: number;
  totalStreams: number;
  uniqueArtists: number;
  uniqueTracks: number;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
}

/* ── Animated stat sub-component ─────────────────────────────────────────── */

function AnimatedStat({
  value,
  label,
  sub,
  className,
}: {
  value: number;
  label: string;
  sub: string;
  className?: string;
}) {
  const { ref, display } = useAnimatedCounter(value);

  return (
    <div className={className}>
      <span ref={ref}>
        <motion.span>{display}</motion.span>
      </span>
      <div className="text-xs text-text-muted font-medium tracking-wider uppercase mt-1">
        {label}
      </div>
      <div className="text-[0.7rem] text-text-muted mt-0.5 font-light">
        {sub}
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */

export function HeroStats({
  totalHours,
  totalStreams,
  uniqueArtists,
  uniqueTracks,
  dateRangeStart,
  dateRangeEnd,
}: HeroStatsProps) {
  const startYear = dateRangeStart
    ? new Date(dateRangeStart).getFullYear()
    : "?";
  const endYear = dateRangeEnd ? new Date(dateRangeEnd).getFullYear() : "?";
  const years =
    dateRangeStart && dateRangeEnd
      ? new Date(dateRangeEnd).getFullYear() -
        new Date(dateRangeStart).getFullYear() +
        1
      : 0;

  const heroStats = [
    {
      value: Math.round(totalHours),
      label: "hours",
      sub: `${Math.round(totalHours / 24)} days of music`,
      glow: "rgba(29,185,84,0.12)", // green
    },
    {
      value: totalStreams,
      label: "streams",
      sub: `since ${startYear}`,
      glow: "rgba(245,166,35,0.12)", // gold
    },
  ];

  const smallStats = [
    { value: uniqueArtists, label: "artists", sub: "explored" },
    { value: uniqueTracks, label: "tracks", sub: "played" },
    { value: years, label: "years", sub: `${startYear} — ${endYear}` },
  ];

  return (
    <motion.section
      id="hero"
      className="min-h-screen flex flex-col items-center justify-center text-center relative px-6 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Radial glow */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle,rgba(29,185,84,0.08)_0%,transparent_70%)] pointer-events-none" />

      <motion.span
        className="font-[family-name:var(--font-display)] text-xs font-semibold tracking-[0.2em] uppercase text-green border border-green/30 px-5 py-2 rounded-full mb-10"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
      >
        Spotify Extended Streaming History
      </motion.span>

      <motion.h1
        className="font-[family-name:var(--font-display)] text-[clamp(2.5rem,6vw,5rem)] font-extrabold leading-[1.05] mb-3 bg-gradient-to-br from-text-primary to-text-secondary bg-clip-text text-transparent"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
      >
        Your Musical Universe
      </motion.h1>

      <motion.p
        className="text-lg text-text-secondary font-light mb-14"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.6 }}
      >
        {years} years of music, decoded and visualized
      </motion.p>

      {/* ── Top tier: 2 hero number cards ──────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-[640px] mb-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {heroStats.map((s) => (
          <motion.div
            key={s.label}
            className="relative bg-bg-card border border-border rounded-[var(--radius-card)] p-6 text-center overflow-hidden"
            variants={staggerItem}
          >
            {/* Inner accent glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 50% 40%, ${s.glow} 0%, transparent 70%)`,
              }}
            />
            <AnimatedStat
              value={s.value}
              label={s.label}
              sub={s.sub}
              className="relative z-10 text-center [&>span]:font-[family-name:var(--font-display)] [&>span]:text-[clamp(2.2rem,4.5vw,3.8rem)] [&>span]:font-extrabold [&>span]:text-green [&>span]:leading-none [&>span]:mb-1 [&>span]:[text-shadow:0_0_40px_rgba(29,185,84,0.2)]"
            />
          </motion.div>
        ))}
      </motion.div>

      {/* ── Bottom tier: 3 compact pill cards ──────────────────────────────── */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-[640px]"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {smallStats.map((s) => (
          <motion.div
            key={s.label}
            className="bg-bg-card/60 border border-border rounded-full px-5 py-3 text-center"
            variants={staggerItem}
          >
            <AnimatedStat
              value={s.value}
              label={s.label}
              sub={s.sub}
              className="[&>span]:font-[family-name:var(--font-display)] [&>span]:text-xl [&>span]:font-bold [&>span]:text-text-primary [&>span]:leading-none"
            />
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}
