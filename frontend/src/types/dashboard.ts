export interface DashboardSummary {
  id: string;
  original_filename: string;
  total_hours: number;
  total_streams: number;
  unique_artists: number;
  unique_tracks: number;
  date_range_start: string | null;
  date_range_end: string | null;
  is_public: boolean;
  share_slug: string | null;
  created_at: string;
}

export interface DashboardDetail extends DashboardSummary {
  dashboard_data: DashboardData;
}

export interface DashboardData {
  // ── Core stats (always present) ──────────────────────────────────────────
  total_streams: number;
  total_hours: number;
  unique_artists: number;
  unique_tracks: number;
  date_range_start: string;
  date_range_end: string;
  top_artists: ArtistStat[];
  top_tracks: TrackStat[];
  top_albums: AlbumStat[];
  monthly_hours: MonthlyHour[];
  yearly_stats: YearlyStat[];
  hourly_distribution: HourlyCount[];
  weekday_distribution: WeekdayCount[];
  shuffle_pct?: number;
  skip_pct?: number;
  offline_pct?: number;
  incognito_pct?: number;
  platforms?: PlatformStat[];
  start_reasons?: ReasonStat[];
  end_reasons?: ReasonStat[];

  // ── Bar charts ───────────────────────────────────────────────────────────
  top_tracks_by_time?: TrackByTime[];
  skip_rate_by_artist?: SkipRateByArtist[];

  // ── Line charts ──────────────────────────────────────────────────────────
  artist_discovery_timeline?: ArtistDiscovery[];
  song_monthly_breakdown?: SongMonthlyBreakdown[];
  song_daily_breakdown?: SongDailyBreakdown[];

  // ── Time patterns ────────────────────────────────────────────────────────
  weekly_hours?: WeeklyHour[];
  daily_hours?: DailyHour[];
  seasonal_patterns?: SeasonalPattern[];
  daily_activity_pattern?: DailyActivity[];
  listening_streaks?: ListeningStreaks;
  binge_sessions?: BingeSession[];

  // ── Distributions ────────────────────────────────────────────────────────
  content_type_distribution?: ContentTypeDistribution[];
  platform_hours?: PlatformHour[];
  shuffle_distribution?: ShuffleDistribution;
  completion_distribution?: CompletionDistribution;

  // ── Heatmaps ─────────────────────────────────────────────────────────────
  calendar_heatmap?: CalendarHeatmapEntry[];
  hour_day_heatmap?: HourDayHeatmapEntry[];
  artist_month_heatmap?: ArtistMonthHeatmap[];
  artist_daily_heatmap?: ArtistDailyHeatmap[];

  // ── Scatter plots ────────────────────────────────────────────────────────
  track_popularity_scatter?: TrackPopularityScatter[];
  skip_rate_scatter?: SkipRateScatter[];

  // ── Geographic ───────────────────────────────────────────────────────────
  country_distribution?: CountryDistribution[];
  travel_music?: TravelMusic[];

  // ── Advanced stats ───────────────────────────────────────────────────────
  statistics_summary?: StatisticsSummary;
  year_over_year?: YearOverYear[];
  discovery_rate?: DiscoveryRate[];
  diversity_score?: DiversityScore;

  // ── Spotify-specific ─────────────────────────────────────────────────────
  reason_analysis?: ReasonAnalysis;
  offline_analysis?: OfflineAnalysis;
  incognito_analysis?: IncognitoAnalysis;
  track_completion_rates?: TrackCompletionRate[];

  // ── Nostalgia ────────────────────────────────────────────────────────────
  nostalgia_tracks?: NostalgiaTrack[];
  music_lifecycle?: MusicLifecycle[];

  // ── Context ──────────────────────────────────────────────────────────────
  weekend_vs_weekday?: WeekendVsWeekday;
  late_night_analysis?: LateNightAnalysis;

  // ── Wrapped ──────────────────────────────────────────────────────────────
  wrapped_summaries?: Record<string, WrappedYear>;

  // ── Mood (behavioral heuristics) ─────────────────────────────────────────
  mood_timeline?: MoodEntry[];
}

// ── Core stat interfaces (unchanged) ─────────────────────────────────────────

export interface ArtistStat {
  artist_name: string;
  hours: number;
  plays: number;
}

export interface TrackStat {
  track_name: string;
  artist_name: string;
  hours: number;
  plays: number;
}

export interface AlbumStat {
  album_name: string;
  artist_name: string;
  hours: number;
  plays: number;
}

export interface MonthlyHour {
  month: string;
  hours: number;
  streams?: number;
}

export interface YearlyStat {
  year: number;
  hours: number;
  unique_artists: number;
}

export interface HourlyCount {
  hour: number;
  streams: number;
  hours?: number;
}

export interface WeekdayCount {
  weekday: number;
  day_name: string;
  streams: number;
  hours: number;
}

export interface PlatformStat {
  platform: string;
  count: number;
  pct: number;
}

export interface ReasonStat {
  reason_start?: string;
  reason_end?: string;
  count: number;
  pct: number;
}

// ── Bar charts ───────────────────────────────────────────────────────────────

export interface TrackByTime {
  track_name: string;
  artist_name: string;
  minutes: number;
  hours: number;
}

export interface SkipRateByArtist {
  artist_name: string;
  plays: number;
  skips: number;
  skip_rate: number;
}

// ── Line charts ──────────────────────────────────────────────────────────────

export interface ArtistDiscovery {
  artist_name: string;
  first_listen: string;
  last_listen: string;
  total_hours: number;
}

