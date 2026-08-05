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

// ─────────────────────────────────────────────────────────────────────────────
// Entity browsing — GET /dashboards/{id}/entities/
// ─────────────────────────────────────────────────────────────────────────────

export type EntityType = "artist" | "track" | "album";

/** Sort keys accepted by the entity list endpoint. */
export type EntitySort = "hours" | "plays" | "name" | "first" | "last";

export type SortOrder = "asc" | "desc";

export interface EntityListItem {
  name: string;
  /** Null for `type=artist`, and for exports with no artist column. */
  artist_name: string | null;
  hours: number;
  plays: number;
  /** YYYY-MM-DD */
  first_listen: string;
  /** YYYY-MM-DD */
  last_listen: string;
  /** 1-based position in the current sort, across all pages. */
  rank: number;
}

export interface EntityListResponse {
  /** Total matching entities, before pagination. */
  count: number;
  page: number;
  page_size: number;
  results: EntityListItem[];
}

/** Query params for `apiClient.getEntities`. */
export interface EntityListParams {
  type: EntityType;
  q?: string;
  sort?: EntitySort;
  order?: SortOrder;
  page?: number;
  page_size?: number;
  from?: string | null;
  to?: string | null;
}

// ── Entity detail — GET /dashboards/{id}/entities/detail/ ─────────────────────

export interface EntityMonthlyPoint {
  month: string;
  hours: number;
  plays: number;
}

export interface EntityHourlyPoint {
  hour: number;
  streams: number;
}

export interface EntityPlatformSlice {
  platform: string;
  count: number;
}

export interface EntityAlbumStat {
  album_name: string;
  hours: number;
  plays: number;
}

export interface EntityTrackStat {
  track_name: string;
  hours: number;
  plays: number;
}

export interface EntityCompanion {
  artist_name: string;
  shared_sessions: number;
}

export interface EntityWeekdayPoint {
  /** 1 = Monday … 7 = Sunday. Always all seven days. */
  weekday: number;
  day_name: string;
  plays: number;
}

export interface EntityDetail {
  name: string;
  type: EntityType;
  total_hours: number;
  total_plays: number;
  /** YYYY-MM-DD */
  first_listen: string;
  /** YYYY-MM-DD */
  last_listen: string;
  monthly_timeline: EntityMonthlyPoint[];
  hourly_distribution: EntityHourlyPoint[];
  platform_breakdown: EntityPlatformSlice[];
  /** Present for tracks/albums (their most-played artist); absent for artists. */
  artist_name?: string | null;
  /** 1-based rank by hours among entities of the same type; null when unknowable. */
  rank: number | null;
  /** 0–1, or null when the export has no skip column. */
  skip_rate: number | null;
  albums: EntityAlbumStat[];
  top_tracks: EntityTrackStat[];
  companions: EntityCompanion[];
  longest_streak_days: number;
  weekday_distribution: EntityWeekdayPoint[];
}

