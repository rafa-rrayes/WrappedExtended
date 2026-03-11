import type { DashboardData } from "@/types/dashboard";

export interface PersonalityTrait {
  name: string;
  score: number;
  description: string;
}

export interface PersonalityProfile {
  traits: PersonalityTrait[];
  dominantType: string;
  typeDescription: string;
}

const PERSONALITY_TYPES: Record<string, { name: string; description: string }> = {
  explorer: { name: "The Archaeologist", description: "Always digging for new sounds and undiscovered artists" },
  loyalist: { name: "The Devotee", description: "Fiercely loyal to your favorites, building deep connections with your music" },
  nightowl: { name: "The Moonlit Listener", description: "Your best listening happens when the world sleeps" },
  binge: { name: "The Marathon Runner", description: "When you listen, you go all in — long sessions, total immersion" },
  completionist: { name: "The Perfectionist", description: "Every song deserves to be heard from start to finish" },
  curator: { name: "The Architect", description: "You take control — no shuffle, no skips, every listen is intentional" },
};

export function calculatePersonality(data: DashboardData): PersonalityProfile {
  const traits: PersonalityTrait[] = [];

  // Explorer: discovery rate slope + normalized entropy + unique ratio
  const explorerScore = calcExplorer(data);
  traits.push({ name: "Explorer", score: explorerScore, description: "How adventurous you are in discovering new music" });

  // Loyalist: top10 concentration + nostalgia + streaks
  const loyalistScore = calcLoyalist(data);
  traits.push({ name: "Loyalist", score: loyalistScore, description: "How deeply you commit to your favorite artists" });

  // Night Owl: late night pct + hourly peak
  const nightOwlScore = calcNightOwl(data);
  traits.push({ name: "Night Owl", score: nightOwlScore, description: "How much of your listening happens after midnight" });

  // Binge Listener: binge sessions + avg daily hours
  const bingeScore = calcBinge(data);
  traits.push({ name: "Binge Listener", score: bingeScore, description: "How long your listening sessions tend to be" });

  // Completionist: completion rate + avg completion pct
  const completionistScore = calcCompletionist(data);
  traits.push({ name: "Completionist", score: completionistScore, description: "How often you listen to songs all the way through" });

  // Curator: inverse shuffle + inverse skip
  const curatorScore = calcCurator(data);
  traits.push({ name: "Curator", score: curatorScore, description: "How intentionally you control your listening experience" });

  // Find dominant trait
  const sorted = [...traits].sort((a, b) => b.score - a.score);
  const dominantKey = sorted[0].name.toLowerCase().replace(/\s+/g, "");
  const typeKey = dominantKey === "bingelistener" ? "binge" : dominantKey === "nightowl" ? "nightowl" : dominantKey;
  const type = PERSONALITY_TYPES[typeKey] ?? PERSONALITY_TYPES.explorer;

  return { traits, dominantType: type.name, typeDescription: type.description };
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function calcExplorer(d: DashboardData): number {
  let score = 50;
  if (d.diversity_score) {
    score = d.diversity_score.normalized_entropy * 100;
  }
  if (d.discovery_rate?.length) {
    const last = d.discovery_rate[d.discovery_rate.length - 1];
    const first = d.discovery_rate[0];
    if (last && first) {
      const months = d.discovery_rate.length || 1;
      const rate = last.new_tracks / months;
      score = (score + Math.min(rate * 2, 100)) / 2;
    }
  }
  const ratio = d.unique_artists / Math.max(d.total_streams, 1);
  score = (score + ratio * 1000) / 2;
  return clamp(score);
}

function calcLoyalist(d: DashboardData): number {
  let score = 50;
  if (d.diversity_score) {
    score = d.diversity_score.top10_concentration;
  }
  if (d.nostalgia_tracks?.length) {
    score = (score + Math.min(d.nostalgia_tracks.length * 5, 100)) / 2;
  }
  if (d.listening_streaks) {
    score = (score + Math.min(d.listening_streaks.longest_streak * 2, 100)) / 2;
  }
  return clamp(score);
}

function calcNightOwl(d: DashboardData): number {
  let score = 0;
  if (d.late_night_analysis) {
    score = d.late_night_analysis.pct * 2;
  }
  if (d.hourly_distribution?.length) {
    const lateHours = d.hourly_distribution.filter((h) => h.hour >= 22 || h.hour <= 4);
    const totalStreams = d.hourly_distribution.reduce((s, h) => s + h.streams, 0);
    const lateStreams = lateHours.reduce((s, h) => s + h.streams, 0);
    const latePct = totalStreams ? (lateStreams / totalStreams) * 100 : 0;
    score = Math.max(score, latePct * 3);
  }
  return clamp(score);
}

function calcBinge(d: DashboardData): number {
  let score = 0;
  if (d.binge_sessions?.length) {
    const avgDuration = d.binge_sessions.reduce((s, b) => s + b.duration_hours, 0) / d.binge_sessions.length;
    score = Math.min(avgDuration * 15, 80);
    score += Math.min(d.binge_sessions.length * 2, 20);
  }
  if (d.statistics_summary) {
    score = (score + Math.min(d.statistics_summary.avg_daily_hours * 20, 100)) / 2;
  }
  return clamp(score);
}

function calcCompletionist(d: DashboardData): number {
  let score = 50;
  if (d.completion_distribution) {
    const { completed, total } = d.completion_distribution;
    if (total) score = (completed / total) * 100;
  }
  if (d.skip_pct !== undefined) {
    score = (score + (100 - d.skip_pct)) / 2;
  }
  return clamp(score);
}

function calcCurator(d: DashboardData): number {
  let score = 50;
  if (d.shuffle_pct !== undefined) {
    score = 100 - d.shuffle_pct;
  }
  if (d.skip_pct !== undefined) {
    score = (score + (100 - d.skip_pct)) / 2;
  }
  return clamp(score);
}
