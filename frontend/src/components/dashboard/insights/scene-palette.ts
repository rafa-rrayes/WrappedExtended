import type { MLScene } from "@/types/dashboard";

/**
 * Categorical palette for taste-map scenes.
 *
 * Hand-tuned rather than taken from d3's `schemeCategory10`: the default schemes carry
 * several colours (navy `#1f77b4`, brown `#8c564b`) that disappear against `#0c0c0c`.
 * Every entry here sits in a narrow high-luminance band so no scene reads as "the dim
 * one", and the sequence is anchored on the brand green and gold with the remaining hues
 * spread around the wheel so neighbouring scenes never collide.
 */
export const SCENE_COLORS = [
  "#1DB954", // brand green
  "#F5A623", // brand gold
  "#5AC8FA", // sky
  "#C77DFF", // violet
  "#FF6F91", // rose
  "#4FE0A0", // seafoam
  "#FFB65C", // amber
  "#7C8CFF", // indigo
  "#E56BC8", // magenta
  "#A3D63C", // lime
  "#35D4D4", // cyan
  "#FF8A5B", // coral
  "#8FA6C9", // slate
  "#D4A574", // sand
  "#6EE7B7", // mint
  "#F2C14E", // butter
] as const;

/** Points whose scene id is missing from `scenes`. */
export const SCENE_FALLBACK_COLOR = "#4a4a4a";

/**
 * Colour per scene id, assigned by rank rather than by id so the largest scene always
 * lands on the brand green and the map stays stable between renders.
 */
export function buildSceneColors(scenes: MLScene[]): Map<number, string> {
  const colors = new Map<number, string>();
  scenes.forEach((scene, index) => {
    colors.set(scene.scene, SCENE_COLORS[index % SCENE_COLORS.length]);
  });
  return colors;
}

/**
 * A human name for a scene.
 *
 * The clustering step names most scenes, but an unnamed cluster is not an error — fall
 * back to the artists that define it, which is what the label would have said anyway.
 */
export function sceneLabel(scene: MLScene): string {
  const label = scene.label?.trim();
  if (label) return label;
  const artists = scene.artists?.slice(0, 2).filter(Boolean) ?? [];
  if (artists.length) return artists.join(" · ");
  return `Scene ${scene.scene}`;
}
