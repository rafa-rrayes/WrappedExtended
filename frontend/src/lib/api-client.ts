import type { TokenPair, Upload, UploadStatus, UserProfile, Payment } from "@/types/api";
import type { AdminAnalytics, AnalyticsRange } from "@/types/admin";
import type { DashboardDetail, DashboardSummary } from "@/types/dashboard";
import { API_BASE_URL } from "./constants";

/** An error carrying the backend's own message, so the UI can show something useful. */
export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

/**
 * Pull a human-readable message out of a DRF error body.
 *
 * DRF replies in several shapes: {"detail": "..."} for permission/auth errors,
 * {"field": ["msg", ...]} for validation errors, and occasionally a bare list.
 */
async function toApiError(res: Response): Promise<ApiError> {
  let payload: unknown = null;
  try {
    payload = await res.clone().json();
  } catch {
    // Non-JSON body (HTML error page, empty response) — fall through to the status.
  }

  const fallback = `Request failed (${res.status})`;
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.detail === "string") return new ApiError(res.status, obj.detail, payload);
    // First field error wins; that is what a form would surface anyway.
    for (const value of Object.values(obj)) {
      if (typeof value === "string") return new ApiError(res.status, value, payload);
      if (Array.isArray(value) && typeof value[0] === "string") {
        return new ApiError(res.status, value[0], payload);
      }
    }
  }
  return new ApiError(res.status, fallback, payload);
}

/**
 * In-flight refresh, shared by every caller.
 *
 * SimpleJWT runs with ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION, so a refresh
 * token is single-use. The dashboard fires several requests at once; letting each
 * expired-token response start its own refresh meant the first call rotated the token
 * and the rest presented a now-blacklisted one, logging the user out at random.
 * Collapsing them onto one promise means exactly one rotation per expiry.
 */
let refreshInFlight: Promise<string | null> | null = null;

