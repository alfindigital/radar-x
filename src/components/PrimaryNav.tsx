"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

export const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/broker", label: "Brokers" },
  { href: "/foreign", label: "Foreign flow" },
  { href: "/rotation", label: "Sectors" },
  { href: "/cases", label: "Cases" },
  { href: "/methodology", label: "Methodology" },
] as const;

export function useMountedPath() {
  const pathname = usePathname();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  return { pathname, mounted };
}

export function isNavActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

// Desktop top-bar links: quiet text; the active section gets the same lit
// panel-2 chip that MobileNav and .tab-active use — one tab language everywhere.
export function DesktopNav() {
  const { pathname, mounted } = useMountedPath();
  return (
    <nav aria-label="Primary" className="hidden items-center gap-0.5 lg:flex">
      {NAV.map((n) => {
        const active = mounted && isNavActive(n.href, pathname);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={`px-3 py-1.5 text-[12px] font-medium tracking-wide ${
              active ? "bg-panel-2 text-acc" : "dim hover:text-ink"
            }`}
            style={{ borderRadius: "var(--radius-sm)" }}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
