"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { HeroStats } from "@/components/dashboard/hero-stats";
import {
  DASHBOARD_NAV,
  NavIcon,
  navHref,
} from "@/components/dashboard/shell/nav-items";
import { useDashboardContext } from "@/components/dashboard/shell/dashboard-context";
import { useRangeHref } from "@/lib/hooks/use-date-range";
import { formatHours } from "@/lib/utils";
import type { MonthlyHour } from "@/types/dashboard";
import { ScopeNotice, ViewPage } from "./view-shell";
import { EmptySection, SectionSkeleton, hasStat } from "./view-section";
import { useScopedStats } from "./use-scoped-stats";

/** One line of orientation per destination, so the grid reads as a map, not a menu. */
const ROUTE_BLURBS: Record<string, string> = {
  "/story": "The full scroll — every section, in narrative order.",
  "/artists": "Everyone you played, ranked and drillable.",
  "/tracks": "The songs that took up the most of your year.",
  "/albums": "Albums by hours, plays and completion.",
  "/time": "Timelines, heatmaps and the shape of your calendar.",
  "/habits": "Shuffle, skips, devices, weekends and late nights.",
  "/discovery": "First listens, obsessions, mood and achievements.",
  "/compare": "Put two windows of your history side by side.",
  "/insights": "Patterns pulled out of the raw stream log.",
  "/lab": "Chart builder, what-if and journey replay.",
};

