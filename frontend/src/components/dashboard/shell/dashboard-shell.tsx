"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useDashboard } from "@/lib/hooks/use-dashboard";
import { ApiError } from "@/lib/api-client";
import { DashboardProvider } from "./dashboard-context";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardTopbar } from "./dashboard-topbar";
import { CommandPalette } from "./command-palette";
import { ShellError, ShellSkeleton } from "./shell-skeleton";

const COLLAPSE_KEY = "wrapex:dashboard-sidebar-collapsed";

/**
 * The persistent chrome around every `/dashboard/[dashboardId]/*` route.
 *
 * It owns the one and only fetch of the dashboard payload and hands it down through
 * context, so route changes swap the content without re-downloading several megabytes of
 * pre-computed stats.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ShellInner>{children}</ShellInner>
    </AuthGuard>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const params = useParams<{ dashboardId: string }>();
  const dashboardId = params?.dashboardId ?? "";
  const { data, error, isLoading, mutate } = useDashboard(dashboardId);

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
    <DashboardProvider dashboardId={dashboardId} dashboard={data} refresh={refresh}>
      <div
        className="min-h-screen bg-bg-deep pt-14"
        style={
          { "--shell-sidebar-w": collapsed ? "64px" : "240px" } as React.CSSProperties
        }
      >
        <DashboardSidebar
          dashboardId={dashboardId}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          mobileOpen={navOpen}
          onCloseMobile={closeNav}
        />

        <div className="transition-[padding] duration-200 md:pl-[var(--shell-sidebar-w)]">
          <DashboardTopbar
            dashboardId={dashboardId}
            title={data.original_filename}
            bounds={{ min: data.date_range_start, max: data.date_range_end }}
            onOpenNav={openNav}
            onOpenPalette={openPalette}
          />
          {children}
        </div>

        <CommandPalette
          dashboardId={dashboardId}
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
        />
      </div>
    </DashboardProvider>
  );
}
