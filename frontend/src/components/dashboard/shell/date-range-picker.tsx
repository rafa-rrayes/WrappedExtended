"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDateRange, type DateRangeBounds } from "@/lib/hooks/use-date-range";

/** "12 Mar 2024" — short enough for the top bar, unambiguous across locales. */
function formatLabel(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function DateRangePicker({ bounds }: { bounds: DateRangeBounds }) {
  const { from, to, isFiltered, setRange, clear, presets } = useDateRange(bounds);
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

  const label = isFiltered
    ? `${from ? formatLabel(from) : "Start"} → ${to ? formatLabel(to) : "Now"}`
    : "All time";

  const activePreset = presets.find((preset) => preset.from === from && preset.to === to);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "flex items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-1.5 text-xs transition-colors",
          isFiltered
            ? "border-green/40 bg-green/10 text-green"
            : "border-border bg-white/[0.04] text-text-secondary hover:bg-white/[0.08] hover:text-text-primary",
        )}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="shrink-0"
        >
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        <span className="max-w-[190px] truncate">{activePreset?.label ?? label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            role="dialog"
            aria-label="Date range"
            className="absolute right-0 z-[1200] mt-2 w-[min(320px,calc(100vw-2rem))] rounded-[var(--radius-card)] border border-border bg-bg-card p-3 shadow-2xl"
          >
            <div className="mb-2 text-[0.6rem] font-medium uppercase tracking-[0.14em] text-text-muted">
              Presets
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => {
                const selected = preset.from === from && preset.to === to;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setRange(preset.from, preset.to)}
                    className={cn(
                      "rounded-[var(--radius-sm)] px-2.5 py-1 text-xs transition-colors",
                      selected
                        ? "bg-green/15 text-green"
                        : "bg-white/[0.04] text-text-secondary hover:bg-white/[0.08] hover:text-text-primary",
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 mb-2 text-[0.6rem] font-medium uppercase tracking-[0.14em] text-text-muted">
              Custom
            </div>
            <div className="flex items-center gap-2">
              <DateInput
                label="From"
                value={from ?? ""}
                min={bounds.min}
                max={to ?? bounds.max}
                onChange={(value) => setRange(value || null, to)}
              />
              <span className="pt-4 text-text-muted">–</span>
              <DateInput
                label="To"
                value={to ?? ""}
                min={from ?? bounds.min}
                max={bounds.max}
                onChange={(value) => setRange(from, value || null)}
              />
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <span className="text-[0.65rem] text-text-muted">
                {isFiltered ? "Applied to every view" : "Showing everything"}
              </span>
              <button
                type="button"
                onClick={clear}
                disabled={!isFiltered}
                className="rounded-[var(--radius-sm)] px-2.5 py-1 text-xs text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DateInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min: string | null;
  max: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex-1">
      <span className="mb-1 block text-[0.65rem] text-text-muted">{label}</span>
      <input
        type="date"
        value={value}
        min={min ?? undefined}
        max={max ?? undefined}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[var(--radius-sm)] border border-border bg-white/[0.04] px-2 py-1.5 text-xs text-text-primary outline-none transition-colors [color-scheme:dark] focus:border-green/50"
      />
    </label>
  );
}
