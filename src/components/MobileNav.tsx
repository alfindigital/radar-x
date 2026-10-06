"use client";

import Link from "next/link";
import { SearchBox } from "./SearchBox";
import { NAV, isNavActive, useMountedPath } from "./PrimaryNav";

export default function MobileNav() {
  const { pathname, mounted } = useMountedPath();
  return (
    <div className="border-b border-line bg-panel lg:hidden">
      <nav aria-label="Primary navigation" className="flex gap-0.5 overflow-x-auto px-2 py-1.5">
        {NAV.map((item) => {
          const active = mounted && isNavActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-10 items-center whitespace-nowrap px-3 text-center font-mono text-[11px] uppercase tracking-wider ${
                active ? "bg-panel-2 text-acc" : "dim"
              }`}
              style={{ borderRadius: "var(--radius-sm)" }}
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
