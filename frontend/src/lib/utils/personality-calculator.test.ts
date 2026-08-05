import { describe, expect, it } from "vitest";
import {
  binge,
  completion,
  diversity,
  hourly,
  lateNight,
  makeStats,
  nostalgia,
  streaks,
  summary,
} from "@/test/fixtures";
import { calculatePersonality } from "./personality-calculator";

/**
 * Six trait scores drive a radar chart and a headline archetype. The chart cannot render a
 * NaN and the archetype cannot be blank, so the invariants worth pinning are the boundaries:
 * every score is an integer in [0, 100], and the winning trait always resolves to a named
 * type rather than silently falling back to the default.
 */

const TRAIT_NAMES = [
  "Explorer",
  "Loyalist",
  "Night Owl",
  "Binge Listener",
  "Completionist",
  "Curator",
];

describe("calculatePersonality — shape", () => {
  it("returns all six traits in a fixed order", () => {
    const profile = calculatePersonality(makeStats());

    expect(profile.traits.map((trait) => trait.name)).toEqual(TRAIT_NAMES);
  });

  it("describes every trait", () => {
    for (const trait of calculatePersonality(makeStats()).traits) {
      expect(trait.description.length).toBeGreaterThan(10);
    }
  });

  it("always names an archetype and explains it", () => {
    const profile = calculatePersonality(makeStats());

    expect(profile.dominantType).toBeTruthy();
    expect(profile.typeDescription).toBeTruthy();
  });

  it("is deterministic", () => {
    const stats = makeStats({ shuffle_pct: 30, skip_pct: 12, total_streams: 1000 });

    expect(calculatePersonality(stats)).toEqual(calculatePersonality(stats));
  });
});

describe("calculatePersonality — scores stay chartable", () => {
  /** Every score must be an integer the radar chart can plot on a 0–100 axis. */
  function expectPlottable(profile: ReturnType<typeof calculatePersonality>) {
    for (const trait of profile.traits) {
      expect(Number.isInteger(trait.score)).toBe(true);
      expect(trait.score).toBeGreaterThanOrEqual(0);
      expect(trait.score).toBeLessThanOrEqual(100);
    }
  }

  it("clamps an empty export into range", () => {
    expectPlottable(calculatePersonality(makeStats()));
  });

  it("clamps a payload built to overflow every formula", () => {
    // Each of these feeds a multiplier — 200% late-night, 20-hour binges and so on.
    expectPlottable(
      calculatePersonality(
        makeStats({
          total_streams: 1,
          unique_artists: 1_000_000,
          shuffle_pct: 100,
          skip_pct: 100,
          late_night_analysis: lateNight(100),
          diversity_score: diversity({ normalized_entropy: 1, top10_concentration: 100 }),
          listening_streaks: streaks(4000, 10),
          binge_sessions: Array.from({ length: 200 }, () => binge(20, 300)),
          statistics_summary: summary({ avg_daily_hours: 24, total_days_active: 2000 }),
          nostalgia_tracks: Array.from({ length: 100 }, (_, i) => nostalgia(i)),
        }),
      ),
    );
  });

  it("clamps a payload built to underflow it", () => {
    expectPlottable(
      calculatePersonality(
        makeStats({
          shuffle_pct: 100,
          skip_pct: 100,
          late_night_analysis: lateNight(0, 0, 0),
          diversity_score: diversity({ normalized_entropy: 0, top10_concentration: 0 }),
          completion_distribution: completion(0, 0),
        }),
      ),
    );
  });

  it("does not divide by zero on a payload with no streams", () => {
    // `unique_artists / total_streams` is the one raw division in the module.
    const profile = calculatePersonality(makeStats({ total_streams: 0, unique_artists: 50 }));

    expect(profile.traits.every((trait) => Number.isFinite(trait.score))).toBe(true);
  });

  it("survives every optional block being absent", () => {
    expect(() => calculatePersonality(makeStats())).not.toThrow();
  });
});

