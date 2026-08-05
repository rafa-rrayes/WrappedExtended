"use client";

import { Fragment, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRangeHref } from "@/lib/hooks/use-date-range";
import { DASHBOARD_NAV, NavIcon, isNavActive, navHref } from "./nav-items";

interface DashboardSidebarProps {
  dashboardId: string;
  /** Desktop rail collapsed to icons only. */
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Mobile off-canvas drawer visibility. */
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function DashboardSidebar({
  dashboardId,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  // The drawer is a navigation surface: leaving it open over the page you just navigated
  // to is never what you wanted.
  useEffect(() => {
    onCloseMobile();
  }, [pathname, onCloseMobile]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseMobile();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      {/* Desktop rail */}
      <aside
        className="hidden md:flex fixed left-0 top-14 bottom-0 z-40 w-[var(--shell-sidebar-w)] flex-col border-r border-border bg-bg-primary/80 backdrop-blur-xl transition-[width] duration-200"
        aria-label="Dashboard sections"
      >
        <SidebarNav dashboardId={dashboardId} pathname={pathname} collapsed={collapsed} />
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex items-center gap-2 border-t border-border px-4 py-3 text-text-muted transition-colors hover:text-text-primary"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("shrink-0 transition-transform", collapsed && "rotate-180")}
            aria-hidden="true"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="md:hidden">
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={onCloseMobile}
              aria-hidden="true"
              className="fixed inset-0 z-[1400] bg-black/60 backdrop-blur-sm"
            />
            <m.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.2 }}
              className="fixed left-0 top-0 bottom-0 z-[1401] flex w-[260px] flex-col border-r border-border bg-bg-primary"
              // It covers the page and traps Escape, so announce it as a modal dialog
              // rather than as a second landmark sitting behind the content.
              role="dialog"
              aria-modal="true"
              aria-label="Dashboard sections"
            >
              <div className="flex h-14 items-center justify-between border-b border-border px-4">
                <span className="font-[family-name:var(--font-display)] text-sm font-bold">
                  Wrap<span className="text-green">Ex</span>
                </span>
                <button
                  type="button"
                  onClick={onCloseMobile}
                  // Opening the drawer has to move focus into it, or a keyboard user is
                  // still tabbing through the page behind the scrim.
                  autoFocus
                  className="p-1 text-text-secondary transition-colors hover:text-text-primary"
                  aria-label="Close navigation"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <SidebarNav dashboardId={dashboardId} pathname={pathname} collapsed={false} />
            </m.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function SidebarNav({
  dashboardId,
  pathname,
  collapsed,
}: {
  dashboardId: string;
  pathname: string;
  collapsed: boolean;
}) {
  const withRange = useRangeHref();

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-4">
      {DASHBOARD_NAV.map((item, index) => {
        const active = isNavActive(pathname, dashboardId, item.segment);
        const previousGroup = index > 0 ? DASHBOARD_NAV[index - 1].group : undefined;
        const startsGroup = item.group !== undefined && item.group !== previousGroup;

        return (
          <Fragment key={item.segment || "overview"}>
            {startsGroup && (
              <div
                className={cn(
                  "mt-4 mb-1 px-3 text-[0.6rem] font-medium uppercase tracking-[0.14em] text-text-muted",
                  collapsed && "sr-only",
                )}
              >
                {item.group}
              </div>
            )}
            <Link
              href={withRange(navHref(dashboardId, item.segment))}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-white/[0.06] text-text-primary"
                  : "text-text-secondary hover:bg-white/[0.03] hover:text-text-primary",
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-green transition-opacity",
                  active ? "opacity-100" : "opacity-0",
                )}
              />
              <NavIcon
                name={item.icon}
                className={cn("shrink-0", active ? "text-green" : "text-current")}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          </Fragment>
        );
      })}
    </nav>
  );
}
