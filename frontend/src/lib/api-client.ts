import type { TokenPair, Upload, UploadStatus, UserProfile, Payment } from "@/types/api";
import type { DashboardDetail, DashboardSummary } from "@/types/dashboard";
import { API_BASE_URL } from "./constants";

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const headers: HeadersInit = {
    ...options.headers,
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 && token) {
    // Try refreshing
    const refreshed = await refreshToken();
    if (refreshed) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${refreshed}`;
      return fetch(url, { ...options, headers });
    }
  }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res;
}

async function refreshToken(): Promise<string | null> {
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return null;
    const data: TokenPair = await res.json();
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    return data.access;
  } catch {
    return null;
  }
}

export const apiClient = {
  async register(username: string, email: string, password: string) {
    const res = await fetch(`${API_BASE_URL}/auth/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    if (!res.ok) throw new Error("Registration failed");
    return res.json();
  },

  async login(username: string, password: string): Promise<TokenPair> {
    const res = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error("Login failed");
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
    if (!res.ok) throw new Error("Dashboard not found");
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
