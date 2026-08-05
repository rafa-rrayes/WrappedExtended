import { describe, expect, it } from "vitest";
import {
  ENTITY_META,
  decodeEntityName,
  entityHref,
  formatDay,
  formatHour,
  formatHoursCompact,
  formatMonthLong,
  formatMonthShort,
  libraryHref,
  rampColor,
} from "./entity-meta";

/**
 * Artist names are hostile input. "AC/DC" carries a path separator, "Error 50% Off" carries
 * a bare percent sign, and both have to survive a round trip through a dynamic route
 * segment without changing the shape of the URL or throwing on the way back.
 */

describe("ENTITY_META", () => {
  it("describes all three entity types consistently", () => {
    expect(Object.keys(ENTITY_META)).toEqual(["artist", "track", "album"]);

    for (const [key, meta] of Object.entries(ENTITY_META)) {
      expect(meta.type).toBe(key);
      expect(meta.segment).toBe(`${meta.singular}s`);
      expect(meta.plural).toBe(`${meta.singular}s`);
      expect(meta.searchPlaceholder).toContain(meta.plural);
    }
  });

  it("gives a secondary artist column only to the types that have one", () => {
    expect(ENTITY_META.artist.hasArtistColumn).toBe(false);
    expect(ENTITY_META.track.hasArtistColumn).toBe(true);
    expect(ENTITY_META.album.hasArtistColumn).toBe(true);
  });

  it("marks the types whose detail endpoint fills child lists", () => {
    expect(ENTITY_META.artist.hasChildren).toBe(true);
    expect(ENTITY_META.album.hasChildren).toBe(true);
    // A track has nothing beneath it.
    expect(ENTITY_META.track.hasChildren).toBe(false);
  });
});

describe("libraryHref / entityHref", () => {
  it("builds the library route for each type", () => {
    expect(libraryHref("d1", "artist")).toBe("/dashboard/d1/artists");
    expect(libraryHref("d1", "track")).toBe("/dashboard/d1/tracks");
    expect(libraryHref("d1", "album")).toBe("/dashboard/d1/albums");
  });

  it("percent-encodes a name so it stays inside the [name] segment", () => {
    // Unencoded, "AC/DC" would read as two path segments.
    expect(entityHref("d1", "artist", "AC/DC")).toBe("/dashboard/d1/artists/AC%2FDC");
    expect(entityHref("d1", "artist", "Where?")).toBe("/dashboard/d1/artists/Where%3F");
    expect(entityHref("d1", "artist", "P!nk #1")).toBe("/dashboard/d1/artists/P!nk%20%231");
    expect(entityHref("d1", "track", "50% Off")).toBe("/dashboard/d1/tracks/50%25%20Off");
  });

  it("handles non-Latin names", () => {
    expect(entityHref("d1", "artist", "宇多田ヒカル")).toBe(
      `/dashboard/d1/artists/${encodeURIComponent("宇多田ヒカル")}`,
    );
  });
});

describe("decodeEntityName", () => {
  it("returns an empty string for a missing param rather than throwing", () => {
    expect(decodeEntityName(undefined)).toBe("");
    expect(decodeEntityName([])).toBe("");
    expect(decodeEntityName("")).toBe("");
  });

  it("takes the first value of a catch-all array param", () => {
    expect(decodeEntityName(["Radiohead", "extra"])).toBe("Radiohead");
  });

  it("passes an already-decoded name straight through", () => {
    // Next decodes dynamic params for us, so this is the common case.
    expect(decodeEntityName("AC/DC")).toBe("AC/DC");
    expect(decodeEntityName("Radiohead")).toBe("Radiohead");
    expect(decodeEntityName("宇多田ヒカル")).toBe("宇多田ヒカル");
  });

  it("decodes a name that arrived still encoded", () => {
    expect(decodeEntityName("AC%2FDC")).toBe("AC/DC");
    expect(decodeEntityName("Sigur%20R%C3%B3s")).toBe("Sigur Rós");
  });

  it("does not throw on a malformed percent sequence — the artist is kept as-is", () => {
    // decodeURIComponent would throw a URIError on every one of these.
    expect(() => decodeEntityName("Error 50% Off")).not.toThrow();
    expect(decodeEntityName("Error 50% Off")).toBe("Error 50% Off");
    expect(decodeEntityName("100%")).toBe("100%");
    expect(decodeEntityName("%")).toBe("%");
    expect(decodeEntityName("%zz")).toBe("%zz");
    expect(decodeEntityName("Discount %5")).toBe("Discount %5");
  });

  it("round-trips every awkward name Next would hand back decoded", () => {
    const names = ["AC/DC", "Where?", "P!nk #1", "50% Off", "Sigur Rós", "宇多田ヒカル", "a b"];

    for (const name of names) {
      const segment = entityHref("d1", "artist", name).split("/").pop() as string;
      // Next percent-decodes the segment before it reaches the page.
      expect(decodeEntityName(decodeURIComponent(segment))).toBe(name);
    }
  });

  it("is lossy only for a name that itself looks like a valid escape", () => {
    // Acknowledged trade-off in the module's own docs: "100%20" is indistinguishable from
    // an encoded space once Next has already decoded the segment once.
    expect(decodeEntityName("100%20")).toBe("100 ");
  });
});

