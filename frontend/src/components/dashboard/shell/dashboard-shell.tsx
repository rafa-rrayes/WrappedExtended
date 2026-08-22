"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useDashboard } from "@/lib/hooks/use-dashboard";
import { ApiError } from "@/lib/api-client";
import type { DashboardDetail } from "@/types/dashboard";
import { DashboardProvider } from "./dashboard-context";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardTopbar } from "./dashboard-topbar";
import { CommandPalette } from "./command-palette";
import { ShellError, ShellSkeleton } from "./shell-skeleton";

const COLLAPSE_KEY = "wrapex:dashboard-sidebar-collapsed";

/**
 * The persistent chrome around every `/dashboard/[dashboardId]/*` route — the owner's view.
 *
 * It owns the one and only fetch of the dashboard payload and hands it down through
 * context, so route changes swap the content without re-downloading several megabytes of
 * pre-computed stats. The public routes (`/shared/[slug]`, `/demo`) fetch differently and
 * skip the auth guard, but render the very same `ShellChrome` — see
 * `public-dashboard-shell.tsx`.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <OwnerShell>{children}</OwnerShell>
    </AuthGuard>
  );
}

function OwnerShell({ children }: { children: React.ReactNode }) {
  const params = useParams<{ dashboardId: string }>();
  const dashboardId = params?.dashboardId ?? "";
  const { data, error, isLoading, mutate } = useDashboard(dashboardId);
  const refresh = useCallback(() => {
    void mutate();
  }, [mutate]);

  if (isLoading) return <ShellSkeleton />;

  if (error || !data) {
    return (
      <ShellError
        message={error instanceof ApiError ? error.message : undefined}
        status={error instanceof ApiError ? error.status : undefined}
        onRetry={refresh}
      />
    );
  }

  return (
    <ShellChrome
      dashboardId={dashboardId}
      basePath={`/dashboard/${dashboardId}`}
      isOwner
      dashboard={data}
      refresh={refresh}
      title={data.original_filename}
    >
      {children}
    </ShellChrome>
  );
}

interface ShellChromeProps {
  dashboardId: string;
  /** URL prefix for every in-dashboard link — see `DashboardContextValue.basePath`. */
  basePath: string;
  isOwner: boolean;
  dashboard: DashboardDetail;
  refresh: () => void;
  /** What the top bar calls this dashboard. */
  title: string;
  /** Optional strip under the top bar — the public routes use it to say whose data this is. */
  banner?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Sidebar, top bar, ⌘K palette and the dashboard context, around an already-fetched
 * dashboard. Knows nothing about where the dashboard came from or what URL it lives at
 * beyond `basePath`, which is what lets the owner's and the public routes share it.
 */
export function ShellChrome({
  dashboardId,
  basePath,
  isOwner,
  dashboard,
  refresh,
  title,
  banner,
  children,
}: ShellChromeProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Read after mount: localStorage is unavailable during SSR, and seeding state from it
  // in a lazy initialiser would produce a hydration mismatch.
  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const closeNav = useCallback(() => setNavOpen(false), []);
  const openNav = useCallback(() => setNavOpen(true), []);
  const openPalette = useCallback(() => setPaletteOpen(true), []);

  return (
    <DashboardProvider
      dashboardId={dashboardId}
      basePath={basePath}
      isOwner={isOwner}
      dashboard={dashboard}
      refresh={refresh}
    >
      <div
        className="min-h-screen bg-bg-deep pt-14"
        style={
          { "--shell-sidebar-w": collapsed ? "64px" : "240px" } as React.CSSProperties
        }
      >
        <DashboardSidebar
          basePath={basePath}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          mobileOpen={navOpen}
          onCloseMobile={closeNav}
        />

        <div className="transition-[padding] duration-200 md:pl-[var(--shell-sidebar-w)]">
          <DashboardTopbar
            dashboardId={dashboardId}
            isOwner={isOwner}
            title={title}
            bounds={{ min: dashboard.date_range_start, max: dashboard.date_range_end }}
            onOpenNav={openNav}
            onOpenPalette={openPalette}
          />
          {banner}
          {children}
        </div>

        <CommandPalette
          dashboardId={dashboardId}
          basePath={basePath}
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
        />
      </div>
    </DashboardProvider>
  );
}
