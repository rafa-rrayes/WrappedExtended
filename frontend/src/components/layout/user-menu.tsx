"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initial = (user?.display_name?.[0] || user?.username?.[0] || "?").toUpperCase();

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full bg-green/20 text-green text-sm font-bold flex items-center justify-center hover:bg-green/30 transition-colors"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-bg-card/90 backdrop-blur-xl border border-border rounded-[var(--radius-sm)] shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium truncate">
              {user?.display_name || user?.username}
            </p>
            <p className="text-xs text-text-muted truncate">{user?.email}</p>
          </div>
          <div className="py-1">
            <Link
              href="/dashboards"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors"
            >
              My Dashboards
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors"
            >
              Settings
            </Link>
          </div>
          <div className="border-t border-border py-1">
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-bg-card-hover transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