/** Query params for `apiClient.getEntityDetail`. */
export interface EntityDetailParams {
  type: EntityType;
  name: string;
  /**
   * Disambiguates tracks/albums that share a title with a different entity, matching how
   * the browse endpoint keys them by (name, artist). Omit it to merge by name.
   */
  artist?: string | null;
  from?: string | null;
  to?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Period comparison — GET /dashboards/{id}/compare/
// ─────────────────────────────────────────────────────────────────────────────

export interface ComparePeriod {
  label: string;
  /** YYYY-MM-DD */
  start: string;
  /** YYYY-MM-DD */
  end: string;
  stats: DashboardData;
}

export interface CompareDelta {
  a: number;
  b: number;
  /** b − a */
  abs: number;
  /** Percentage change from A to B; null when A is zero. */
  pct: number | null;
}

export interface CompareResponse {
  period_a: ComparePeriod;
  period_b: ComparePeriod;
  /** Keyed by metric name: total_hours, total_streams, unique_artists, … */
  deltas: Record<string, CompareDelta>;
}

/** Query params for `apiClient.getCompare`. */
export interface CompareParams {
  a_start: string;
  a_end: string;
  b_start: string;
  b_end: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ML insights — GET /dashboards/{id}/ml/ , POST /dashboards/{id}/ml/compute/
//
// Every sub-model is optional/nullable: they are trained independently and any one
// of them can be missing (too little data, optional dependency absent, crash) while
// the rest are fine. Always guard before reading into one.
// ─────────────────────────────────────────────────────────────────────────────

export type MLStatus = "pending" | "ready" | "failed" | "unavailable";

export interface MLSummary {
  rows: number;
  date_min: string;
  date_max: string;
  total_hours: number;
  unique_artists: number;
  unique_tracks: number;
  sessions: number;
  /** 0–1 */
  skip_rate: number;
}

// ── Embeddings / taste map ───────────────────────────────────────────────────

export interface MLEmbeddingPoint {
  artist: string;
  x: number;
  y: number;
  /** Cluster id this artist was assigned to; matches `MLScene.scene`. */
  scene: number;
  hours: number;
}

export interface MLScene {
  scene: number;
  label: string;
  artists: string[];
  /** Number of artists in the scene (offline suite extra). */
  size?: number;
  hours?: number;
}

export interface MLSimilarArtist {
  artist: string;
  /** Cosine similarity, 0–1. */
  score: number;
}

export interface MLSimilarTrack {
  track: string;
  score: number;
}

export interface MLEmbeddings {
  method: string;
  projection: string;
  artists_plotted: number;
  points: MLEmbeddingPoint[];
  scenes: MLScene[];
  /** Artist name → its nearest neighbours. */
  similar_artists: Record<string, MLSimilarArtist[]>;
  model?: {
    artists_embedded: number;
    tracks_embedded: number;
    vector_size: number;
    sessions_used: number;
  };
  similar_to_top_track?: { track: string; neighbors: MLSimilarTrack[] };
}

// ── Session clustering / listening modes ─────────────────────────────────────

export interface MLListeningMode {
  mode: number;
  name: string;
  n_sessions: number;
  pct_sessions: number;
  total_hours: number;
  avg_plays: number;
  avg_min_per_track: number;
  /** 0–1 */
  skip_rate: number;
  /** 0–1 */
  shuffle_rate: number;
  /** 0–1 */
  artist_diversity: number;
  /** Hour of day, may be fractional. */
  median_start_hour: number;
}

export interface MLClustering {
  n_sessions: number;
  modes: MLListeningMode[];
}

// ── Skip prediction ──────────────────────────────────────────────────────────

export interface MLSkipDriver {
  feature: string;
  importance: number;
}

export interface MLPytorchMLP {
  available: boolean;
  auc?: number;
  epochs?: number;
  /** Set when `available` is false. */
  error?: string;
}

export interface MLSkipModel {
  /** 0–1 */
  baseline_skip_rate: number;
  gradient_boosting_auc: number;
  pytorch_mlp: MLPytorchMLP;
  drivers: MLSkipDriver[];
}

// ── Next-artist sequence model ───────────────────────────────────────────────

export interface MLSequencePrediction {
  after: string;
  predicts: string[];
}

export interface MLSequenceModel {
  available: boolean;
  /** Set when `available` is false. */
  error?: string;
  params?: { vocab: number; emb: number; hidden: number; epochs: number };
  sessions_train?: number;
  sessions_test?: number;
  next_artist_top1?: number;
  next_artist_top5?: number;
  baseline_top1?: number;
  lift_over_baseline?: number;
  train_loss_curve?: number[];
  sample_predictions?: MLSequencePrediction[];
}

// ── Forecast & anomalies ─────────────────────────────────────────────────────

export interface MLHistoryPoint {
  /** YYYY-MM-DD, first of the month. */
  month: string;
  hours: number;
}

export interface MLForecastPoint {
  /** YYYY-MM-DD, first of the month. */
  month: string;
  hours: number;
  lower: number;
  upper: number;
}

export interface MLAnomalousDay {
  /** YYYY-MM-DD */
  date: string;
  hours: number;
  plays: number;
  unique_artists: number;
  skip_rate: number;
}

export interface MLForecast {
  history_months: number;
  avg_monthly_hours_last_year: number;
  history: MLHistoryPoint[];
  forecast_next_6_months: MLForecastPoint[];
  anomalous_days: MLAnomalousDay[];
}

export interface MLInsights {
  summary: MLSummary;
  embeddings?: MLEmbeddings | null;
  clustering?: MLClustering | null;
  skip_model?: MLSkipModel | null;
  sequence_model?: MLSequenceModel | null;
  forecast?: MLForecast | null;
}

/** GET /dashboards/{id}/ml/ */
export interface MLResponse {
  status: MLStatus;
  /** Only populated when `status === "ready"`. */
  insights: MLInsights | null;
  error_message?: string;
}

/** POST /dashboards/{id}/ml/compute/ */
export interface MLComputeResponse {
  status: MLStatus;
}
