"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

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

export function SearchBox({ expandable = false }: { expandable?: boolean }) {
  const router = useRouter();
  const listId = useId();
  const inputId = `issuer-search-${listId}`;
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [options, setOptions] = useState<TickerOption[]>([]);
  // Collapsed to an icon button on the desktop bar; the mobile nav keeps the
  // always-open field.
  const [open, setOpen] = useState(!expandable);
  const inputRef = useRef<HTMLInputElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Focus follows the summon: a field the user just opened takes the caret.
  useEffect(() => {
    if (expandable && open) inputRef.current?.focus();
  }, [expandable, open]);

  async function ensureTickers() {
    if (options.length) return;
    try {
      setOptions(await loadTickers());
      setError("");
    } catch {
      setError("Issuer directory unreachable: type the ticker code directly; it still navigates.");
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
    if (expandable) {
      setOpen(false);
      setQ("");
      btnRef.current?.focus();
    }
    router.push(`/stock/${encodeURIComponent(hit ? hit.s : t)}`);
  }

  if (expandable) {
    // Icon first, field to its right: the magnifier stays put as the anchor
    // while the input opens toward the theme control. Same icon closes on
    // empty, submits on text — a magnifier that does both reads as one tool.
    return (
      <div className="relative flex items-center gap-1">
        <button
          ref={btnRef}
          type="button"
          aria-label={open ? "Submit search" : "Search issuer"}
          aria-expanded={open}
          aria-controls={inputId}
          data-tip={open ? "Submit · Esc to close" : "Search issuer"}
          onClick={() => {
            if (!open) setOpen(true);
            else if (q.trim()) formRef.current?.requestSubmit();
            else setOpen(false);
          }}
          className="iconbtn tip-r tip-b"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
        <form
          ref={formRef}
          onSubmit={go}
          noValidate
          className={`overflow-hidden transition-[width,opacity] duration-150 ease-out ${
            open ? "w-[220px] opacity-100" : "w-0 opacity-0"
          }`}
        >
          <label htmlFor={inputId} className="sr-only">Search issuer</label>
          <input
            ref={inputRef}
            id={inputId}
            aria-label="Search issuer"
            aria-invalid={Boolean(error)}
            aria-hidden={!open}
            disabled={!open}
            tabIndex={open ? 0 : -1}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={ensureTickers}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setQ("");
                setOpen(false);
                btnRef.current?.focus();
              }
            }}
            onBlur={(e) => {
              // Blur into the magnifier means "submit/close", handled by its
              // own click — only focus truly leaving the control collapses.
              if (!q.trim() && e.relatedTarget !== btnRef.current) setOpen(false);
            }}
            list={listId}
            autoComplete="off"
            spellCheck={false}
            placeholder="Search"
            className="mono block w-full border border-line bg-panel px-3 py-1.5 text-[12px] text-ink placeholder:text-ink-faint focus:border-acc focus:outline-none"
            style={{ borderRadius: "var(--radius-sm)" }}
          />
          <datalist id={listId}>
            {options.map((o) => (
              <option key={o.s} value={o.s}>{o.n}</option>
            ))}
          </datalist>
          {/* Hidden submit: keeps implicit Enter-to-submit semantics but is
              removed from the Tab order so keyboard focus never lands on an
              invisible control. */}
          <button type="submit" className="sr-only" tabIndex={-1}>Open issuer</button>
        </form>
        {error && (
          <p className="absolute right-0 top-full mt-1.5 w-[280px] text-right text-[11px] leading-snug text-dist" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={go} className="w-full" noValidate>
      <label htmlFor={inputId} className="sr-only">Search issuer</label>
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
          ref={inputRef}
          id={inputId}
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
