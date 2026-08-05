"use client";

import { useWhatIfStore } from "@/lib/stores/what-if";
import { recalculateWithout } from "@/lib/utils/what-if-recalculator";
import type { DashboardData } from "@/types/dashboard";

interface WhatIfPanelProps {
  dashboardId: string;
  data: DashboardData;
}

export function WhatIfPanel({ dashboardId, data }: WhatIfPanelProps) {
  // NOTE: the store also holds a server-computed `result` from fetchResult(), but this
  // panel renders only the client-side `clientResult` below. See tasks/todo.md.
  const { open, excludeArtists, loading, setOpen, toggleArtist, fetchResult, reset } = useWhatIfStore();

  if (!open) return null;

  const topArtists = data.top_artists ?? [];
  const clientResult = excludeArtists.length > 0 ? recalculateWithout(data, excludeArtists) : null;

  return (
    <div className="fixed right-0 top-0 bottom-0 z-[1500] w-full sm:w-96 bg-bg-primary/95 backdrop-blur-xl border-l border-border shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-text-primary">What If...?</h3>
          <p className="text-text-muted text-xs mt-0.5">Remove artists to see how your stats change</p>
        </div>
        <button onClick={() => { setOpen(false); reset(); }} className="text-text-muted hover:text-text-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Artist toggles */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
        <div className="text-text-muted text-xs uppercase tracking-wider mb-3">Toggle artists to exclude</div>
        {topArtists.map((artist) => {
          const excluded = excludeArtists.includes(artist.artist_name);
          return (
            <button
              key={artist.artist_name}
              onClick={() => toggleArtist(artist.artist_name)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] transition-all text-left ${
                excluded ? "bg-red-500/10 border border-red-500/30" : "bg-white/[0.03] border border-transparent hover:bg-white/[0.06]"
              }`}
            >
              <div className={`w-3 h-3 rounded-sm border ${excluded ? "bg-red-500 border-red-500" : "border-border"}`}>
                {excluded && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>}
              </div>
              <span className={`flex-1 text-sm ${excluded ? "text-red-400 line-through" : "text-text-primary"}`}>{artist.artist_name}</span>
              <span className="text-text-muted text-xs">{artist.hours.toFixed(1)}h</span>
            </button>
          );
        })}
      </div>

      {/* Deltas */}
      {clientResult && (
        <div className="p-4 border-t border-border space-y-2">
          <div className="text-text-muted text-xs uppercase tracking-wider mb-2">Impact</div>
          {clientResult.deltas.map((d) => (
            <div key={d.field} className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">{d.field}</span>
              <div className="flex items-center gap-2">
                <span className="text-text-muted line-through">{typeof d.original === "number" ? Math.round(d.original).toLocaleString() : d.original}</span>
                <span className="text-red-400">{typeof d.modified === "number" ? Math.round(d.modified).toLocaleString() : d.modified}</span>
                <span className="text-red-400 text-xs">({d.deltaPct.toFixed(1)}%)</span>
              </div>
            </div>
          ))}

          <button
            onClick={() => fetchResult(dashboardId)}
            disabled={loading}
            className="w-full mt-3 px-4 py-2 bg-green/20 text-green rounded-[var(--radius-sm)] text-sm font-medium hover:bg-green/30 transition-colors disabled:opacity-50"
          >
            {loading ? "Computing..." : "Get Full Recalculation"}
          </button>
        </div>
      )}
    </div>
  );
}
