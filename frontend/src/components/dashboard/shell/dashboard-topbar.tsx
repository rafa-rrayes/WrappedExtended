"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDashboards } from "@/lib/hooks/use-dashboards";
import type { DateRangeBounds } from "@/lib/hooks/use-date-range";
import { DateRangePicker } from "./date-range-picker";

interface DashboardTopbarProps {
  dashboardId: string;
  title: string;
  bounds: DateRangeBounds;
  onOpenNav: () => void;
  onOpenPalette: () => void;
}

export function DashboardTopbar({
  dashboardId,
  title,
  bounds,
  onOpenNav,
  onOpenPalette,
}: DashboardTopbarProps) {
  return (
    <header className="sticky top-14 z-30 flex h-14 items-center gap-2 border-b border-border bg-bg-primary/85 px-3 backdrop-blur-xl sm:px-5">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="rounded-[var(--radius-sm)] p-1.5 text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary md:hidden"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>

      <DashboardSwitcher dashboardId={dashboardId} title={title} />

      {/* `shrink-0` makes the dashboard title absorb the squeeze on a narrow viewport — it
          already truncates, whereas the search and date controls would just overflow. */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenPalette}
          className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-white/[0.04] px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:bg-white/[0.08] hover:text-text-secondary"
          aria-label="Search"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="shrink-0"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <span className="hidden lg:inline">Search</span>
          <kbd className="hidden rounded border border-border px-1 text-[0.6rem] lg:inline">
            ⌘K
          </kbd>
        </button>

        <DateRangePicker bounds={bounds} />
      </div>
    </header>
  );
}

function DashboardSwitcher({ dashboardId, title }: { dashboardId: string; title: string }) {
  const { data: dashboards } = useDashboards();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const options = dashboards ?? [];

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={options.length <= 1}
        className="flex min-w-0 items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left transition-colors hover:bg-white/[0.06] disabled:hover:bg-transparent"
      >
        <span className="max-w-[36vw] truncate font-[family-name:var(--font-display)] text-sm font-semibold text-text-primary sm:max-w-[280px]">
          {title}
        </span>
        {options.length > 1 && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className={cn("shrink-0 text-text-muted transition-transform", open && "rotate-180")}
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            role="listbox"
            className="absolute left-0 z-[1200] mt-2 max-h-[60vh] w-[min(320px,calc(100vw-2rem))] overflow-y-auto rounded-[var(--radius-card)] border border-border bg-bg-card p-1.5 shadow-2xl"
          >
            {options.map((dashboard) => {
              const current = dashboard.id === dashboardId;
              return (
                <button
                  key={dashboard.id}
                  type="button"
                  role="option"
                  aria-selected={current}
                  onClick={() => {
                    setOpen(false);
                    // Deliberately drops ?from&to — the new dashboard covers a different
                    // span, so carrying a range over would land on an empty view.
                    if (!current) router.push(`/dashboard/${dashboard.id}`);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left transition-colors",
                    current ? "bg-white/[0.06]" : "hover:bg-white/[0.04]",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-text-primary">
                      {dashboard.original_filename}
                    </span>
                    <span className="block text-xs text-text-muted">
                      {Math.round(dashboard.total_hours).toLocaleString()}h ·{" "}
                      {dashboard.unique_artists.toLocaleString()} artists
                    </span>
                  </span>
                  {current && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green" />}
                </button>
              );
            })}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