export interface SongMonthlyBreakdown {
  track_name: string;
  artist_name: string;
  data: { month: string; plays: number; minutes?: number }[];
}

// ── Time patterns ────────────────────────────────────────────────────────────

export interface WeeklyHour {
  week: string;
  hours: number;
}

export interface DailyHour {
  date: string;
  hours: number;
}

export interface SeasonalPattern {
  month_name: string;
  avg_hours: number;
  total_hours: number;
  streams: number;
}

export interface DailyActivity {
  hour: number;
  avg_minutes: number;
}

export interface ListeningStreaks {
  current_streak: number;
  longest_streak: number;
  avg_streak: number;
  streaks: { start: string; end: string; days: number }[];
}

export interface BingeSession {
  start: string;
  end: string;
  duration_hours: number;
  tracks_played: number;
}

// ── Distributions ────────────────────────────────────────────────────────────

export interface ContentTypeDistribution {
  type: string;
  count: number;
  hours: number;
  pct: number;
}

export interface PlatformHour {
  platform: string;
  hours: number;
  pct: number;
}

export interface ShuffleDistribution {
  shuffle_on: number;
  shuffle_off: number;
  total: number;
}

export interface CompletionDistribution {
  completed: number;
  skipped: number;
  total: number;
}

// ── Heatmaps ─────────────────────────────────────────────────────────────────

export interface CalendarHeatmapEntry {
  date: string;
  hours: number;
}

export interface HourDayHeatmapEntry {
  weekday: string;
  hour: number;
  hours: number;
}

export interface ArtistMonthHeatmap {
  artist_name: string;
  data: { month: string; hours: number; minutes?: number }[];
}

export interface ArtistDailyHeatmap {
  artist_name: string;
  data: { date: string; hours: number; minutes?: number }[];
}

export interface SongDailyBreakdown {
  track_name: string;
  artist_name: string;
  data: { date: string; plays: number; minutes?: number }[];
}

// ── Scatter plots ────────────────────────────────────────────────────────────

export interface TrackPopularityScatter {
  track_name: string;
  artist_name: string;
  plays: number;
  hours: number;
  avg_ms: number;
}

export interface SkipRateScatter {
  track_name: string;
  artist_name: string;
  plays: number;
  skip_rate: number;
}

// ── Geographic ───────────────────────────────────────────────────────────────

export interface CountryDistribution {
  country: string;
  hours: number;
  plays: number;
  pct: number;
}

export interface TravelMusic {
  country: string;
  top_artist: string;
  hours: number;
}

// ── Advanced stats ───────────────────────────────────────────────────────────

export interface StatisticsSummary {
  avg_daily_hours: number;
  avg_daily_streams: number;
  avg_track_ms: number;
  median_track_ms: number;
  total_days_active: number;
  total_unique_albums: number;
}

export interface YearOverYear {
  year: number;
  hours: number;
  streams: number;
  unique_artists: number;
  change_pct: number | null;
}

export interface DiscoveryRate {
  month: string;
  new_tracks: number;
  cumulative_tracks: number;
}

export interface DiversityScore {
  shannon_entropy: number;
  normalized_entropy: number;
  gini_coefficient: number;
  top10_concentration: number;
}

// ── Spotify-specific ─────────────────────────────────────────────────────────

export interface ReasonAnalysisEntry {
  reason: string;
  count: number;
  pct: number;
  avg_ms: number;
}

export interface ReasonAnalysis {
  start?: ReasonAnalysisEntry[];
  end?: ReasonAnalysisEntry[];
}

export interface OfflineAnalysis {
  offline_hours: number;
  offline_pct: number;
  top_offline_artists: { artist_name: string; hours: number }[];
}

export interface IncognitoAnalysis {
  incognito_hours: number;
  incognito_pct: number;
  top_incognito_artists: { artist_name: string; hours: number }[];
}

export interface TrackCompletionRate {
  track_name: string;
  artist_name: string;
  plays: number;
  avg_completion_pct: number;
}

// ── Nostalgia ────────────────────────────────────────────────────────────────

export interface NostalgiaTrack {
  track_name: string;
  artist_name: string;
  first_listen: string;
  latest_listen: string;
  plays: number;
}

export interface MusicLifecycle {
  track_name: string;
  artist_name: string;
  peak_month: string;
  months_active: number;
  total_plays: number;
}

// ── Context ──────────────────────────────────────────────────────────────────

export interface WeekendVsWeekday {
  weekday: {
    hours: number;
    streams: number;
    top_artists: { artist_name: string; hours: number }[];
  };
  weekend: {
    hours: number;
    streams: number;
    top_artists: { artist_name: string; hours: number }[];
  };
}

export interface LateNightAnalysis {
  hours: number;
  pct: number;
  streams: number;
  top_artists: { artist_name: string; hours: number }[];
}

// ── Wrapped ──────────────────────────────────────────────────────────────────

export interface WrappedYear {
  total_hours: number;
  total_streams: number;
  unique_artists: number;
  unique_tracks: number;
  top_artist?: string;
  top_artist_hours?: number;
  top_track?: string;
  top_track_artist?: string;
  top_track_plays?: number;
  top_album?: string;
  top_album_artist?: string;
  top_album_hours?: number;
}

// ── Mood ─────────────────────────────────────────────────────────────────────

export interface MoodEntry {
  month: string;
  mood_score: number;
  energy: number;
  engagement: number;
  immersion: number;
  exploration: number;
  total_hours: number;
}