function refreshToken(): Promise<string | null> {
  refreshInFlight ??= performRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function performRefresh(): Promise<string | null> {
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) {
      // The refresh token itself is dead — clear both so the app can send the
      // user to /login instead of retrying with credentials that cannot work.
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      return null;
    }
    const data: TokenPair = await res.json();
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    return data.access;
  } catch {
    return null;
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetch(url, { ...options, headers });

  if (res.status === 401 && token) {
    const refreshed = await refreshToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${refreshed}`;
      res = await fetch(url, { ...options, headers });
    }
  }

  // Checked once, after any retry — the retried response used to be returned
  // unchecked, handing callers an error body to .json().
  if (!res.ok) throw await toApiError(res);
  return res;
}

export const apiClient = {
  async register(username: string, email: string, password: string) {
    const res = await fetch(`${API_BASE_URL}/auth/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    // Surfaces the real reason ("A user with that username already exists.",
    // "This password is too common.") instead of a blanket failure message.
    if (!res.ok) throw await toApiError(res);
    return res.json();
  },

  async login(username: string, password: string): Promise<TokenPair> {
    const res = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw await toApiError(res);
    return res.json();
  },

  async logout(refresh: string): Promise<void> {
    await fetchWithAuth(`${API_BASE_URL}/auth/logout/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
  },

  async getMe(): Promise<UserProfile> {
    const res = await fetchWithAuth(`${API_BASE_URL}/auth/me/`);
    return res.json();
  },

  async updateProfile(data: { display_name?: string; timezone?: string }): Promise<UserProfile> {
    const res = await fetchWithAuth(`${API_BASE_URL}/auth/me/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async changePassword(old_password: string, new_password: string): Promise<void> {
    await fetchWithAuth(`${API_BASE_URL}/auth/password/change/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ old_password, new_password }),
    });
  },

  async uploadFile(file: File): Promise<Upload> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetchWithAuth(`${API_BASE_URL}/uploads/`, {
      method: "POST",
      body: formData,
    });
    return res.json();
  },

  async getUploadStatus(id: string): Promise<UploadStatus> {
    const res = await fetchWithAuth(`${API_BASE_URL}/uploads/${id}/status/`);
    return res.json();
  },

  async deleteUpload(id: string): Promise<void> {
    await fetchWithAuth(`${API_BASE_URL}/uploads/${id}/`, {
      method: "DELETE",
    });
  },

  async getDashboards(): Promise<DashboardSummary[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/dashboards/`);
    const data = await res.json();
    return data.results ?? data;
  },

  async getDashboard(id: string): Promise<DashboardDetail> {
    const res = await fetchWithAuth(`${API_BASE_URL}/dashboards/${id}/`);
    return res.json();
  },

  async updateDashboard(
    id: string,
    data: { is_public?: boolean; share_slug?: string },
  ): Promise<DashboardSummary> {
    const res = await fetchWithAuth(`${API_BASE_URL}/dashboards/${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteDashboard(id: string): Promise<void> {
    await fetchWithAuth(`${API_BASE_URL}/dashboards/${id}/`, {
      method: "DELETE",
    });
  },

  async getPublicDashboard(slug: string): Promise<DashboardDetail> {
    const res = await fetch(`${API_BASE_URL}/dashboards/shared/${slug}/`);
    if (!res.ok) throw await toApiError(res);
    return res.json();
  },

  // ── Payments & Account ────────────────────────────────────────────────

  async getPayments(): Promise<Payment[]> {
    const res = await fetchWithAuth(`${API_BASE_URL}/payments/`);
    const data = await res.json();
    return data.results ?? data;
  },

  async deleteAccount(): Promise<void> {
    await fetchWithAuth(`${API_BASE_URL}/auth/account/`, {
      method: "DELETE",
    });
  },

  // ── Billing ────────────────────────────────────────────────────────────

  async createBillingPortalSession(): Promise<{ url: string }> {
    const res = await fetchWithAuth(`${API_BASE_URL}/payments/billing-portal/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return res.json();
  },

  // ── Dashboard Features ──────────────────────────────────────────────────

  async timeMachine(
    dashboardId: string,
    body: { start: string; end: string; compare_start?: string; compare_end?: string },
  ) {
    const res = await fetchWithAuth(`${API_BASE_URL}/dashboards/${dashboardId}/time-machine/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  },

  async searchSuggest(dashboardId: string, q: string) {
    const res = await fetchWithAuth(
      `${API_BASE_URL}/dashboards/${dashboardId}/search/suggest/?q=${encodeURIComponent(q)}`,
    );
    return res.json();
  },

  async searchEntity(dashboardId: string, q: string, type: "artist" | "track") {
    const res = await fetchWithAuth(
      `${API_BASE_URL}/dashboards/${dashboardId}/search/?q=${encodeURIComponent(q)}&type=${type}`,
    );
    return res.json();
  },

  async chartBuilder(
    dashboardId: string,
    body: { metric: string; group_by: string; limit: number },
  ) {
    const res = await fetchWithAuth(`${API_BASE_URL}/dashboards/${dashboardId}/chart/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  },

  async whatIf(
    dashboardId: string,
    body: { exclude_artists?: string[]; exclude_tracks?: string[]; min_ms?: number },
  ) {
    const res = await fetchWithAuth(`${API_BASE_URL}/dashboards/${dashboardId}/what-if/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  },

  async getBenchmarks(dashboardId: string) {
    const res = await fetchWithAuth(`${API_BASE_URL}/dashboards/${dashboardId}/benchmarks/`);
    return res.json();
  },

  async getAdminAnalytics(range: AnalyticsRange = "30d"): Promise<AdminAnalytics> {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/analytics/?range=${range}`);
    return res.json();
  },

  async getJourney(dashboardId: string, params: { year: number; month?: number; day?: number }) {
    const searchParams = new URLSearchParams({ year: String(params.year) });
    if (params.month) searchParams.set("month", String(params.month));
    if (params.day) searchParams.set("day", String(params.day));
    const res = await fetchWithAuth(
      `${API_BASE_URL}/dashboards/${dashboardId}/journey/?${searchParams}`,
    );
    return res.json();
  },
};

/** SWR-compatible fetcher */
export const fetcher = (url: string) => fetchWithAuth(url).then((r) => r.json());
