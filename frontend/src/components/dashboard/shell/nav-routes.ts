/**
 * The dashboard route map — pure data and URL helpers, kept free of JSX so the logic is
 * unit-testable under the no-transform vitest config. `nav-items.tsx` re-exports all of
 * this next to the icons.
 *
 * Single source of truth for the sidebar, the command palette's jump targets and anything
 * else that needs to know what routes exist. `segment` is appended to the dashboard's
 * base path (`/dashboard/{id}`, `/shared/{slug}` or `/demo` — see
 * `DashboardContextValue.basePath`); the empty string is the Overview index route.
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

/** `basePath` + segment. */
export function navHref(basePath: string, segment: string): string {
  return `${basePath}${segment}`;
}

/**
 * Is `pathname` inside this nav item?
 *
 * The index route needs an exact match; everything else matches its subtree so that
 * `/artists/Radiohead` still lights up "Artists".
 */
export function isNavActive(pathname: string, basePath: string, segment: string): boolean {
  if (segment === "") return pathname === basePath || pathname === `${basePath}/`;
  return pathname === basePath + segment || pathname.startsWith(`${basePath}${segment}/`);
}
