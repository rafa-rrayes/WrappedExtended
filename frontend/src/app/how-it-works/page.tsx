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
    number: "1",
    title: "Request Your Data",
    desc: "Go to your Spotify account privacy settings and request your Extended Streaming History. This is the full dataset — not the basic \"last year\" download.",
    detail:
      "Spotify provides a dedicated page where you can request a copy of all your data. Look for the \"Extended streaming history\" option under Privacy Settings.",
    link: {
      label: "Open Spotify Privacy Settings",
      href: "https://www.spotify.com/account/privacy/",
    },
  },
  {
    number: "2",
    title: "Wait for the Email",
    desc: "Spotify will send you an email when your data is ready. This can take anywhere from a few days to 30 days — be patient, it's worth it.",
    detail:
      'You\'ll receive an email from Spotify with the subject "Your data is ready to download." Check your spam folder if you don\'t see it after a week.',
  },
  {
    number: "3",
    title: "Download the ZIP",
    desc: "Click the download link in the email. You'll get a .zip file containing your entire streaming history as JSON files.",
    detail:
      "The ZIP file usually contains a folder called \"Spotify Extended Streaming History\" with multiple JSON files inside. Don't unzip it — upload the .zip directly.",
  },
  {
    number: "4",
    title: "Upload to WrapEx",
    desc: "Drop the .zip file on WrapEx. We'll process your entire streaming history and generate your personal dashboard in under a minute.",
    detail:
      "We strip personally identifiable information (like IP addresses) during processing. Your raw files are deleted after your dashboard is generated.",
    link: {
      label: "Go to Upload",
      href: "/upload",
    },
  },
];

export default function HowItWorksPage() {
  return (
    <main className="pt-14">
      {/* Hero */}
      <section className="py-24 px-6 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(29,185,84,0.06)_0%,transparent_70%)] pointer-events-none" />

        <FadeUp>
          <span className="inline-block font-[family-name:var(--font-display)] text-xs font-semibold tracking-[0.2em] uppercase text-green border border-green/30 px-5 py-2 rounded-full mb-8">
            How It Works
          </span>
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(2rem,5vw,4rem)] font-extrabold leading-[1.1] mb-4 bg-gradient-to-br from-text-primary to-text-secondary bg-clip-text text-transparent">
            Four steps to your dashboard
          </h1>
          <p className="text-lg text-text-secondary font-light max-w-lg mx-auto">
            Get your complete Spotify streaming history visualized in minutes.
            Here&apos;s how.
          </p>
        </FadeUp>
      </section>

      {/* Steps */}
      <section className="max-w-[800px] mx-auto px-6 pb-24">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border hidden md:block" />

          <div className="space-y-8">
            {STEPS.map((step, i) => (
              <FadeUp key={step.number} delay={i * 100}>
                <div className="relative md:pl-16">
                  {/* Step number */}
                  <div className="hidden md:flex absolute left-0 top-0 w-12 h-12 rounded-full bg-green/20 text-green font-[family-name:var(--font-display)] font-bold text-lg items-center justify-center border-2 border-bg-primary z-10">
                    {step.number}
                  </div>

                  <div className="bg-bg-card/60 border border-border rounded-[var(--radius-card)] p-6 hover:border-green/20 transition-colors">
                    <div className="flex items-center gap-3 mb-3 md:hidden">
                      <div className="w-8 h-8 rounded-full bg-green/20 text-green font-bold text-sm flex items-center justify-center shrink-0">
                        {step.number}
                      </div>
                      <h3 className="font-[family-name:var(--font-display)] font-bold text-lg">
                        {step.title}
                      </h3>
                    </div>
                    <h3 className="font-[family-name:var(--font-display)] font-bold text-lg mb-2 hidden md:block">
                      {step.title}
                    </h3>
                    <p className="text-sm text-text-secondary leading-relaxed mb-3">
                      {step.desc}
                    </p>
                    <p className="text-xs text-text-muted leading-relaxed">
                      {step.detail}
                    </p>
                    {step.link && (
                      <Link
                        href={step.link.href}
                        target={step.link.href.startsWith("http") ? "_blank" : undefined}
                        rel={step.link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="inline-block mt-4 text-sm text-green hover:text-green/80 font-medium transition-colors"
                      >
                        {step.link.label} &rarr;
                      </Link>
                    )}
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Tips */}
      <section className="max-w-[800px] mx-auto px-6 py-24">
        <FadeUp>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-center mb-4">
            Tips
          </h2>
          <p className="text-text-secondary text-center mb-12 max-w-md mx-auto">
            A few things to keep in mind.
          </p>
        </FadeUp>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              icon: "\u2139",
              title: "Extended, not basic",
              desc: 'Make sure you request the "Extended Streaming History" — the basic download only covers the last year.',
            },
            {
              icon: "\u2709",
              title: "Check your spam",
              desc: "Spotify's data-ready email sometimes lands in spam or promotions folders.",
            },
            {
              icon: "\u2B06",
              title: "Upload the .zip",
              desc: "Don't unzip the file. Upload the original .zip directly to WrapEx.",
            },
            {
              icon: "\u2728",
              title: "More data = better insights",
              desc: "The longer your streaming history, the richer your dashboard will be.",
            },
          ].map((tip, i) => (
            <FadeUp key={tip.title} delay={i * 50}>
              <div className="bg-bg-card/40 border border-border rounded-[var(--radius-card)] p-5 hover:border-green/20 transition-colors h-full">
                <span className="text-xl mb-3 block">{tip.icon}</span>
                <h3 className="font-[family-name:var(--font-display)] font-bold text-sm mb-1">
                  {tip.title}
                </h3>
                <p className="text-xs text-text-muted">{tip.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(29,185,84,0.06)_0%,transparent_60%)] pointer-events-none" />
        <FadeUp>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold mb-4">
            Ready to see your data?
          </h2>
          <p className="text-text-secondary mb-8 max-w-md mx-auto">
            Upload your Spotify export and get your personal dashboard in under
            a minute.
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
        <p className="mb-3">
          WrapEx &mdash; Your streaming history, beautifully visualized.
        </p>
        <div className="flex items-center justify-center gap-6">
          <Link
            href="/terms"
            className="hover:text-text-secondary transition-colors"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="hover:text-text-secondary transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/contact"
            className="hover:text-text-secondary transition-colors"
          >
            Contact
          </Link>
        </div>
      </footer>
    </main>
  );
}
