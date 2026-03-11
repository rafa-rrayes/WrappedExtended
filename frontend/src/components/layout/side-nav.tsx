"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { id: "hero", label: "Overview" },
  { id: "artists", label: "Artists" },
  { id: "tracks", label: "Tracks" },
  { id: "albums", label: "Albums" },
  { id: "timeline", label: "Timeline" },
  { id: "yoy", label: "Year / Year" },
  { id: "when", label: "Schedule" },
  { id: "heatmap", label: "Heatmap" },
  { id: "calendar", label: "Calendar" },
  { id: "artist-discovery", label: "Discovery" },
  { id: "obsession", label: "Obsessions" },
  { id: "habits", label: "Habits" },
  { id: "platforms", label: "Platforms" },
  { id: "skips", label: "Skips" },
  { id: "geo", label: "Geography" },
  { id: "nostalgia", label: "Nostalgia" },
  { id: "stats", label: "Stats" },
  { id: "personality", label: "Personality" },
  { id: "achievements", label: "Achievements" },
  { id: "mood", label: "Mood" },
  { id: "benchmarks", label: "Benchmarks" },
  { id: "weekend", label: "Wknd / Wkdy" },
  { id: "latenight", label: "Late Night" },
  { id: "wrapped", label: "Wrapped" },
];

export function SideNav() {
  const [active, setActive] = useState("hero");
  const { scrollYProgress } = useScroll();
  const progressHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { threshold: 0.2, rootMargin: "-10% 0px -60% 0px" }
    );

    for (const item of NAV_ITEMS) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <nav className="fixed left-0 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-1 py-3 px-2 bg-bg-primary/85 backdrop-blur-xl border-r border-border rounded-r-[var(--radius-card)] md:flex hidden">
      {/* Scroll progress line */}
      <div className="absolute left-[13px] top-3 bottom-3 w-[2px] bg-white/[0.06] rounded-full pointer-events-none">
        <motion.div
          className="absolute top-0 left-0 w-full bg-green rounded-full"
          style={{ height: progressHeight }}
        />
      </div>

      {NAV_ITEMS.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="group flex items-center gap-2.5 px-2 py-1 rounded-[var(--radius-sm)] transition-all relative z-10"
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all shrink-0",
              active === item.id
                ? "bg-green shadow-[0_0_10px_var(--color-green-glow)]"
                : "bg-text-muted group-hover:bg-text-secondary"
            )}
          />
          <span
            className={cn(
              "font-[family-name:var(--font-body)] text-[0.6rem] font-medium whitespace-nowrap tracking-wider uppercase transition-all overflow-hidden",
              active === item.id
                ? "opacity-100 max-w-[120px] mr-1 text-text-secondary"
                : "opacity-0 max-w-0 text-text-muted group-hover:opacity-100 group-hover:max-w-[120px] group-hover:mr-1"
            )}
          >
            {item.label}
          </span>
        </a>
      ))}
    </nav>
  );
}
