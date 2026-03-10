"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api-client";

interface SharePanelProps {
  dashboardId: string;
  isPublic: boolean;
  shareSlug: string | null;
  onUpdate: () => void;
}

export function SharePanel({ dashboardId, isPublic, shareSlug, onUpdate }: SharePanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = shareSlug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/shared/${shareSlug}`
    : null;

  async function togglePublic() {
    setLoading(true);
    try {
      await apiClient.updateDashboard(dashboardId, { is_public: !isPublic });
      onUpdate();
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary border border-border hover:border-green/30 px-4 py-2 rounded-full transition-all"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
        </svg>
        Share
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-bg-card/90 backdrop-blur-xl border border-border rounded-[var(--radius-sm)] shadow-lg p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Public sharing</span>
            <button
              onClick={togglePublic}
              disabled={loading}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                isPublic ? "bg-green" : "bg-bg-elevated"
              }`}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: isPublic ? "22px" : "2px" }}
              />
            </button>
          </div>

          {isPublic && shareUrl && (
            <div className="flex gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 bg-bg-deep border border-border rounded-[var(--radius-sm)] px-3 py-1.5 text-xs text-text-secondary truncate"
              />
              <button
                onClick={copyLink}
                className="bg-green/20 text-green text-xs font-medium px-3 py-1.5 rounded-[var(--radius-sm)] hover:bg-green/30 transition-colors shrink-0"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
