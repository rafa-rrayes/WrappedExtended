"use client";

import type { DashboardDetail } from "@/types/dashboard";
import { SharePanel } from "@/components/dashboard/share-panel";
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

interface DashboardContentProps {
  data: DashboardDetail;
  showSharePanel?: boolean;
  onUpdate?: () => void;
}

export function DashboardContent({
  data,
  showSharePanel,
  onUpdate,
}: DashboardContentProps) {
  const stats = data.dashboard_data;

  return (
    <>
      {showSharePanel && (
        <div className="max-w-[1280px] mx-auto px-6 flex justify-end pt-16">
          <SharePanel
            dashboardId={data.id}
            isPublic={data.is_public}
            shareSlug={data.share_slug}
            onUpdate={onUpdate ?? (() => {})}
          />
        </div>
      )}
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
      </div>
    </>
  );
}
