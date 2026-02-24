import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      {/* Hero glow */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle,rgba(29,185,84,0.08)_0%,transparent_70%)] pointer-events-none" />

      <span className="font-[family-name:var(--font-display)] text-xs font-semibold tracking-[0.2em] uppercase text-green border border-green/30 px-5 py-2 rounded-full mb-10 animate-[fadeUp_0.8s_ease_forwards_0.2s] opacity-0">
        Spotify Extended Streaming History
      </span>

      <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.5rem,6vw,5rem)] font-extrabold leading-[1.05] mb-3 animate-[fadeUp_0.8s_ease_forwards_0.4s] opacity-0 bg-gradient-to-br from-text-primary to-text-secondary bg-clip-text text-transparent">
        Your Sonic Universe
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
    </main>
  );
}