describe("formatDay", () => {
  it("renders a calendar date without going through a local-time Date", () => {
    // `new Date("2024-03-12").toLocaleDateString()` renders 11 March west of Greenwich.
    expect(formatDay("2024-03-12")).toBe("12 Mar 2024");
    expect(formatDay("2024-01-01")).toBe("1 Jan 2024");
    expect(formatDay("2024-12-31")).toBe("31 Dec 2024");
  });

  it("accepts a full timestamp", () => {
    expect(formatDay("2024-03-12T23:59:59Z")).toBe("12 Mar 2024");
  });

  it("renders an em dash for anything unusable", () => {
    expect(formatDay(null)).toBe("—");
    expect(formatDay(undefined)).toBe("—");
    expect(formatDay("")).toBe("—");
    expect(formatDay("bogus")).toBe("—");
    expect(formatDay("2024-13-05")).toBe("—");
    expect(formatDay("2024-03")).toBe("—");
  });
});

describe("formatMonthShort / formatMonthLong", () => {
  it("formats a YYYY-MM bucket", () => {
    expect(formatMonthShort("2024-03")).toBe("Mar '24");
    expect(formatMonthShort("2019-12")).toBe("Dec '19");
    expect(formatMonthLong("2024-03")).toBe("March 2024");
    expect(formatMonthLong("2019-12")).toBe("December 2019");
  });

  it("tolerates a longer date being passed in", () => {
    expect(formatMonthShort("2024-03-15")).toBe("Mar '24");
    expect(formatMonthLong("2024-03-15")).toBe("March 2024");
  });

  it("returns the input unchanged for an out-of-range month", () => {
    expect(formatMonthShort("2024-13")).toBe("2024-13");
    expect(formatMonthShort("2024-00")).toBe("2024-00");
    expect(formatMonthLong("2024-13")).toBe("2024-13");
  });

  // A range check alone did not cover this: with no "-" in the input `monthNumber` is
  // undefined, `index` is NaN, and every comparison against NaN is false — so the guard
  // passed and `MONTH_NAMES[NaN]` interpolated as the literal string "undefined".
  it("returns an input with no separator unchanged", () => {
    expect(formatMonthShort("bogus")).toBe("bogus");
    expect(formatMonthLong("bogus")).toBe("bogus");
    expect(formatMonthShort("")).toBe("");
    expect(formatMonthLong("")).toBe("");
  });

  it("returns an input with a non-numeric month unchanged", () => {
    expect(formatMonthShort("2024-ab")).toBe("2024-ab");
    expect(formatMonthLong("2024-ab")).toBe("2024-ab");
  });
});

describe("formatHour", () => {
  it("renders a 24-hour clock hour in 12-hour form", () => {
    expect(formatHour(0)).toBe("12 AM");
    expect(formatHour(1)).toBe("1 AM");
    expect(formatHour(11)).toBe("11 AM");
    expect(formatHour(12)).toBe("12 PM");
    expect(formatHour(13)).toBe("1 PM");
    expect(formatHour(23)).toBe("11 PM");
  });

  it("covers all 24 hours without repeating a label", () => {
    const labels = Array.from({ length: 24 }, (_, hour) => formatHour(hour));
    expect(new Set(labels).size).toBe(24);
  });
});

describe("formatHoursCompact", () => {
  it("switches to minutes below an hour", () => {
    expect(formatHoursCompact(0)).toBe("0m");
    expect(formatHoursCompact(0.25)).toBe("15m");
    expect(formatHoursCompact(0.99)).toBe("59m");
  });

  it("keeps one decimal between 1 and 100 hours", () => {
    expect(formatHoursCompact(1)).toBe("1.0h");
    expect(formatHoursCompact(9.94)).toBe("9.9h");
    expect(formatHoursCompact(10)).toBe("10.0h");
    expect(formatHoursCompact(99.94)).toBe("99.9h");
  });

  it("drops the decimal once the cell would get too wide", () => {
    expect(formatHoursCompact(100)).toBe("100h");
    expect(formatHoursCompact(1234.5)).toMatch(/^1.235h$/);
  });
});

describe("rampColor", () => {
  it("starts on the brand green and ends on the brand gold", () => {
    expect(rampColor(0, 5)).toBe("rgb(29,185,84)");
    expect(rampColor(4, 5)).toBe("rgb(245,166,35)");
  });

  it("interpolates in between", () => {
    expect(rampColor(1, 3)).toBe("rgb(137,176,60)");
  });

  it("does not divide by zero on a single-item or empty series", () => {
    expect(rampColor(0, 1)).toBe("rgb(29,185,84)");
    expect(rampColor(0, 0)).toBe("rgb(29,185,84)");
  });

  it("always emits a parseable rgb() triple", () => {
    for (let index = 0; index < 12; index++) {
      expect(rampColor(index, 12)).toMatch(/^rgb\(\d{1,3},\d{1,3},\d{1,3}\)$/);
    }
  });
});
