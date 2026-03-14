"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    setOpen(false);
    await logout();
    router.push("/");
  }

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="text-text-secondary hover:text-text-primary transition-colors p-1"
        aria-label="Menu"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute top-14 left-0 right-0 bg-bg-primary/95 backdrop-blur-xl border-b border-border z-40">
          <nav className="max-w-[1280px] mx-auto px-6 py-4 flex flex-col gap-3">
            <Link
              href="/demo"
              onClick={() => setOpen(false)}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Demo
            </Link>
            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/upload"
              onClick={() => setOpen(false)}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Upload
            </Link>
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboards"
                  onClick={() => setOpen(false)}
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  My Dashboards
                </Link>
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Account
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-left text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
