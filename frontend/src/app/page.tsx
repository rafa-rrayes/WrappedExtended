"use client";

import Link from "next/link";
import { useInView } from "@/lib/hooks/use-in-view";

function FadeUp({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className="transition-all duration-700 ease-out"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(24px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

const STEPS = [
  {
    step: "1",
    title: "Download",
    desc: "Request your Extended Streaming History from Spotify\u2019s privacy settings.",
  },
  {
    step: "2",
    title: "Upload",
    desc: "Drop your .zip file on WrapEx. We process it in under a minute.",
  },
  {
    step: "3",
    title: "Explore",
    desc: "Dive into interactive charts, trends, and insights about your listening.",
  },
];

const FEATURES = [
  {
    icon: "\u266B",
    title: "Top Artists & Tracks",
    desc: "Your most-played music ranked by hours and streams",
  },
  {
    icon: "\u25D0",
    title: "Listening Patterns",
    desc: "When you listen \u2014 by hour, day, and season",
  },
  {
    icon: "\u2197",
    title: "Year-over-Year Trends",
    desc: "How your taste evolves across years",
  },
  {
    icon: "\u263E",
    title: "Late Night Analysis",
    desc: "What you listen to when everyone\u2019s asleep",
  },
  {
    icon: "\u25C9",
    title: "Platform Breakdown",
    desc: "Desktop vs mobile vs other devices",
  },
  {
    icon: "\u27F3",
    title: "Song Obsessions",
    desc: "Tracks you played on repeat and when",
  },
  {
    icon: "\u2726",
    title: "Discovery Timeline",
    desc: "When you found your favorite artists",
  },
  {
    icon: "\u229E",
    title: "Heatmaps",
    desc: "Calendar and hour-by-day listening grids",
  },
];

const MOCK_STATS = [
  { label: "Hours Listened", value: "2,847" },
  { label: "Total Streams", value: "48,291" },
  { label: "Unique Artists", value: "1,432" },
  { label: "Unique Tracks", value: "8,761" },
];

export default function LandingPage() {
  return (
    <main className="pt-14">
      {/* Hero */}
      <section className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center text-center px-6 relative">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle,rgba(29,185,84,0.08)_0%,transparent_70%)] pointer-events-none" />

        <span className="font-[family-name:var(--font-display)] text-xs font-semibold tracking-[0.2em] uppercase text-green border border-green/30 px-5 py-2 rounded-full mb-10 animate-[fadeUp_0.8s_ease_forwards_0.2s] opacity-0">
          Spotify Extended Streaming History
        </span>

        <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.5rem,6vw,5rem)] font-extrabold leading-[1.05] mb-3 animate-[fadeUp_0.8s_ease_forwards_0.4s] opacity-0 bg-gradient-to-br from-text-primary to-text-secondary bg-clip-text text-transparent">
          Your Musical Universe
        </h1>

        <p className="text-lg text-text-secondary font-light mb-14 animate-[fadeUp_0.8s_ease_forwards_0.6s] opacity-0">
          Upload your streaming history. Get a dashboard that tells your story.
        </p>

        <div className="flex gap-4 animate-[fadeUp_0.8s_ease_forwards_0.8s] opacity-0">
          <Link
            href="/upload"
            className="bg-green hover:bg-green/90 text-bg-deep font-semibold px-8 py-3 rounded-full transition-all"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="border border-border hover:border-text-muted text-text-secondary hover:text-text-primary px-8 py-3 rounded-full transition-all"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-[1280px] mx-auto px-6 py-24">
        <FadeUp>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-center mb-4">
            How It Works
          </h2>
          <p className="text-text-secondary text-center mb-12 max-w-md mx-auto">
            Three simple steps to unlock your listening insights.
          </p>
        </FadeUp>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((item, i) => (
            <FadeUp key={item.step} delay={i * 100}>
              <div className="bg-bg-card/60 border border-border rounded-[var(--radius-card)] p-6 text-center hover:border-green/30 transition-colors">
                <div className="w-10 h-10 rounded-full bg-green/20 text-green font-bold flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-[family-name:var(--font-display)] font-bold mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-text-secondary">{item.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* What You'll Discover */}
      <section className="max-w-[1280px] mx-auto px-6 py-24">
        <FadeUp>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-center mb-4">
            What You&apos;ll Discover
          </h2>
          <p className="text-text-secondary text-center mb-12 max-w-md mx-auto">
            Deep insights into your music habits, preferences, and trends.
          </p>
        </FadeUp>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((item, i) => (
            <FadeUp key={item.title} delay={i * 50}>
              <div className="bg-bg-card/40 border border-border rounded-[var(--radius-card)] p-5 hover:border-green/20 transition-colors">
                <span className="text-2xl mb-3 block">{item.icon}</span>
                <h3 className="font-[family-name:var(--font-display)] font-bold text-sm mb-1">
                  {item.title}
                </h3>
                <p className="text-xs text-text-muted">{item.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="max-w-[1280px] mx-auto px-6 py-24">
        <FadeUp>
          <div className="relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(29,185,84,0.1)_0%,transparent_70%)] pointer-events-none" />
            <div className="bg-bg-card/40 border border-border rounded-[var(--radius-card)] p-8 md:p-12">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {MOCK_STATS.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-green">
                      {stat.value}
                    </p>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mt-1">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-bg-deep/50 rounded-[var(--radius-sm)] h-24 animate-pulse"
                  />
                ))}
              </div>
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={200}>
          <div className="text-center mt-12">
            <Link
              href="/upload"
              className="bg-green hover:bg-green/90 text-bg-deep font-semibold px-10 py-3.5 rounded-full transition-all text-lg"
            >
              Get Started &mdash; It&apos;s Free
            </Link>
          </div>
        </FadeUp>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-xs text-text-muted">
        <p>WrapEx &mdash; Your streaming history, beautifully visualized.</p>
      </footer>
    </main>
  );
}
