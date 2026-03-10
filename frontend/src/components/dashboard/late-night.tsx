"use client";

import type { LateNightAnalysis } from "@/types/dashboard";
import { formatHours } from "@/lib/utils";

interface LateNightProps {
  data: LateNightAnalysis;
}

export function LateNight({ data }: LateNightProps) {
  if (!data) return null;

  return (
    <section id="latenight" className="py-24 opacity-0 animate-[fadeUp_0.8s_ease_forwards]">
      <div className="mb-12">
        <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-green mb-2.5 block">
          18 — Late Night Listening
        </span>
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-[1.15]">
          After <span className="text-gold">Midnight</span>
        </h2>
      </div>

      <div className="relative overflow-hidden bg-gradient-to-br from-[#0a0a0a] to-[#0f0a15] border border-border rounded-[var(--radius-card)] p-8">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[radial-gradient(circle,rgba(156,39,176,0.08)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-[radial-gradient(circle,rgba(29,185,84,0.05)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative z-10">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[#9C27B0] [text-shadow:0_0_30px_rgba(156,39,176,0.25)]">
                {formatHours(data.hours)}
              </div>
              <div className="text-text-muted text-[0.65rem] uppercase tracking-wider mt-1">
                Late Night Hours
              </div>
            </div>
            <div className="text-center">
              <div className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-text-primary">
                {data.pct.toFixed(1)}%
              </div>
              <div className="text-text-muted text-[0.65rem] uppercase tracking-wider mt-1">
                Of All Listening
              </div>
            </div>
            <div className="text-center">
              <div className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-text-primary">
                {data.streams.toLocaleString()}
              </div>
              <div className="text-text-muted text-[0.65rem] uppercase tracking-wider mt-1">
                Night Streams
              </div>
            </div>
          </div>

          {/* Top late night artists */}
          {data.top_artists && data.top_artists.length > 0 && (
            <div>
              <div className="text-text-muted text-[0.6rem] uppercase tracking-wider mb-3">
                Your Late Night Companions
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {data.top_artists.slice(0, 6).map((a, i) => (
                  <div
                    key={a.artist_name}
                    className="flex items-center gap-3 p-2.5 bg-white/[0.02] rounded-[var(--radius-sm)]"
                  >
                    <span
                      className={`font-[family-name:var(--font-display)] text-sm font-bold shrink-0 ${
                        i === 0 ? "text-[#9C27B0]" : "text-text-muted"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-text-primary text-sm truncate">{a.artist_name}</span>
                    <span className="text-text-muted text-xs ml-auto shrink-0">
                      {formatHours(a.hours)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
