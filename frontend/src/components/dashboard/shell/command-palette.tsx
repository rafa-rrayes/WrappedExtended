"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { useRangeHref } from "@/lib/hooks/use-date-range";
import { DASHBOARD_NAV, NavIcon, navHref, type NavIconName } from "./nav-items";

/** Shape of `GET /dashboards/{id}/search/suggest/`. */
interface SuggestResponse {
  artists: string[];
  tracks: { track_name: string; artist_name: string | null }[];
}

interface PaletteItem {
  key: string;
  kind: "route" | "artist" | "track";
  label: string;
  hint?: string;
  icon: NavIconName;
  href: string;
}

const DEBOUNCE_MS = 200;
const MAX_ENTITY_RESULTS = 8;

interface CommandPaletteProps {
  dashboardId: string;
  /** URL prefix for the jump targets — see `DashboardContextValue.basePath`. */
  basePath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ dashboardId, basePath, open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const withRange = useRangeHref();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestResponse>({ artists: [], tracks: [] });
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ⌘K / Ctrl+K from anywhere in the shell.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpenChange(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange]);

  // Reopening should feel like a fresh search, not like resuming the last one.
  useEffect(() => {
    if (open) {
      setQuery("");
      setSuggestions({ artists: [], tracks: [] });
      setActiveIndex(0);
      const id = window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  // Debounced suggest. The stale-response guard matters because a slow request for "rad"
  // can otherwise land after the fast one for "radiohead" and overwrite it.
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions({ artists: [], tracks: [] });
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const data: SuggestResponse = await apiClient.searchSuggest(dashboardId, trimmed);
        if (cancelled) return;
        setSuggestions({
          artists: Array.isArray(data?.artists) ? data.artists : [],
          tracks: Array.isArray(data?.tracks) ? data.tracks : [],
        });
      } catch {
        if (!cancelled) setSuggestions({ artists: [], tracks: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, open, dashboardId]);

  const items = useMemo<PaletteItem[]>(() => {
    const trimmed = query.trim().toLowerCase();

    const routes: PaletteItem[] = DASHBOARD_NAV.filter(
      (item) => !trimmed || item.label.toLowerCase().includes(trimmed),
    ).map((item) => ({
      key: `route:${item.segment}`,
      kind: "route",
      label: item.label,
      hint: item.group,
      icon: item.icon,
      href: withRange(navHref(basePath, item.segment)),
    }));

    const artists: PaletteItem[] = suggestions.artists
      .slice(0, MAX_ENTITY_RESULTS)
      .map((name) => ({
        key: `artist:${name}`,
        kind: "artist",
        label: name,
        icon: "artists",
        href: withRange(
          `${navHref(basePath, "/artists")}/${encodeURIComponent(name)}`,
        ),
      }));

    const tracks: PaletteItem[] = suggestions.tracks
      .slice(0, MAX_ENTITY_RESULTS)
      .map((track) => ({
        key: `track:${track.track_name}:${track.artist_name ?? ""}`,
        kind: "track",
        label: track.track_name,
        hint: track.artist_name ?? undefined,
        icon: "tracks",
        href: withRange(
          `${navHref(basePath, "/tracks")}/${encodeURIComponent(track.track_name)}`,
        ),
      }));

    return [...artists, ...tracks, ...routes];
  }, [query, suggestions, basePath, withRange]);

  useEffect(() => {
    setActiveIndex(0);
  }, [items.length]);

  const select = useCallback(
    (item: PaletteItem | undefined) => {
      if (!item) return;
      onOpenChange(false);
      router.push(item.href);
    },
    [onOpenChange, router],
  );

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onOpenChange(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (items.length ? (index + 1) % items.length : 0));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (items.length ? (index - 1 + items.length) % items.length : 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      select(items[activeIndex]);
    }
  }

  // Keep the highlighted row visible while arrowing through a long list.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const groups: { title: string; kind: PaletteItem["kind"] }[] = [
    { title: "Artists", kind: "artist" },
    { title: "Tracks", kind: "track" },
    { title: "Go to", kind: "route" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[2000] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <m.div
            initial={{ opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.985 }}
            transition={{ duration: 0.14 }}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={onKeyDown}
            className="w-full max-w-xl overflow-hidden rounded-[var(--radius-card)] border border-border bg-bg-card shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="shrink-0 text-text-muted"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search artists, tracks or jump to a section…"
                aria-label="Search"
                className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
              />
              {loading && (
                <span className="text-[0.6rem] uppercase tracking-wider text-text-muted">
                  …
                </span>
              )}
              <kbd className="rounded border border-border px-1.5 py-0.5 text-[0.6rem] text-text-muted">
                ESC
              </kbd>
            </div>

            <div ref={listRef} className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
              {items.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-text-muted">
                  {loading ? "Searching…" : "No matches"}
                </div>
              ) : (
                groups.map((group) => {
                  const groupItems = items.filter((item) => item.kind === group.kind);
                  if (groupItems.length === 0) return null;
                  return (
                    <div key={group.kind} className="mb-1">
                      <div className="px-3 pb-1 pt-2 text-[0.6rem] font-medium uppercase tracking-[0.14em] text-text-muted">
                        {group.title}
                      </div>
                      {groupItems.map((item) => {
                        const index = items.indexOf(item);
                        const active = index === activeIndex;
                        return (
                          <button
                            key={item.key}
                            type="button"
                            data-index={index}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => select(item)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left transition-colors",
                              active ? "bg-white/[0.07]" : "hover:bg-white/[0.04]",
                            )}
                          >
                            <NavIcon
                              name={item.icon}
                              className={cn(
                                "shrink-0",
                                active ? "text-green" : "text-text-muted",
                              )}
                            />
                            <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                              {item.label}
                            </span>
                            {item.hint && (
                              <span className="max-w-[40%] truncate text-xs text-text-muted">
                                {item.hint}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[0.65rem] text-text-muted">
              <span>↑↓ navigate</span>
              <span>↵ open</span>
              <span className="ml-auto">⌘K</span>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
