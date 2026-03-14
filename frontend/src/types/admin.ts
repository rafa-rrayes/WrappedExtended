export type AnalyticsRange = "7d" | "30d" | "90d" | "all";

export interface AdminKPIs {
  total_revenue_cents: number;
  period_revenue_cents: number;
  today_revenue_cents: number;
  total_users: number;
  period_new_users: number;
  active_users_30d: number;
  total_uploads: number;
  period_uploads: number;
  success_rate: number;
  total_storage_bytes: number;
  total_dashboards: number;
  paid_users: number;
  conversion_rate: number;
}

export interface RevenueDataPoint {
  date: string;
  amount_cents: number;
  cumulative_cents: number;
}

export interface UserGrowthDataPoint {
  date: string;
  new_users: number;
  cumulative_users: number;
}

export interface UploadDataPoint {
  date: string;
  total: number;
  completed: number;
  failed: number;
}

export interface UploadFunnel {
  pending_payment: number;
  pending: number;
  validating: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface PlatformInsights {
  avg_total_hours: number;
  avg_total_streams: number;
  avg_unique_artists: number;
  avg_unique_tracks: number;
  total_public_dashboards: number;
}

export interface RecentActivity {
  type: "upload" | "payment" | "registration";
  user: string;
  detail: string;
  status: string | null;
  created_at: string;
}

export interface AdminAnalytics {
  kpis: AdminKPIs;
  revenue_series: RevenueDataPoint[];
  user_growth_series: UserGrowthDataPoint[];
  upload_series: UploadDataPoint[];
  upload_funnel: UploadFunnel;
  platform_insights: PlatformInsights;
  recent_activity: RecentActivity[];
}
