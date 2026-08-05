import { describe, expect, it } from "vitest";
import { artist, makeStats, track } from "@/test/fixtures";
import { buildSearchIndex, searchEntities } from "./search-index";

describe("buildSearchIndex", () => {
  it("flattens artists and tracks into one list, tagged by type", () => {
    const index = buildSearchIndex(
      makeStats({
        top_artists: [artist("Radiohead", 42, 300)],
        top_tracks: [track("Weird Fishes", "Radiohead", 3, 20)],
      }),
    );

    expect(index).toEqual([
      { type: "artist", name: "Radiohead", hours: 42, plays: 300 },
      {
        type: "track",
        name: "Weird Fishes",
        artistName: "Radiohead",
        hours: 3,
        plays: 20,
      },
    ]);
  });

  it("keeps artists ahead of tracks, so an exact artist match ranks first", () => {
    const index = buildSearchIndex(
      makeStats({
        top_artists: [artist("A"), artist("B")],
        top_tracks: [track("T", "A")],
      }),
    );

    expect(index.map((entry) => entry.type)).toEqual(["artist", "artist", "track"]);
  });

  it("leaves artistName unset on artists, so the field marks a track", () => {
    const [entry] = buildSearchIndex(makeStats({ top_artists: [artist("Björk")] }));

    expect(entry.artistName).toBeUndefined();
  });

  it("returns an empty index for a payload with no top lists", () => {
    expect(buildSearchIndex(makeStats())).toEqual([]);
  });

  it("survives a truncated payload missing the arrays entirely", () => {
    const partial = makeStats();
    delete (partial as Partial<typeof partial>).top_artists;
    delete (partial as Partial<typeof partial>).top_tracks;

    expect(() => buildSearchIndex(partial)).not.toThrow();
    expect(buildSearchIndex(partial)).toEqual([]);
  });

  it("indexes one list even when the other is missing", () => {
    const artistsOnly = makeStats({ top_artists: [artist("Solo")] });
    delete (artistsOnly as Partial<typeof artistsOnly>).top_tracks;

    expect(buildSearchIndex(artistsOnly)).toHaveLength(1);
  });
});

describe("searchEntities", () => {
  const index = buildSearchIndex(
    makeStats({
      top_artists: [artist("Radiohead"), artist("Portishead"), artist("Sigur Rós")],
      top_tracks: [
        track("Karma Police", "Radiohead"),
        track("Glory Box", "Portishead"),
        track("Hoppípolla", "Sigur Rós"),
      ],
    }),
  );

  it("matches on a substring anywhere in the name", () => {
    expect(searchEntities(index, "portis").map((r) => r.name)).toEqual([
      "Portishead",
      "Glory Box",
    ]);
    expect(searchEntities(index, "police").map((r) => r.name)).toEqual(["Karma Police"]);
  });

  it("matches artists and their tracks together on a shared substring", () => {
    // "head" hits two artists by name and their tracks by artistName.
    expect(searchEntities(index, "head").map((r) => r.name)).toEqual([
      "Radiohead",
      "Portishead",
      "Karma Police",
      "Glory Box",
    ]);
  });

  it("is case-insensitive in both directions", () => {
    expect(searchEntities(index, "RADIOHEAD")).toEqual(searchEntities(index, "radiohead"));
    expect(searchEntities(index, "karma police")).toHaveLength(1);
  });

  it("matches a track by its artist, not only by its title", () => {
    // Typing "portishead" should surface Glory Box even though the title never says it.
    const names = searchEntities(index, "portishead").map((r) => r.name);

    expect(names).toContain("Glory Box");
  });

  it("ignores surrounding whitespace", () => {
    expect(searchEntities(index, "   radiohead  ")).toEqual(searchEntities(index, "radiohead"));
  });

  it("returns nothing for an empty or whitespace-only query", () => {
    // An empty box must not dump the whole library into the palette.
    expect(searchEntities(index, "")).toEqual([]);
    expect(searchEntities(index, "    ")).toEqual([]);
  });

  it("returns nothing when there is genuinely no match", () => {
    expect(searchEntities(index, "zzzzz")).toEqual([]);
  });

  it("matches non-ASCII names", () => {
    expect(searchEntities(index, "rós").map((r) => r.name)).toContain("Sigur Rós");
    expect(searchEntities(index, "hoppí")).toHaveLength(1);
  });

  it("treats the query as a literal, not a regular expression", () => {
    // A stray "(" from a real title must not blow up the filter.
    expect(() => searchEntities(index, "(")).not.toThrow();
    expect(searchEntities(index, ".*")).toEqual([]);
  });

  it("caps the result list so the palette stays a shortlist", () => {
    const many = buildSearchIndex(
      makeStats({
        top_artists: Array.from({ length: 40 }, (_, i) => artist(`The Band ${i}`)),
      }),
    );

    expect(searchEntities(many, "band")).toHaveLength(15);
  });

  it("preserves index order within the cap, so artists win the top slots", () => {
    const mixed = buildSearchIndex(
      makeStats({
        top_artists: Array.from({ length: 10 }, (_, i) => artist(`Match A${i}`)),
        top_tracks: Array.from({ length: 10 }, (_, i) => track(`Match T${i}`, "Someone")),
      }),
    );
    const results = searchEntities(mixed, "match");

    expect(results).toHaveLength(15);
    expect(results.slice(0, 10).every((r) => r.type === "artist")).toBe(true);
    expect(results.slice(10).every((r) => r.type === "track")).toBe(true);
  });

  it("searches an empty index without complaint", () => {
    expect(searchEntities([], "anything")).toEqual([]);
  });
});
