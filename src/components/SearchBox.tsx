"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

type TickerOption = { s: string; n: string };

// Ticker list is served by /api/tickers and fetched lazily on first focus —
// the header renders on every page, so the 962-row directory must not be
// serialized into every document. Module-level promise dedupes both nav
// instances (top bar + mobile nav). A failed fetch clears the cache so the
// next focus retries — a transient 503 must not kill search for the session.
let tickerCache: Promise<TickerOption[]> | null = null;

function loadTickers(): Promise<TickerOption[]> {
  tickerCache ??= fetch("/api/tickers")
    .then((r) => {
      if (!r.ok) throw new Error(`tickers HTTP ${r.status}`);
      return r.json() as Promise<TickerOption[]>;
    })
    .catch((e) => {
      tickerCache = null;
      throw e;
    });
  return tickerCache;
}

export function SearchBox() {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [options, setOptions] = useState<TickerOption[]>([]);

  async function ensureTickers() {
    if (options.length) return;
    try {
      setOptions(await loadTickers());
      setError("");
    } catch {
      setError("Issuer directory unreachable — type the ticker code directly; it still navigates.");
    }
  }

  function go(e: React.FormEvent) {
    e.preventDefault();
    const t = q.trim().toUpperCase().replace(/\.JK$/, "");
    if (t.length < 2) {
      setError("Enter at least two ticker characters.");
      return;
    }
    // Datalist matches on the ticker; resolve typed names to their ticker so
    // "Bank Central" lands on BBCA. Issuer names carry legal prefixes/suffixes
    // ("PT … Tbk"), so compare on the stripped form. Unknown input still
    // navigates — the dossier route renders its explicit unknown state.
    const norm = (s: string) =>
      s.toUpperCase().replace(/^(PT|CV|PD)\s+/, "").replace(/\s+TBK\.?$/, "").trim();
    const opts = options;
    const hit =
      opts.find((o) => o.s === t) ??
      opts.find((o) => norm(o.n) === t) ??
      opts.find((o) => norm(o.n).startsWith(t)) ??
      opts.find((o) => t.length >= 5 && norm(o.n).includes(t));
    setError("");
    router.push(`/stock/${encodeURIComponent(hit ? hit.s : t)}`);
  }

  return (
    <form onSubmit={go} className="w-full" noValidate>
      <label htmlFor={`issuer-search-${listId}`} className="sr-only">Search issuer</label>
      <div className="relative">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="faint absolute left-3 top-1/2 -translate-y-1/2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          id={`issuer-search-${listId}`}
          aria-label="Search issuer"
          aria-invalid={Boolean(error)}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={ensureTickers}
          list={listId}
          autoComplete="off"
          spellCheck={false}
          placeholder="Search"
          className="mono w-full border border-line bg-panel py-1.5 pl-9 pr-3 text-[12px] text-ink placeholder:text-ink-faint focus:border-acc focus:outline-none"
          style={{ borderRadius: "var(--radius-sm)" }}
        />
        <datalist id={listId}>
          {options.map((o) => (
            <option key={o.s} value={o.s}>{o.n}</option>
          ))}
        </datalist>
      </div>
      {error && <p className="mt-1 text-[11px] text-dist" role="alert">{error}</p>}
      {/* Hidden submit: keeps implicit Enter-to-submit semantics but is removed
          from the Tab order so keyboard focus never lands on an invisible control. */}
      <button type="submit" className="sr-only" tabIndex={-1}>Open issuer</button>
    </form>
  );
}
