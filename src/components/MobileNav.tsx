"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { SearchBox } from "./SearchBox";

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
    <div className="border-b border-line bg-panel md:hidden">
      <nav aria-label="Primary navigation" className="flex gap-1 overflow-x-auto px-2 py-2">
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
      <div className="px-2 pb-2">
        <SearchBox />
      </div>
    </div>
  );
}
