import type {
  AlbumStat,
  ArtistStat,
  BingeSession,
  CompareDelta,
  CompletionDistribution,
  CountryDistribution,
  DashboardData,
  DiversityScore,
  HourlyCount,
  LateNightAnalysis,
  ListeningStreaks,
  MLScene,
  NostalgiaTrack,
  PlatformHour,
  StatisticsSummary,
  TrackStat,
  YearlyStat,
} from "@/types/dashboard";

/**
 * Fixture builders for the pure-logic suites.
 *
 * `DashboardData` has a dozen required fields and ~80 optional ones, so every test that
 * needs one would otherwise open with forty lines of zeroes. `makeStats` supplies a
 * minimal-but-valid payload — the shape a genuinely sparse Spotify export produces — and
 * lets each test name only the fields it actually asserts on.
 */
export function makeStats(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    total_streams: 0,
    total_hours: 0,
    unique_artists: 0,
    unique_tracks: 0,
    date_range_start: "2020-01-01",
    date_range_end: "2020-12-31",
    top_artists: [],
    top_tracks: [],
    top_albums: [],
    monthly_hours: [],
    yearly_stats: [],
    hourly_distribution: [],
    weekday_distribution: [],
    ...overrides,
  };
}

export function artist(artist_name: string, hours = 10, plays = 100): ArtistStat {
  return { artist_name, hours, plays };
}

export function track(
  track_name: string,
  artist_name: string,
  hours = 5,
  plays = 50,
): TrackStat {
  return { track_name, artist_name, hours, plays };
}

export function album(
  album_name: string,
  artist_name: string,
  hours = 8,
  plays = 40,
): AlbumStat {
  return { album_name, artist_name, hours, plays };
}

/** A delta with `pct` derived the way the backend derives it: null when A is zero. */
export function delta(a: number, b: number): CompareDelta {
  return { a, b, abs: b - a, pct: a === 0 ? null : ((b - a) / a) * 100 };
}

export function scene(id: number, overrides: Partial<MLScene> = {}): MLScene {
  return { scene: id, label: `Scene ${id}`, artists: [], ...overrides };
}

// ── Optional analyzer blocks ─────────────────────────────────────────────────
//
// Each of these has three to six required fields of which any given test cares about one.
// The builders default the rest so a test can say `diversity({ normalized_entropy: 0.9 })`
// and stay readable.

export function diversity(overrides: Partial<DiversityScore> = {}): DiversityScore {
  return {
    shannon_entropy: 5,
    normalized_entropy: 0.5,
    gini_coefficient: 0.5,
    top10_concentration: 50,
    ...overrides,
  };
}

export function streaks(longest_streak: number, current_streak = 1): ListeningStreaks {
  return { longest_streak, current_streak, avg_streak: 2, streaks: [] };
}

export function binge(duration_hours: number, tracks_played = 40): BingeSession {
  return {
    start: "2021-01-01T20:00:00Z",
    end: "2021-01-01T23:00:00Z",
    duration_hours,
    tracks_played,
  };
}

export function summary(overrides: Partial<StatisticsSummary> = {}): StatisticsSummary {
  return {
    avg_daily_hours: 1,
    avg_daily_streams: 20,
    avg_track_ms: 210_000,
    median_track_ms: 200_000,
    total_days_active: 300,
    total_unique_albums: 200,
    ...overrides,
  };
}

/** Completion counts, with `skipped` derived so the three always add up. */
export function completion(completed: number, total: number): CompletionDistribution {
  return { completed, skipped: Math.max(total - completed, 0), total };
}

export function lateNight(pct: number, streams = 100, hours = 10): LateNightAnalysis {
  return { pct, streams, hours, top_artists: [] };
}

export function hourly(hour: number, streams: number): HourlyCount {
  return { hour, streams, hours: streams / 12 };
}

export function country(code: string, hours = 10): CountryDistribution {
  return { country: code, hours, plays: 100, pct: 10 };
}

export function platformHour(platform: string, hours = 10): PlatformHour {
  return { platform, hours, pct: 10 };
}

export function year(y: number): YearlyStat {
  return { year: y, hours: 100, unique_artists: 50 };
}

export function nostalgia(index: number): NostalgiaTrack {
  return {
    track_name: `Track ${index}`,
    artist_name: "Someone",
    first_listen: "2016-05-01",
    latest_listen: "2024-01-01",
    plays: 3,
  };
}
