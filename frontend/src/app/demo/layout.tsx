import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicDashboardShell } from "@/components/dashboard/shell/public-dashboard-shell";
import { ShellSkeleton } from "@/components/dashboard/shell/shell-skeleton";

export const metadata: Metadata = {
  title: "Demo Dashboard",
  description:
    "Explore a sample WrapEx dashboard to see what your Spotify listening data looks like — top artists, tracks, listening patterns, and more.",
};

const DEMO_SLUG = process.env.NEXT_PUBLIC_DEMO_SLUG ?? "demo";

/**
 * The demo is the full dashboard application — sidebar, every tab, date filter, ⌘K —
 * pointed at the public dashboard behind `NEXT_PUBLIC_DEMO_SLUG`. The Suspense boundary is
 * required for the same reason as the owner's layout: the shell reads `?from&to` through
 * `useSearchParams`.
 */
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <PublicDashboardShell slug={DEMO_SLUG} basePath="/demo" variant="demo">
        {children}
      </PublicDashboardShell>
    </Suspense>
  );
}
