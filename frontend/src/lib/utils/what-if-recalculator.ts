import type { DashboardData, ArtistStat, TrackStat } from "@/types/dashboard";

export interface WhatIfDelta {
  field: string;
  original: number;
  modified: number;
  delta: number;
  deltaPct: number;
}

export function recalculateWithout(
  data: DashboardData,
  excludeArtists: string[]
): { modified: Partial<DashboardData>; deltas: WhatIfDelta[] } {
  const deltas: WhatIfDelta[] = [];
  const excluded = new Set(excludeArtists.map((a) => a.toLowerCase()));

  // Filter top artists
  const filteredArtists = (data.top_artists ?? []).filter(
    (a) => !excluded.has(a.artist_name.toLowerCase())
  );

  // Calculate removed hours/plays
  const removedArtists = (data.top_artists ?? []).filter(
    (a) => excluded.has(a.artist_name.toLowerCase())
  );
  const removedHours = removedArtists.reduce((s, a) => s + a.hours, 0);
  const removedPlays = removedArtists.reduce((s, a) => s + a.plays, 0);

  const newTotalHours = Math.max(0, data.total_hours - removedHours);
  const newTotalStreams = Math.max(0, data.total_streams - removedPlays);

  deltas.push(makeDelta("Total Hours", data.total_hours, newTotalHours));
  deltas.push(makeDelta("Total Streams", data.total_streams, newTotalStreams));
  deltas.push(makeDelta("Unique Artists", data.unique_artists, data.unique_artists - excludeArtists.length));

  // Filter top tracks
  const filteredTracks = (data.top_tracks ?? []).filter(
    (t) => !excluded.has(t.artist_name.toLowerCase())
  );

  return {
    modified: {
      total_hours: newTotalHours,
      total_streams: newTotalStreams,
      unique_artists: data.unique_artists - excludeArtists.length,
      top_artists: filteredArtists,
      top_tracks: filteredTracks,
    },
    deltas,
  };
}

function makeDelta(field: string, original: number, modified: number): WhatIfDelta {
  return {
    field,
    original,
    modified,
    delta: modified - original,
    deltaPct: original ? ((modified - original) / original) * 100 : 0,
  };
}
