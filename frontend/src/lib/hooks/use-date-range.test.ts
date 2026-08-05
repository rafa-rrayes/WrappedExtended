import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPresets, toIsoDate } from "./use-date-range";

/**
 * `buildPresets` is anchored to the *end of the data*, not to today — an export that stops
 * six months ago would otherwise offer a "Last 30 days" that selects nothing. That makes it
 * a pure function of its bounds, and the determinism tests below are what keep it one.
 */

afterEach(() => {
  vi.useRealTimers();
});

describe("toIsoDate", () => {
  it("passes a well-formed calendar date through", () => {
    expect(toIsoDate("2024-03-12")).toBe("2024-03-12");
  });

  it("truncates a full ISO timestamp to its date part", () => {
    expect(toIsoDate("2024-03-12T22:41:07Z")).toBe("2024-03-12");
    expect(toIsoDate("2024-03-12T22:41:07.123456+00:00")).toBe("2024-03-12");
  });

  it("returns null for absent input", () => {
    expect(toIsoDate(null)).toBeNull();
    expect(toIsoDate(undefined)).toBeNull();
    expect(toIsoDate("")).toBeNull();
  });

  it("rejects anything that is not a zero-padded YYYY-MM-DD", () => {
    expect(toIsoDate("2024-3-5")).toBeNull();
    expect(toIsoDate("12/03/2024")).toBeNull();
    expect(toIsoDate("yesterday")).toBeNull();
    expect(toIsoDate("2024-03")).toBeNull();
  });

  it("rejects impossible calendar dates that Date would roll over", () => {
    // `new Date("2025-02-31")` silently becomes 3 March; that must not become a filter.
    expect(toIsoDate("2025-02-31")).toBeNull();
    expect(toIsoDate("2024-13-01")).toBeNull();
    expect(toIsoDate("2024-04-31")).toBeNull();
    expect(toIsoDate("2024-00-10")).toBeNull();
    expect(toIsoDate("2024-01-00")).toBeNull();
  });

  it("accepts a real leap day and rejects a fake one", () => {
    expect(toIsoDate("2024-02-29")).toBe("2024-02-29");
    expect(toIsoDate("2023-02-29")).toBeNull();
  });
});

describe("buildPresets — anchoring", () => {
  const bounds = { min: "2019-04-01", max: "2021-06-15" };

  it("anchors every relative window to bounds.max, not to today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-05T12:00:00Z"));

    const presets = buildPresets(bounds);
    const byLabel = Object.fromEntries(presets.map((preset) => [preset.label, preset]));

    expect(byLabel["Last 30 days"]).toEqual({
      label: "Last 30 days",
      from: "2021-05-17",
      to: "2021-06-15",
    });
    expect(byLabel["Last 90 days"]).toEqual({
      label: "Last 90 days",
      from: "2021-03-18",
      to: "2021-06-15",
    });
    expect(byLabel["Last 12 months"]).toEqual({
      label: "Last 12 months",
      from: "2020-06-15",
      to: "2021-06-15",
    });
  });

  it("produces identical output whatever the current date is", () => {
    vi.useFakeTimers();

    vi.setSystemTime(new Date("2019-01-01T00:00:00Z"));
    const inThePast = buildPresets(bounds);

    vi.setSystemTime(new Date("2031-12-31T23:59:59Z"));
    const farFuture = buildPresets(bounds);

    expect(farFuture).toEqual(inThePast);
  });

  it("is a pure function — repeated calls agree", () => {
    expect(buildPresets(bounds)).toEqual(buildPresets(bounds));
  });
});

