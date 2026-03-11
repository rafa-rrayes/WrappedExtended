"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReplayStore } from "@/lib/stores/replay";
import type { DashboardData, CalendarHeatmapEntry, ArtistDiscovery } from "@/types/dashboard";

interface ReplayOverlayProps {
  data: DashboardData;
}

interface Milestone {
  position: number;
  text: string;
  type: "discovery" | "streak" | "stat";
}

export function ReplayOverlay({ data }: ReplayOverlayProps) {
  const { active, playing, speed, position, setActive, setPlaying, setSpeed, setPosition, reset } = useReplayStore();
  const animRef = useRef<number>(0);
  const [currentTrack, setCurrentTrack] = useState("");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null);

  // Build timeline data
  const calendarData = data.calendar_heatmap ?? [];
  const totalDays = calendarData.length;

  useEffect(() => {
    // Build milestones from artist discovery timeline
    const ms: Milestone[] = [];
    const discoveries = data.artist_discovery_timeline ?? [];
    for (const d of discoveries.slice(0, 20)) {
      const dayIndex = calendarData.findIndex((c) => c.date >= d.first_listen);
      if (dayIndex >= 0) {
        ms.push({ position: dayIndex / totalDays, text: `Discovered ${d.artist_name}`, type: "discovery" });
      }
    }
    setMilestones(ms.sort((a, b) => a.position - b.position));
  }, [data, calendarData, totalDays]);

  // Animation loop
  useEffect(() => {
    if (!playing || !active) return;
    const step = () => {
      setPosition(position + 0.0005 * speed);
      if (position >= 1) {
        setPlaying(false);
        return;
      }
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [playing, active, position, speed, setPosition, setPlaying]);

  // Check milestones
  useEffect(() => {
    const ms = milestones.find((m) => Math.abs(m.position - position) < 0.005);
    if (ms) setActiveMilestone(ms);
    else setActiveMilestone(null);
  }, [position, milestones]);

  // Current day info
  const dayIndex = Math.min(Math.floor(position * totalDays), totalDays - 1);
  const currentDay = calendarData[dayIndex];

  if (!active) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[3000] bg-black/95 flex flex-col items-center justify-center"
    >
      {/* Close button */}
      <button
        onClick={() => { setActive(false); reset(); }}
        className="absolute top-6 right-6 text-white/50 hover:text-white"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>

      {/* Current day display */}
      <div className="text-center mb-8">
        <div className="text-6xl font-bold font-[family-name:var(--font-display)] text-green mb-2">
          {currentDay?.date ?? ""}
        </div>
        <div className="text-white/50 text-lg">
          {currentDay ? `${currentDay.hours.toFixed(1)} hours` : ""}
        </div>
      </div>

      {/* Milestone ticker */}
      <AnimatePresence>
        {activeMilestone && (
          <motion.div
            key={activeMilestone.text}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-xl text-gold font-[family-name:var(--font-display)] mb-8"
          >
            {activeMilestone.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      <div className="w-full max-w-2xl px-8">
        <div className="relative h-1 bg-white/10 rounded-full cursor-pointer" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setPosition((e.clientX - rect.left) / rect.width);
        }}>
          <div className="absolute top-0 left-0 h-full bg-green rounded-full" style={{ width: `${position * 100}%` }} />
          {milestones.map((m, i) => (
            <div key={i} className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-gold rounded-full" style={{ left: `${m.position * 100}%` }} />
          ))}
        </div>

        {/* Transport controls */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button onClick={() => setPosition(0)} className="text-white/50 hover:text-white text-sm">Reset</button>
          <button
            onClick={() => setPlaying(!playing)}
            className="w-12 h-12 rounded-full bg-green flex items-center justify-center hover:bg-green/80"
          >
            {playing ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="black"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="black"><polygon points="5 3 19 12 5 21"/></svg>
            )}
          </button>
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="bg-transparent border border-white/20 rounded px-2 py-1 text-white text-sm"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={5}>5x</option>
            <option value={10}>10x</option>
          </select>
        </div>
      </div>
    </motion.div>
  );
}
