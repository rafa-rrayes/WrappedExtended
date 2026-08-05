import type { EntityType } from "@/types/dashboard";

/**
 * Per-type knowledge shared by the three library routes and the three detail routes.
 *
 * The routes themselves are thin: they pass a `type` and everything that differs between
 * artists, tracks and albums is looked up here.
 */
export interface EntityMeta {
  type: EntityType;
  /** URL segment under `/dashboard/{id}`. */
  segment: "artists" | "tracks" | "albums";
  singular: string;
  plural: string;
  /** Sentence-case heading for the library page. */
  title: string;
  /** Column header + detail-page label for the entity's own name. */
  nameLabel: string;
  /** Tracks and albums carry a secondary artist; artists do not. */
  hasArtistColumn: boolean;
  /**
   * Whether the detail endpoint fills `albums` / `top_tracks`.
   * The backend only populates them for artists and albums.
   */
  hasChildren: boolean;
  searchPlaceholder: string;
}

export const ENTITY_META: Record<EntityType, EntityMeta> = {
  artist: {
    type: "artist",
    segment: "artists",
    singular: "artist",
    plural: "artists",
    title: "Artists",
    nameLabel: "Artist",
    hasArtistColumn: false,
    hasChildren: true,
    searchPlaceholder: "Search artists…",
  },
  track: {
    type: "track",
    segment: "tracks",
    singular: "track",
    plural: "tracks",
    title: "Tracks",
    nameLabel: "Track",
    hasArtistColumn: true,
    hasChildren: false,
    searchPlaceholder: "Search tracks…",
  },
  album: {
    type: "album",
    segment: "albums",
    singular: "album",
    plural: "albums",
    title: "Albums",
    nameLabel: "Album",
    hasArtistColumn: true,
    hasChildren: true,
    searchPlaceholder: "Search albums…",
  },
};

export function libraryHref(dashboardId: string, type: EntityType): string {
  return `/dashboard/${dashboardId}/${ENTITY_META[type].segment}`;
}

/**
 * Href for one entity's detail page.
 *
 * `encodeURIComponent` is not optional here: artist names legitimately contain `/`
 * (AC/DC), `?`, `#` and `%`, all of which would otherwise change the shape of the URL
 * rather than sitting inside the `[name]` segment.
 *
 * `artist` rides along as a query param for tracks and albums, because a title alone is
 * not a key — two different songs called "Alive" would otherwise open the same page with
 * their stats merged. It is meaningless for artists, whose name is already the key.
 */
export function entityHref(
  dashboardId: string,
  type: EntityType,
  name: string,
  artist?: string | null,
): string {
  const path = `${libraryHref(dashboardId, type)}/${encodeURIComponent(name)}`;
  if (type === "artist" || !artist) return path;
  return `${path}?artist=${encodeURIComponent(artist)}`;
}

/**
 * Read an entity name back out of the `[name]` route param.
 *
 * Next already percent-decodes dynamic params, so the common case is a no-op — but a name
 * that survived decoding with a bare `%` in it ("Error 50% Off") would make a second
 * `decodeURIComponent` throw, and a name that arrived still-encoded needs the decode. This
 * does the decode when it is meaningful and keeps the raw value when it is not, so no
 * artist is ever dropped for having an awkward character in their name.
 */
export function decodeEntityName(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
  if (!value.includes("%")) return value;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * `2024-03-12` → `12 Mar 2024`.
 *
 * Formatted by hand rather than through `new Date().toLocaleDateString()`: the API sends
 * bare calendar dates, which `Date` reads as UTC midnight and then renders one day early
 * for anyone west of Greenwich.
 */
export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day || month < 1 || month > 12) return "—";
  return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
}

/** `2024-03` → `Mar '24`, for dense chart axes. */
export function formatMonthShort(month: string): string {
  const [year, monthNumber] = month.slice(0, 7).split("-");
  const index = Number(monthNumber) - 1;
  if (!year || index < 0 || index > 11) return month;
  return `${MONTH_NAMES[index]} '${year.slice(2)}`;
}

/** `2024-03` → `March 2024`, for tooltips where there is room to spell it out. */
export function formatMonthLong(month: string): string {
  const [year, monthNumber] = month.slice(0, 7).split("-");
  const index = Number(monthNumber) - 1;
  const long = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  if (!year || index < 0 || index > 11) return month;
  return `${long[index]} ${year}`;
}

/** `14` → `2 PM`. */
export function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

/** Compact hour count for table cells, where `1,234.5h` is too wide. */
export function formatHoursCompact(hours: number): string {
  if (hours >= 100) return `${Math.round(hours).toLocaleString()}h`;
  if (hours >= 10) return `${hours.toFixed(1)}h`;
  if (hours >= 1) return `${hours.toFixed(1)}h`;
  return `${Math.round(hours * 60)}m`;
}

/**
 * The green → gold ramp the rest of the dashboard uses for ordered series.
 * Matches `top-artists-chart.tsx` so a bar here reads as the same family of chart.
 */
export function rampColor(index: number, total: number): string {
  const ratio = total <= 1 ? 0 : index / (total - 1);
  const r = Math.round(29 + (245 - 29) * ratio);
  const g = Math.round(185 + (166 - 185) * ratio);
  const b = Math.round(84 + (35 - 84) * ratio);
  return `rgb(${r},${g},${b})`;
}
