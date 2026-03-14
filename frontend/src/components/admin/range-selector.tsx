"use client";

import type { AnalyticsRange } from "@/types/admin";
import { cn } from "@/lib/utils";

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "all", label: "All Time" },
];

interface RangeSelectorProps {
  value: AnalyticsRange;
  onChange: (range: AnalyticsRange) => void;
}

export function RangeSelector({ value, onChange }: RangeSelectorProps) {
  return (
    <div className="flex gap-1 bg-bg-card border border-border rounded-full p-1">
      {RANGES.map((r) => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
            value === r.value
              ? "bg-green text-black"
              : "text-text-muted hover:text-text"
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
