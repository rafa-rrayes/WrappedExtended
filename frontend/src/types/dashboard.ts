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
}

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
}

export interface YearlyStat {
  year: number;
  hours: number;
  unique_artists: number;
}

export interface HourlyCount {
  hour: number;
  streams: number;
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
