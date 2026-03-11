"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { buildSearchIndex, searchEntities, type SearchResult } from "@/lib/utils/search-index";
import type { DashboardData } from "@/types/dashboard";
import { DeepDiveModal } from "./deep-dive-modal";

interface SearchBarProps {
  data: DashboardData;
  dashboardId: string;
}

export function SearchBar({ data, dashboardId }: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<SearchResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const indexRef = useRef<SearchResult[]>([]);

  useEffect(() => {
    indexRef.current = buildSearchIndex(data);
  }, [data]);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setResults(searchEntities(indexRef.current, q));
  }, []);

  if (selectedEntity) {
    return (
      <DeepDiveModal
        entity={selectedEntity}
        dashboardId={dashboardId}
        data={data}
        onClose={() => setSelectedEntity(null)}
      />
    );
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] border border-border rounded-[var(--radius-sm)] text-text-muted text-sm hover:bg-white/[0.08] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        Search artists & tracks
      </button>

      {open && (
        <div className="fixed inset-0 z-[2000] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg bg-bg-card border border-border rounded-[var(--radius-card)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search for an artist or track..."
                className="w-full bg-transparent text-text-primary text-lg outline-none placeholder:text-text-muted"
              />
            </div>
            {results.length > 0 && (
              <div className="max-h-80 overflow-y-auto p-2">
                {results.map((r, i) => (
                  <button
                    key={`${r.type}-${r.name}-${i}`}
                    onClick={() => { setSelectedEntity(r); setOpen(false); }}
                    className="w-full text-left px-3 py-2.5 rounded-[var(--radius-sm)] hover:bg-white/[0.06] transition-colors flex items-center gap-3"
                  >
                    <span className="text-[0.6rem] uppercase tracking-wider text-text-muted w-10">
                      {r.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-text-primary text-sm truncate">{r.name}</div>
                      {r.artistName && <div className="text-text-muted text-xs truncate">{r.artistName}</div>}
                    </div>
                    <span className="text-text-muted text-xs">{r.hours.toFixed(1)}h</span>
                  </button>
                ))}
              </div>
            )}
            {query.length > 0 && results.length === 0 && (
              <div className="p-6 text-center text-text-muted text-sm">No results found</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
