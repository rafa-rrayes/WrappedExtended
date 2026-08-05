import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/shell/dashboard-shell";
import { ShellSkeleton } from "@/components/dashboard/shell/shell-skeleton";

/**
 * Persistent shell for every dashboard route.
 *
 * The Suspense boundary is required, not decorative: the shell reads the `?from&to`
 * date filter via `useSearchParams`, and Next refuses to prerender a component that
 * does so without one.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}
