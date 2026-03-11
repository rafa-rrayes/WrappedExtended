"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { fadeUp } from "@/lib/animations";

interface SectionRevealProps {
  children: React.ReactNode | ((inView: boolean) => React.ReactNode);
  id?: string;
  className?: string;
}

export function SectionReveal({ children, id, className }: SectionRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

  return (
    <motion.section
      ref={ref}
      id={id}
      className={className ?? "py-24"}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={fadeUp}
    >
      {typeof children === "function" ? children(inView) : children}
    </motion.section>
  );
}
