"use client";

import { useState } from "react";
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

const TESTIMONIALS = [
  {
    name: "Mia T.",
    role: "Playlist curator",
    text: "I had no idea I\u2019d listened to over 3,000 hours last year. The heatmap alone was worth it \u2014 turns out I\u2019m a 2 AM listener.",
  },
  {
    name: "Jake R.",
    role: "Music producer",
    text: "Way more detailed than Spotify Wrapped. I could see exactly when I discovered my favorite artists and how my taste shifted season by season.",
  },
  {
    name: "Priya S.",
    role: "Data nerd & vinyl collector",
    text: "Finally, actual data from my streaming history instead of a cute slideshow. The year-over-year trends blew my mind.",
  },
  {
    name: "Carlos M.",
    role: "DJ & music blogger",
    text: "Shared my dashboard with my followers and they loved it. The bar chart race of my top artists was genuinely entertaining to watch.",
  },
];

const FAQS = [
  {
    q: "What data do I need?",
    a: "Your Spotify Extended Streaming History. You can request it from Spotify\u2019s privacy settings \u2014 it usually arrives as a .zip file within a few days.",
  },
  {
    q: "How long does processing take?",
    a: "Under a minute for most files. We crunch years of streaming data in seconds using a high-performance data pipeline.",
  },
  {
    q: "Is my data safe?",
    a: "We strip personally identifiable information (like IP addresses) during processing. Your raw files are deleted after your dashboard is generated. We never share your data.",
  },
  {
    q: "What\u2019s in the dashboard?",
    a: "Top artists, tracks, and albums ranked by play time. Listening heatmaps, hourly and seasonal patterns, platform breakdowns, discovery timelines, and more \u2014 over a dozen interactive visualizations.",
  },
  {
    q: "Can I share my dashboard?",
    a: "Yes! Every dashboard has a shareable public link you can send to friends or post on social media.",
  },
  {
    q: "Why $5?",
    a: "Running the infrastructure to process and host your dashboard costs real money. $5 keeps WrapEx sustainable without ads or selling your data. One payment, your dashboard stays forever.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left bg-bg-card/40 border border-border rounded-[var(--radius-card)] p-5 hover:border-green/20 transition-colors cursor-pointer"
    >
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-[family-name:var(--font-display)] font-bold text-sm">
          {q}
        </h3>
        <span
          className="text-text-muted text-lg shrink-0 transition-transform duration-300"
          style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
        >
          +
        </span>
      </div>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? "200px" : "0px", opacity: open ? 1 : 0 }}
      >
        <p className="text-sm text-text-secondary mt-3 leading-relaxed">{a}</p>
      </div>
    </button>
  );
}

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
            href="/pricing"
            className="border border-border hover:border-text-muted text-text-secondary hover:text-text-primary px-8 py-3 rounded-full transition-all"
          >
            See Pricing
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

        <FadeUp delay={300}>
          <div className="text-center mt-8">
            <Link
              href="/how-it-works"
              className="text-sm text-green hover:text-green/80 font-medium transition-colors"
            >
              See detailed guide &rarr;
            </Link>
          </div>
        </FadeUp>
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
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-[1280px] mx-auto px-6 py-24">
        <FadeUp>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-center mb-4">
            Simple Pricing
          </h2>
          <p className="text-text-secondary text-center mb-12 max-w-md mx-auto">
            No subscriptions. No hidden fees. Pay once, keep your dashboard forever.
          </p>
        </FadeUp>

        <FadeUp delay={100}>
          <div className="max-w-md mx-auto relative">
            <div className="absolute -inset-px rounded-[calc(var(--radius-card)+1px)] bg-gradient-to-b from-green/40 via-green/10 to-transparent pointer-events-none" />
            <div className="relative bg-bg-card border border-green/20 rounded-[var(--radius-card)] p-8 text-center">
              <span className="inline-block font-[family-name:var(--font-display)] text-xs font-semibold tracking-[0.15em] uppercase text-green bg-green/10 px-4 py-1.5 rounded-full mb-6">
                One-time payment
              </span>
              <div className="mb-6">
                <span className="font-[family-name:var(--font-display)] text-6xl font-extrabold text-text-primary">
                  $5
                </span>
                <span className="text-text-muted ml-2">per dashboard</span>
              </div>
              <ul className="text-sm text-text-secondary space-y-3 mb-8 text-left max-w-[280px] mx-auto">
                {[
                  "All visualizations & insights",
                  "Shareable public link",
                  "Dashboard stays online forever",
                  "Years of streaming data processed",
                  "No ads, no data selling",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="text-green mt-0.5 shrink-0">&#10003;</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/upload"
                className="inline-block w-full bg-green hover:bg-green/90 text-bg-deep font-semibold py-3 rounded-full transition-all"
              >
                Get Your Dashboard
              </Link>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* Testimonials */}
      <section className="max-w-[1280px] mx-auto px-6 py-24">
        <FadeUp>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-center mb-4">
            What People Are Saying
          </h2>
          <p className="text-text-secondary text-center mb-12 max-w-md mx-auto">
            Music lovers who went beyond Spotify Wrapped.
          </p>
        </FadeUp>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <FadeUp key={t.name} delay={i * 80}>
              <div className="bg-bg-card/40 border border-border rounded-[var(--radius-card)] p-6 hover:border-green/15 transition-colors h-full">
                <p className="text-sm text-text-secondary leading-relaxed mb-5 italic">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green/15 flex items-center justify-center text-green text-xs font-bold font-[family-name:var(--font-display)]">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {t.name}
                    </p>
                    <p className="text-xs text-text-muted">{t.role}</p>
                  </div>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[720px] mx-auto px-6 py-24">
        <FadeUp>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-center mb-4">
            Questions &amp; Answers
          </h2>
          <p className="text-text-secondary text-center mb-12 max-w-md mx-auto">
            Everything you need to know before getting started.
          </p>
        </FadeUp>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <FadeUp key={faq.q} delay={i * 60}>
              <FAQItem q={faq.q} a={faq.a} />
            </FadeUp>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-24 text-center relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(29,185,84,0.06)_0%,transparent_60%)] pointer-events-none" />
        <FadeUp>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold mb-4">
            Ready to see your data?
          </h2>
          <p className="text-text-secondary mb-8 max-w-md mx-auto">
            Upload your Spotify export and get your personal dashboard in under a minute.
          </p>
          <Link
            href="/upload"
            className="bg-green hover:bg-green/90 text-bg-deep font-semibold px-10 py-3.5 rounded-full transition-all text-lg"
          >
            Get Started &mdash; $5
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
