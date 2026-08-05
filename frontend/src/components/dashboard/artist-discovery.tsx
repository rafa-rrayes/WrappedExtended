"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ZAxis,
} from "recharts";
import { motion } from "framer-motion";
import type { ArtistDiscovery as ArtistDiscoveryType } from "@/types/dashboard";
import { formatHours } from "@/lib/utils";
import { SectionReveal } from "@/components/dashboard/section-reveal";
import { staggerContainer, staggerItem } from "@/lib/animations";

interface ArtistDiscoveryProps {
  data: ArtistDiscoveryType[];
}

export function ArtistDiscoveryTimeline({ data }: ArtistDiscoveryProps) {
  if (!data?.length) return null;

  const chartData = data.slice(0, 30).map((a) => ({
    ...a,
    firstListenTs: new Date(a.first_listen).getTime(),
    displayDate: new Date(a.first_listen).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    }),
  }));

  const maxHours = Math.max(...chartData.map((d) => d.total_hours));

  return (
    <SectionReveal id="artist-discovery" className="py-24">
      {(inView) => (
        <>
          <div className="mb-12">
            <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-green mb-2.5 block">
              09 — Artist Discovery
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-[1.15]">
              When You <span className="text-gold">Found</span> Them
            </h2>
          </div>

          <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="firstListenTs"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(ts) =>
                    new Date(ts).toLocaleDateString("en-US", { month: "short", year: "2-digit" })
                  }
                  tickCount={9}
                  interval="preserveStartEnd"
                  minTickGap={28}
                  tick={{ fontSize: 10, fill: "#555" }}
                  axisLine={false}
                  tickLine={false}
                  name="First Listen"
                />
                <YAxis
                  dataKey="total_hours"
                  tickFormatter={(v) => `${v}h`}
                  tick={{ fontSize: 10, fill: "#555" }}
                  axisLine={false}
                  tickLine={false}
                  width={45}
                  name="Total Hours"
                />
                <ZAxis
                  dataKey="total_hours"
                  range={[40, 400]}
                  domain={[0, maxHours]}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(10,10,10,0.92)",
                    border: "1px solid rgba(29,185,84,0.3)",
                    borderRadius: 8,
                  }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[rgba(10,10,10,0.92)] border border-green/30 rounded-lg p-3">
                        <div className="font-semibold text-text-primary text-sm">{d.artist_name}</div>
                        <div className="text-text-secondary text-xs mt-1">
                          Discovered: {d.displayDate}
                        </div>
                        <div className="text-green text-xs font-bold mt-0.5">
                          {formatHours(d.total_hours)} total
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter
                  data={chartData}
                  fill="#1DB954"
                  fillOpacity={0.6}
                  isAnimationActive={inView}
                  animationDuration={1200}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Top discoveries list */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-6"
            variants={staggerContainer}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
          >
            {data.slice(0, 6).map((a, i) => (
              <motion.div
                key={a.artist_name}
                variants={staggerItem}
                className="bg-bg-card border border-border rounded-[var(--radius-card)] p-4 flex items-center gap-4"
              >
                <span
                  className={`font-[family-name:var(--font-display)] text-lg font-extrabold shrink-0 ${
                    i === 0 ? "text-gold" : "text-text-muted"
                  }`}
                >
                  #{i + 1}
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-text-primary text-sm truncate">
                    {a.artist_name}
                  </div>
                  <div className="text-text-muted text-[0.65rem]">
                    {new Date(a.first_listen).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}{" "}
                    — {formatHours(a.total_hours)}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
    </SectionReveal>
  );
}
