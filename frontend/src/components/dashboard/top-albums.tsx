"use client";

import { formatNumber, formatHours } from "@/lib/utils";
import type { AlbumStat } from "@/types/dashboard";

interface TopAlbumsProps {
  albums: AlbumStat[];
}

export function TopAlbums({ albums }: TopAlbumsProps) {
  if (!albums?.length) return null;

  const maxPlays = albums[0]?.plays ?? 1;

  return (
    <section id="albums" className="py-24 opacity-0 animate-[fadeUp_0.8s_ease_forwards]">
      <div className="mb-12">
        <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-green mb-2.5 block">
          03 — Top Albums
        </span>
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-[1.15]">
          Albums on <span className="text-gold">Repeat</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {albums.slice(0, 15).map((album, i) => {
          const barWidth = (album.plays / maxPlays) * 100;
          return (
            <div
              key={`${album.album_name}-${i}`}
              className={`bg-bg-card border border-border rounded-[var(--radius-card)] p-5 transition-all hover:bg-bg-card-hover hover:border-white/10 relative overflow-hidden ${
                i === 0 ? "md:col-span-2 lg:col-span-1 bg-gradient-to-br from-gold/[0.06] to-transparent border-gold/20" : ""
              }`}
            >
              {/* Rank */}
              <div className="flex items-start justify-between mb-3">
                <span
                  className={`font-[family-name:var(--font-display)] text-2xl font-extrabold ${
                    i === 0
                      ? "text-gold [text-shadow:0_0_20px_rgba(245,166,35,0.3)]"
                      : i < 3
                      ? "text-text-secondary"
                      : "text-text-muted"
                  }`}
                >
                  #{i + 1}
                </span>
                <span className="font-[family-name:var(--font-display)] text-sm font-bold text-green">
                  {formatHours(album.hours)}
                </span>
              </div>

              {/* Album info */}
              <div className="mb-4">
                <div className="font-semibold text-text-primary text-sm leading-snug truncate">
                  {album.album_name}
                </div>
                <div className="text-text-secondary text-xs mt-0.5 truncate">
                  {album.artist_name}
                </div>
              </div>

              {/* Play bar */}
              <div className="relative h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${barWidth}%`,
                    background: i === 0
                      ? "linear-gradient(90deg, #F5A623, #1DB954)"
                      : "linear-gradient(90deg, #1DB954, rgba(29,185,84,0.3))",
                  }}
                />
              </div>
              <div className="text-text-muted text-[0.65rem] mt-1.5">
                {formatNumber(album.plays)} plays
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
