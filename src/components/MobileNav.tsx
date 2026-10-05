"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

const NAV = [
  { href: "/", label: "Exit Watch" },
  { href: "/broker", label: "Brokers" },
  { href: "/asing", label: "Foreign flow" },
  { href: "/rotasi", label: "Sectors" },
  { href: "/kasus", label: "Cases" },
  { href: "/metodologi", label: "Methodology" },
];

export default function MobileNav() {
  const pathname = usePathname();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  return (
    <nav
      aria-label="Primary navigation"
      className="flex gap-1 overflow-x-auto border-b border-line bg-panel px-2 py-2 md:hidden"
    >
      {NAV.map((item) => {
        const active = mounted && (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-2 py-2 text-center text-[11px] ${active ? "bg-panel-2 text-ink" : "dim"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
