"use client";

import { formatNumber, formatHours } from "@/lib/utils";
import type { TrackStat } from "@/types/dashboard";

interface TopTracksTableProps {
  tracks: TrackStat[];
}

export function TopTracksTable({ tracks }: TopTracksTableProps) {
  if (!tracks.length) return null;

  return (
    <section id="tracks" className="py-24">
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
          <tbody>
            {tracks.map((t, i) => (
              <tr
                key={`${t.track_name}-${i}`}
                className={`transition-all hover:bg-green/5 ${
                  i === 0
                    ? "bg-gradient-to-r from-gold/[0.08] to-gold/[0.02] rounded-[var(--radius-sm)]"
                    : i % 2 === 0
                    ? "bg-white/[0.015]"
                    : ""
                }`}
              >
                <td
                  className={`font-[family-name:var(--font-display)] text-xl font-extrabold w-12 text-center py-3.5 px-4 ${
                    i === 0 ? "text-gold text-2xl [text-shadow:0_0_20px_rgba(245,166,35,0.3)]" : "text-text-muted"
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
