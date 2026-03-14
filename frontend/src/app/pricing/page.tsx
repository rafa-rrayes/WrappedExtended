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

const INCLUDED = [
  {
    icon: "\u266B",
    title: "Top Artists, Tracks & Albums",
    desc: "Ranked by total hours and stream count, with trends over time",
  },
  {
    icon: "\u25D0",
    title: "Listening Patterns",
    desc: "Hourly, daily, and seasonal breakdowns of when you listen",
  },
  {
    icon: "\u229E",
    title: "Heatmaps & Calendars",
    desc: "Hour-by-day grids and calendar views of your listening activity",
  },
  {
    icon: "\u2197",
    title: "Year-over-Year Trends",
    desc: "See how your taste and habits evolve across years",
  },
  {
    icon: "\u25C9",
    title: "Platform Breakdown",
    desc: "Desktop vs mobile vs other devices, across your full history",
  },
  {
    icon: "\u263E",
    title: "Late Night Analysis",
    desc: "Your after-midnight listening habits revealed",
  },
  {
    icon: "\u27F3",
    title: "Song Obsessions",
    desc: "Tracks you played on repeat and exactly when the obsession hit",
  },
  {
    icon: "\u2726",
    title: "Discovery Timeline",
    desc: "When you first found each of your favorite artists",
  },
  {
    icon: "\u25B6",
    title: "Bar Chart Race",
    desc: "Animated visualization of your top artists racing over time",
  },
  {
    icon: "\u2194",
    title: "Shareable Dashboard",
    desc: "Public link to share your dashboard with friends and followers",
  },
];

const COMPARISONS = [
  { feature: "Streaming history coverage", wrapex: "Full history (years)", wrapped: "Last year only" },
  { feature: "Number of visualizations", wrapex: "12+ interactive charts", wrapped: "~5 slides" },
  { feature: "Custom data analysis", wrapex: "Deep stats & heatmaps", wrapped: "Top 5 lists" },
  { feature: "Shareable link", wrapex: "Permanent public URL", wrapped: "Temporary story" },
  { feature: "Available anytime", wrapex: "Whenever you want", wrapped: "December only" },
  { feature: "Raw data access", wrapex: "Your actual play data", wrapped: "Curated highlights" },
];

