"use client";

import Link from "next/link";
import type { DashboardSummary } from "@/types/dashboard";
import { formatNumber, formatHours, formatRelativeDate } from "@/lib/utils";

interface DashboardCardProps {
  dashboard: DashboardSummary;
  onDelete?: (id: string) => void;
}

export function DashboardCard({ dashboard, onDelete }: DashboardCardProps) {
  return (
    <Link
      href={`/dashboard/${dashboard.id}`}
      className="block bg-bg-card border border-border rounded-[var(--radius-card)] p-6 hover:border-green/30 hover:bg-bg-card-hover transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0">
          <h3 className="font-[family-name:var(--font-display)] font-bold text-sm truncate group-hover:text-green transition-colors">
            {dashboard.original_filename}
          </h3>
          <p className="text-xs text-text-muted mt-1">
            {dashboard.date_range_start && dashboard.date_range_end
              ? `${dashboard.date_range_start} — ${dashboard.date_range_end}`
              : "No date range"}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          {dashboard.is_public && (
            <span className="text-[10px] font-medium text-green bg-green/10 px-2 py-0.5 rounded-full">
              Public
            </span>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(dashboard.id);
              }}
              className="text-text-muted hover:text-red-400 transition-colors p-1"
              aria-label="Delete dashboard"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-lg font-bold text-green">{formatHours(dashboard.total_hours)}</p>
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Hours</p>
        </div>
        <div>
          <p className="text-lg font-bold">{formatNumber(dashboard.total_streams)}</p>
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Streams</p>
        </div>
        <div>
          <p className="text-lg font-bold">{formatNumber(dashboard.unique_artists)}</p>
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Artists</p>
        </div>
        <div>
          <p className="text-lg font-bold">{formatNumber(dashboard.unique_tracks)}</p>
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Tracks</p>
        </div>
      </div>

      <p className="text-[10px] text-text-muted mt-4">
        {formatRelativeDate(dashboard.created_at)}
      </p>
    </Link>
  );
}