describe("buildPresets — clamping to bounds", () => {
  it("floors a relative window at bounds.min instead of reaching past the data", () => {
    const presets = buildPresets({ min: "2021-06-01", max: "2021-06-15" });
    const byLabel = Object.fromEntries(presets.map((preset) => [preset.label, preset]));

    expect(byLabel["Last 30 days"].from).toBe("2021-06-01");
    expect(byLabel["Last 90 days"].from).toBe("2021-06-01");
    expect(byLabel["Last 12 months"].from).toBe("2021-06-01");
    expect(presets.every((preset) => preset.from >= "2021-06-01")).toBe(true);
  });

  it("never lets a preset end past bounds.max", () => {
    const presets = buildPresets({ min: "2019-04-01", max: "2021-06-15" });

    expect(presets.every((preset) => preset.to <= "2021-06-15")).toBe(true);
    expect(presets.every((preset) => preset.from <= preset.to)).toBe(true);
  });

  it("clips the first and last year presets to the data's real extent", () => {
    const presets = buildPresets({ min: "2019-04-01", max: "2021-06-15" });
    const byLabel = Object.fromEntries(presets.map((preset) => [preset.label, preset]));

    // The partial first year starts at the export's first day, not 1 January.
    expect(byLabel["2019"]).toEqual({ label: "2019", from: "2019-04-01", to: "2019-12-31" });
    // The partial last year stops at the export's last day, not 31 December.
    expect(byLabel["2021"]).toEqual({ label: "2021", from: "2021-01-01", to: "2021-06-15" });
    // A year fully inside the data keeps its natural span.
    expect(byLabel["2020"]).toEqual({ label: "2020", from: "2020-01-01", to: "2020-12-31" });
  });

  it("lists years newest-first and adds an All time entry spanning the bounds", () => {
    const presets = buildPresets({ min: "2019-04-01", max: "2021-06-15" });

    expect(presets.map((preset) => preset.label)).toEqual([
      "Last 30 days",
      "Last 90 days",
      "Last 12 months",
      "2021",
      "2020",
      "2019",
      "All time",
    ]);
    expect(presets.at(-1)).toEqual({ label: "All time", from: "2019-04-01", to: "2021-06-15" });
  });

  it("clamps month arithmetic instead of overflowing (31 Mar − 12mo stays in March)", () => {
    const presets = buildPresets({ min: "2018-01-01", max: "2021-03-31" });
    const byLabel = Object.fromEntries(presets.map((preset) => [preset.label, preset]));

    expect(byLabel["Last 12 months"].from).toBe("2020-03-31");
  });

  it("clamps a leap day onto the 28th when the target year has no 29 February", () => {
    const presets = buildPresets({ min: "2018-01-01", max: "2024-02-29" });
    const byLabel = Object.fromEntries(presets.map((preset) => [preset.label, preset]));

    expect(byLabel["Last 12 months"].from).toBe("2023-02-28");
  });
});

describe("buildPresets — missing or malformed bounds", () => {
  it("offers only the relative windows when there is no minimum", () => {
    const presets = buildPresets({ min: null, max: "2021-06-15" });

    expect(presets.map((preset) => preset.label)).toEqual([
      "Last 30 days",
      "Last 90 days",
      "Last 12 months",
    ]);
    expect(presets.every((preset) => preset.to === "2021-06-15")).toBe(true);
  });

  it("falls back to today only when the data has no end date at all", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-05T12:00:00Z"));

    const presets = buildPresets({ min: null, max: null });

    expect(presets).toHaveLength(3);
    expect(presets.every((preset) => preset.to === "2026-08-05")).toBe(true);
  });

  it("treats a malformed bound as absent rather than propagating it", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-05T12:00:00Z"));

    // `2021-02-31` is not a real date, so it must not become the anchor.
    expect(buildPresets({ min: null, max: "2021-02-31" })).toEqual(
      buildPresets({ min: null, max: null }),
    );
    expect(buildPresets({ min: "nonsense", max: "2021-06-15" }).map((p) => p.label)).toEqual([
      "Last 30 days",
      "Last 90 days",
      "Last 12 months",
    ]);
  });

  it("handles being called with no bounds object at all", () => {
    expect(() => buildPresets()).not.toThrow();
    expect(buildPresets()).toHaveLength(3);
  });

  it("collapses to a single day when the export covers one day", () => {
    const presets = buildPresets({ min: "2021-06-15", max: "2021-06-15" });

    expect(presets.every((preset) => preset.from === "2021-06-15")).toBe(true);
    expect(presets.every((preset) => preset.to === "2021-06-15")).toBe(true);
    expect(presets.at(-1)?.label).toBe("All time");
  });
});
