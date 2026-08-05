import { describe, expect, it } from "vitest";
import { delta } from "@/test/fixtures";
import {
  COMPARE_METRICS,
  changeDirection,
  deltaTone,
  formatMetricChange,
  formatMetricValue,
  metricMeta,
  orderedDeltaKeys,
} from "./metrics";

/**
 * Two things this module must never do: paint a worse year green, and print an
 * arithmetic accident ("NaN%", "+Infinity%") at the user. Both are covered directly.
 */

describe("metricMeta", () => {
  it("returns the curated meta for a known key", () => {
    expect(metricMeta("skip_pct")).toMatchObject({
      label: "Skip rate",
      unit: "percent",
      sentiment: "down-is-good",
    });
  });

  it("falls back to a neutral, de-snaked stand-in for a key the backend just added", () => {
    expect(metricMeta("avg_session_length")).toEqual({
      key: "avg_session_length",
      label: "Avg session length",
      unit: "count",
      sentiment: "neutral",
    });
  });

  it("infers the percent unit from a _pct suffix and renders it as a % label", () => {
    expect(metricMeta("completion_pct")).toMatchObject({
      label: "Completion %",
      unit: "percent",
      sentiment: "neutral",
    });
  });

  it("never guesses a sentiment for an unknown key", () => {
    expect(metricMeta("mystery_metric").sentiment).toBe("neutral");
    expect(metricMeta("hours_lost_pct").sentiment).toBe("neutral");
  });
});

describe("orderedDeltaKeys", () => {
  it("keeps the curated order regardless of the payload's key order", () => {
    const deltas = {
      shuffle_pct: delta(30, 35),
      total_hours: delta(100, 120),
      unique_artists: delta(50, 60),
    };

    expect(orderedDeltaKeys(deltas)).toEqual(["total_hours", "unique_artists", "shuffle_pct"]);
  });

  it("appends unrecognised keys alphabetically after the known ones", () => {
    const deltas = {
      zebra_metric: delta(1, 2),
      total_hours: delta(100, 120),
      alpha_metric: delta(1, 2),
    };

    expect(orderedDeltaKeys(deltas)).toEqual(["total_hours", "alpha_metric", "zebra_metric"]);
  });

  it("omits curated metrics the payload does not carry", () => {
    expect(orderedDeltaKeys({ total_hours: delta(1, 2) })).toEqual(["total_hours"]);
    expect(orderedDeltaKeys({})).toEqual([]);
  });
});

describe("changeDirection", () => {
  it("reports the sign of a real change", () => {
    expect(changeDirection(delta(100, 120))).toBe(1);
    expect(changeDirection(delta(120, 100))).toBe(-1);
  });

  it("has a dead zone so float dust does not read as a change", () => {
    expect(changeDirection({ a: 1, b: 1, abs: 0, pct: 0 })).toBe(0);
    expect(changeDirection({ a: 1, b: 1, abs: 0.00001, pct: 0 })).toBe(0);
    expect(changeDirection({ a: 1, b: 1, abs: -0.00001, pct: 0 })).toBe(0);
    expect(changeDirection({ a: 1, b: 1, abs: 0.001, pct: 0 })).toBe(1);
  });
});

describe("deltaTone — direction and desirability are not the same thing", () => {
  const hours = metricMeta("total_hours");
  const skip = metricMeta("skip_pct");
  const shuffle = metricMeta("shuffle_pct");

  it("greens a rise only where rising is good", () => {
    expect(deltaTone(hours, delta(100, 120))).toBe("positive");
    expect(deltaTone(hours, delta(120, 100))).toBe("negative");
  });

  it("greens a *falling* skip rate and reds a rising one", () => {
    // The headline case: 18% → 26% skipping is a worse year, not a better one.
    expect(deltaTone(skip, delta(18, 26))).toBe("negative");
    expect(deltaTone(skip, delta(26, 18))).toBe("positive");
  });

  it("stays neutral for a metric with no better direction", () => {
    expect(deltaTone(shuffle, delta(30, 60))).toBe("neutral");
    expect(deltaTone(shuffle, delta(60, 30))).toBe("neutral");
    expect(deltaTone(metricMeta("unknown_thing"), delta(1, 100))).toBe("neutral");
  });

  it("stays neutral when nothing actually moved", () => {
    expect(deltaTone(hours, delta(100, 100))).toBe("neutral");
    expect(deltaTone(skip, { a: 20, b: 20, abs: 0.00001, pct: 0 })).toBe("neutral");
  });

  it("assigns a tone to every curated metric without throwing", () => {
    for (const meta of COMPARE_METRICS) {
      expect(["positive", "negative", "neutral"]).toContain(deltaTone(meta, delta(10, 20)));
    }
  });
});

