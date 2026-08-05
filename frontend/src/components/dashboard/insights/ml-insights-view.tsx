"use client";

import type { MLInsights } from "@/types/dashboard";
import { formatHours, formatNumber } from "@/lib/utils";
import { MlPanel, MlStat, formatPercent } from "./ml-primitives";
import { TasteMapSection } from "./taste-map-section";
import { ListeningModesSection } from "./listening-modes-section";
import { SkipDriversSection } from "./skip-drivers-section";
import { ForecastSection } from "./forecast-section";
import { SequenceModelSection } from "./sequence-model-section";
import { SimilarArtistsSection } from "./similar-artists-section";

const SECTION_LINKS = [
  { href: "#taste-map", label: "Taste map" },
  { href: "#listening-modes", label: "Listening modes" },
  { href: "#skip-drivers", label: "Skip drivers" },
  { href: "#forecast", label: "Forecast" },
  { href: "#next-artist", label: "Next artist" },
  { href: "#similar-artists", label: "Neighbours" },
];

/**
 * The `ready` state: every model rendered, each one independently guarded.
 *
 * `summary` is the only field guaranteed to exist. Everything below it decides for itself
 * whether it has something to draw, so one missing model never takes the page with it.
 */
export function MlInsightsView({
  dashboardId,
  insights,
  onRerun,
  isRerunning,
  isRunning,
  rerunError,
  notice,
}: {
  dashboardId: string;
  insights: MLInsights;
  onRerun: () => void;
  /** The enqueue request itself is in flight. */
  isRerunning: boolean;
  /** A run is already executing server-side — these results are the previous ones. */
  isRunning?: boolean;
  rerunError: string | null;
  /** Banner for a re-run in flight or a re-run that failed over a still-good payload. */
  notice?: React.ReactNode;
}) {
  const summary = insights.summary;
  const busy = isRerunning || Boolean(isRunning);

  return (
    <div className="space-y-12">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="mb-1.5 block font-[family-name:var(--font-display)] text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-green">
              Insights
            </span>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-text-primary sm:text-3xl">
              What the models found
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-text-secondary">
              Five models trained on your history — where your taste clusters, how you listen,
              what makes you skip, and where it&apos;s all heading.
            </p>
          </div>
          <div className="text-right">
            <button
              type="button"
              onClick={onRerun}
              disabled={busy}
              className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-text-secondary transition-colors hover:border-text-muted hover:text-text-primary disabled:opacity-50"
            >
              {isRunning ? "Analysis running…" : isRerunning ? "Starting…" : "Re-run analysis"}
            </button>
            {rerunError ? (
              <p className="mt-2 max-w-[220px] text-xs text-gold" role="alert">
                {rerunError}
              </p>
            ) : null}
          </div>
        </div>

        {notice ? <div className="mt-5">{notice}</div> : null}

        {summary ? (
          <MlPanel className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <MlStat
              label="Plays analysed"
              value={formatNumber(summary.rows ?? 0)}
              accent="green"
            />
            <MlStat label="Hours" value={formatHours(summary.total_hours ?? 0)} />
            <MlStat label="Artists" value={formatNumber(summary.unique_artists ?? 0)} />
            <MlStat label="Tracks" value={formatNumber(summary.unique_tracks ?? 0)} />
            <MlStat label="Sessions" value={formatNumber(summary.sessions ?? 0)} />
            <MlStat
              label="Skip rate"
              value={formatPercent(summary.skip_rate ?? 0)}
              accent="gold"
            />
          </MlPanel>
        ) : null}

        <nav
          aria-label="Insight sections"
          className="mt-4 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
        >
          {SECTION_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-white/15 hover:text-text-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </header>

      <TasteMapSection dashboardId={dashboardId} embeddings={insights.embeddings} />
      <ListeningModesSection clustering={insights.clustering} />
      <SkipDriversSection skipModel={insights.skip_model} />
      <ForecastSection forecast={insights.forecast} />
      <SequenceModelSection
        dashboardId={dashboardId}
        sequenceModel={insights.sequence_model}
      />
      <SimilarArtistsSection dashboardId={dashboardId} embeddings={insights.embeddings} />
    </div>
  );
}