export default function PricingPage() {
  return (
    <main className="pt-14">
      {/* Hero */}
      <section className="py-24 px-6 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(29,185,84,0.06)_0%,transparent_70%)] pointer-events-none" />

        <FadeUp>
          <span className="inline-block font-[family-name:var(--font-display)] text-xs font-semibold tracking-[0.2em] uppercase text-green border border-green/30 px-5 py-2 rounded-full mb-8">
            Pricing
          </span>
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(2rem,5vw,4rem)] font-extrabold leading-[1.1] mb-4 bg-gradient-to-br from-text-primary to-text-secondary bg-clip-text text-transparent">
            One dashboard. One price.
          </h1>
          <p className="text-lg text-text-secondary font-light max-w-lg mx-auto">
            No subscriptions, no tiers, no upsells. Pay $10 and get your complete listening dashboard forever.
          </p>
        </FadeUp>
      </section>

      {/* Price Card */}
      <section className="max-w-lg mx-auto px-6 pb-24">
        <FadeUp>
          <div className="relative">
            <div className="absolute -inset-px rounded-[calc(var(--radius-card)+1px)] bg-gradient-to-b from-green/50 via-green/15 to-transparent pointer-events-none" />
            <div className="relative bg-bg-card border border-green/20 rounded-[var(--radius-card)] p-10 text-center">
              <div className="mb-2">
                <span className="font-[family-name:var(--font-display)] text-7xl font-extrabold text-text-primary">
                  $10
                </span>
              </div>
              <p className="text-text-muted mb-8">
                per dashboard &middot; one-time payment
              </p>

              <Link
                href="/upload"
                className="inline-block w-full bg-green hover:bg-green/90 text-bg-deep font-semibold py-3.5 rounded-full transition-all text-lg mb-6"
              >
                Get Your Dashboard
              </Link>

              <div className="flex items-center justify-center gap-6 text-xs text-text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="text-green">&#9679;</span> Secure payment via Stripe
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-green">&#9679;</span> No account required to start
                </span>
              </div>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* What's Included */}
      <section className="max-w-[1280px] mx-auto px-6 py-24">
        <FadeUp>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-center mb-4">
            Everything in Your Dashboard
          </h2>
          <p className="text-text-secondary text-center mb-12 max-w-md mx-auto">
            Every dashboard includes the full suite of visualizations and insights.
          </p>
        </FadeUp>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {INCLUDED.map((item, i) => (
            <FadeUp key={item.title} delay={i * 50}>
              <div className="bg-bg-card/40 border border-border rounded-[var(--radius-card)] p-5 hover:border-green/20 transition-colors h-full">
                <span className="text-xl mb-3 block">{item.icon}</span>
                <h3 className="font-[family-name:var(--font-display)] font-bold text-sm mb-1">
                  {item.title}
                </h3>
                <p className="text-xs text-text-muted">{item.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* WrapEx vs Spotify Wrapped */}
      <section className="max-w-[800px] mx-auto px-6 py-24">
        <FadeUp>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-center mb-4">
            WrapEx vs Spotify Wrapped
          </h2>
          <p className="text-text-secondary text-center mb-12 max-w-md mx-auto">
            Wrapped is fun. WrapEx is the full picture.
          </p>
        </FadeUp>

        <FadeUp delay={100}>
          <div className="bg-bg-card/40 border border-border rounded-[var(--radius-card)] overflow-hidden">
            <div className="grid grid-cols-3 text-xs font-[family-name:var(--font-display)] font-bold uppercase tracking-wider text-text-muted border-b border-border">
              <div className="p-4" />
              <div className="p-4 text-center text-green">WrapEx</div>
              <div className="p-4 text-center">Wrapped</div>
            </div>
            {COMPARISONS.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-3 text-sm ${i < COMPARISONS.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="p-4 text-text-secondary">{row.feature}</div>
                <div className="p-4 text-center text-text-primary">{row.wrapex}</div>
                <div className="p-4 text-center text-text-muted">{row.wrapped}</div>
              </div>
            ))}
          </div>
        </FadeUp>
      </section>

      {/* Why $10 */}
      <section className="max-w-[720px] mx-auto px-6 py-24">
        <FadeUp>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-center mb-4">
            Why $10?
          </h2>
        </FadeUp>

        <FadeUp delay={100}>
          <div className="bg-bg-card/40 border border-border rounded-[var(--radius-card)] p-8 space-y-4 text-sm text-text-secondary leading-relaxed">
            <p>
              WrapEx runs real infrastructure &mdash; servers to process your data, storage to host your dashboard, and bandwidth to serve it to anyone you share it with.
            </p>
            <p>
              $10 covers the cost of processing your streaming history (which can span years of data), generating all the visualizations, and keeping your dashboard online permanently.
            </p>
            <p>
              There are no ads, no tracking, and we never sell your data. The price is the product, and the product is your dashboard.
            </p>
          </div>
        </FadeUp>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(29,185,84,0.06)_0%,transparent_60%)] pointer-events-none" />
        <FadeUp>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold mb-4">
            Ready to see your data?
          </h2>
          <p className="text-text-secondary mb-8 max-w-md mx-auto">
            Upload your Spotify export. Dashboard ready in under a minute.
          </p>
          <Link
            href="/upload"
            className="bg-green hover:bg-green/90 text-bg-deep font-semibold px-10 py-3.5 rounded-full transition-all text-lg"
          >
            Get Started &mdash; $10
          </Link>
        </FadeUp>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-xs text-text-muted">
        <p className="mb-3">WrapEx &mdash; Your streaming history, beautifully visualized.</p>
        <div className="flex items-center justify-center gap-6">
          <Link href="/terms" className="hover:text-text-secondary transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-text-secondary transition-colors">
            Privacy
          </Link>
          <Link href="/contact" className="hover:text-text-secondary transition-colors">
            Contact
          </Link>
        </div>
      </footer>
    </main>
  );
}
