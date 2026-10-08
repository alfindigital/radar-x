// Shared table pager — 20 rows per page, query-param driven, server-rendered.

import Link from "next/link";

export const TABLE_PAGE_SIZE = 20;

export interface PageSlice<T> {
  rows: T[];
  page: number;
  pageCount: number;
  total: number;
  from: number; // 1-based index of first shown row (0 when empty)
  to: number; // 1-based index of last shown row
}

export function paginate<T>(rows: readonly T[], raw: string | string[] | undefined): PageSlice<T> {
  const pageCount = Math.max(1, Math.ceil(rows.length / TABLE_PAGE_SIZE));
  const n = Number(typeof raw === "string" ? raw : "1");
  const page = Number.isInteger(n) && n >= 1 ? Math.min(n, pageCount) : 1;
  const start = (page - 1) * TABLE_PAGE_SIZE;
  const slice = rows.slice(start, start + TABLE_PAGE_SIZE);
  return {
    rows: slice,
    page,
    pageCount,
    total: rows.length,
    from: slice.length ? start + 1 : 0,
    to: start + slice.length,
  };
}

// Returns a page-link factory that preserves the view's other query params.
// Page 1 omits the page param so the canonical URL stays clean.
export function pageHref(base: string, key: string, params: Record<string, string | undefined> = {}) {
  return (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (p > 1) q.set(key, String(p));
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };
}

export function Pager({ s, href }: { s: PageSlice<unknown>; href: (page: number) => string }) {
  if (s.pageCount <= 1) return null;
  return (
    <nav aria-label="Pages" className="mt-3 flex items-center gap-3 text-[11px]">
      {s.page > 1 ? (
        <Link href={href(s.page - 1)} className="mono blue">
          ← Prev
        </Link>
      ) : (
        <span className="mono faint">← Prev</span>
      )}
      <span className="mono faint">
        Page {s.page} of {s.pageCount} · {s.from}–{s.to} of {s.total}
      </span>
      {s.page < s.pageCount ? (
        <Link href={href(s.page + 1)} className="mono blue">
          Next →
        </Link>
      ) : (
        <span className="mono faint">Next →</span>
      )}
    </nav>
  );
}