export function OverviewView() {
  const { dashboardId, dashboard } = useDashboardContext();
  const { stats, from, to, isFiltered, isLoading, failed } = useScopedStats();
  const withRange = useRangeHref();

  const topArtist = stats.top_artists?.[0];
  const topTrack = stats.top_tracks?.[0];
  const topAlbum = stats.top_albums?.[0];
  const streaks = stats.listening_streaks;
  const latestYear = pickLatestYear(stats.year_over_year);

  return (
    <ViewPage>
      {/* One action row rather than a second page title: HeroStats already carries the
          <h1> for this route, and two competing headlines is one too many. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-green">
          Overview
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <ScopeNotice from={from} to={to} isFiltered={isFiltered} failed={failed} />
          <Link
            href={withRange(navHref(dashboardId, "/story"))}
            className="rounded-full bg-green px-4 py-2 text-sm font-semibold text-bg-deep transition-opacity hover:opacity-90"
          >
            Read the story
          </Link>
        </div>
      </div>

      {/* The story hero, compacted: this is a landing screen, not the opening of a scroll,
          so the child <section>'s min-h-screen is overridden from the outside rather than
          by editing a component the story route still depends on. */}
      <div className="[&>section]:[min-height:0px] [&>section]:px-0 [&>section]:py-10">
        <HeroStats
          totalHours={stats.total_hours}
          totalStreams={stats.total_streams}
          uniqueArtists={stats.unique_artists}
          uniqueTracks={stats.unique_tracks}
          dateRangeStart={from ?? dashboard.date_range_start}
          dateRangeEnd={to ?? dashboard.date_range_end}
        />
      </div>

      {isLoading ? (
        <SectionSkeleton count={2} />
      ) : (
        <>
          {/* ── Highlights ───────────────────────────────────────────────── */}
          <h2 className="mb-4 border-b border-border pb-4 font-[family-name:var(--font-display)] text-lg font-bold text-text-primary">
            Highlights
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <HighlightCard
              eyebrow="Top artist"
              title={topArtist?.artist_name}
              meta={
                topArtist
                  ? `${formatHours(topArtist.hours)} · ${topArtist.plays.toLocaleString()} plays`
                  : undefined
              }
              href={withRange(navHref(dashboardId, "/artists"))}
              cta="All artists"
            />
            <HighlightCard
              eyebrow="Top track"
              title={topTrack?.track_name}
              meta={
                topTrack
                  ? `${topTrack.artist_name} · ${topTrack.plays.toLocaleString()} plays`
                  : undefined
              }
              href={withRange(navHref(dashboardId, "/tracks"))}
              cta="All tracks"
            />
            <HighlightCard
              eyebrow="Top album"
              title={topAlbum?.album_name}
              meta={
                topAlbum
                  ? `${topAlbum.artist_name} · ${formatHours(topAlbum.hours)}`
                  : undefined
              }
              href={withRange(navHref(dashboardId, "/albums"))}
              cta="All albums"
            />
          </div>

          {/* ── Activity + streak / year ─────────────────────────────────── */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {hasStat(stats.monthly_hours) ? (
                <ActivityCard
                  data={stats.monthly_hours}
                  href={withRange(navHref(dashboardId, "/time"))}
                />
              ) : (
                <EmptySection
                  title="Monthly activity"
                  note="This export has no month-by-month totals to plot."
                />
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <HighlightCard
                eyebrow="Current streak"
                title={streaks ? `${streaks.current_streak} days` : undefined}
                meta={
                  streaks
                    ? `Longest ${streaks.longest_streak} days · avg ${Math.round(streaks.avg_streak)}`
                    : undefined
                }
                href={withRange(navHref(dashboardId, "/habits"))}
                cta="Habits"
                emptyNote="No streak data in this export."
              />
              <HighlightCard
                eyebrow={latestYear ? `${latestYear.year} vs ${latestYear.year - 1}` : "This year"}
                title={latestYear ? formatHours(latestYear.hours) : undefined}
                meta={
                  latestYear
                    ? latestYear.change_pct === null
                      ? `${latestYear.unique_artists.toLocaleString()} artists`
                      : `${latestYear.change_pct >= 0 ? "+" : ""}${latestYear.change_pct.toFixed(0)}% on the year before`
                    : undefined
                }
                accent={
                  latestYear?.change_pct != null && latestYear.change_pct < 0 ? "gold" : "green"
                }
                href={withRange(navHref(dashboardId, "/time"))}
                cta="Timeline"
                emptyNote="No year-over-year comparison available."
              />
            </div>
          </div>

          {/* ── Where to go next ─────────────────────────────────────────── */}
          <section className="mt-12">
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-bold text-text-primary">
              Explore
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {DASHBOARD_NAV.filter((item) => item.segment !== "").map((item) => (
                <Link
                  key={item.segment}
                  href={withRange(navHref(dashboardId, item.segment))}
                  className="group flex items-start gap-3 rounded-[var(--radius-card)] border border-border bg-bg-card p-4 transition-colors hover:border-white/10 hover:bg-bg-card-hover"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-elevated text-text-secondary transition-colors group-hover:text-green">
                    <NavIcon name={item.icon} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-[family-name:var(--font-display)] text-sm font-semibold text-text-primary">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-text-muted">
                      {ROUTE_BLURBS[item.segment] ?? ""}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </ViewPage>
  );
}

/* ── Pieces ────────────────────────────────────────────────────────────────── */

function HighlightCard({
  eyebrow,
  title,
  meta,
  href,
  cta,
  accent = "green",
  emptyNote,
}: {
  eyebrow: string;
  title?: string;
  meta?: string;
  href: string;
  cta: string;
  accent?: "green" | "gold";
  emptyNote?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col justify-between rounded-[var(--radius-card)] border border-border bg-bg-card p-5 transition-colors hover:border-white/10 hover:bg-bg-card-hover"
    >
      <div className="min-w-0">
        <span
          className={`block text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${
            accent === "gold" ? "text-gold" : "text-green"
          }`}
        >
          {eyebrow}
        </span>
        <span className="mt-2 block truncate font-[family-name:var(--font-display)] text-xl font-extrabold text-text-primary">
          {title ?? "—"}
        </span>
        <span className="mt-1 block truncate text-sm text-text-secondary">
          {meta ?? emptyNote ?? "Not in this export."}
        </span>
      </div>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-text-muted transition-colors group-hover:text-text-primary">
        {cta}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}

function ActivityCard({ data, href }: { data: MonthlyHour[]; href: string }) {
  // One label per ~year keeps the axis readable on a card this size.
  const tickInterval = Math.max(1, Math.floor(data.length / 6));

  return (
    <div className="h-full rounded-[var(--radius-card)] border border-border bg-bg-card p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-base font-bold text-text-primary">
          Monthly activity
        </h2>
        <Link href={href} className="text-xs font-medium text-green hover:underline">
          Full timeline →
        </Link>
      </div>
      <ResponsiveContainer width="100%" height={190}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="overview-activity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1DB954" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#1DB954" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            interval={tickInterval}
            tickFormatter={formatMonth}
            tick={{ fill: "var(--color-text-muted)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
            }}
            labelFormatter={(value: string) => formatMonth(value)}
            formatter={(value: number) => [formatHours(value), "Listened"]}
          />
          <Area
            type="monotone"
            dataKey="hours"
            stroke="#1DB954"
            strokeWidth={2}
            fill="url(#overview-activity)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatMonth(value: string): string {
  const [year, month] = value.split("-");
  const label = MONTH_LABELS[Number(month) - 1];
  return label ? `${label} '${year.slice(2)}` : value;
}

function pickLatestYear(entries: { year: number; hours: number; unique_artists: number; change_pct: number | null }[] | undefined) {
  if (!entries?.length) return null;
  return entries.reduce((latest, entry) => (entry.year > latest.year ? entry : latest));
}
