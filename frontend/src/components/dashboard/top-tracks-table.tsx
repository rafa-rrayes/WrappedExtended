"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { formatNumber, formatHours } from "@/lib/utils";
import { SectionReveal } from "@/components/dashboard/section-reveal";
import { staggerContainer, staggerItem } from "@/lib/animations";
import type { TrackStat } from "@/types/dashboard";

interface TopTracksTableProps {
  tracks: TrackStat[];
}

const INITIAL_COUNT = 10;

const trackStagger: typeof staggerContainer = {
  ...staggerContainer,
  visible: {
    transition: {
      staggerChildren: 0.04,
    },
  },
};

export function TopTracksTable({ tracks }: TopTracksTableProps) {
  const [expanded, setExpanded] = useState(false);

  if (!tracks.length) return null;

  const visibleTracks = expanded ? tracks : tracks.slice(0, INITIAL_COUNT);
  const hasMore = tracks.length > INITIAL_COUNT;

  return (
    <SectionReveal id="tracks">
      <div className="mb-12">
        <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-green mb-2.5 block">
          02 — Most Played Tracks
        </span>
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-[1.15]">
          Your All-Time <span className="text-gold">Greatest Hits</span>
        </h2>
      </div>

      <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-4 overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-1">
          <motion.tbody
            variants={trackStagger}
            initial="hidden"
            animate="visible"
          >
            {visibleTracks.map((t, i) => (
              <motion.tr
                key={`${t.track_name}-${t.artist_name}-${i}`}
                variants={staggerItem}
                className={`transition-all group hover:translate-x-[3px] hover:border-l-2 hover:border-green ${
                  i === 0
                    ? "bg-gradient-to-r from-gold/[0.08] to-gold/[0.02] rounded-[var(--radius-sm)]"
                    : i === 1
                    ? "border-l-2 border-l-[#C0C0C0]/40"
                    : i === 2
                    ? "border-l-2 border-l-[#CD7F32]/40"
                    : i % 2 === 0
                    ? "bg-white/[0.015]"
                    : ""
                }`}
              >
                <td
                  className={`font-[family-name:var(--font-display)] text-xl font-extrabold w-12 text-center py-3.5 px-4 ${
                    i === 0
                      ? "text-gold text-2xl [text-shadow:0_0_20px_rgba(245,166,35,0.3)]"
                      : i === 1
                      ? "text-[#C0C0C0]"
                      : i === 2
                      ? "text-[#CD7F32]"
                      : "text-text-muted"
                  }`}
                >
                  {i + 1}
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-text-primary">{t.track_name}</div>
                  <div className="text-text-secondary text-xs mt-0.5">{t.artist_name}</div>
                </td>
                <td className="font-[family-name:var(--font-display)] font-bold text-green text-right whitespace-nowrap py-3.5 px-4">
                  {formatNumber(t.plays)} plays
                </td>
                <td className="text-text-muted text-right text-sm whitespace-nowrap py-3.5 px-4">
                  {formatHours(t.hours)}
                </td>
              </motion.tr>
            ))}
          </motion.tbody>
        </table>

        {hasMore && !expanded && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => setExpanded(true)}
              className="px-5 py-2 rounded-full text-sm font-semibold font-[family-name:var(--font-display)] bg-white/5 text-text-muted border border-transparent hover:bg-green/10 hover:text-green hover:border-green/30 transition-all"
            >
              Show {Math.min(tracks.length - INITIAL_COUNT, 10)} more
            </button>
          </div>
        )}
      </div>
    </SectionReveal>
  );
}
