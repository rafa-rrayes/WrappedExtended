"use client";

import { useTimeMachineStore } from "@/lib/stores/time-machine";

interface TimeMachineToolbarProps {
  dashboardId: string;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
}

export function TimeMachineToolbar({ dashboardId, dateRangeStart, dateRangeEnd }: TimeMachineToolbarProps) {
  const {
    active, startDate, endDate, comparing, compareStartDate, compareEndDate, loading,
    setActive, setDateRange, setCompareRange, setComparing, fetchFilteredData, reset,
  } = useTimeMachineStore();

  const presets = [
    { label: "Last Year", start: getYearAgo(1), end: today() },
    { label: "Last 6 Months", start: getMonthsAgo(6), end: today() },
    ...(dateRangeStart && dateRangeEnd ? [{ label: "All Time", start: dateRangeStart, end: dateRangeEnd }] : []),
  ];

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] border border-border rounded-[var(--radius-sm)] text-text-muted text-sm hover:bg-white/[0.08] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        Time Machine
      </button>
    );
  }

  return (
    <div className="bg-bg-card/80 backdrop-blur-xl border border-border rounded-[var(--radius-card)] p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-green flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          Time Machine Active
        </h3>
        <button onClick={() => { setActive(false); reset(); }} className="text-text-muted hover:text-text-primary text-xs">
          Exit
        </button>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2 mb-3">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => { setDateRange(p.start, p.end); }}
            className="px-2.5 py-1 bg-white/[0.04] border border-border rounded-[var(--radius-sm)] text-text-muted text-xs hover:bg-white/[0.08] transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Date inputs */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-text-muted text-[0.6rem] uppercase tracking-wider block mb-1">From</label>
          <input type="date" value={startDate} onChange={(e) => setDateRange(e.target.value, endDate)} className="bg-bg-primary border border-border rounded-[var(--radius-sm)] px-2 py-1 text-text-primary text-sm" />
        </div>
        <div>
          <label className="text-text-muted text-[0.6rem] uppercase tracking-wider block mb-1">To</label>
          <input type="date" value={endDate} onChange={(e) => setDateRange(startDate, e.target.value)} className="bg-bg-primary border border-border rounded-[var(--radius-sm)] px-2 py-1 text-text-primary text-sm" />
        </div>

        <label className="flex items-center gap-1.5 text-text-muted text-xs cursor-pointer">
          <input type="checkbox" checked={comparing} onChange={(e) => setComparing(e.target.checked)} className="accent-green" />
          Compare
        </label>

        {comparing && (
          <>
            <div>
              <label className="text-text-muted text-[0.6rem] uppercase tracking-wider block mb-1">vs From</label>
              <input type="date" value={compareStartDate} onChange={(e) => setCompareRange(e.target.value, compareEndDate)} className="bg-bg-primary border border-border rounded-[var(--radius-sm)] px-2 py-1 text-text-primary text-sm" />
            </div>
            <div>
              <label className="text-text-muted text-[0.6rem] uppercase tracking-wider block mb-1">vs To</label>
              <input type="date" value={compareEndDate} onChange={(e) => setCompareRange(compareStartDate, e.target.value)} className="bg-bg-primary border border-border rounded-[var(--radius-sm)] px-2 py-1 text-text-primary text-sm" />
            </div>
          </>
        )}

        <button
          onClick={() => fetchFilteredData(dashboardId)}
          disabled={loading || !startDate || !endDate}
          className="px-4 py-1.5 bg-green text-black text-sm font-semibold rounded-[var(--radius-sm)] hover:bg-green/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Loading..." : "Apply"}
        </button>
      </div>
    </div>
  );
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function getYearAgo(n: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d.toISOString().split("T")[0];
}

function getMonthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().split("T")[0];
}
