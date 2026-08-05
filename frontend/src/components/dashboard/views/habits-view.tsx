"use client";

import { ListeningHabits } from "@/components/dashboard/listening-habits";
import { PlatformBreakdown } from "@/components/dashboard/platform-breakdown";
import { SkipAnalysis } from "@/components/dashboard/skip-analysis";
import { WeekendWeekday } from "@/components/dashboard/weekend-weekday";
import { LateNight } from "@/components/dashboard/late-night";
import { GeographicListening } from "@/components/dashboard/geographic-listening";
import { DeepStats } from "@/components/dashboard/deep-stats";
import { ScopeNotice, ViewHeader, ViewPage } from "./view-shell";
import { EmptySection, SectionSkeleton, ViewSection, hasAnyStat } from "./view-section";
import { useScopedStats } from "./use-scoped-stats";

export function HabitsView() {
  const { stats, from, to, isFiltered, isLoading, failed } = useScopedStats();

  return (
    <ViewPage>
      <ViewHeader
        eyebrow="Habits"
        title={
          <>
            How you <span className="text-gold">press play</span>
          </>
        }
        description="Shuffle, skips, devices, weekends, late nights and the places you were listening from — the behaviour behind the numbers."
        actions={
          <ScopeNotice from={from} to={to} isFiltered={isFiltered} failed={failed} />
        }
      />

      {isLoading ? (
        <SectionSkeleton count={3} />
      ) : (
        <>
          <ViewSection
            title="Listening habits"
            available={hasAnyStat(
              stats.shuffle_pct,
              stats.skip_pct,
              stats.offline_pct,
              stats.incognito_pct,
              stats.completion_distribution,
              stats.listening_streaks,
            )}
          >
            <ListeningHabits
              shufflePct={stats.shuffle_pct}
              skipPct={stats.skip_pct}
              offlinePct={stats.offline_pct}
              incognitoPct={stats.incognito_pct}
              completion={stats.completion_distribution}
              streaks={stats.listening_streaks}
            />
          </ViewSection>

          <ViewSection
            title="Platforms"
            available={hasAnyStat(stats.platform_hours, stats.content_type_distribution)}
          >
            <PlatformBreakdown
              platformHours={stats.platform_hours}
              contentTypes={stats.content_type_distribution}
            />
          </ViewSection>

          <ViewSection
            title="Skips"
            available={hasAnyStat(
              stats.skip_rate_by_artist,
              stats.skip_rate_scatter,
              stats.track_completion_rates,
            )}
          >
            <SkipAnalysis
              skipRateByArtist={stats.skip_rate_by_artist}
              skipRateScatter={stats.skip_rate_scatter}
              completionRates={stats.track_completion_rates}
            />
          </ViewSection>

          {stats.weekend_vs_weekday ? (
            <WeekendWeekday data={stats.weekend_vs_weekday} />
          ) : (
            <EmptySection title="Weekend vs weekday" />
          )}

          {stats.late_night_analysis ? (
            <LateNight data={stats.late_night_analysis} />
          ) : (
            <EmptySection title="Late night" />
          )}

          <ViewSection
            title="Geography"
            available={hasAnyStat(stats.country_distribution, stats.travel_music)}
          >
            <GeographicListening
              countries={stats.country_distribution}
              travelMusic={stats.travel_music}
            />
          </ViewSection>

          <ViewSection
            title="Deep stats"
            available={hasAnyStat(stats.statistics_summary, stats.diversity_score)}
          >
            <DeepStats summary={stats.statistics_summary} diversity={stats.diversity_score} />
          </ViewSection>
        </>
      )}
    </ViewPage>
  );
}
