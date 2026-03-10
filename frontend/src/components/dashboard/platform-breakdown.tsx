"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { PlatformHour, ContentTypeDistribution } from "@/types/dashboard";
import { formatHours } from "@/lib/utils";

interface PlatformBreakdownProps {
  platformHours?: PlatformHour[];
  contentTypes?: ContentTypeDistribution[];
}

const COLORS = ["#1DB954", "#F5A623", "#E91E63", "#9C27B0", "#00BCD4", "#FF5722", "#8BC34A", "#607D8B"];

export function PlatformBreakdown({ platformHours, contentTypes }: PlatformBreakdownProps) {
  if (!platformHours?.length && !contentTypes?.length) return null;

  return (
    <section id="platforms" className="py-24 opacity-0 animate-[fadeUp_0.8s_ease_forwards]">
      <div className="mb-12">
        <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-green mb-2.5 block">
          12 — Platform Breakdown
        </span>
        <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-[1.15]">
          Where You <span className="text-gold">Play</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform donut */}
        {platformHours && platformHours.length > 0 && (
          <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
            <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-secondary mb-4 tracking-wide uppercase">
              Devices
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={platformHours}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="hours"
                  nameKey="platform"
                  strokeWidth={0}
                >
                  {platformHours.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(10,10,10,0.92)",
                    border: "1px solid rgba(29,185,84,0.3)",
                    borderRadius: 8,
                  }}
                  formatter={(value: number) => [formatHours(value), "Hours"]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Content type */}
        {contentTypes && contentTypes.length > 0 && (
          <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
            <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-secondary mb-4 tracking-wide uppercase">
              Content Types
            </h3>
            <div className="space-y-4 mt-6">
              {contentTypes.map((ct, i) => (
                <div key={ct.type}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-text-primary text-sm font-medium capitalize">
                      {ct.type}
                    </span>
                    <span className="text-text-secondary text-sm">
                      {formatHours(ct.hours)} ({ct.pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${ct.pct}%`,
                        backgroundColor: COLORS[i % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
