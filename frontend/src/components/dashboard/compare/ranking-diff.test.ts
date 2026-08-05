import { describe, expect, it } from "vitest";
import { album, artist, makeStats, track } from "@/test/fixtures";
import { buildRankingDiff, RANKING_LABELS } from "./ranking-diff";

/**
 * The rank join is the piece of the compare page most likely to be quietly wrong: it is a
 * full outer join over two lists keyed by a normalised name, and every interesting case
 * (present on one side only, identical rank, the same artist spelled differently) lives at
 * a boundary. These tests pin all of them.
 */

const artistsA = makeStats({
  top_artists: [artist("Radiohead", 40), artist("Fela Kuti", 30), artist("Nina Simone", 20)],
});

describe("buildRankingDiff — the outer join", () => {
  it("marks an entity present only in A as gone, and only in B as new", () => {
    const a = makeStats({ top_artists: [artist("Radiohead"), artist("Fela Kuti")] });
    const b = makeStats({ top_artists: [artist("Radiohead"), artist("Nina Simone")] });

    const diff = buildRankingDiff(a, b, "artists");

    const fela = diff.listA.find((row) => row.label === "Fela Kuti");
    expect(fela?.movement).toBe("gone");
    expect(fela?.rankA).toBe(2);
    expect(fela?.rankB).toBeNull();
    expect(fela?.rankChange).toBeNull();

    const nina = diff.listB.find((row) => row.label === "Nina Simone");
    expect(nina?.movement).toBe("new");
    expect(nina?.rankA).toBeNull();
    expect(nina?.rankB).toBe(2);
    expect(nina?.rankChange).toBeNull();

    expect(diff.entered).toBe(1);
    expect(diff.left).toBe(1);
  });

  it("reports an identical rank as held, not as a movement", () => {
    const diff = buildRankingDiff(artistsA, artistsA, "artists");

    expect(diff.listB.map((row) => row.movement)).toEqual(["same", "same", "same"]);
    expect(diff.listB.every((row) => row.rankChange === 0)).toBe(true);
    expect(diff.held).toBe(3);
    expect(diff.climbed).toBe(0);
    expect(diff.fell).toBe(0);
    expect(diff.entered).toBe(0);
    expect(diff.left).toBe(0);
  });

  it("computes rankChange as A − B, so a climb is positive", () => {
    const a = makeStats({
      top_artists: [artist("Fela Kuti"), artist("Nina Simone"), artist("Radiohead")],
    });
    const b = makeStats({
      top_artists: [artist("Radiohead"), artist("Fela Kuti"), artist("Nina Simone")],
    });

    const diff = buildRankingDiff(a, b, "artists");
    const byLabel = Object.fromEntries(diff.listB.map((row) => [row.label, row]));

    // 3rd → 1st is a climb of two places.
    expect(byLabel["Radiohead"].movement).toBe("up");
    expect(byLabel["Radiohead"].rankChange).toBe(2);
    // 1st → 2nd and 2nd → 3rd both slipped one.
    expect(byLabel["Fela Kuti"].movement).toBe("down");
    expect(byLabel["Fela Kuti"].rankChange).toBe(-1);
    expect(byLabel["Nina Simone"].rankChange).toBe(-1);

    expect(diff.climbed).toBe(1);
    expect(diff.fell).toBe(2);
    expect(diff.held).toBe(0);
  });
});

