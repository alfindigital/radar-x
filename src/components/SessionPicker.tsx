"use client";

// Session/date picker for boards backed by dated feeds. Only dates that exist
// in the data are offered — picking a non-session day is impossible, so the
// control can never produce an empty "no such date" state. Latest session is
// the default and drops the param so shared URLs stay short.

import { useRouter } from "next/navigation";

export function SessionPicker({
  base,
  param,
  dates,
  value,
  extra,
  label = "Session",
}: {
  base: string;
  param: string;
  /** Available dates, latest first. */
  dates: string[];
  /** Currently applied date (null/absent = latest). */
  value?: string | null;
  /** Other params to preserve (e.g. cohort). */
  extra?: Record<string, string | undefined>;
  label?: string;
}) {
  const router = useRouter();
  if (!dates.length) return null;
  const current = value && dates.includes(value) ? value : dates[0];
  return (
    <label className="mono flex items-center gap-2 text-[10px] uppercase tracking-wider faint">
      {label}
      <select
        value={current}
        aria-label={`${label} date`}
        onChange={(e) => {
          const q = new URLSearchParams();
          for (const [k, v] of Object.entries(extra ?? {})) if (v) q.set(k, v);
          if (e.target.value !== dates[0]) q.set(param, e.target.value);
          const qs = q.toString();
          router.push(qs ? `${base}?${qs}` : base);
        }}
        className="mono border border-line bg-panel px-2 py-1 text-[11px] text-ink focus:border-acc focus:outline-none"
        style={{ borderRadius: "var(--radius-sm)" }}
      >
        {dates.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </label>
  );
}
