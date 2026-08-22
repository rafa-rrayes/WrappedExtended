"use client";

import type { DashboardDetail } from "@/types/dashboard";
import { SharePanel } from "@/components/dashboard/share-panel";
import { ExportPanel } from "@/components/dashboard/export-panel";
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
import { BarChartRace } from "@/components/dashboard/bar-chart-race";
import { SocialBenchmarks } from "@/components/dashboard/social-benchmarks";
import { SearchBar } from "@/components/dashboard/search/search-bar";
import { TimeMachineToolbar } from "@/components/dashboard/time-machine/time-machine-toolbar";
import { useTimeMachineStore } from "@/lib/stores/time-machine";

/**
 * The single-scroll "Wrapped story".
 *
 * Rendered by `StoryView` on the owner's `/dashboard/{id}/story` and on the public
 * `/shared/{slug}/story` + `/demo/story`. The search bar, Time Machine toolbar and social
 * benchmarks work on every one of them (the feature endpoints accept anonymous reads of a
 * public dashboard); only the share and export panels are the owner's, hence `isOwner`.
 *
 * The interactive tools that used to float over this scroll (chart builder, what-if,
 * journey replay) now live on `/dashboard/{id}/lab` as a real page.
 */

interface DashboardContentProps {
  data: DashboardDetail;
  /** Shows the share and export panels — actions only the dashboard's owner has. */
  isOwner?: boolean;
  onUpdate?: () => void;
}

export function DashboardContent({
  data,
  isOwner = false,
  onUpdate,
}: DashboardContentProps) {
  const timeMachine = useTimeMachineStore();

  // Use time-machine filtered data when active, otherwise base data
  const stats = timeMachine.active && timeMachine.filteredData
    ? timeMachine.filteredData
    : data.dashboard_data;

  return (
    <>
      {isOwner && (
        <div className="max-w-[1280px] mx-auto px-6 flex justify-end gap-2 pt-16">
          <ExportPanel data={data} />
          <SharePanel
            dashboardId={data.id}
            isPublic={data.is_public}
            shareSlug={data.share_slug}
            onUpdate={onUpdate ?? (() => {})}
          />
        </div>
      )}

      {/* Feature toolbar — takes the share row's top spacing when there is no share row. */}
      <div
        className={`max-w-[1280px] mx-auto px-6 flex flex-wrap items-center gap-2 ${isOwner ? "pt-4" : "pt-16"}`}
      >
        <SearchBar data={stats} dashboardId={data.id} />
        <TimeMachineToolbar
          dashboardId={data.id}
          dateRangeStart={data.date_range_start}
          dateRangeEnd={data.date_range_end}
        />
      </div>

      <div id="dashboard-content">
        <div data-section="hero-stats">
          <HeroStats
            totalHours={timeMachine.active && timeMachine.filteredData ? stats.total_hours : data.total_hours}
            totalStreams={timeMachine.active && timeMachine.filteredData ? stats.total_streams : data.total_streams}
            uniqueArtists={timeMachine.active && timeMachine.filteredData ? stats.unique_artists : data.unique_artists}
            uniqueTracks={timeMachine.active && timeMachine.filteredData ? stats.unique_tracks : data.unique_tracks}
            dateRangeStart={data.date_range_start}
            dateRangeEnd={data.date_range_end}
          />
        </div>
        <div className="max-w-[1280px] mx-auto px-6 pb-20">
          <div data-section="top-artists"><TopArtistsChart artists={stats.top_artists ?? []} /></div>
          <div data-section="top-tracks"><TopTracksTable tracks={stats.top_tracks ?? []} /></div>
          <div data-section="top-albums"><TopAlbums albums={stats.top_albums ?? []} /></div>
          <div data-section="listening-timeline">
            <ListeningTimeline
              monthlyHours={stats.monthly_hours ?? []}
              yearlyStats={stats.yearly_stats}
            />
          </div>
          <div data-section="year-over-year"><YearOverYear data={stats.year_over_year ?? []} /></div>
          <div data-section="when-you-listen">
            <WhenYouListen
              hourlyDistribution={stats.hourly_distribution ?? []}
              weekdayDistribution={stats.weekday_distribution ?? []}
              dailyActivity={stats.daily_activity_pattern}
              seasonalPatterns={stats.seasonal_patterns}
            />
          </div>
          <div data-section="hour-day-heatmap"><HourDayHeatmap data={stats.hour_day_heatmap ?? []} /></div>
          <div data-section="calendar-heatmap"><CalendarHeatmap data={stats.calendar_heatmap ?? []} /></div>
          <div data-section="artist-discovery"><ArtistDiscoveryTimeline data={stats.artist_discovery_timeline ?? []} /></div>
          <div data-section="song-obsession"><SongObsession data={stats.song_monthly_breakdown ?? []} /></div>
          <div data-section="listening-habits">
            <ListeningHabits
              shufflePct={stats.shuffle_pct}
              skipPct={stats.skip_pct}
              offlinePct={stats.offline_pct}
              incognitoPct={stats.incognito_pct}
              completion={stats.completion_distribution}
              streaks={stats.listening_streaks}
            />
          </div>
          <div data-section="platform-breakdown">
            <PlatformBreakdown
              platformHours={stats.platform_hours}
              contentTypes={stats.content_type_distribution}
            />
          </div>
          <div data-section="skip-analysis">
            <SkipAnalysis
              skipRateByArtist={stats.skip_rate_by_artist}
              skipRateScatter={stats.skip_rate_scatter}
              completionRates={stats.track_completion_rates}
            />
          </div>
          <div data-section="geographic">
            <GeographicListening
              countries={stats.country_distribution}
              travelMusic={stats.travel_music}
            />
          </div>
          <div data-section="nostalgia">
            <NostalgiaDiscovery
              nostalgiaTracks={stats.nostalgia_tracks}
              discoveryRate={stats.discovery_rate}
              musicLifecycle={stats.music_lifecycle}
            />
          </div>
          <div data-section="deep-stats">
            <DeepStats
              summary={stats.statistics_summary}
              diversity={stats.diversity_score}
            />
          </div>
          <div data-section="personality"><PersonalityProfile data={stats} /></div>
          <div data-section="achievements"><AchievementsGrid data={stats} /></div>

          {stats.mood_timeline && stats.mood_timeline.length > 0 && (
            <div data-section="mood-timeline"><MoodTimeline data={stats.mood_timeline} /></div>
          )}

          <div data-section="social-benchmarks"><SocialBenchmarks dashboardId={data.id} /></div>

          {stats.weekend_vs_weekday && (
            <div data-section="weekend-weekday"><WeekendWeekday data={stats.weekend_vs_weekday} /></div>
          )}
          {stats.late_night_analysis && (
            <div data-section="late-night"><LateNight data={stats.late_night_analysis} /></div>
          )}
          <div data-section="bar-chart-race">
            <BarChartRace
              artistMonthHeatmap={stats.artist_month_heatmap}
              songMonthlyBreakdown={stats.song_monthly_breakdown}
              artistDailyHeatmap={stats.artist_daily_heatmap}
              songDailyBreakdown={stats.song_daily_breakdown}
            />
          </div>
          <div data-section="your-wrapped"><YourWrapped data={stats.wrapped_summaries ?? {}} /></div>
        </div>
      </div>
    </>
  );
}
