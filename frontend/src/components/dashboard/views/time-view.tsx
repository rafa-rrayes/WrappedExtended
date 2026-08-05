"use client";

import { ListeningTimeline } from "@/components/dashboard/listening-timeline";
import { YearOverYear } from "@/components/dashboard/year-over-year";
import { WhenYouListen } from "@/components/dashboard/when-you-listen";
import { HourDayHeatmap } from "@/components/dashboard/hour-day-heatmap";
import { CalendarHeatmap } from "@/components/dashboard/calendar-heatmap";
import { BarChartRace } from "@/components/dashboard/bar-chart-race";
import { ScopeNotice, ViewHeader, ViewPage } from "./view-shell";
import { SectionSkeleton, ViewSection, hasAnyStat, hasStat } from "./view-section";
import { useScopedStats } from "./use-scoped-stats";

export function TimeView() {
  const { stats, from, to, isFiltered, isLoading, failed } = useScopedStats();

  return (
    <ViewPage>
      <ViewHeader
        eyebrow="Time"
        title={
          <>
            When your listening <span className="text-gold">actually happens</span>
          </>
        }
        description="Months, years, weekdays and hours — the shape of your history along every axis of the clock and the calendar."
        actions={
          <ScopeNotice from={from} to={to} isFiltered={isFiltered} failed={failed} />
        }
      />

      {isLoading ? (
        <SectionSkeleton count={3} />
      ) : (
        <>
          <ViewSection title="Listening timeline" available={hasStat(stats.monthly_hours)}>
            <ListeningTimeline
              monthlyHours={stats.monthly_hours ?? []}
              yearlyStats={stats.yearly_stats}
            />
          </ViewSection>

          <ViewSection title="Year over year" available={hasStat(stats.year_over_year)}>
            <YearOverYear data={stats.year_over_year ?? []} />
          </ViewSection>

          <ViewSection
            title="When you listen"
            available={hasAnyStat(stats.hourly_distribution, stats.weekday_distribution)}
          >
            <WhenYouListen
              hourlyDistribution={stats.hourly_distribution ?? []}
              weekdayDistribution={stats.weekday_distribution ?? []}
              dailyActivity={stats.daily_activity_pattern}
              seasonalPatterns={stats.seasonal_patterns}
            />
          </ViewSection>

          <ViewSection title="Hour / day heatmap" available={hasStat(stats.hour_day_heatmap)}>
            <HourDayHeatmap data={stats.hour_day_heatmap ?? []} />
          </ViewSection>

          <ViewSection title="Calendar" available={hasStat(stats.calendar_heatmap)}>
            <CalendarHeatmap data={stats.calendar_heatmap ?? []} />
          </ViewSection>

          <ViewSection
            title="Chart race"
            available={hasAnyStat(
              stats.artist_month_heatmap,
              stats.song_monthly_breakdown,
              stats.artist_daily_heatmap,
              stats.song_daily_breakdown,
            )}
          >
            <BarChartRace
              artistMonthHeatmap={stats.artist_month_heatmap}
              songMonthlyBreakdown={stats.song_monthly_breakdown}
              artistDailyHeatmap={stats.artist_daily_heatmap}
              songDailyBreakdown={stats.song_daily_breakdown}
            />
          </ViewSection>
        </>
      )}
    </ViewPage>
  );
}
