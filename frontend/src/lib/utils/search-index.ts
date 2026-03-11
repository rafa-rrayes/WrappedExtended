import type { DashboardData } from "@/types/dashboard";

export interface SearchResult {
  type: "artist" | "track";
  name: string;
  artistName?: string;
  hours: number;
  plays: number;
}

export function buildSearchIndex(data: DashboardData): SearchResult[] {
  const results: SearchResult[] = [];

  for (const a of data.top_artists ?? []) {
    results.push({ type: "artist", name: a.artist_name, hours: a.hours, plays: a.plays });
  }

  for (const t of data.top_tracks ?? []) {
    results.push({ type: "track", name: t.track_name, artistName: t.artist_name, hours: t.hours, plays: t.plays });
  }

  return results;
}

export function searchEntities(index: SearchResult[], query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return index
    .filter((r) => r.name.toLowerCase().includes(q) || r.artistName?.toLowerCase().includes(q))
    .slice(0, 15);
}