describe("formatMetricValue", () => {
  it("formats by unit", () => {
    // The thousands separator comes from the host locale, so it is matched loosely.
    expect(formatMetricValue(metricMeta("total_hours"), 1234.56)).toMatch(/^1.234.6h$/);
    expect(formatMetricValue(metricMeta("total_streams"), 12345.7)).toMatch(/^12.346$/);
    expect(formatMetricValue(metricMeta("skip_pct"), 18.44)).toBe("18.4%");
  });

  it("renders a non-finite value as an em dash rather than 'NaNh'", () => {
    expect(formatMetricValue(metricMeta("total_hours"), NaN)).toBe("—");
    expect(formatMetricValue(metricMeta("skip_pct"), Infinity)).toBe("—");
    expect(formatMetricValue(metricMeta("total_streams"), -Infinity)).toBe("—");
  });
});

describe("formatMetricChange — percentage points vs relative percent", () => {
  it("headlines a percent metric in percentage points, not percent-of-a-percent", () => {
    const change = formatMetricChange(metricMeta("skip_pct"), delta(20, 25));

    // delta.pct is literally +25%, which is the trap. The headline must be +5.0 pp.
    expect(change.primary).toBe("+5.0 pp");
    expect(change.secondary).toBe("+25% relative");
  });

  it("signs a fall correctly", () => {
    expect(formatMetricChange(metricMeta("skip_pct"), delta(25, 20)).primary).toBe("-5.0 pp");
  });

  it("headlines a count metric relatively with the absolute beneath", () => {
    const change = formatMetricChange(metricMeta("total_streams"), delta(1000, 1500));

    expect(change.primary).toBe("+50%");
    expect(change.secondary).toBe("+500");
  });

  it("keeps a decimal on small relative changes and drops it on large ones", () => {
    expect(formatMetricChange(metricMeta("total_streams"), delta(1000, 1050)).primary).toBe(
      "+5.0%",
    );
    expect(formatMetricChange(metricMeta("total_streams"), delta(1000, 1500)).primary).toBe(
      "+50%",
    );
  });

  it("shows an unchanged metric without a misleading sign", () => {
    const change = formatMetricChange(metricMeta("total_hours"), delta(100, 100));

    expect(change.primary).toBe("0.0%");
    expect(change.secondary).toBe("0h");
  });
});

describe("formatMetricChange — the undefined percentage", () => {
  it("renders pct === null as an em dash with an explanatory title", () => {
    // a === 0: the backend sends pct: null because the change is mathematically undefined.
    const change = formatMetricChange(metricMeta("total_hours"), delta(0, 40));

    expect(change.primary).toBe("—");
    expect(change.secondary).toBe("+40h");
    expect(change.title).toContain("period A");
  });

  it("still shows the absolute move, which is the part that is well defined", () => {
    expect(formatMetricChange(metricMeta("total_streams"), delta(0, 250)).secondary).toBe("+250");
  });

  it("omits the relative line on a percent metric whose A was zero", () => {
    const change = formatMetricChange(metricMeta("skip_pct"), delta(0, 12));

    expect(change.primary).toBe("+12.0 pp");
    expect(change.secondary).toBeNull();
  });

  it("never emits NaN% or Infinity%, whatever the payload contains", () => {
    const hostile = [
      { a: 0, b: 5, abs: 5, pct: Infinity },
      { a: 0, b: 0, abs: NaN, pct: NaN },
      { a: 1, b: 1, abs: Infinity, pct: -Infinity },
    ];

    for (const meta of COMPARE_METRICS) {
      for (const bad of hostile) {
        const change = formatMetricChange(meta, bad);
        const rendered = `${change.primary} ${change.secondary ?? ""}`;
        expect(rendered).not.toMatch(/NaN|Infinity/);
      }
    }
  });

  it("degrades the whole display to an em dash when even the absolute is unusable", () => {
    const change = formatMetricChange(metricMeta("total_hours"), {
      a: 0,
      b: 0,
      abs: NaN,
      pct: NaN,
    });

    expect(change.primary).toBe("—");
    expect(change.secondary).toBeNull();
  });
});