describe("buildRankingDiff — key normalisation", () => {
  it("matches across casing and stray whitespace rather than reporting a new entry", () => {
    const a = makeStats({ top_artists: [artist("  radiohead  ", 40)] });
    const b = makeStats({ top_artists: [artist("RADIOHEAD", 50)] });

    const diff = buildRankingDiff(a, b, "artists");

    expect(diff.entered).toBe(0);
    expect(diff.left).toBe(0);
    expect(diff.held).toBe(1);
    expect(diff.listB[0].hoursA).toBe(40);
    expect(diff.listB[0].hoursB).toBe(50);
  });

  it("displays B's spelling, and trims the label on both sides", () => {
    const a = makeStats({ top_artists: [artist("  radiohead ")] });
    const b = makeStats({ top_artists: [artist(" Radiohead ")] });

    expect(buildRankingDiff(a, b, "artists").listB[0].label).toBe("Radiohead");
    // With no B entry to prefer, A's (trimmed) spelling is what shows.
    expect(buildRankingDiff(a, undefined, "artists").listA[0].label).toBe("radiohead");
  });

  it("keys tracks and albums on the artist too, so a cover is not the original", () => {
    const a = makeStats({ top_tracks: [track("Hurt", "Nine Inch Nails")] });
    const b = makeStats({ top_tracks: [track("Hurt", "Johnny Cash")] });

    const diff = buildRankingDiff(a, b, "tracks");

    expect(diff.entered).toBe(1);
    expect(diff.left).toBe(1);
    expect(diff.listB[0].sublabel).toBe("Johnny Cash");
  });

  it("keeps the higher-ranked row when a duplicate key arrives", () => {
    const a = makeStats({
      top_artists: [artist("Radiohead", 40), artist("radiohead", 5), artist("Fela Kuti", 30)],
    });

    const diff = buildRankingDiff(a, undefined, "artists");

    expect(diff.listA).toHaveLength(2);
    expect(diff.listA[0].hoursA).toBe(40);
    // Ranks stay dense: Fela is 2nd, not 3rd.
    expect(diff.listA[1].rankA).toBe(2);
  });

  it("drops nameless rows instead of rendering a blank entry", () => {
    const a = makeStats({ top_artists: [artist("Radiohead"), artist("   "), artist("Fela")] });

    const diff = buildRankingDiff(a, undefined, "artists");

    expect(diff.listA.map((row) => row.label)).toEqual(["Radiohead", "Fela"]);
    expect(diff.listA[1].rankA).toBe(2);
  });
});

describe("buildRankingDiff — degenerate inputs", () => {
  it("returns an empty, zeroed diff when both periods are missing", () => {
    const diff = buildRankingDiff(undefined, undefined, "artists");

    expect(diff).toMatchObject({
      kind: "artists",
      listA: [],
      listB: [],
      topSize: 0,
      entered: 0,
      left: 0,
      climbed: 0,
      fell: 0,
      held: 0,
    });
  });

  it("treats an entirely empty period as a clean sweep", () => {
    const b = makeStats({ top_artists: [artist("Radiohead"), artist("Fela Kuti")] });

    const fromNothing = buildRankingDiff(makeStats(), b, "artists");
    expect(fromNothing.entered).toBe(2);
    expect(fromNothing.left).toBe(0);
    expect(fromNothing.listB.every((row) => row.movement === "new")).toBe(true);
    expect(fromNothing.listB.every((row) => row.hoursA === null)).toBe(true);

    const toNothing = buildRankingDiff(b, makeStats(), "artists");
    expect(toNothing.left).toBe(2);
    expect(toNothing.entered).toBe(0);
    expect(toNothing.listA.every((row) => row.movement === "gone")).toBe(true);
  });

  it("survives a payload whose top lists are absent altogether", () => {
    const bare = makeStats();
    delete (bare as Partial<typeof bare>).top_artists;
    delete (bare as Partial<typeof bare>).top_albums;

    const stats = bare as Parameters<typeof buildRankingDiff>[0];
    expect(() => buildRankingDiff(stats, stats, "artists")).not.toThrow();
    expect(buildRankingDiff(stats, stats, "albums").listA).toEqual([]);
  });

  it("coerces a missing hours/plays figure to zero rather than NaN", () => {
    const a = makeStats({
      top_artists: [{ artist_name: "Radiohead" } as unknown as ReturnType<typeof artist>],
    });

    const diff = buildRankingDiff(a, undefined, "artists");

    expect(diff.listA[0].hoursA).toBe(0);
    expect(diff.listA[0].playsA).toBe(0);
  });
});

describe("buildRankingDiff — topSize", () => {
  it("takes the longer of the two lists, since that is what 'top N' means here", () => {
    const a = makeStats({ top_albums: [album("Kid A", "Radiohead")] });
    const b = makeStats({
      top_albums: [album("Kid A", "Radiohead"), album("In Rainbows", "Radiohead")],
    });

    expect(buildRankingDiff(a, b, "albums").topSize).toBe(2);
    expect(buildRankingDiff(b, a, "albums").topSize).toBe(2);
  });
});

describe("RANKING_LABELS", () => {
  it("names every ranking kind", () => {
    expect(RANKING_LABELS).toEqual({
      artists: "Artists",
      tracks: "Tracks",
      albums: "Albums",
    });
  });
});
