import type { DashboardData } from "@/types/dashboard";

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  tier: AchievementTier;
  unlocked: boolean;
  progress: number;
  target: number;
  /**
   * The badge's actual number, always populated. A tier with no value behind it ("Platform
   * Hopper — PLATINUM") tells the reader nothing, so every badge carries its figure:
   * "6 platforms" once earned, "1 / 2 platforms" while it is still locked.
   */
  context: string;
}

/**
 * How a rule's raw value should be written out. Counts round and get thousands
 * separators, percentages round to whole points, scores keep two decimals (the diversity
 * tiers are 0.05 apart, so one decimal would collapse three of them into the same string)
 * and rates keep one.
 */
type ValueFormat = "count" | "percent" | "score" | "rate";

interface AchievementRule {
  id: string;
  icon: string;
  title: string;
  description: string;
  tiers: { tier: AchievementTier; target: number }[];
  getValue: (data: DashboardData) => number;
  /** How to print `getValue`'s output. */
  format: ValueFormat;
  /** Noun that follows the number, e.g. "3 platforms". Empty where the unit is the "%". */
  unit: string;
  /** Richer copy for the unlocked state, where the bare number reads thin. */
  getContext?: (data: DashboardData, value: number) => string;
}

const RULES: AchievementRule[] = [
  {
    id: "century-club",
    icon: "\u{1F3C6}",
    title: "Century Club",
    description: "Total listening hours",
    tiers: [
      { tier: "bronze", target: 100 },
      { tier: "silver", target: 500 },
      { tier: "gold", target: 1000 },
      { tier: "platinum", target: 5000 },
    ],
    getValue: (d) => d.total_hours,
    format: "count",
    unit: "hours",
    getContext: (_, v) => `${Math.round(v)} hours of music`,
  },
  {
    id: "stream-machine",
    icon: "\u{1F3B5}",
    title: "Stream Machine",
    description: "Total streams played",
    tiers: [
      { tier: "bronze", target: 5000 },
      { tier: "silver", target: 25000 },
      { tier: "gold", target: 100000 },
      { tier: "platinum", target: 500000 },
    ],
    getValue: (d) => d.total_streams,
    format: "count",
    unit: "streams",
  },
  {
    id: "world-traveler",
    icon: "\u{1F30D}",
    title: "World Traveler",
    description: "Countries listened from",
    tiers: [
      { tier: "bronze", target: 3 },
      { tier: "silver", target: 5 },
      { tier: "gold", target: 10 },
      { tier: "platinum", target: 20 },
    ],
    getValue: (d) => d.country_distribution?.length ?? 0,
    format: "count",
    unit: "countries",
  },
  {
    id: "night-owl",
    icon: "\u{1F989}",
    title: "Night Owl",
    description: "Late night listening percentage",
    tiers: [
      { tier: "bronze", target: 10 },
      { tier: "silver", target: 20 },
      { tier: "gold", target: 30 },
      { tier: "platinum", target: 50 },
    ],
    getValue: (d) => d.late_night_analysis?.pct ?? 0,
    format: "percent",
    unit: "",
  },
  {
    id: "streak-master",
    icon: "\u{1F525}",
    title: "Streak Master",
    description: "Longest daily listening streak",
    tiers: [
      { tier: "bronze", target: 7 },
      { tier: "silver", target: 30 },
      { tier: "gold", target: 90 },
      { tier: "platinum", target: 365 },
    ],
    getValue: (d) => d.listening_streaks?.longest_streak ?? 0,
    format: "count",
    unit: "days",
    getContext: (_, v) => `${v} consecutive days`,
  },
  {
    id: "artist-collector",
    icon: "\u{1F3A8}",
    title: "Artist Collector",
    description: "Unique artists discovered",
    tiers: [
      { tier: "bronze", target: 100 },
      { tier: "silver", target: 500 },
      { tier: "gold", target: 2000 },
      { tier: "platinum", target: 5000 },
    ],
    getValue: (d) => d.unique_artists,
    format: "count",
    unit: "artists",
  },
  {
    id: "track-explorer",
    icon: "\u{1F50D}",
    title: "Track Explorer",
    description: "Unique tracks played",
    tiers: [
      { tier: "bronze", target: 500 },
      { tier: "silver", target: 2000 },
      { tier: "gold", target: 5000 },
      { tier: "platinum", target: 20000 },
    ],
    getValue: (d) => d.unique_tracks,
    format: "count",
    unit: "tracks",
  },
  {
    id: "marathon-runner",
    icon: "\u{1F3C3}",
    title: "Marathon Runner",
    description: "Longest binge session",
    tiers: [
      { tier: "bronze", target: 2 },
      { tier: "silver", target: 4 },
      { tier: "gold", target: 8 },
      { tier: "platinum", target: 12 },
    ],
    getValue: (d) => {
      if (!d.binge_sessions?.length) return 0;
      return Math.max(...d.binge_sessions.map((b) => b.duration_hours));
    },
    format: "rate",
    unit: "hours",
    getContext: (_, v) => `${v.toFixed(1)} hour session`,
  },
  {
    id: "completionist",
    icon: "\u{2705}",
    title: "Completionist",
    description: "Song completion rate",
    tiers: [
      { tier: "bronze", target: 60 },
      { tier: "silver", target: 75 },
      { tier: "gold", target: 85 },
      { tier: "platinum", target: 95 },
    ],
    getValue: (d) => {
      if (!d.completion_distribution) return 0;
      const { completed, total } = d.completion_distribution;
      return total ? (completed / total) * 100 : 0;
    },
    format: "percent",
    unit: "",
  },
  {
    id: "daily-devotee",
    icon: "\u{1F4C5}",
    title: "Daily Devotee",
    description: "Total days with listening activity",
    tiers: [
      { tier: "bronze", target: 100 },
      { tier: "silver", target: 365 },
      { tier: "gold", target: 730 },
      { tier: "platinum", target: 1500 },
    ],
    getValue: (d) => d.statistics_summary?.total_days_active ?? 0,
    format: "count",
    unit: "days",
  },
  {
    id: "album-connoisseur",
    icon: "\u{1F4BF}",
    title: "Album Connoisseur",
    description: "Unique albums explored",
    tiers: [
      { tier: "bronze", target: 50 },
      { tier: "silver", target: 200 },
      { tier: "gold", target: 1000 },
      { tier: "platinum", target: 3000 },
    ],
    getValue: (d) => d.statistics_summary?.total_unique_albums ?? 0,
    format: "count",
    unit: "albums",
  },
  {
    id: "platform-hopper",
    icon: "\u{1F4F1}",
    title: "Platform Hopper",
    description: "Different platforms used",
    tiers: [
      { tier: "bronze", target: 2 },
      { tier: "silver", target: 3 },
      { tier: "gold", target: 4 },
      { tier: "platinum", target: 6 },
    ],
    getValue: (d) => d.platform_hours?.length ?? d.platforms?.length ?? 0,
    format: "count",
    unit: "platforms",
  },
  {
    id: "diversity-champion",
    icon: "\u{1F308}",
    title: "Diversity Champion",
    description: "Music diversity score",
    tiers: [
      { tier: "bronze", target: 0.5 },
      { tier: "silver", target: 0.7 },
      { tier: "gold", target: 0.85 },
      { tier: "platinum", target: 0.95 },
    ],
    getValue: (d) => d.diversity_score?.normalized_entropy ?? 0,
    format: "score",
    unit: "",
  },
  {
    id: "weekend-warrior",
    icon: "\u{1F389}",
    title: "Weekend Warrior",
    description: "Weekend listening hours",
    tiers: [
      { tier: "bronze", target: 50 },
      { tier: "silver", target: 200 },
      { tier: "gold", target: 500 },
      { tier: "platinum", target: 1000 },
    ],
    getValue: (d) => d.weekend_vs_weekday?.weekend?.hours ?? 0,
    format: "count",
    unit: "weekend hours",
  },
  {
    id: "nostalgia-king",
    icon: "\u{1F451}",
    title: "Nostalgia Royalty",
    description: "Nostalgic tracks rediscovered",
    tiers: [
      { tier: "bronze", target: 5 },
      { tier: "silver", target: 15 },
      { tier: "gold", target: 30 },
      { tier: "platinum", target: 50 },
    ],
    getValue: (d) => d.nostalgia_tracks?.length ?? 0,
    format: "count",
    unit: "tracks",
  },
  {
    id: "early-bird",
    icon: "\u{1F426}",
    title: "Early Bird",
    description: "Morning listening (6am-10am) percentage",
    tiers: [
      { tier: "bronze", target: 10 },
      { tier: "silver", target: 20 },
      { tier: "gold", target: 30 },
      { tier: "platinum", target: 40 },
    ],
    getValue: (d) => {
      if (!d.hourly_distribution?.length) return 0;
      const morning = d.hourly_distribution.filter((h) => h.hour >= 6 && h.hour < 10);
      const total = d.hourly_distribution.reduce((s, h) => s + h.streams, 0);
      const morningStreams = morning.reduce((s, h) => s + h.streams, 0);
      return total ? (morningStreams / total) * 100 : 0;
    },
    format: "percent",
    unit: "",
  },
  {
    id: "shuffle-master",
    icon: "\u{1F500}",
    title: "Shuffle Master",
    description: "Shuffle mode usage",
    tiers: [
      { tier: "bronze", target: 25 },
      { tier: "silver", target: 50 },
      { tier: "gold", target: 75 },
      { tier: "platinum", target: 90 },
    ],
    getValue: (d) => d.shuffle_pct ?? 0,
    format: "percent",
    unit: "",
  },
  {
    id: "offline-listener",
    icon: "\u{1F4E1}",
    title: "Offline Listener",
    description: "Offline listening percentage",
    tiers: [
      { tier: "bronze", target: 5 },
      { tier: "silver", target: 15 },
      { tier: "gold", target: 30 },
      { tier: "platinum", target: 50 },
    ],
    getValue: (d) => d.offline_pct ?? 0,
    format: "percent",
    unit: "",
  },
  {
    id: "year-veteran",
    icon: "\u{1F396}",
    title: "Year Veteran",
    description: "Years of listening data",
    tiers: [
      { tier: "bronze", target: 1 },
      { tier: "silver", target: 3 },
      { tier: "gold", target: 5 },
      { tier: "platinum", target: 10 },
    ],
    getValue: (d) => d.yearly_stats?.length ?? 0,
    format: "count",
    unit: "years",
  },
  {
    id: "heavy-hitter",
    icon: "\u{1F4AA}",
    title: "Heavy Hitter",
    description: "Average daily listening hours",
    tiers: [
      { tier: "bronze", target: 1 },
      { tier: "silver", target: 2 },
      { tier: "gold", target: 4 },
      { tier: "platinum", target: 8 },
    ],
    getValue: (d) => d.statistics_summary?.avg_daily_hours ?? 0,
    format: "rate",
    unit: "hours/day",
    getContext: (_, v) => `${v.toFixed(1)} hours per day`,
  },
];

