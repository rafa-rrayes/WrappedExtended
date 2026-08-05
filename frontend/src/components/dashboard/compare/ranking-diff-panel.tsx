"use client";

import { useMemo, useState } from "react";
import type { DashboardData } from "@/types/dashboard";
import { cn, formatHours, formatNumber } from "@/lib/utils";
import { PERIOD_A_COLOR, PERIOD_B_COLOR } from "./period-format";
import {
  buildRankingDiff,
  RANKING_LABELS,
  type Movement,
  type RankingDiffRow,
  type RankingKind,
} from "./ranking-diff";

const KINDS: RankingKind[] = ["artists", "tracks", "albums"];

/** The metric each list is actually ranked by, mirroring the backend's own sort. */
const RANKED_BY: Record<RankingKind, "hours" | "plays"> = {
  artists: "hours",
  tracks: "plays",
  albums: "hours",
};

export function RankingDiffPanel({
  statsA,
  statsB,
  labelA,
  labelB,
}: {
  statsA: DashboardData;
  statsB: DashboardData;
  labelA: string;
  labelB: string;
}) {
  const [kind, setKind] = useState<RankingKind>("artists");
  // Highlighting an entry lights it up in both columns — the cheapest way to read a rank
  // jump is to see the same row at two different heights. Hover drives it for a mouse;
  // `pinned` is the path for touch and keyboard, where there is no hover to lose, and it
  // also lets you hold one artist lit while you scroll the other column looking for it.
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const activeKey = pinned ?? hovered;

  const diff = useMemo(() => buildRankingDiff(statsA, statsB, kind), [statsA, statsB, kind]);
  const metric = RANKED_BY[kind];

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {KINDS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === kind}
            onClick={() => {
              setKind(option);
              // Keys are per-ranking; carrying one across would light nothing.
              setPinned(null);
              setHovered(null);
            }}
            className={cn(
              "rounded-[var(--radius-sm)] px-3 py-1.5 text-xs transition-colors",
              option === kind
                ? "bg-green/15 text-green"
                : "bg-white/[0.04] text-text-secondary hover:bg-white/[0.08] hover:text-text-primary",
            )}
          >
            {RANKING_LABELS[option]}
          </button>
        ))}
        <span className="ml-auto text-[0.65rem] text-text-muted">
          ranked by {metric === "hours" ? "hours" : "plays"}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RankColumn
          slot="A"
          label={labelA}
          color={PERIOD_A_COLOR}
          rows={diff.listA}
          side="a"
          metric={metric}
          activeKey={activeKey}
          pinnedKey={pinned}
          onHover={setHovered}
          onPin={setPinned}
        />
        <RankColumn
          slot="B"
          label={labelB}
          color={PERIOD_B_COLOR}
          rows={diff.listB}
          side="b"
          metric={metric}
          activeKey={activeKey}
          pinnedKey={pinned}
          onHover={setHovered}
          onPin={setPinned}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-3 text-[0.7rem]">
        <Tally count={diff.climbed} label="climbed" className="text-green" />
        <Tally count={diff.fell} label="fell" className="text-negative" />
        <Tally count={diff.held} label="held" className="text-text-secondary" />
        <Tally count={diff.entered} label="entered" className="text-gold" />
        <Tally count={diff.left} label="dropped out" className="text-text-muted" />
      </div>

      <p className="mt-2 text-[0.7rem] leading-relaxed text-text-muted">
        Movement is measured inside the top {diff.topSize} each period exposes, matched on
        name. “Entered” means new to that top {diff.topSize} — not necessarily a first-ever
        play — and “dropped out” likewise only means it fell below the cut. Select an entry
        to hold it highlighted in both columns.
      </p>
    </div>
  );
}

function Tally({
  count,
  label,
  className,
}: {
  count: number;
  label: string;
  className: string;
}) {
  return (
    <span className={cn("flex items-center gap-1", count === 0 && "opacity-40")}>
      <span className={cn("font-[family-name:var(--font-display)] font-bold", className)}>
        {count}
      </span>
      <span className="text-text-muted">{label}</span>
    </span>
  );
}

