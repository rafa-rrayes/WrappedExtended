"use client";

import { useMemo, useState } from "react";
import { computeAchievements, type Achievement, type AchievementTier } from "@/lib/utils/achievement-rules";
import type { DashboardData } from "@/types/dashboard";

interface AchievementsGridProps {
  data: DashboardData;
}

const TIER_STYLES: Record<AchievementTier, { border: string; bg: string; label: string }> = {
  bronze: { border: "border-amber-700/40", bg: "bg-amber-900/20", label: "text-amber-500" },
  silver: { border: "border-gray-400/40", bg: "bg-gray-700/20", label: "text-gray-300" },
  gold: { border: "border-yellow-500/40", bg: "bg-yellow-900/20", label: "text-yellow-400" },
  platinum: { border: "border-cyan-400/40", bg: "bg-cyan-900/20", label: "text-cyan-300" },
};

export function AchievementsGrid({ data }: AchievementsGridProps) {
  const achievements = useMemo(() => computeAchievements(data), [data]);
  const [showAll, setShowAll] = useState(false);

  const unlocked = achievements.filter((a) => a.unlocked);
  const displayed = showAll ? achievements : achievements.slice(0, 12);

  return (
    <section id="achievements" className="py-10">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-text-primary">
          Achievements
        </h2>
        <span className="text-green font-bold text-sm">
          {unlocked.length}/{achievements.length} unlocked
        </span>
      </div>
      <p className="text-text-muted text-sm mb-8">
        Milestones from your listening journey
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {displayed.map((achievement) => (
          <AchievementCard key={achievement.id} achievement={achievement} />
        ))}
      </div>

      {achievements.length > 12 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-4 text-sm text-text-muted hover:text-green transition-colors"
        >
          {showAll ? "Show less" : `Show all ${achievements.length} achievements`}
        </button>
      )}
    </section>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const style = achievement.unlocked
    ? TIER_STYLES[achievement.tier]
    : { border: "border-white/[0.06]", bg: "bg-white/[0.02]", label: "text-text-muted" };

  const progress = Math.min(achievement.progress / achievement.target, 1);

  return (
    <div
      className={`${style.bg} ${style.border} border rounded-[var(--radius-card)] p-4 transition-all ${
        achievement.unlocked ? "hover:scale-[1.02]" : "opacity-50"
      }`}
    >
      <div className="text-2xl mb-2">{achievement.icon}</div>
      <div className="font-[family-name:var(--font-display)] font-semibold text-sm text-text-primary mb-0.5">
        {achievement.title}
      </div>
      <div className="text-[0.65rem] text-text-muted mb-2">
        {achievement.description}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden mb-1">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${progress * 100}%`,
            backgroundColor: achievement.unlocked ? "var(--color-green)" : "rgba(255,255,255,0.15)",
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <span
          className={`shrink-0 text-[0.6rem] font-medium uppercase tracking-wider ${style.label}`}
        >
          {achievement.unlocked ? achievement.tier : `${Math.round(progress * 100)}%`}
        </span>
        {/* Shown whether or not the badge is unlocked: a tier on its own ("PLATINUM")
            never says how many, and on a locked badge the figure is the motivating half
            of the card. `title` keeps the full string reachable when it truncates. */}
        <span
          className="truncate text-right text-[0.6rem] text-text-muted"
          title={achievement.context}
        >
          {achievement.context}
        </span>
      </div>
    </div>
  );
}
