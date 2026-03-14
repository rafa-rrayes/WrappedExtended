"use client";

import Link from "next/link";
import { useAuth } from "@/lib/context/auth-context";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";

export function Header() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-bg-primary/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] font-bold text-lg"
        >
          Wrap<span className="text-green">Ex</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-text-secondary">
          <Link
            href="/demo"
            className="hover:text-text-primary transition-colors"
          >
            Demo
          </Link>
          <Link
            href="/pricing"
            className="hover:text-text-primary transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/upload"
            className="hover:text-text-primary transition-colors"
          >
            Upload
          </Link>
          {!isLoading &&
            (isAuthenticated ? (
              <>
                <Link
                  href="/dashboards"
                  className="hover:text-text-primary transition-colors"
                >
                  My Dashboards
                </Link>
                <UserMenu />
              </>
            ) : (
              <Link
                href="/login"
                className="hover:text-text-primary transition-colors"
              >
                Sign In
              </Link>
            ))}
        </nav>

        {/* Mobile nav */}
        <MobileNav />
      </div>
    </header>
  );
}
