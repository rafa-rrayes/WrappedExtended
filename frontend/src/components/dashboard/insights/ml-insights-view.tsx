"use client";

import type { MLInsights } from "@/types/dashboard";
import { formatHours, formatNumber } from "@/lib/utils";
import { useDateRange } from "@/lib/hooks/use-date-range";
import { ScopeIgnoredNotice, ViewHeader } from "@/components/dashboard/views/view-shell";
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
  // The models are fitted server-side against the whole export; there is no filtered
  // variant to fetch. Say so rather than let the top-bar picker look broken.
  const { isFiltered } = useDateRange();

  return (
    <div className="space-y-12">
      <div>
        <ViewHeader
          eyebrow="Insights"
          title={
            <>
              What the <span className="text-gold">models</span> found
            </>
          }
          description="Five models trained on your history — where your taste clusters, how you listen, what makes you skip, and where it's all heading."
          actions={
            <>
              <ScopeIgnoredNotice
                isFiltered={isFiltered}
                title="The models are trained once against your full history, so a date filter can't be applied to their output."
              >
                Date filter not applied
              </ScopeIgnoredNotice>
              <button
                type="button"
                onClick={onRerun}
                disabled={busy}
                className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-text-secondary transition-colors hover:border-text-muted hover:text-text-primary disabled:opacity-50"
              >
                {isRunning ? "Analysis running…" : isRerunning ? "Starting…" : "Re-run analysis"}
              </button>
            </>
          }
        />

        {rerunError ? (
          <p className="-mt-2 mb-5 text-sm text-gold" role="alert">
            {rerunError}
          </p>
        ) : null}

        {notice ? <div className="mb-5">{notice}</div> : null}

        {summary ? (
          <MlPanel className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
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
      </div>

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