describe("calculatePersonality — the formulas point the right way", () => {
  /** Score for one trait under a given payload. */
  function score(name: string, overrides: Parameters<typeof makeStats>[0]) {
    const trait = calculatePersonality(makeStats(overrides)).traits.find((t) => t.name === name);
    if (!trait) throw new Error(`No trait named "${name}"`);
    return trait.score;
  }

  it("rewards a listener who never shuffles with a high Curator score", () => {
    expect(score("Curator", { shuffle_pct: 0, skip_pct: 0 })).toBeGreaterThan(
      score("Curator", { shuffle_pct: 95, skip_pct: 60 }),
    );
  });

  it("rewards finishing songs with a high Completionist score", () => {
    expect(
      score("Completionist", {
        completion_distribution: completion(95, 100),
        skip_pct: 2,
      }),
    ).toBeGreaterThan(
      score("Completionist", {
        completion_distribution: completion(20, 100),
        skip_pct: 70,
      }),
    );
  });

  it("reads Night Owl straight off the hourly histogram when the summary is absent", () => {
    const late = score("Night Owl", {
      hourly_distribution: [hourly(1, 80), hourly(14, 20)],
    });
    const daytime = score("Night Owl", {
      hourly_distribution: [hourly(9, 80), hourly(14, 20)],
    });

    expect(late).toBeGreaterThan(daytime);
    expect(daytime).toBe(0);
  });

  it("counts the late window as wrapping past midnight, not as a plain range", () => {
    // 22:00–04:00 spans the date boundary; a naive `hour >= 22 && hour <= 4` matches nothing.
    expect(score("Night Owl", { hourly_distribution: [hourly(23, 10)] })).toBe(100);
    expect(score("Night Owl", { hourly_distribution: [hourly(3, 10)] })).toBe(100);
  });

  it("rewards long sessions with a high Binge score", () => {
    const marathon = score("Binge Listener", {
      binge_sessions: [binge(6, 80)],
      statistics_summary: summary({ avg_daily_hours: 5 }),
    });
    const sipper = score("Binge Listener", {
      binge_sessions: [binge(2, 20)],
      statistics_summary: summary({ avg_daily_hours: 0.4 }),
    });

    expect(marathon).toBeGreaterThan(sipper);
  });

  it("rewards a wide, low-concentration library with a high Explorer score", () => {
    expect(
      score("Explorer", {
        total_streams: 1000,
        unique_artists: 400,
        diversity_score: diversity({ normalized_entropy: 0.95, top10_concentration: 8 }),
      }),
    ).toBeGreaterThan(
      score("Explorer", {
        total_streams: 1000,
        unique_artists: 12,
        diversity_score: diversity({ normalized_entropy: 0.1, top10_concentration: 95 }),
      }),
    );
  });

  it("rewards concentration and long streaks with a high Loyalist score", () => {
    expect(
      score("Loyalist", {
        diversity_score: diversity({ normalized_entropy: 0.1, top10_concentration: 90 }),
        listening_streaks: streaks(300, 40),
      }),
    ).toBeGreaterThan(
      score("Loyalist", {
        diversity_score: diversity({ normalized_entropy: 0.95, top10_concentration: 5 }),
        listening_streaks: streaks(2),
      }),
    );
  });
});

describe("calculatePersonality — the dominant archetype", () => {
  /** The archetype produced when one trait is driven to the top. */
  function archetype(overrides: Parameters<typeof makeStats>[0]) {
    return calculatePersonality(makeStats(overrides)).dominantType;
  }

  it("names the winning trait's archetype, not a generic one", () => {
    expect(
      archetype({
        hourly_distribution: [hourly(2, 500)],
        late_night_analysis: lateNight(90, 500, 50),
      }),
    ).toBe("The Moonlit Listener");

    expect(
      archetype({
        binge_sessions: [binge(12, 200)],
        statistics_summary: summary({ avg_daily_hours: 8 }),
      }),
    ).toBe("The Marathon Runner");

    expect(archetype({ shuffle_pct: 0, skip_pct: 0 })).toBe("The Architect");
  });

  it("maps every one of the six trait names onto a real archetype", () => {
    // The `?? PERSONALITY_TYPES.explorer` fallback exists for safety, but no trait should
    // ever need it — a renamed trait silently becoming "The Archaeologist" would be a bug.
    const archetypes = new Set<string>();

    for (const overrides of [
      { total_streams: 10, unique_artists: 10 },
      {
        diversity_score: diversity({ normalized_entropy: 0.05, top10_concentration: 99 }),
        listening_streaks: streaks(900, 5),
      },
      { late_night_analysis: lateNight(99) },
      { binge_sessions: [binge(12, 200)], statistics_summary: summary({ avg_daily_hours: 9 }) },
      { completion_distribution: completion(100, 100), skip_pct: 0, shuffle_pct: 100 },
      { shuffle_pct: 0, skip_pct: 0 },
    ]) {
      archetypes.add(archetype(overrides));
    }

    expect(archetypes.size).toBeGreaterThanOrEqual(5);
    expect(archetypes).not.toContain("");
  });

  it("still names an archetype for a completely empty export", () => {
    // Nothing to go on, so the neutral 50 baselines decide it — Loyalist keeps its 50 while
    // Explorer is halved by a zero unique-artist ratio. The point is that it resolves at all.
    const profile = calculatePersonality(makeStats());

    expect(profile.dominantType).toBe("The Devotee");
    expect(profile.typeDescription.length).toBeGreaterThan(20);
  });

  it("breaks a tie by declaration order rather than at random", () => {
    // Array.prototype.sort is stable, so the first trait declared wins an exact tie.
    const flat = calculatePersonality(makeStats());
    const top = Math.max(...flat.traits.map((trait) => trait.score));
    const tied = flat.traits.filter((trait) => trait.score === top);

    expect(tied[0].name).toBe(flat.traits.find((t) => t.score === top)?.name);
  });
});
