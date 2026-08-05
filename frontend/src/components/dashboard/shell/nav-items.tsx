import type { ReactNode } from "react";

/**
 * The dashboard route map.
 *
 * Single source of truth for the sidebar, the command palette's jump targets and anything
 * else that needs to know what routes exist. `segment` is appended to
 * `/dashboard/{id}` — the empty string is the Overview index route.
 */
export interface DashboardNavItem {
  segment: string;
  label: string;
  icon: NavIconName;
  /** Rendered under a small caps group heading in the sidebar. */
  group?: string;
}

export type NavIconName =
  | "overview"
  | "story"
  | "artists"
  | "tracks"
  | "albums"
  | "time"
  | "habits"
  | "discovery"
  | "compare"
  | "insights"
  | "lab";

export const DASHBOARD_NAV: DashboardNavItem[] = [
  { segment: "", label: "Overview", icon: "overview" },
  { segment: "/story", label: "Story", icon: "story" },
  { segment: "/artists", label: "Artists", icon: "artists", group: "Library" },
  { segment: "/tracks", label: "Tracks", icon: "tracks", group: "Library" },
  { segment: "/albums", label: "Albums", icon: "albums", group: "Library" },
  { segment: "/time", label: "Time", icon: "time" },
  { segment: "/habits", label: "Habits", icon: "habits" },
  { segment: "/discovery", label: "Discovery", icon: "discovery" },
  { segment: "/compare", label: "Compare", icon: "compare" },
  { segment: "/insights", label: "Insights", icon: "insights" },
  { segment: "/lab", label: "Lab", icon: "lab" },
];

/** `/dashboard/{id}` + segment. */
export function navHref(dashboardId: string, segment: string): string {
  return `/dashboard/${dashboardId}${segment}`;
}

/**
 * Is `pathname` inside this nav item?
 *
 * The index route needs an exact match; everything else matches its subtree so that
 * `/artists/Radiohead` still lights up "Artists".
 */
export function isNavActive(pathname: string, dashboardId: string, segment: string): boolean {
  const base = `/dashboard/${dashboardId}`;
  if (segment === "") return pathname === base || pathname === `${base}/`;
  return pathname === base + segment || pathname.startsWith(`${base}${segment}/`);
}

const PATHS: Record<NavIconName, ReactNode> = {
  overview: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  story: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 5.5v15" />
    </>
  ),
  artists: (
    <>
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </>
  ),
  tracks: (
    <>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </>
  ),
  albums: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  time: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  habits: (
    <>
      <path d="M3 12h4l2.5-7 5 14L17 12h4" />
    </>
  ),
  discovery: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </>
  ),
  compare: (
    <>
      <path d="M4 8h11l-3-3M20 16H9l3 3" />
    </>
  ),
  insights: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1 1 1.7v.4h5v-.4c0-.7.4-1.3 1-1.7A6 6 0 0 0 12 3z" />
    </>
  ),
  lab: (
    <>
      <path d="M9 3h6M10 3v6.5L5 19a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 19l-5-9.5V3" />
      <path d="M7.5 15h9" />
    </>
  ),
};

export function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
