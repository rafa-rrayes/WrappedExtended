"use client";

import type { WrappedYear } from "@/types/dashboard";
import { formatHours, formatNumber } from "@/lib/utils";

interface YourWrappedProps {
  data: Record<string, WrappedYear>;
}

export function YourWrapped({ data }: YourWrappedProps) {
  if (!data || Object.keys(data).length === 0) return null;

  const years = Object.entries(data).sort(([a], [b]) => Number(b) - Number(a));

  const CARD_GRADIENTS = [
    "from-green/20 to-green/5",
    "from-gold/20 to-gold/5",
    "from-[#E91E63]/20 to-[#E91E63]/5",
    "from-[#9C27B0]/20 to-[#9C27B0]/5",
    "from-[#00BCD4]/20 to-[#00BCD4]/5",
    "from-[#FF5722]/20 to-[#FF5722]/5",
  ];

  return (
    <section id="wrapped" className="py-24 opacity-0 animate-[fadeUp_0.8s_ease_forwards]">
      <div className="mb-12">
        <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-green mb-2.5 block">
          19 — Your Wrapped
        </span>
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-[1.15]">
          Every Year, <span className="text-gold">Unwrapped</span>
        </h2>
      </div>

      <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-green scrollbar-track-bg-deep">
        {years.map(([year, w], i) => (
          <div
            key={year}
            className={`snap-center shrink-0 w-[320px] bg-gradient-to-br ${
              CARD_GRADIENTS[i % CARD_GRADIENTS.length]
            } border border-border rounded-[var(--radius-card)] p-6 relative overflow-hidden`}
          >
            {/* Background year */}
            <div className="absolute top-2 right-4 font-[family-name:var(--font-display)] text-[6rem] font-extrabold text-white/[0.03] leading-none pointer-events-none select-none">
              {year}
            </div>

            <div className="relative z-10">
              {/* Year label */}
              <div className="font-[family-name:var(--font-display)] text-xl font-extrabold text-text-primary mb-5">
                {year}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div>
                  <div className="font-[family-name:var(--font-display)] text-lg font-bold text-green">
                    {formatHours(w.total_hours)}
                  </div>
                  <div className="text-text-muted text-[0.6rem] uppercase tracking-wider">
                    Hours
                  </div>
                </div>
                <div>
                  <div className="font-[family-name:var(--font-display)] text-lg font-bold text-text-primary">
                    {formatNumber(w.total_streams)}
                  </div>
                  <div className="text-text-muted text-[0.6rem] uppercase tracking-wider">
                    Streams
                  </div>
                </div>
                <div>
                  <div className="font-[family-name:var(--font-display)] text-lg font-bold text-text-primary">
                    {formatNumber(w.unique_artists)}
                  </div>
                  <div className="text-text-muted text-[0.6rem] uppercase tracking-wider">
                    Artists
                  </div>
                </div>
                <div>
                  <div className="font-[family-name:var(--font-display)] text-lg font-bold text-text-primary">
                    {formatNumber(w.unique_tracks)}
                  </div>
                  <div className="text-text-muted text-[0.6rem] uppercase tracking-wider">
                    Tracks
                  </div>
                </div>
              </div>

              {/* Top content */}
              <div className="space-y-3 border-t border-white/[0.06] pt-4">
                {w.top_artist && (
                  <div>
                    <div className="text-text-muted text-[0.55rem] uppercase tracking-wider">
                      Top Artist
                    </div>
                    <div className="text-text-primary text-sm font-semibold truncate">
                      {w.top_artist}
                    </div>
                    {w.top_artist_hours != null && (
                      <div className="text-green text-[0.6rem]">
                        {formatHours(w.top_artist_hours)}
                      </div>
                    )}
                  </div>
                )}
                {w.top_track && (
                  <div>
                    <div className="text-text-muted text-[0.55rem] uppercase tracking-wider">
                      Top Track
                    </div>
                    <div className="text-text-primary text-sm font-semibold truncate">
                      {w.top_track}
                    </div>
                    <div className="text-text-muted text-[0.55rem]">
                      {w.top_track_artist}
                      {w.top_track_plays != null && ` · ${formatNumber(w.top_track_plays)} plays`}
                    </div>
                  </div>
                )}
                {w.top_album && (
                  <div>
                    <div className="text-text-muted text-[0.55rem] uppercase tracking-wider">
                      Top Album
                    </div>
                    <div className="text-text-primary text-sm font-semibold truncate">
                      {w.top_album}
                    </div>
                    <div className="text-text-muted text-[0.55rem]">
                      {w.top_album_artist}
                      {w.top_album_hours != null && ` · ${formatHours(w.top_album_hours)}`}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
