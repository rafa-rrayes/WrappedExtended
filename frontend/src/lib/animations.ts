import type { Variants } from "framer-motion";

// ── Reduced-motion support ────────────────────────────────────────────────────

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Spread onto any `<motion.*>` element to skip animations when the user
 *  has enabled reduced-motion in their OS settings. */
export const reducedMotionProps = {
  transition: prefersReducedMotion() ? { duration: 0 } : undefined,
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function rmSafe<V extends Variants>(variants: V): V {
  if (typeof window !== "undefined" && prefersReducedMotion()) {
    const identity: Variants = {};
    for (const key of Object.keys(variants)) {
      identity[key] = {
        opacity: key === "hidden" ? 0 : 1,
        transition: { duration: 0 },
      };
    }
    return identity as V;
  }
  return variants;
}

// ── Variants ──────────────────────────────────────────────────────────────────

/** Fade in while sliding up 24 px. */
export const fadeUp: Variants = rmSafe({
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
});

/** Parent container that staggers its direct children. */
export const staggerContainer: Variants = rmSafe({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
});

/** Child variant that matches the `fadeUp` style — pair with `staggerContainer`. */
export const staggerItem: Variants = rmSafe({
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
});

/** Scale from 0.95 to 1 while fading in. */
export const scaleIn: Variants = rmSafe({
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: "easeOut" },
  },
});
