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
                        margin={{ left: 50, right: 10, top: 5, bottom: 5 }}
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
                          width={50}
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
                      <span className="text-text-primary font-semibold">{countries[0].country}</span>
                    </span>
                    {countries.length === 2 && (
                      <span className="text-text-muted text-sm mt-2">
                        The remaining {countries[1].pct.toFixed(0)}% from {countries[1].country}
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
                      <span className="font-[family-name:var(--font-display)] text-lg font-bold text-text-secondary shrink-0">
                        {tm.country}
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
