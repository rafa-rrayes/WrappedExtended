"use client";

import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import type { EntityDetail, EntityType } from "@/types/dashboard";
import { ApiError, apiClient } from "@/lib/api-client";
import { useDateRange, useRangeHref } from "@/lib/hooks/use-date-range";
import { useDashboardContext } from "@/components/dashboard/shell/dashboard-context";
import {
  ChartCard,
  EntityHourlyChart,
  EntityMonthlyChart,
  EntityPlatformChart,
  EntityWeekdayChart,
} from "./entity-charts";
import { EntityDetailHeader } from "./entity-detail-header";
import { EntityCompanions, EntityRankedList, type RankedRow } from "./entity-lists";
import { ENTITY_META, decodeEntityName, entityHref, libraryHref } from "./entity-meta";
import { EntityNotFound, LibraryError } from "./library-states";

/**
 * The per-entity mini-dashboard behind `/artists/[name]`, `/tracks/[name]`, `/albums/[name]`.
 *
 * `name` is the raw route param: the owner tree reads it from `[name]`, the public
 * catch-all from the second path segment, so the route decides where it comes from and
 * this component only knows how to decode it.
 *
 * The name arrives as a URL path segment, which is the whole difficulty: `AC/DC`, `?`, `#`
 * and `%` are all legal in an artist name and all structural in a URL. Links are built with
 * `encodeURIComponent` (see `entityHref`) and read back through `decodeEntityName`, so the
 * segment is opaque in transit and exact by the time it reaches the API.
 */
export function EntityDetailPage({
  type,
  name: rawName,
}: {
  type: EntityType;
  name: string | string[] | undefined;
}) {
  const name = decodeEntityName(rawName);

  // A title is not a key for tracks and albums: the library lists two different songs
  // called "Alive" as separate rows, so it links here with the artist that tells them
  // apart. Absent (or on an artist page) the API falls back to merging by name.
  const searchParams = useSearchParams();
  const artist = type === "artist" ? null : searchParams.get("artist");

  const { dashboardId, basePath, bounds } = useDashboardContext();
  const { from, to, isFiltered } = useDateRange(bounds);
  const withRange = useRangeHref();
  const meta = ENTITY_META[type];

  const { data, error, isLoading, mutate } = useSWR<EntityDetail>(
    name ? ["entity-detail", dashboardId, type, name, artist, from, to] : null,
    () => apiClient.getEntityDetail(dashboardId, { type, name, artist, from, to }),
    {
      revalidateOnFocus: false,
      // A 404 is an answer, not a hiccup — retrying it just delays the empty state.
      shouldRetryOnError: false,
    },
  );

  const backHref = withRange(libraryHref(basePath, type));
  const dashboardHref = withRange(basePath);

  if (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <main className="mx-auto max-w-[1280px] px-5 py-8">
        {notFound ? (
          <EntityNotFound
            name={name}
            singular={meta.singular}
            backHref={backHref}
            backLabel={meta.title}
            isFiltered={isFiltered}
          />
        ) : (
          <LibraryError
            message={error instanceof ApiError ? error.message : undefined}
            onRetry={() => void mutate()}
          />
        )}
      </main>
    );
  }

  if (isLoading || !data) {
    return <EntityDetailSkeleton />;
  }

  const artistHref =
    data.artist_name && type !== "artist"
      ? withRange(entityHref(basePath, "artist", data.artist_name))
      : undefined;

  // Children of an artist page belong to that artist; children of an album page belong to
  // the album's artist. Either way they need it to stay distinct from same-titled entries.
  const childArtist = type === "artist" ? data.name : data.artist_name;

  const topTracks: RankedRow[] = data.top_tracks.map((track) => ({
    name: track.track_name,
    hours: track.hours,
    plays: track.plays,
    href: withRange(entityHref(basePath, "track", track.track_name, childArtist)),
  }));

  const albums: RankedRow[] = data.albums.map((album) => ({
    name: album.album_name,
    hours: album.hours,
    plays: album.plays,
    href: withRange(entityHref(basePath, "album", album.album_name, childArtist)),
  }));

  const showChildren = meta.hasChildren && (topTracks.length > 0 || albums.length > 0);

  return (
    <main className="mx-auto max-w-[1280px] px-5 py-8">
      <EntityDetailHeader
        detail={data}
        type={type}
        backHref={backHref}
        dashboardHref={dashboardHref}
        artistHref={artistHref}
      />

      <div className="grid gap-4">
        <ChartCard
          title="Over time"
          subtitle={`Hours of ${meta.singular} listening, by month`}
        >
          <EntityMonthlyChart data={data.monthly_timeline} />
        </ChartCard>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Time of day" subtitle="Streams by hour">
            <EntityHourlyChart data={data.hourly_distribution} />
          </ChartCard>
          <ChartCard title="Day of week" subtitle="Plays by weekday">
            <EntityWeekdayChart data={data.weekday_distribution} />
          </ChartCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Where you listened" subtitle="Share of streams by platform">
            <EntityPlatformChart data={data.platform_breakdown} />
          </ChartCard>

          {type === "artist" && (
            <ChartCard
              title="Often listened alongside"
              subtitle="Artists that share listening sessions with this one"
            >
              <EntityCompanions
                companions={data.companions}
                hrefFor={(artistName) =>
                  withRange(entityHref(basePath, "artist", artistName))
                }
              />
            </ChartCard>
          )}
        </div>

        {showChildren && (
          <div className="grid gap-4 lg:grid-cols-2">
            {topTracks.length > 0 && (
              <ChartCard title="Top tracks" subtitle="Most-played tracks under this name">
                <EntityRankedList rows={topTracks} />
              </ChartCard>
            )}
            {albums.length > 0 && (
              <ChartCard title="Albums" subtitle="Where the listening time went">
                <EntityRankedList rows={albums} />
              </ChartCard>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function EntityDetailSkeleton() {
  return (
    <main className="mx-auto max-w-[1280px] px-5 py-8">
      <div className="mb-4 h-3 w-56 animate-pulse rounded bg-bg-elevated" />
      <div className="mb-6 h-9 w-72 animate-pulse rounded bg-bg-elevated" />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-[74px] animate-pulse rounded-[var(--radius-card)] bg-bg-card"
          />
        ))}
      </div>
      <div className="grid gap-4">
        <div className="h-[300px] animate-pulse rounded-[var(--radius-card)] bg-bg-card" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-[260px] animate-pulse rounded-[var(--radius-card)] bg-bg-card" />
          <div className="h-[260px] animate-pulse rounded-[var(--radius-card)] bg-bg-card" />
        </div>
      </div>
    </main>
  );
}
