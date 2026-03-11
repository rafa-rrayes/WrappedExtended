"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import type { SearchResult } from "@/lib/utils/search-index";
import type { DashboardData } from "@/types/dashboard";
import { API_BASE_URL } from "@/lib/constants";

interface DeepDiveModalProps {
  entity: SearchResult;
  dashboardId: string;
  data: DashboardData;
  onClose: () => void;
}

interface EntityDetail {
  name: string;
  type: string;
  total_hours: number;
  total_plays: number;
  first_listen: string;
  last_listen: string;
  monthly_timeline: { month: string; hours: number; plays: number }[];
  hourly_distribution: { hour: number; streams: number }[];
  platform_breakdown: { platform: string; count: number }[];
  top_tracks?: { track_name: string; hours: number; plays: number }[];
  artist_name?: string;
}

export function DeepDiveModal({ entity, dashboardId, data, onClose }: DeepDiveModalProps) {
  const [detail, setDetail] = useState<EntityDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(
      `${API_BASE_URL}/dashboards/${dashboardId}/search/?q=${encodeURIComponent(entity.name)}&type=${entity.type}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setDetail(d);
        setLoading(false);
      })
      .catch(() => {
        // Fallback to client-side data
        setDetail({
          name: entity.name,
          type: entity.type,
          total_hours: entity.hours,
          total_plays: entity.plays,
          first_listen: "",
          last_listen: "",
          monthly_timeline: [],
          hourly_distribution: [],
          platform_breakdown: [],
        });
        setLoading(false);
      });
  }, [entity, dashboardId, data]);

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-bg-primary border border-border rounded-t-2xl sm:rounded-[var(--radius-card)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-bg-primary/95 backdrop-blur-sm border-b border-border p-5 flex items-center justify-between z-10">
          <div>
            <div className="text-[0.6rem] uppercase tracking-wider text-green mb-1">{entity.type}</div>
            <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-text-primary">{entity.name}</h3>
            {detail?.artist_name && <div className="text-text-muted text-sm">{detail.artist_name}</div>}
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-5 space-y-6">
          {loading ? (
            <div className="text-center text-text-muted py-10">Loading...</div>
          ) : detail ? (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Hours" value={detail.total_hours.toFixed(1)} />
                <StatCard label="Plays" value={detail.total_plays.toLocaleString()} />
                {detail.first_listen && <StatCard label="First Listen" value={detail.first_listen} />}
                {detail.last_listen && <StatCard label="Last Listen" value={detail.last_listen} />}
              </div>

              {/* Monthly timeline */}
              {detail.monthly_timeline.length > 0 && (
                <div>
                  <h4 className="text-text-secondary text-sm font-semibold mb-3">Monthly Plays</h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={detail.monthly_timeline}>
                        <XAxis dataKey="month" tick={{ fill: "var(--color-text-muted)", fontSize: 9 }} tickFormatter={(v) => v.slice(2)} />
                        <YAxis tick={{ fill: "var(--color-text-muted)", fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12 }} />
                        <Bar dataKey="plays" fill="#1DB954" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Top tracks for artist */}
              {detail.top_tracks && detail.top_tracks.length > 0 && (
                <div>
                  <h4 className="text-text-secondary text-sm font-semibold mb-3">Top Tracks</h4>
                  <div className="space-y-1.5">
                    {detail.top_tracks.map((t, i) => (
                      <div key={t.track_name} className="flex items-center gap-3 text-sm">
                        <span className="text-text-muted w-5 text-right">{i + 1}</span>
                        <span className="text-text-primary flex-1 truncate">{t.track_name}</span>
                        <span className="text-text-muted">{t.plays} plays</span>
                        <span className="text-text-muted">{t.hours.toFixed(1)}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-text-muted py-10">
              Limited data available for this {entity.type}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-card border border-border rounded-[var(--radius-sm)] p-3">
      <div className="text-text-muted text-[0.6rem] uppercase tracking-wider">{label}</div>
      <div className="text-text-primary font-semibold text-sm mt-0.5">{value}</div>
    </div>
  );
}
