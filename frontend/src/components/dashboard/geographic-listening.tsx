"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import type { CountryDistribution, TravelMusic } from "@/types/dashboard";
import { formatHours } from "@/lib/utils";
import { SectionReveal } from "./section-reveal";

interface GeographicListeningProps {
  countries?: CountryDistribution[];
  travelMusic?: TravelMusic[];
}

/** Spotify's placeholder for "we don't know where this play came from". */
const UNKNOWN_REGION = "ZZ";

/** Built once — constructing an Intl formatter per tick is needlessly expensive. */
const regionDisplayNames =
  typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

/** "BR" → "🇧🇷". Empty string for anything that isn't a two-letter code. */
function countryFlag(code: string): string {
  if (!/^[a-z]{2}$/i.test(code)) return "";
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65),
  );
}

/**
 * "BR" → { flag: "🇧🇷", name: "Brazil" }. "ZZ" is Spotify's unknown region; any code the
 * platform can't resolve falls back to the raw code with no flag — never "undefined".
 */
function resolveCountry(code: string): { flag: string; name: string } {
  const upper = code?.toUpperCase() ?? "";
  if (!upper || upper === UNKNOWN_REGION) return { flag: "", name: "Unknown" };
  if (!/^[A-Z]{2}$/.test(upper)) return { flag: "", name: code };

  let name = upper;
  try {
    name = regionDisplayNames?.of(upper) || upper;
  } catch {
    name = upper;
  }
  // An unresolved code comes back unchanged — don't dress it up with a meaningless flag.
  return { flag: name === upper ? "" : countryFlag(upper), name };
}

/** "BR" → "Brazil", "ZZ" → "Unknown". */
function countryName(code: string): string {
  return resolveCountry(code).name;
}

/** "BR" → "🇧🇷 Brazil", "ZZ" → "Unknown". */
function countryLabel(code: string): string {
  const { flag, name } = resolveCountry(code);
  return flag ? `${flag} ${name}` : name;
}

/**
 * Same as `countryLabel`, clipped to what fits the axis gutter on a phone-width card.
 * The tooltip still shows the full name.
 */
function countryAxisLabel(code: string): string {
  const { flag, name } = resolveCountry(code);
  const clipped = name.length > 15 ? `${name.slice(0, 14)}…` : name;
  return flag ? `${flag} ${clipped}` : clipped;
}

export function GeographicListening({ countries, travelMusic }: GeographicListeningProps) {
  if (!countries?.length && !travelMusic?.length) return null;

  const showBarChart = (countries?.length ?? 0) >= 3;
  const showTravelMusic = (countries?.length ?? 0) >= 2 && travelMusic && travelMusic.length > 0;

  return (
    <SectionReveal id="geo" className="py-24">
      {(inView: boolean) => (
        <>
          <div className="mb-12">
            <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-[#00BCD4] mb-2.5 block">
              14 — Geographic Listening
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-[1.15]">
              Music Across <span className="text-gold">Borders</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Country distribution */}
            {countries && countries.length > 0 && (
              <>
                {showBarChart ? (
                  <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
                    <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-secondary mb-4 tracking-wide uppercase">
                      Listening by Country
                    </h3>
                    <ResponsiveContainer width="100%" height={countries.slice(0, 12).length * 34 + 20}>
                      <BarChart
                        data={countries.slice(0, 12)}
                        layout="vertical"
                        margin={{ left: 0, right: 10, top: 5, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                        <XAxis
                          type="number"
                          tickFormatter={(v) => `${v}h`}
                          tick={{ fontSize: 10, fill: "#555" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="country"
                          width={124}
                          tickFormatter={countryAxisLabel}
                          tick={{ fontSize: 11, fill: "#999" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "rgba(10,10,10,0.92)",
                            border: "1px solid rgba(0,188,212,0.3)",
                            borderRadius: 8,
                          }}
                          formatter={(value: number) => [formatHours(value), "Hours"]}
                          labelFormatter={(code) => countryLabel(String(code))}
                        />
                        <Bar dataKey="hours" radius={[0, 4, 4, 0]} isAnimationActive={inView}>
                          {countries.slice(0, 12).map((_, i) => {
                            const ratio = i / (Math.min(countries.length, 12) - 1 || 1);
                            // Gradient from cyan (#00BCD4) to green (#1DB954)
                            const r = Math.round(0 + (29 - 0) * ratio);
                            const g = Math.round(188 + (185 - 188) * ratio);
                            const b = Math.round(212 + (84 - 212) * ratio);
                            return <Cell key={i} fill={`rgb(${r},${g},${b})`} fillOpacity={0.8} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  /* Sparse data: show a single large stat card */
                  <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-8 flex flex-col items-center justify-center text-center">
                    <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-secondary mb-6 tracking-wide uppercase">
                      Listening by Country
                    </h3>
                    <span className="font-[family-name:var(--font-display)] text-[clamp(3rem,6vw,5rem)] font-extrabold text-[#00BCD4] leading-none">
                      {countries[0].pct.toFixed(0)}%
                    </span>
                    <span className="text-text-secondary text-lg mt-3">
                      of your music was from{" "}
                      <span className="text-text-primary font-semibold">
                        {countryLabel(countries[0].country)}
                      </span>
                    </span>
                    {countries.length === 2 && (
                      <span className="text-text-muted text-sm mt-2">
                        The remaining {countries[1].pct.toFixed(0)}% from{" "}
                        {countryLabel(countries[1].country)}
                      </span>
                    )}
                    <span className="text-text-muted text-xs mt-4">
                      {formatHours(countries[0].hours)} total
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Travel music — only shown when there are 2+ countries */}
            {showTravelMusic && (
              <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
                <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-secondary mb-4 tracking-wide uppercase">
                  Your Soundtrack Abroad
                </h3>
                <div className="space-y-3">
                  {travelMusic!.slice(0, 10).map((tm) => (
                    <div
                      key={tm.country}
                      className="flex items-center gap-4 p-3 bg-white/[0.02] rounded-[var(--radius-sm)] hover:bg-white/[0.04] transition-colors"
                    >
                      <span
                        className="font-[family-name:var(--font-display)] text-sm font-bold text-text-secondary shrink-0 w-32 truncate"
                        title={countryName(tm.country)}
                      >
                        {countryLabel(tm.country)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-text-primary text-sm font-medium truncate">
                          {tm.top_artist}
                        </div>
                        <div className="text-text-muted text-[0.65rem]">
                          {formatHours(tm.hours)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </SectionReveal>
  );
}
