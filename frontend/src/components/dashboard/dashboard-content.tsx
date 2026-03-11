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
import { PersonalityProfile } from "@/components/dashboard/personality-profile";
import { AchievementsGrid } from "@/components/dashboard/achievements-grid";
import { MoodTimeline } from "@/components/dashboard/mood-timeline";
import { SocialBenchmarks } from "@/components/dashboard/social-benchmarks";
import { SearchBar } from "@/components/dashboard/search/search-bar";
import { ChartBuilderModal } from "@/components/dashboard/chart-builder/chart-builder-modal";
import { WhatIfPanel } from "@/components/dashboard/what-if/what-if-panel";
import { WidgetExportModal } from "@/components/dashboard/widgets/widget-export";
import { TimeMachineToolbar } from "@/components/dashboard/time-machine/time-machine-toolbar";
import { ReplayOverlay } from "@/components/dashboard/replay/replay-overlay";
import { useTimeMachineStore } from "@/lib/stores/time-machine";
import { useChartBuilderStore } from "@/lib/stores/chart-builder";
import { useWhatIfStore } from "@/lib/stores/what-if";
import { useReplayStore } from "@/lib/stores/replay";

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
  const timeMachine = useTimeMachineStore();
  const chartBuilder = useChartBuilderStore();
  const whatIf = useWhatIfStore();
  const replay = useReplayStore();

  // Use time-machine filtered data when active, otherwise base data
  const stats = timeMachine.active && timeMachine.filteredData
    ? timeMachine.filteredData
    : data.dashboard_data;

  const isAuthenticated = showSharePanel !== undefined;

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

      {/* Feature toolbar */}
      {isAuthenticated && (
        <div className="max-w-[1280px] mx-auto px-6 pt-4 flex flex-wrap items-center gap-2">
          <SearchBar data={stats} dashboardId={data.id} />
          <TimeMachineToolbar
            dashboardId={data.id}
            dateRangeStart={data.date_range_start}
            dateRangeEnd={data.date_range_end}
          />
        </div>
      )}

      <HeroStats
        totalHours={timeMachine.active && timeMachine.filteredData ? stats.total_hours : data.total_hours}
        totalStreams={timeMachine.active && timeMachine.filteredData ? stats.total_streams : data.total_streams}
        uniqueArtists={timeMachine.active && timeMachine.filteredData ? stats.unique_artists : data.unique_artists}
        uniqueTracks={timeMachine.active && timeMachine.filteredData ? stats.unique_tracks : data.unique_tracks}
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

        {/* New sections */}
        <PersonalityProfile data={stats} />
        <AchievementsGrid data={stats} />

        {stats.mood_timeline && stats.mood_timeline.length > 0 && (
          <MoodTimeline data={stats.mood_timeline} />
        )}

        {isAuthenticated && <SocialBenchmarks dashboardId={data.id} />}

        {stats.weekend_vs_weekday && (
          <WeekendWeekday data={stats.weekend_vs_weekday} />
        )}
        {stats.late_night_analysis && (
          <LateNight data={stats.late_night_analysis} />
        )}
        <YourWrapped data={stats.wrapped_summaries ?? {}} />
      </div>

      {/* Interactive feature overlays — authenticated only */}
      {isAuthenticated && (
        <>
          <ChartBuilderModal dashboardId={data.id} />
          <WhatIfPanel dashboardId={data.id} data={stats} />
          <WidgetExportModal />
          <ReplayOverlay data={stats} />

          {/* FAB buttons */}
          <div className="fixed bottom-6 right-6 z-[1000] flex flex-col gap-3">
            <button
              onClick={() => replay.setActive(true)}
              className="w-12 h-12 rounded-full bg-bg-card border border-border shadow-lg flex items-center justify-center text-text-muted hover:text-green hover:border-green transition-colors"
              title="Journey Replay"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21" />
              </svg>
            </button>
            <button
              onClick={() => whatIf.setOpen(true)}
              className="w-12 h-12 rounded-full bg-bg-card border border-border shadow-lg flex items-center justify-center text-text-muted hover:text-gold hover:border-gold transition-colors"
              title="What If...?"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 4-1 8h6l-9 12 1-8H6z" />
              </svg>
            </button>
            <button
              onClick={() => chartBuilder.setOpen(true)}
              className="w-12 h-12 rounded-full bg-green shadow-lg flex items-center justify-center text-black hover:bg-green/80 transition-colors"
              title="Chart Builder"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18" />
                <path d="M7 16l4-8 4 4 6-10" />
              </svg>
            </button>
          </div>
        </>
      )}
    </>
  );
}
