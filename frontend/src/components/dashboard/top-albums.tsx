"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { formatNumber, formatHours } from "@/lib/utils";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { SectionReveal } from "./section-reveal";
import type { AlbumStat } from "@/types/dashboard";

interface TopAlbumsProps {
  albums: AlbumStat[];
}

export function TopAlbums({ albums }: TopAlbumsProps) {
  const [showAll, setShowAll] = useState(false);

  if (!albums?.length) return null;

  const maxPlays = albums[0]?.plays ?? 1;
  const allAlbums = albums.slice(0, 15);
  const visibleAlbums = showAll ? allAlbums : allAlbums.slice(0, 6);

  return (
    <SectionReveal id="albums" className="py-24">
      {() => (
        <>
          <div className="mb-12">
            <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-green mb-2.5 block">
              03 — Top Albums
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-[1.15]">
              Albums on <span className="text-gold">Repeat</span>
            </h2>
          </div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {visibleAlbums.map((album, i) => {
              const barWidth = (album.plays / maxPlays) * 100;
              const isFirst = i === 0;

              return (
                <motion.div
                  key={`${album.album_name}-${i}`}
                  variants={staggerItem}
                  className={`bg-bg-card border border-border rounded-[var(--radius-card)] p-5 transition-all hover:translate-y-[-2px] hover:border-white/15 hover:shadow-lg relative overflow-hidden ${
                    isFirst
                      ? "lg:col-span-2 border-gold/20"
                      : "hover:bg-bg-card-hover"
                  }`}
                  style={
                    isFirst
                      ? {
                          background:
                            "radial-gradient(ellipse at 30% 20%, rgba(245,166,35,0.1) 0%, transparent 60%)",
                        }
                      : undefined
                  }
                >
                  {/* Rank */}
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className={`font-[family-name:var(--font-display)] text-2xl font-extrabold ${
                        isFirst
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
                    <div
                      className={`font-semibold text-text-primary leading-snug truncate ${
                        isFirst ? "text-base" : "text-sm"
                      }`}
                    >
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
                        background: isFirst
                          ? "linear-gradient(90deg, #F5A623, #1DB954)"
                          : "linear-gradient(90deg, #1DB954, rgba(29,185,84,0.3))",
                      }}
                    />
                  </div>
                  <div className="text-text-muted text-[0.65rem] mt-1.5">
                    {formatNumber(album.plays)} plays
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Show all / Show less toggle */}
          {allAlbums.length > 6 && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setShowAll((prev) => !prev)}
                className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide uppercase text-text-secondary hover:text-text-primary border border-border hover:border-white/15 rounded-full px-6 py-2 transition-colors"
              >
                {showAll ? "Show less" : "Show all"}
              </button>
            </div>
          )}
        </>
      )}
    </SectionReveal>
  );
}
