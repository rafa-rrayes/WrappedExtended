"use client";

import { useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import { usePublicDashboard } from "@/lib/hooks/use-public-dashboard";
import { ShellChrome } from "./dashboard-shell";
import { ShellError, ShellSkeleton } from "./shell-skeleton";

export type PublicDashboardVariant = "demo" | "shared";

interface PublicDashboardShellProps {
  /** The `share_slug` to look the dashboard up by. */
  slug: string;
  /** URL prefix of this public tree: `/demo` or `/shared/{slug}`. */
  basePath: string;
  variant: PublicDashboardVariant;
  children: React.ReactNode;
}

/**
 * The same app shell as `/dashboard/[dashboardId]`, for a dashboard its owner made public.
 *
 * No auth guard and no token: the dashboard is fetched by slug, and every feature endpoint
 * below it accepts anonymous reads of a public dashboard, so the libraries, Time Machine,
 * Lab and the rest all work for a visitor. What a visitor cannot do — share, export,
 * re-run the models, switch dashboards — is gated on `isOwner=false` in the context.
 */
export function PublicDashboardShell({
  slug,
  basePath,
  variant,
  children,
}: PublicDashboardShellProps) {
  const { data, error, isLoading, mutate } = usePublicDashboard(slug);
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
        missing={MISSING_COPY[variant]}
        escape={ESCAPE[variant]}
      />
    );
  }

  return (
    <ShellChrome
      dashboardId={data.id}
      basePath={basePath}
      isOwner={false}
      dashboard={data}
      refresh={refresh}
      title={variant === "demo" ? "Demo dashboard" : data.original_filename}
      banner={<PublicBanner variant={variant} />}
    >
      {children}
    </ShellChrome>
  );
}

const MISSING_COPY = {
  demo: {
    title: "The demo isn't available right now",
    body: "No dashboard is published under the demo slug yet. Upload your own Spotify export to see what WrapEx does with it.",
  },
  shared: {
    title: "This dashboard isn't available",
    body: "The link may be wrong, or its owner may have switched sharing off.",
  },
} as const;

const ESCAPE = {
  demo: { href: "/upload", label: "Upload your data" },
  shared: { href: "/", label: "Go home" },
} as const;

/**
 * The strip under the top bar that says whose data this is, with the one call to action
 * a public page exists for. Sticky just below the top bar (56px header + 56px top bar) so
 * it stays in view down the long Story route without competing with the chrome above it.
 */
function PublicBanner({ variant }: { variant: PublicDashboardVariant }) {
  const demo = variant === "demo";
  return (
    <div
      role="note"
      className={cn(
        "sticky top-28 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2 text-sm backdrop-blur-xl sm:px-6",
        demo
          ? "border-gold/20 bg-gold/10 text-gold"
          : "border-green/20 bg-green/10 text-green",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
        <span className="text-text-primary">
          {demo
            ? "This is a demo dashboard built from sample data."
            : "You're viewing a dashboard someone shared with you."}
        </span>
      </span>
      <Link
        href={demo ? "/upload" : "/"}
        className={cn(
          "ml-auto shrink-0 rounded-full px-3.5 py-1 text-xs font-semibold text-bg-deep transition-opacity hover:opacity-90",
          demo ? "bg-gold" : "bg-green",
        )}
      >
        {demo ? "Upload your own data →" : "Create your own →"}
      </Link>
    </div>
  );
}
