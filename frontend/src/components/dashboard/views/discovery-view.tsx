"use client";

import { ArtistDiscoveryTimeline } from "@/components/dashboard/artist-discovery";
import { SongObsession } from "@/components/dashboard/song-obsession";
import { NostalgiaDiscovery } from "@/components/dashboard/nostalgia-discovery";
import { MoodTimeline } from "@/components/dashboard/mood-timeline";
import { PersonalityProfile } from "@/components/dashboard/personality-profile";
import { AchievementsGrid } from "@/components/dashboard/achievements-grid";
import { SocialBenchmarks } from "@/components/dashboard/social-benchmarks";
import { YourWrapped } from "@/components/dashboard/your-wrapped";
import { useDashboardContext } from "@/components/dashboard/shell/dashboard-context";
import { ScopeNotice, ViewHeader, ViewPage } from "./view-shell";
import { SectionSkeleton, ViewSection, hasAnyStat, hasStat } from "./view-section";
import { useScopedStats } from "./use-scoped-stats";

export function DiscoveryView() {
  const { dashboardId } = useDashboardContext();
  const { stats, from, to, isFiltered, isLoading, failed } = useScopedStats();

  return (
    <ViewPage>
      <ViewHeader
        eyebrow="Discovery"
        title={
          <>
            What you found, and <span className="text-gold">what it says</span>
          </>
        }
        description="First listens, obsessions, nostalgia, mood and the personality your play history adds up to."
        actions={
          <ScopeNotice from={from} to={to} isFiltered={isFiltered} failed={failed} />
        }
      />

      {isLoading ? (
        <SectionSkeleton count={3} />
      ) : (
        <>
          <ViewSection
            title="Artist discovery"
            available={hasStat(stats.artist_discovery_timeline)}
          >
            <ArtistDiscoveryTimeline data={stats.artist_discovery_timeline ?? []} />
          </ViewSection>

          <ViewSection title="Obsessions" available={hasStat(stats.song_monthly_breakdown)}>
            <SongObsession data={stats.song_monthly_breakdown ?? []} />
          </ViewSection>

          <ViewSection
            title="Nostalgia & discovery rate"
            available={hasAnyStat(
              stats.nostalgia_tracks,
              stats.discovery_rate,
              stats.music_lifecycle,
            )}
          >
            <NostalgiaDiscovery
              nostalgiaTracks={stats.nostalgia_tracks}
              discoveryRate={stats.discovery_rate}
              musicLifecycle={stats.music_lifecycle}
            />
          </ViewSection>

          <ViewSection title="Mood timeline" available={hasStat(stats.mood_timeline)}>
            <MoodTimeline data={stats.mood_timeline ?? []} />
          </ViewSection>

          <PersonalityProfile data={stats} />
          <AchievementsGrid data={stats} />

          <SocialBenchmarks dashboardId={dashboardId} />

          <ViewSection title="Your Wrapped" available={hasStat(stats.wrapped_summaries)}>
            <YourWrapped data={stats.wrapped_summaries ?? {}} />
          </ViewSection>
        </>
      )}
    </ViewPage>
  );
}
