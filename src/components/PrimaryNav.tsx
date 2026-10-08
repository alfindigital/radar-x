"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

export const NAV = [
  { href: "/", label: "Exit Watch" },
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

// Desktop top-bar links: quiet text, accent underline on the active section.
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
            className={`relative px-3 py-1.5 text-[12px] font-medium tracking-wide ${
              active ? "text-ink" : "dim hover:text-ink"
            }`}
          >
            {n.label}
            {active && <span className="absolute inset-x-3 -bottom-[9px] h-px bg-acc" aria-hidden />}
          </Link>
        );
      })}
    </nav>
  );
}
