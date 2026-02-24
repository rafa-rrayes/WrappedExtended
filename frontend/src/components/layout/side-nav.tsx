"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { id: "hero", label: "Overview" },
  { id: "artists", label: "Artists" },
  { id: "tracks", label: "Tracks" },
  { id: "timeline", label: "Timeline" },
  { id: "when", label: "Schedule" },
  { id: "habits", label: "Habits" },
  { id: "albums", label: "Albums" },
  { id: "flow", label: "Flow" },
];

export function SideNav() {
  const [active, setActive] = useState("hero");

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
    <nav className="fixed left-0 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-1.5 py-4 px-2.5 bg-bg-primary/85 backdrop-blur-xl border-r border-border rounded-r-[var(--radius-card)] md:flex hidden">
      {NAV_ITEMS.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="group flex items-center gap-2.5 px-2 py-1.5 rounded-[var(--radius-sm)] transition-all"
        >
          <span
            className={cn(
              "w-2 h-2 rounded-full transition-all shrink-0",
              active === item.id
                ? "bg-green shadow-[0_0_10px_var(--color-green-glow)]"
                : "bg-text-muted group-hover:bg-text-secondary"
            )}
          />
          <span
            className={cn(
              "font-[family-name:var(--font-body)] text-[0.7rem] font-medium whitespace-nowrap tracking-wider uppercase transition-all overflow-hidden",
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
