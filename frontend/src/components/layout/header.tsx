import Link from "next/link";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-bg-primary/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-[family-name:var(--font-display)] font-bold text-lg">
          Wrap<span className="text-green">Ex</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-text-secondary">
          <Link href="/upload" className="hover:text-text-primary transition-colors">
            Upload
          </Link>
          <Link href="/login" className="hover:text-text-primary transition-colors">
            Sign In
          </Link>
        </nav>
      </div>
    </header>
  );
}
