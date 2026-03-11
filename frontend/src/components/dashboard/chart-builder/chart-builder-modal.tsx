"use client";

import { useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useChartBuilderStore, type ChartType } from "@/lib/stores/chart-builder";

interface ChartBuilderModalProps {
  dashboardId: string;
}

const CHART_TYPES: { type: ChartType; label: string; icon: string }[] = [
  { type: "bar", label: "Bar", icon: "\u2587\u2585\u2583\u2587" },
  { type: "line", label: "Line", icon: "\u2571\u2572\u2571" },
  { type: "area", label: "Area", icon: "\u25B3" },
  { type: "pie", label: "Pie", icon: "\u25D4" },
  { type: "scatter", label: "Scatter", icon: "\u2022\u2022\u2022" },
];

const METRICS = [
  { value: "hours", label: "Hours Played" },
  { value: "plays", label: "Play Count" },
  { value: "avg_hours", label: "Avg Hours" },
];

const GROUP_BY = [
  { value: "artist_name", label: "Artist" },
  { value: "track_name", label: "Track" },
  { value: "album_name", label: "Album" },
  { value: "platform", label: "Platform" },
  { value: "year", label: "Year" },
  { value: "month", label: "Month" },
  { value: "hour", label: "Hour" },
  { value: "weekday", label: "Weekday" },
];

const COLORS = ["#1DB954", "#F5A623", "#7B68EE", "#FF6B6B", "#4ECDC4", "#45B7D1", "#FF8C42", "#98D8C8", "#F06292", "#AED581"];

export function ChartBuilderModal({ dashboardId }: ChartBuilderModalProps) {
  const { open, config, data, loading, setOpen, setConfig, fetchData, reset } = useChartBuilderStore();

  useEffect(() => {
    if (open && dashboardId) {
      fetchData(dashboardId);
    }
  }, [open, config.metric, config.groupBy, config.limit, dashboardId, fetchData]);

  if (!open) return null;

  const labelKey = config.groupBy;
  const valueKey = config.metric === "avg_hours" ? "avg_hours" : config.metric;

  return (
    <div className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { setOpen(false); reset(); }}>
      <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-bg-primary border border-border rounded-[var(--radius-card)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-text-primary">Chart Builder</h2>
          <button onClick={() => { setOpen(false); reset(); }} className="text-text-muted hover:text-text-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Controls */}
          <div className="space-y-5">
            <div>
              <label className="text-text-muted text-xs uppercase tracking-wider mb-2 block">Chart Type</label>
              <div className="grid grid-cols-5 gap-1.5">
                {CHART_TYPES.map((ct) => (
                  <button
                    key={ct.type}
                    onClick={() => setConfig({ chartType: ct.type })}
                    className={`p-2 rounded-[var(--radius-sm)] border text-center text-xs transition-all ${
                      config.chartType === ct.type
                        ? "bg-green/20 border-green text-green"
                        : "bg-white/[0.03] border-border text-text-muted hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="text-base">{ct.icon}</div>
                    <div className="mt-0.5">{ct.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-text-muted text-xs uppercase tracking-wider mb-2 block">Metric</label>
              <select
                value={config.metric}
                onChange={(e) => setConfig({ metric: e.target.value })}
                className="w-full bg-bg-card border border-border rounded-[var(--radius-sm)] px-3 py-2 text-text-primary text-sm"
              >
                {METRICS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-text-muted text-xs uppercase tracking-wider mb-2 block">Group By</label>
              <select
                value={config.groupBy}
                onChange={(e) => setConfig({ groupBy: e.target.value })}
                className="w-full bg-bg-card border border-border rounded-[var(--radius-sm)] px-3 py-2 text-text-primary text-sm"
              >
                {GROUP_BY.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-text-muted text-xs uppercase tracking-wider mb-2 block">Limit: {config.limit}</label>
              <input
                type="range"
                min={5}
                max={100}
                value={config.limit}
                onChange={(e) => setConfig({ limit: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>

          {/* Chart */}
          <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-4 min-h-[400px] flex items-center justify-center">
            {loading ? (
              <div className="text-text-muted">Loading...</div>
            ) : data.length === 0 ? (
              <div className="text-text-muted">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                {config.chartType === "bar" ? (
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey={labelKey} tick={{ fill: "var(--color-text-muted)", fontSize: 9 }} angle={-45} textAnchor="end" height={80} />
                    <YAxis tick={{ fill: "var(--color-text-muted)", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12 }} />
                    <Bar dataKey={valueKey} fill="#1DB954" radius={[3, 3, 0, 0]} />
                  </BarChart>
                ) : config.chartType === "line" ? (
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey={labelKey} tick={{ fill: "var(--color-text-muted)", fontSize: 9 }} />
                    <YAxis tick={{ fill: "var(--color-text-muted)", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12 }} />
                    <Line type="monotone" dataKey={valueKey} stroke="#1DB954" strokeWidth={2} dot={false} />
                  </LineChart>
                ) : config.chartType === "area" ? (
                  <AreaChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey={labelKey} tick={{ fill: "var(--color-text-muted)", fontSize: 9 }} />
                    <YAxis tick={{ fill: "var(--color-text-muted)", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12 }} />
                    <Area type="monotone" dataKey={valueKey} stroke="#1DB954" fill="#1DB954" fillOpacity={0.2} />
                  </AreaChart>
                ) : config.chartType === "pie" ? (
                  <PieChart>
                    <Pie data={data.slice(0, 10)} dataKey={valueKey} nameKey={labelKey} cx="50%" cy="50%" outerRadius={150} label={(e) => e[labelKey]}>
                      {data.slice(0, 10).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12 }} />
                  </PieChart>
                ) : (
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis type="number" dataKey={valueKey} tick={{ fill: "var(--color-text-muted)", fontSize: 10 }} />
                    <YAxis type="number" dataKey={valueKey} tick={{ fill: "var(--color-text-muted)", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12 }} />
                    <Scatter data={data} fill="#1DB954" />
                  </ScatterChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
