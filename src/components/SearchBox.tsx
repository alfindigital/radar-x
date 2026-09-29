"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  function go(e: React.FormEvent) {
    e.preventDefault();
    const t = q.trim().toUpperCase().replace(/\.JK$/, "");
    if (t.length < 2) {
      setError("Enter at least two ticker characters.");
      return;
    }
    setError("");
    router.push(`/saham/${encodeURIComponent(t)}`);
  }

  return (
    <form onSubmit={go} className="w-full max-w-[280px]" noValidate>
      <label htmlFor="issuer-search" className="sr-only">Search issuer</label>
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
            id="issuer-search"
            aria-label="Search issuer"
            aria-invalid={Boolean(error)}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search issuer… (BBCA)"
          className="w-full rounded-md border border-line bg-panel py-1.5 pl-9 pr-3 text-xs text-ink placeholder:text-ink-faint focus:border-line-2 focus:outline-none"
        />
      </div>
      {error && <p className="mt-1 text-[11px] text-dist" role="alert">{error}</p>}
      <button type="submit" className="sr-only">Open issuer</button>
    </form>
  );
}
