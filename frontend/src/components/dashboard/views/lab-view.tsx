"use client";

import { useEffect, type ReactNode } from "react";
import { ChartBuilderModal } from "@/components/dashboard/chart-builder/chart-builder-modal";
import { WhatIfPanel } from "@/components/dashboard/what-if/what-if-panel";
import { ReplayOverlay } from "@/components/dashboard/replay/replay-overlay";
import { useDashboardContext } from "@/components/dashboard/shell/dashboard-context";
import { useChartBuilderStore, type ChartType } from "@/lib/stores/chart-builder";
import { useWhatIfStore } from "@/lib/stores/what-if";
import { useReplayStore } from "@/lib/stores/replay";
import { recalculateWithout } from "@/lib/utils/what-if-recalculator";
import { formatHours } from "@/lib/utils";
import { ViewHeader, ViewPage } from "./view-shell";
import { EmptySection, hasStat } from "./view-section";

/**
 * The three interactive tools, promoted off the old floating-button cluster.
 *
 * Each tool keeps its own component and zustand store untouched; this page is the real UI
 * that drives them — state summaries, quick actions and launchers — instead of an
 * anonymous circle in the bottom-right corner.
 */

interface ChartPreset {
  label: string;
  hint: string;
  metric: string;
  groupBy: string;
  chartType: ChartType;
  limit: number;
}

const CHART_PRESETS: ChartPreset[] = [
  { label: "Top artists by hours", hint: "bar · 20", metric: "hours", groupBy: "artist_name", chartType: "bar", limit: 20 },
  { label: "Hours by year", hint: "line · all", metric: "hours", groupBy: "year", chartType: "line", limit: 30 },
  { label: "Plays by hour of day", hint: "area · 24", metric: "plays", groupBy: "hour", chartType: "area", limit: 24 },
  { label: "Hours by platform", hint: "pie · 10", metric: "hours", groupBy: "platform", chartType: "pie", limit: 10 },
];

const REPLAY_SPEEDS = [0.5, 1, 2, 5, 10];

const QUICK_EXCLUDE_COUNT = 6;

