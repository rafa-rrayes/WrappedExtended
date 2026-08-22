import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicDashboardShell } from "@/components/dashboard/shell/public-dashboard-shell";
import { ShellSkeleton } from "@/components/dashboard/shell/shell-skeleton";

export const metadata: Metadata = {
  title: "Shared Dashboard",
  description: "A WrapEx listening dashboard someone shared with you.",
};

/**
 * A shared link opens the full dashboard application, read-only, for whoever holds it —
 * the same shell, tabs, date filter and ⌘K the owner sees, minus the owner-only controls
 * (share, export, dashboard switcher, ML run). The Suspense boundary is required because
 * the shell reads `?from&to` through `useSearchParams`.
 */
export default async function SharedDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <PublicDashboardShell slug={slug} basePath={`/shared/${slug}`} variant="shared">
        {children}
      </PublicDashboardShell>
    </Suspense>
  );
}