/** Write a rule's raw value the way that rule's numbers read best. */
function formatValue(value: number, format: ValueFormat): string {
  switch (format) {
    case "percent":
      return `${Math.round(value)}%`;
    case "score":
      return value.toFixed(2);
    case "rate":
      return value.toFixed(1);
    default:
      return Math.round(value).toLocaleString();
  }
}

/**
 * The generic value line, used for every rule that does not write its own.
 *
 * Locked badges get "value / target" because the gap is the motivating half of the
 * information; unlocked ones get the bare figure, since the tier label beside it already
 * says how far past the threshold the user is. Deriving this from `format` + `unit` beats
 * hand-writing twenty `getContext`s: a new rule cannot forget to show its number.
 */
function defaultContext(rule: AchievementRule, value: number, target: number, unlocked: boolean) {
  const shown = unlocked
    ? formatValue(value, rule.format)
    : `${formatValue(value, rule.format)} / ${formatValue(target, rule.format)}`;
  return rule.unit ? `${shown} ${rule.unit}` : shown;
}

export function computeAchievements(data: DashboardData): Achievement[] {
  const achievements: Achievement[] = [];

  for (const rule of RULES) {
    const value = rule.getValue(data);

    // Find the highest achieved tier
    let bestTier: AchievementTier = "bronze";
    let unlocked = false;
    let target = rule.tiers[0].target;

    for (const t of rule.tiers) {
      if (value >= t.target) {
        bestTier = t.tier;
        unlocked = true;
      }
    }

    // Next tier target (for progress bar)
    const nextTier = rule.tiers.find((t) => value < t.target);
    target = nextTier?.target ?? rule.tiers[rule.tiers.length - 1].target;

    // A rule's own copy is the richer read once the badge is earned ("42 consecutive
    // days"); while it is locked the generic "value / target" is what the user needs.
    const context =
      (unlocked ? rule.getContext?.(data, value) : undefined) ??
      defaultContext(rule, value, target, unlocked);

    achievements.push({
      id: rule.id,
      icon: rule.icon,
      title: rule.title,
      description: rule.description,
      tier: bestTier,
      unlocked,
      progress: value,
      target,
      context,
    });
  }

  return achievements.sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    return (b.progress / b.target) - (a.progress / a.target);
  });
}