export function LabView() {
  const { dashboardId, stats } = useDashboardContext();
  const chartBuilder = useChartBuilderStore();
  const whatIf = useWhatIfStore();
  const replay = useReplayStore();

  // Leaving the page should not leave a tool half-open waiting behind the next route.
  useEffect(() => {
    return () => {
      useChartBuilderStore.getState().setOpen(false);
      useWhatIfStore.getState().setOpen(false);
      useReplayStore.getState().setActive(false);
      useReplayStore.getState().setPlaying(false);
    };
  }, []);

  const topArtists = stats.top_artists ?? [];
  const calendar = stats.calendar_heatmap ?? [];
  const impact =
    whatIf.excludeArtists.length > 0 ? recalculateWithout(stats, whatIf.excludeArtists) : null;

  return (
    <ViewPage>
      <ViewHeader
        eyebrow="Lab"
        title={
          <>
            Ask your history <span className="text-gold">your own questions</span>
          </>
        }
        description="Three tools that go past the pre-computed charts: build a chart from any metric, remove artists to see what's left, and replay the whole thing day by day."
      />

      <div className="space-y-4">
        {/* ── Chart builder ────────────────────────────────────────────── */}
        <LabPanel
          title="Chart Builder"
          description="Pick a metric and a grouping, and the query engine aggregates your raw streams into a chart that isn't on any other page."
          icon={
            <>
              <path d="M3 3v18h18" />
              <path d="M7 16l4-8 4 4 6-10" />
            </>
          }
          action={
            <button
              type="button"
              onClick={() => chartBuilder.setOpen(true)}
              className="rounded-full bg-green px-5 py-2 text-sm font-semibold text-bg-deep transition-opacity hover:opacity-90"
            >
              Open builder
            </button>
          }
        >
          <div className="mb-3 flex flex-wrap gap-2 text-xs text-text-muted">
            <StateChip label="Metric" value={chartBuilder.config.metric.replace("_", " ")} />
            <StateChip label="Group by" value={chartBuilder.config.groupBy.replace("_name", "").replace("_", " ")} />
            <StateChip label="Type" value={chartBuilder.config.chartType} />
            <StateChip label="Limit" value={String(chartBuilder.config.limit)} />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CHART_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  chartBuilder.setConfig({
                    metric: preset.metric,
                    groupBy: preset.groupBy,
                    chartType: preset.chartType,
                    limit: preset.limit,
                  });
                  chartBuilder.setOpen(true);
                }}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-border bg-bg-elevated px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:border-green/40 hover:text-text-primary"
              >
                <span className="truncate">{preset.label}</span>
                <span className="shrink-0 text-[0.65rem] uppercase tracking-wider text-text-muted">
                  {preset.hint}
                </span>
              </button>
            ))}
          </div>
        </LabPanel>

        {/* ── What if ──────────────────────────────────────────────────── */}
        <LabPanel
          title="What If…?"
          description="Take artists out of your history and watch the totals move. Useful for the one artist that ate your whole year."
          icon={<path d="m15 4-1 8h6l-9 12 1-8H6z" />}
          action={
            <div className="flex items-center gap-2">
              {whatIf.excludeArtists.length > 0 && (
                <button
                  type="button"
                  onClick={() => whatIf.reset()}
                  className="rounded-full border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => whatIf.setOpen(true)}
                disabled={topArtists.length === 0}
                className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-bg-deep transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Open panel
              </button>
            </div>
          }
        >
          {topArtists.length === 0 ? (
            <p className="text-sm text-text-muted">
              This export has no artist totals to exclude.
            </p>
          ) : (
            <>
              <div className="mb-3 text-xs uppercase tracking-wider text-text-muted">
                Quick exclude
              </div>
              <div className="flex flex-wrap gap-2">
                {topArtists.slice(0, QUICK_EXCLUDE_COUNT).map((artist) => {
                  const excluded = whatIf.excludeArtists.includes(artist.artist_name);
                  return (
                    <button
                      key={artist.artist_name}
                      type="button"
                      onClick={() => whatIf.toggleArtist(artist.artist_name)}
                      aria-pressed={excluded}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        excluded
                          ? "border-gold/50 bg-gold-dim text-gold line-through"
                          : "border-border bg-bg-elevated text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {artist.artist_name}
                    </button>
                  );
                })}
              </div>

              {impact && (
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {impact.deltas.map((delta) => (
                    <div
                      key={delta.field}
                      className="rounded-[var(--radius-sm)] border border-border bg-bg-elevated px-3 py-2"
                    >
                      <div className="text-[0.65rem] uppercase tracking-wider text-text-muted">
                        {delta.field}
                      </div>
                      <div className="mt-0.5 text-sm text-text-primary">
                        {Math.round(delta.modified).toLocaleString()}
                        <span className="ml-2 text-xs text-gold">
                          {delta.deltaPct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </LabPanel>

        {/* ── Journey replay ───────────────────────────────────────────── */}
        <LabPanel
          title="Journey Replay"
          description="Scrub through your history one day at a time, with first listens surfacing as milestones along the way."
          icon={<polygon points="5 3 19 12 5 21" />}
          action={
            <button
              type="button"
              onClick={() => {
                replay.setActive(true);
                replay.setPlaying(true);
              }}
              disabled={!hasStat(calendar)}
              className="rounded-full bg-green px-5 py-2 text-sm font-semibold text-bg-deep transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Start replay
            </button>
          }
        >
          {!hasStat(calendar) ? (
            <p className="text-sm text-text-muted">
              Replay needs the daily calendar data, which this export doesn&apos;t include.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-wrap gap-2 text-xs text-text-muted">
                <StateChip label="Days" value={calendar.length.toLocaleString()} />
                <StateChip label="From" value={calendar[0]?.date ?? "—"} />
                <StateChip label="To" value={calendar[calendar.length - 1]?.date ?? "—"} />
                <StateChip label="Total" value={formatHours(stats.total_hours)} />
              </div>
              <label className="ml-auto flex items-center gap-2 text-xs text-text-muted">
                Speed
                <select
                  value={replay.speed}
                  onChange={(event) => replay.setSpeed(Number(event.target.value))}
                  className="rounded-[var(--radius-sm)] border border-border bg-bg-elevated px-2 py-1 text-sm text-text-primary"
                >
                  {REPLAY_SPEEDS.map((speed) => (
                    <option key={speed} value={speed}>
                      {speed}x
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </LabPanel>

        {topArtists.length === 0 && !hasStat(calendar) && !hasStat(stats.top_tracks) && (
          <EmptySection
            title="Nothing to experiment with yet"
            note="The lab runs on the same data as the rest of the dashboard, and this export came back empty."
          />
        )}
      </div>

      {/* The tools themselves — unchanged components, now launched from the page. */}
      <ChartBuilderModal dashboardId={dashboardId} />
      <WhatIfPanel dashboardId={dashboardId} data={stats} />
      <ReplayOverlay data={stats} />
    </ViewPage>
  );
}

/* ── Pieces ────────────────────────────────────────────────────────────────── */

function LabPanel({
  title,
  description,
  icon,
  action,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  action: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-bg-card p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-elevated text-green">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {icon}
            </svg>
          </span>
          <div className="min-w-0">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-text-primary">
              {title}
            </h2>
            <p className="mt-1 max-w-xl text-sm text-text-secondary">{description}</p>
          </div>
        </div>
        <div className="shrink-0">{action}</div>
      </div>
      {children}
    </section>
  );
}

function StateChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-border bg-bg-elevated px-2.5 py-1">
      <span className="uppercase tracking-wider text-text-muted">{label}</span>{" "}
      <span className="text-text-secondary">{value}</span>
    </span>
  );
}
