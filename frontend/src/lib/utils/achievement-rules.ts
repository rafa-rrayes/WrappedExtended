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
  context?: string;
}

interface AchievementRule {
  id: string;
  icon: string;
  title: string;
  description: string;
  tiers: { tier: AchievementTier; target: number }[];
  getValue: (data: DashboardData) => number;
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
    getContext: (_, v) => `${v.toFixed(1)} hours per day`,
  },
];

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

    const context = rule.getContext?.(data, value);

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
