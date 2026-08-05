import { describe, expect, it } from "vitest";
import { scene } from "@/test/fixtures";
import {
  SCENE_COLORS,
  SCENE_FALLBACK_COLOR,
  buildSceneColors,
  sceneLabel,
} from "./scene-palette";

/**
 * Colour is assigned by *rank*, not by scene id — the largest scene always lands on the
 * brand green, and a re-run that renumbers the clusters must not reshuffle the map's
 * colours. Both properties are pinned below.
 */

describe("SCENE_COLORS", () => {
  it("is a non-empty palette of distinct hex colours", () => {
    expect(SCENE_COLORS.length).toBeGreaterThan(0);
    expect(new Set(SCENE_COLORS).size).toBe(SCENE_COLORS.length);

    for (const color of SCENE_COLORS) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("is anchored on the brand green and gold", () => {
    expect(SCENE_COLORS[0]).toBe("#1DB954");
    expect(SCENE_COLORS[1]).toBe("#F5A623");
  });

  it("keeps a separate, dimmer colour for points with no scene", () => {
    expect(SCENE_FALLBACK_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(SCENE_COLORS).not.toContain(SCENE_FALLBACK_COLOR);
  });
});

describe("buildSceneColors — assignment by rank", () => {
  it("gives the first-ranked scene the brand green regardless of its id", () => {
    // The clustering step numbers scenes arbitrarily; rank is what carries meaning.
    expect(buildSceneColors([scene(7), scene(2), scene(9)]).get(7)).toBe(SCENE_COLORS[0]);
    expect(buildSceneColors([scene(0)]).get(0)).toBe(SCENE_COLORS[0]);
  });

  it("walks the palette in order down the ranking", () => {
    const colors = buildSceneColors([scene(3), scene(1), scene(2)]);

    expect(colors.get(3)).toBe(SCENE_COLORS[0]);
    expect(colors.get(1)).toBe(SCENE_COLORS[1]);
    expect(colors.get(2)).toBe(SCENE_COLORS[2]);
  });

  it("is stable — the same ranking always yields the same map", () => {
    const scenes = [scene(4), scene(0), scene(11)];

    expect([...buildSceneColors(scenes)]).toEqual([...buildSceneColors(scenes)]);
  });

  it("depends only on position, so identical ranks colour identically", () => {
    const byOneName = buildSceneColors([scene(1), scene(2)]);
    const byAnother = buildSceneColors([scene(50, { label: "Other" }), scene(60)]);

    expect([...byOneName.values()]).toEqual([...byAnother.values()]);
  });

  it("keys the map on the scene id, so a lookup by id works", () => {
    const colors = buildSceneColors([scene(42)]);

    expect(colors.has(42)).toBe(true);
    expect(colors.has(0)).toBe(false);
    expect(colors.get(99)).toBeUndefined();
  });

  it("wraps around the palette rather than running out of colours", () => {
    const many = Array.from({ length: SCENE_COLORS.length + 3 }, (_, index) => scene(index));
    const colors = buildSceneColors(many);

    expect(colors.size).toBe(many.length);
    expect(colors.get(SCENE_COLORS.length)).toBe(SCENE_COLORS[0]);
    expect(colors.get(SCENE_COLORS.length + 1)).toBe(SCENE_COLORS[1]);
    expect([...colors.values()].every(Boolean)).toBe(true);
  });

  it("returns an empty map for no scenes", () => {
    expect(buildSceneColors([]).size).toBe(0);
  });
});

describe("sceneLabel", () => {
  it("prefers the clustering step's own name", () => {
    expect(sceneLabel(scene(1, { label: "Late-night electronica" }))).toBe(
      "Late-night electronica",
    );
  });

  it("trims a padded label", () => {
    expect(sceneLabel(scene(1, { label: "  Indie rock  " }))).toBe("Indie rock");
  });

  it("falls back to the two artists that define the scene", () => {
    // An unnamed cluster is not an error — name it after what it contains.
    expect(
      sceneLabel(scene(3, { label: "", artists: ["Aphex Twin", "Boards of Canada", "Autechre"] })),
    ).toBe("Aphex Twin · Boards of Canada");
  });

  it("uses a single artist when that is all there is", () => {
    expect(sceneLabel(scene(3, { label: "", artists: ["Nina Simone"] }))).toBe("Nina Simone");
  });

  it("falls back to the scene number when there is nothing else to say", () => {
    expect(sceneLabel(scene(5, { label: "", artists: [] }))).toBe("Scene 5");
    expect(sceneLabel(scene(0, { label: "   ", artists: [] }))).toBe("Scene 0");
  });

  it("treats a whitespace-only or empty artist list as absent", () => {
    expect(sceneLabel(scene(2, { label: "", artists: ["", ""] }))).toBe("Scene 2");
  });

  it("survives a payload missing label and artists entirely", () => {
    const bare = { scene: 8 } as Parameters<typeof sceneLabel>[0];

    expect(() => sceneLabel(bare)).not.toThrow();
    expect(sceneLabel(bare)).toBe("Scene 8");
  });

  it("never returns an empty string", () => {
    const candidates = [
      scene(1, { label: "Named" }),
      scene(2, { label: "", artists: ["A"] }),
      scene(3, { label: "", artists: [] }),
      { scene: 4 } as Parameters<typeof sceneLabel>[0],
    ];

    for (const candidate of candidates) {
      expect(sceneLabel(candidate).length).toBeGreaterThan(0);
    }
  });
});
