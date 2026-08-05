import { describe, expect, it } from "vitest";
import {
  binge,
  completion,
  country,
  diversity,
  hourly,
  makeStats,
  platformHour,
  streaks,
  summary,
  year,
} from "@/test/fixtures";
import { computeAchievements } from "./achievement-rules";

/**
 * The badge grid is rendered straight from this list, so two things must hold for every
 * possible payload: the tier shown is the *highest* one actually earned, and `progress /
 * target` is a finite ratio a progress bar can use. A sparse export — the common case for a
 * new user — must produce a full, locked grid rather than an empty one or a crash.
 */

/** Look one achievement up by id. */
function byId(achievements: ReturnType<typeof computeAchievements>, id: string) {
  const found = achievements.find((achievement) => achievement.id === id);
  if (!found) throw new Error(`No achievement with id "${id}"`);
  return found;
}

describe("computeAchievements — the grid itself", () => {
  it("returns the same complete set of badges whatever the payload", () => {
    const empty = computeAchievements(makeStats());
    const full = computeAchievements(makeStats({ total_hours: 9000, total_streams: 900_000 }));

    expect(empty.length).toBeGreaterThan(0);
    expect(new Set(empty.map((a) => a.id))).toEqual(new Set(full.map((a) => a.id)));
  });

  it("never issues the same badge id twice", () => {
    const ids = computeAchievements(makeStats()).map((a) => a.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every badge a title, an icon and a description", () => {
    for (const achievement of computeAchievements(makeStats())) {
      expect(achievement.title).toBeTruthy();
      expect(achievement.icon).toBeTruthy();
      expect(achievement.description).toBeTruthy();
    }
  });

  it("locks everything for a brand-new, empty export instead of crashing", () => {
    const achievements = computeAchievements(makeStats());

    expect(achievements.every((a) => a.unlocked === false)).toBe(true);
    expect(achievements.every((a) => a.progress === 0)).toBe(true);
  });

  it("reads a payload missing every optional block without throwing", () => {
    // `country_distribution`, `binge_sessions`, `statistics_summary`… all absent.
    expect(() => computeAchievements(makeStats())).not.toThrow();
  });
});

describe("computeAchievements — tiers", () => {
  it("stays locked below the bronze threshold", () => {
    const badge = byId(computeAchievements(makeStats({ total_hours: 99 })), "century-club");

    expect(badge.unlocked).toBe(false);
    expect(badge.progress).toBe(99);
    expect(badge.target).toBe(100);
  });

  it("unlocks exactly on the threshold, not one past it", () => {
    const badge = byId(computeAchievements(makeStats({ total_hours: 100 })), "century-club");

    expect(badge.unlocked).toBe(true);
    expect(badge.tier).toBe("bronze");
  });

  it("reports the highest tier earned, not the first one crossed", () => {
    const tiers = [
      [100, "bronze"],
      [500, "silver"],
      [999, "silver"],
      [1000, "gold"],
      [5000, "platinum"],
      [50_000, "platinum"],
    ] as const;

    for (const [hours, tier] of tiers) {
      expect(byId(computeAchievements(makeStats({ total_hours: hours })), "century-club").tier).toBe(
        tier,
      );
    }
  });

  it("points target at the next tier up, so the bar shows what is left to earn", () => {
    const badge = byId(computeAchievements(makeStats({ total_hours: 600 })), "century-club");

    expect(badge.tier).toBe("silver");
    expect(badge.target).toBe(1000);
  });

  it("pins target to the platinum threshold once everything is earned", () => {
    // There is no tier beyond platinum, so the bar sits full rather than dividing by nothing.
    const badge = byId(computeAchievements(makeStats({ total_hours: 12_000 })), "century-club");

    expect(badge.target).toBe(5000);
    expect(badge.progress / badge.target).toBeGreaterThanOrEqual(1);
  });

  it("keeps every progress ratio finite and non-negative", () => {
    const hostile = makeStats({
      total_hours: 0,
      total_streams: 0,
      shuffle_pct: 0,
      offline_pct: 0,
      completion_distribution: completion(0, 0),
      hourly_distribution: [],
      binge_sessions: [],
    });

    for (const achievement of computeAchievements(hostile)) {
      expect(achievement.target).toBeGreaterThan(0);
      expect(Number.isFinite(achievement.progress / achievement.target)).toBe(true);
      expect(achievement.progress).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("computeAchievements — values derived from optional blocks", () => {
  it("counts countries, platforms and years from their arrays", () => {
    const achievements = computeAchievements(
      makeStats({
        country_distribution: [country("BR"), country("PT"), country("US")],
        platform_hours: [platformHour("android"), platformHour("web")],
        yearly_stats: [year(2019), year(2020)],
      }),
    );

    expect(byId(achievements, "world-traveler")).toMatchObject({ progress: 3, unlocked: true });
    expect(byId(achievements, "platform-hopper")).toMatchObject({ progress: 2, unlocked: true });
    expect(byId(achievements, "year-veteran")).toMatchObject({ progress: 2, tier: "bronze" });
  });

  it("falls back to the legacy platforms list when platform_hours is absent", () => {
    const achievements = computeAchievements(
      makeStats({ platforms: [{ platform: "ios", count: 4, pct: 100 }] }),
    );

    expect(byId(achievements, "platform-hopper").progress).toBe(1);
  });

  it("takes the longest binge session, not the average or the count", () => {
    const achievements = computeAchievements(
      makeStats({
        binge_sessions: [binge(1.5), binge(9.25), binge(3)],
      }),
    );

    expect(byId(achievements, "marathon-runner")).toMatchObject({
      progress: 9.25,
      tier: "gold",
      context: "9.3 hour session",
    });
  });

  it("derives completion rate as a percentage and survives a zero denominator", () => {
    expect(
      byId(
        computeAchievements(makeStats({ completion_distribution: completion(90, 100) })),
        "completionist",
      ),
    ).toMatchObject({ progress: 90, tier: "gold" });

    expect(
      byId(
        computeAchievements(makeStats({ completion_distribution: completion(0, 0) })),
        "completionist",
      ),
    ).toMatchObject({ progress: 0, unlocked: false });
  });

  it("derives the morning share from the hourly histogram", () => {
    const achievements = computeAchievements(
      makeStats({
        hourly_distribution: [hourly(7, 30), hourly(8, 30), hourly(20, 40)],
      }),
    );

    // 60 of 100 streams land in the 06:00–10:00 window.
    expect(byId(achievements, "early-bird")).toMatchObject({ progress: 60, tier: "platinum" });
  });

  it("excludes the hour the window ends on", () => {
    const achievements = computeAchievements(
      makeStats({
        hourly_distribution: [hourly(10, 50), hourly(20, 50)],
      }),
    );

    expect(byId(achievements, "early-bird").progress).toBe(0);
  });

  it("accepts a fractional target for the diversity score", () => {
    const achievements = computeAchievements(
      makeStats({
        diversity_score: diversity({ normalized_entropy: 0.88 }),
      }),
    );

    expect(byId(achievements, "diversity-champion")).toMatchObject({
      progress: 0.88,
      tier: "gold",
      target: 0.95,
    });
  });
});

describe("computeAchievements — ordering", () => {
  it("puts every unlocked badge ahead of every locked one", () => {
    const achievements = computeAchievements(
      makeStats({ total_hours: 700, total_streams: 30_000, unique_artists: 600 }),
    );
    const firstLocked = achievements.findIndex((a) => !a.unlocked);

    expect(firstLocked).toBeGreaterThan(0);
    expect(achievements.slice(firstLocked).some((a) => a.unlocked)).toBe(false);
  });

  it("sorts locked badges by how close they are to their next tier", () => {
    const achievements = computeAchievements(makeStats({ total_hours: 90, unique_artists: 5 }));
    const locked = achievements.filter((a) => !a.unlocked);
    const ratios = locked.map((a) => a.progress / a.target);

    // 90/100 for Century Club should sit above 5/100 for Artist Collector.
    expect([...ratios].sort((a, b) => b - a)).toEqual(ratios);
    expect(locked[0].id).toBe("century-club");
  });

  it("is deterministic for the same payload", () => {
    const stats = makeStats({ total_hours: 1200, shuffle_pct: 60 });

    expect(computeAchievements(stats)).toEqual(computeAchievements(stats));
  });
});

describe("computeAchievements — context copy", () => {
  it("adds a human sentence only to the badges that define one", () => {
    const achievements = computeAchievements(
      makeStats({
        total_hours: 1234.6,
        listening_streaks: streaks(42, 3),
        statistics_summary: summary({ avg_daily_hours: 2.64 }),
      }),
    );

    expect(byId(achievements, "century-club").context).toBe("1235 hours of music");
    expect(byId(achievements, "streak-master").context).toBe("42 consecutive days");
    expect(byId(achievements, "heavy-hitter").context).toBe("2.6 hours per day");
    expect(byId(achievements, "stream-machine").context).toBeUndefined();
  });

  it("never renders NaN or Infinity in a context string", () => {
    const achievements = computeAchievements(
      makeStats({ total_hours: 0, binge_sessions: [], statistics_summary: undefined }),
    );

    for (const achievement of achievements) {
      expect(achievement.context ?? "").not.toMatch(/NaN|Infinity/);
    }
  });
});