function RankColumn({
  slot,
  label,
  color,
  rows,
  side,
  metric,
  activeKey,
  pinnedKey,
  onHover,
  onPin,
}: {
  slot: "A" | "B";
  label: string;
  color: string;
  rows: RankingDiffRow[];
  side: "a" | "b";
  metric: "hours" | "plays";
  activeKey: string | null;
  pinnedKey: string | null;
  onHover: (key: string | null) => void;
  onPin: (key: string | null) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: color }}
          aria-hidden="true"
        />
        <span className="text-[0.6rem] font-medium uppercase tracking-[0.14em] text-text-muted">
          {slot}
        </span>
        <span className="truncate font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
          {label}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[var(--radius-sm)] border border-dashed border-border px-3 py-6 text-center text-xs text-text-muted">
          Nothing played in this period.
        </p>
      ) : (
        <ol className="space-y-0.5">
          {rows.map((row) => {
            const rank = side === "a" ? row.rankA : row.rankB;
            const value =
              side === "a"
                ? metric === "hours"
                  ? row.hoursA
                  : row.playsA
                : metric === "hours"
                  ? row.hoursB
                  : row.playsB;
            const active = activeKey === row.key;
            const isPinned = pinnedKey === row.key;
            return (
              <li key={row.key}>
                <button
                  type="button"
                  aria-pressed={isPinned}
                  onMouseEnter={() => onHover(row.key)}
                  onMouseLeave={() => onHover(null)}
                  onFocus={() => onHover(row.key)}
                  onBlur={() => onHover(null)}
                  onClick={() => onPin(isPinned ? null : row.key)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left transition-colors",
                    active ? "bg-white/[0.07]" : "hover:bg-white/[0.04]",
                  )}
                >
                  <span className="w-5 shrink-0 text-right font-[family-name:var(--font-display)] text-xs font-bold text-text-muted">
                    {rank}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-text-primary">
                      {row.label}
                    </span>
                    {row.sublabel && (
                      <span className="block truncate text-[0.65rem] text-text-muted">
                        {row.sublabel}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[0.7rem] text-text-secondary tabular-nums">
                    {value === null
                      ? "—"
                      : metric === "hours"
                        ? formatHours(value)
                        : `${formatNumber(value)}×`}
                  </span>
                  <MovementChip row={row} side={side} />
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

const MOVEMENT_STYLE: Record<Movement, string> = {
  up: "border-green/25 bg-green/10 text-green",
  down: "border-negative/25 bg-negative-dim text-negative",
  same: "border-transparent text-text-muted",
  new: "border-gold/30 bg-gold-dim text-gold",
  gone: "border-border bg-white/[0.04] text-text-muted",
};

/**
 * A's column only flags what disappeared; B's column carries the full movement, since B is
 * the "after" state everyone reads first.
 */
function MovementChip({ row, side }: { row: RankingDiffRow; side: "a" | "b" }) {
  if (side === "a") {
    if (row.movement !== "gone") {
      return <span className="w-11 shrink-0" aria-hidden="true" />;
    }
    return (
      <span
        className={cn(
          "w-11 shrink-0 rounded-full border px-1.5 py-0.5 text-center text-[0.6rem] font-semibold",
          MOVEMENT_STYLE.gone,
        )}
        title={`Dropped out of the ${row.rankA ? "top list" : "list"} in period B`}
      >
        OUT
      </span>
    );
  }

  if (row.movement === "new") {
    return (
      <span
        className={cn(
          "w-11 shrink-0 rounded-full border px-1.5 py-0.5 text-center text-[0.6rem] font-semibold",
          MOVEMENT_STYLE.new,
        )}
        title="New to the top list in period B"
      >
        NEW
      </span>
    );
  }

  const change = row.rankChange ?? 0;
  const glyph = change > 0 ? "▲" : change < 0 ? "▼" : "–";
  const movement: Movement = change > 0 ? "up" : change < 0 ? "down" : "same";

  return (
    <span
      className={cn(
        "w-11 shrink-0 rounded-full border px-1.5 py-0.5 text-center text-[0.6rem] font-semibold tabular-nums",
        MOVEMENT_STYLE[movement],
      )}
      title={
        change === 0
          ? `Held rank ${row.rankB}`
          : `Moved from ${row.rankA} to ${row.rankB}`
      }
    >
      <span aria-hidden="true">{glyph}</span>
      {change === 0 ? "" : ` ${Math.abs(change)}`}
      <span className="sr-only">
        {change === 0 ? "held rank" : change > 0 ? "climbed" : "fell"}
      </span>
    </span>
  );
}
