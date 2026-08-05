import { describe, expect, it } from "vitest";
import { skipFeatureCopy } from "./skip-features";

/**
 * The skip model ships its raw engineered column names through in `drivers`. Charting
 * those identifiers verbatim would be a database dump, so every one gets a human label —
 * and, critically, a column the backend adds later must still render rather than vanish.
 */

const KNOWN = [
  "shuffle",
  "artist_familiarity",
  "track_familiarity",
  "start_fwdbtn",
  "start_trackdone",
  "start_click",
  "pos_in_session",
  "hour",
  "weekday",
  "is_weekend",
  "offline",
  "is_mobile",
];

describe("skipFeatureCopy — known columns", () => {
  it("gives every trained feature a human label and an explanation", () => {
    for (const feature of KNOWN) {
      const copy = skipFeatureCopy(feature);

      expect(copy.label).toBeTruthy();
      // A label that still looks like a column name defeats the point.
      expect(copy.label).not.toContain("_");
      expect(copy.explanation.length).toBeGreaterThan(20);
      expect(copy.explanation.endsWith(".")).toBe(true);
    }
  });

  it("translates the least obvious identifiers into plain language", () => {
    expect(skipFeatureCopy("start_fwdbtn").label).toBe("Arrived via the skip button");
    expect(skipFeatureCopy("start_trackdone").label).toBe("Auto-played after a finished track");
    expect(skipFeatureCopy("pos_in_session").label).toBe("Position in the session");
    expect(skipFeatureCopy("is_mobile").label).toBe("On a phone");
  });

  it("does not reuse a label between two different features", () => {
    const labels = KNOWN.map((feature) => skipFeatureCopy(feature).label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("returns the same object shape every time", () => {
    expect(Object.keys(skipFeatureCopy("shuffle")).sort()).toEqual(["explanation", "label"]);
  });
});

describe("skipFeatureCopy — the fallback for a column the backend just added", () => {
  it("de-snakes an unknown feature into a sentence-cased label", () => {
    expect(skipFeatureCopy("danceability_score")).toEqual({
      label: "Danceability score",
      explanation: "A feature the skip model was trained on.",
    });
  });

  it("capitalises only the first word, so it reads as a sentence not a title", () => {
    expect(skipFeatureCopy("time_since_last_play").label).toBe("Time since last play");
  });

  it("handles a single-word column", () => {
    expect(skipFeatureCopy("tempo").label).toBe("Tempo");
  });

  it("does not drop the feature just because it is unrecognised", () => {
    // The whole point of the fallback: a new backend column still charts.
    expect(skipFeatureCopy("brand_new_thing").label).toBeTruthy();
  });

  it("survives degenerate identifiers without throwing", () => {
    for (const weird of ["", "_", "__", "_leading", "trailing_", "a__b"]) {
      expect(() => skipFeatureCopy(weird)).not.toThrow();
      expect(typeof skipFeatureCopy(weird).label).toBe("string");
    }

    expect(skipFeatureCopy("_leading").label).toBe("Leading");
    expect(skipFeatureCopy("trailing_").label).toBe("Trailing");
    expect(skipFeatureCopy("a__b").label).toBe("A b");
    expect(skipFeatureCopy("").label).toBe("");
  });

  it("never mistakes an unknown column for a known one", () => {
    // A near-miss must take the fallback explanation, not shuffle's.
    expect(skipFeatureCopy("shuffle_mode").explanation).toBe(
      "A feature the skip model was trained on.",
    );
    expect(skipFeatureCopy("Shuffle").label).toBe("Shuffle");
    expect(skipFeatureCopy("Shuffle").explanation).toBe(
      "A feature the skip model was trained on.",
    );
  });
});
