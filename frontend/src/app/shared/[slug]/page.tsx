"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import type { DashboardDetail } from "@/types/dashboard";
import { HeroStats } from "@/components/dashboard/hero-stats";
import { TopArtistsChart } from "@/components/dashboard/top-artists-chart";
import { TopTracksTable } from "@/components/dashboard/top-tracks-table";
import { TopAlbums } from "@/components/dashboard/top-albums";
import { ListeningTimeline } from "@/components/dashboard/listening-timeline";
import { YearOverYear } from "@/components/dashboard/year-over-year";
import { WhenYouListen } from "@/components/dashboard/when-you-listen";
import { HourDayHeatmap } from "@/components/dashboard/hour-day-heatmap";
import { CalendarHeatmap } from "@/components/dashboard/calendar-heatmap";
import { ArtistDiscoveryTimeline } from "@/components/dashboard/artist-discovery";
import { SongObsession } from "@/components/dashboard/song-obsession";
import { ListeningHabits } from "@/components/dashboard/listening-habits";
import { PlatformBreakdown } from "@/components/dashboard/platform-breakdown";
import { SkipAnalysis } from "@/components/dashboard/skip-analysis";
import { GeographicListening } from "@/components/dashboard/geographic-listening";
import { NostalgiaDiscovery } from "@/components/dashboard/nostalgia-discovery";
import { DeepStats } from "@/components/dashboard/deep-stats";
import { WeekendWeekday } from "@/components/dashboard/weekend-weekday";
import { LateNight } from "@/components/dashboard/late-night";
import { YourWrapped } from "@/components/dashboard/your-wrapped";

export default function SharedDashboardPage() {
  const params = useParams<{ slug: string }>();
  const { data, error, isLoading } = useSWR<DashboardDetail>(
    params.slug ? `/shared/${params.slug}` : null,
    () => apiClient.getPublicDashboard(params.slug),
  );

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-text-muted animate-pulse">
          Loading shared dashboard...
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center pt-14">
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold mb-4">
            Dashboard Not Found
          </h1>
          <p className="text-text-secondary mb-6">
            This dashboard doesn&apos;t exist or isn&apos;t public.
          </p>
          <Link href="/" className="text-green hover:underline">
            Go home
          </Link>
        </div>
      </main>
    );
  }

  const stats = data.dashboard_data;

  return (
    <>
      {/* Shared badge */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40">
        <span className="bg-green/20 text-green text-xs font-medium px-4 py-1.5 rounded-full border border-green/30">
          Shared Dashboard
        </span>
      </div>

      <HeroStats
        totalHours={data.total_hours}
        totalStreams={data.total_streams}
        uniqueArtists={data.unique_artists}
        uniqueTracks={data.unique_tracks}
        dateRangeStart={data.date_range_start}
        dateRangeEnd={data.date_range_end}
      />

      <div className="max-w-[1280px] mx-auto px-6 pb-20">
        <TopArtistsChart artists={stats.top_artists ?? []} />
        <TopTracksTable tracks={stats.top_tracks ?? []} />
        <TopAlbums albums={stats.top_albums ?? []} />
        <ListeningTimeline
          monthlyHours={stats.monthly_hours ?? []}
          yearlyStats={stats.yearly_stats}
        />
        <YearOverYear data={stats.year_over_year ?? []} />
        <WhenYouListen
          hourlyDistribution={stats.hourly_distribution ?? []}
          weekdayDistribution={stats.weekday_distribution ?? []}
          dailyActivity={stats.daily_activity_pattern}
          seasonalPatterns={stats.seasonal_patterns}
        />
        <HourDayHeatmap data={stats.hour_day_heatmap ?? []} />
        <CalendarHeatmap data={stats.calendar_heatmap ?? []} />
        <ArtistDiscoveryTimeline data={stats.artist_discovery_timeline ?? []} />
        <SongObsession data={stats.song_monthly_breakdown ?? []} />
        <ListeningHabits
          shufflePct={stats.shuffle_pct}
          skipPct={stats.skip_pct}
          offlinePct={stats.offline_pct}
          incognitoPct={stats.incognito_pct}
          completion={stats.completion_distribution}
          streaks={stats.listening_streaks}
        />
        <PlatformBreakdown
          platformHours={stats.platform_hours}
          contentTypes={stats.content_type_distribution}
        />
        <SkipAnalysis
          skipRateByArtist={stats.skip_rate_by_artist}
          skipRateScatter={stats.skip_rate_scatter}
          completionRates={stats.track_completion_rates}
        />
        <GeographicListening
          countries={stats.country_distribution}
          travelMusic={stats.travel_music}
        />
        <NostalgiaDiscovery
          nostalgiaTracks={stats.nostalgia_tracks}
          discoveryRate={stats.discovery_rate}
          musicLifecycle={stats.music_lifecycle}
        />
        <DeepStats
          summary={stats.statistics_summary}
          diversity={stats.diversity_score}
        />
        {stats.weekend_vs_weekday && (
          <WeekendWeekday data={stats.weekend_vs_weekday} />
        )}
        {stats.late_night_analysis && (
          <LateNight data={stats.late_night_analysis} />
        )}
        <YourWrapped data={stats.wrapped_summaries ?? {}} />

        {/* CTA */}
        <div className="mt-12 text-center py-12 border-t border-border">
          <p className="text-text-secondary mb-4">
            Want to analyze your own Spotify history?
          </p>
          <Link
            href="/"
            className="bg-green hover:bg-green/90 text-bg-deep font-semibold px-8 py-3 rounded-full transition-all"
          >
            Create Your Own Dashboard
          </Link>
        </div>
      </div>
    </>
  );
}
