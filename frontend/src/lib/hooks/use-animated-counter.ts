"use client";

import { useEffect, useRef } from "react";
import {
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";

/**
 * Animates a number from 0 to `target` when the returned ref scrolls into view.
 *
 * @param target   – The value to count up to.
 * @param options  – `decimals` (default 0) and `duration` (ignored — spring-based).
 * @returns `{ ref, display }` — attach `ref` to a `<span>` and render via
 *          `<motion.span>{display}</motion.span>`.
 */
export function useAnimatedCounter(
  target: number,
  options?: { decimals?: number; duration?: number }
): { ref: React.RefObject<HTMLSpanElement | null>; display: MotionValue<string> } {
  const decimals = options?.decimals ?? 0;

  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });

  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 50, damping: 20 });

  const display = useTransform(spring, (current: number) =>
    current.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );

  useEffect(() => {
    if (inView) {
      motionValue.set(target);
    }
  }, [inView, motionValue, target]);

  return { ref, display };
}
