"use client";

import type { WeekendVsWeekday as WeekendVsWeekdayType } from "@/types/dashboard";
import { formatHours, formatNumber } from "@/lib/utils";

interface WeekendWeekdayProps {
  data: WeekendVsWeekdayType;
}

function HalfCard({
  title,
  hours,
  streams,
  topArtists,
  accent,
}: {
  title: string;
  hours: number;
  streams: number;
  topArtists: { artist_name: string; hours: number }[];
  accent: string;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6 flex-1">
      <h3
        className="font-[family-name:var(--font-display)] text-sm font-bold mb-5 tracking-wide uppercase"
        style={{ color: accent }}
      >
        {title}
      </h3>
      <div className="space-y-4">
        <div>
          <div
            className="font-[family-name:var(--font-display)] text-3xl font-extrabold"
            style={{ color: accent, textShadow: `0 0 30px ${accent}30` }}
          >
            {formatHours(hours)}
          </div>
          <div className="text-text-muted text-[0.65rem] uppercase tracking-wider mt-0.5">
            total listening
          </div>
        </div>
        <div>
          <div className="font-[family-name:var(--font-display)] text-lg font-bold text-text-primary">
            {formatNumber(streams)}
          </div>
          <div className="text-text-muted text-[0.65rem] uppercase tracking-wider mt-0.5">
            streams
          </div>
        </div>
        {topArtists.length > 0 && (
          <div>
            <div className="text-text-muted text-[0.6rem] uppercase tracking-wider mb-2">
              Top Artists
            </div>
            <div className="space-y-1.5">
              {topArtists.slice(0, 5).map((a, i) => (
                <div key={a.artist_name} className="flex items-center justify-between">
                  <span className="text-text-primary text-sm truncate">
                    <span className="text-text-muted mr-1.5">{i + 1}.</span>
                    {a.artist_name}
                  </span>
                  <span className="text-text-muted text-xs shrink-0 ml-2">
                    {formatHours(a.hours)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function WeekendWeekday({ data }: WeekendWeekdayProps) {
  if (!data) return null;

  return (
    <section id="weekend" className="py-24 opacity-0 animate-[fadeUp_0.8s_ease_forwards]">
      <div className="mb-12">
        <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-green mb-2.5 block">
          17 — Weekend vs Weekday
        </span>
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-[1.15]">
          Work Mode vs <span className="text-gold">Chill Mode</span>
        </h2>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <HalfCard
          title="Weekdays"
          hours={data.weekday.hours}
          streams={data.weekday.streams}
          topArtists={data.weekday.top_artists}
          accent="#1DB954"
        />
        <div className="hidden md:flex items-center">
          <div className="w-px h-32 bg-border" />
        </div>
        <HalfCard
          title="Weekends"
          hours={data.weekend.hours}
          streams={data.weekend.streams}
          topArtists={data.weekend.top_artists}
          accent="#F5A623"
        />
      </div>
    </section>
  );
}
