// Small display widgets: ScoreNumber, ScoreMarker, ScoreBreakdown, CaseRow, Stat.

import Link from "next/link";
import type { DerivedCase } from "@/lib/derive";
import type { ComponentKey, ScoreV2 } from "@/lib/types";
import { fmtCurrency, fmtPct, PATTERN_LABEL, patternTagClass, scoreColor } from "./fmt";

export function ScoreNumber({ score, size = "md" }: { score: number | null; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "text-3xl" : size === "sm" ? "text-sm" : "text-base";
  if (score === null) return <span className={`mono faint ${sz}`}>Unavailable</span>;
  return (
    <span className={`mono font-bold tabular-nums ${sz} ${scoreColor(score)}`}>
      {score > 0 ? "+" : ""}
      {score}
    </span>
  );
}

export function ScoreMarker({ score }: { score: number | null }) {
  if (score === null) return null;
  const pos = Math.max(0, Math.min(100, (score + 100) / 2));
  return (
    <div className="relative h-1 w-20 rounded-full bg-panel-2" title={`${score > 0 ? "+" : ""}${score}`}>
      <div
        className="absolute top-1/2 h-2.5 w-[3px] -translate-y-1/2 rounded-full"
        style={{ left: `calc(${pos}% - 1.5px)`, background: score >= 0 ? "var(--acc)" : "var(--dist)" }}
      />
      <div className="absolute left-1/2 top-1/2 h-1.5 w-px -translate-y-1/2 bg-line-2" />
    </div>
  );
}

const COMPONENT_META: { key: ComponentKey; label: string; weight: number; hint: string }[] = [
  { key: "insiderZ", label: "Reported ownership (90d)", weight: 0.3, hint: "Net reported transaction value within the inclusive 90-day window" },
  { key: "foreignTrend", label: "Foreign flow (90d)", weight: 0.25, hint: "Cumulative net inflow normalized by an observed market cap" },
  { key: "instNetZ", label: "Broker context (14d)", weight: 0.2, hint: "Eligible institutional or foreign broker net value" },
  { key: "retailExodusZ", label: "Shareholder count change", weight: 0.15, hint: "Month-over-month reported shareholder count change" },
  { key: "fclassShift", label: "Foreign holder-class shift", weight: 0.1, hint: "Foreign institutional classes minus foreign individual classes" },
];

export function ScoreBreakdown({ score }: { score: ScoreV2 }) {
  return (
    <div className="space-y-3">
      {COMPONENT_META.map((m) => {
        const component = score.components[m.key];
        const z = component.z;
        const pos = (z ?? 0) >= 0;
        const pct = z === null ? 0 : Math.min(100, (Math.abs(z) / 3) * 100);
        return (
          <div key={m.key} title={`${m.hint} — bobot ${(m.weight * 100).toFixed(0)}%`}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="dim">
                {m.label} <span className="faint">{(m.weight * 100).toFixed(0)}%</span>
              </span>
              <span className={`mono ${pos ? "acc" : "dist"}`}>
                {z === null ? "Unavailable" : `${pos ? "+" : ""}${z.toFixed(2)}σ`}
              </span>
            </div>
            <div className="mt-1 h-[3px] rounded-full bg-panel-2">
              <div
                className={`h-full rounded-full ${pos ? "bg-acc" : "bg-dist"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      <p className="pt-1 text-[10px] faint">σ = robust cohort z-score, clipped to ±3; unavailable components do not contribute.</p>
    </div>
  );
}

export function CaseRow({ c }: { c: DerivedCase }) {
  const names = c.holders;
  const val = c.insiderTrades.reduce((s, t) => s + t.value, 0);
  const outcome30 = c.outcomes.find((outcome) => outcome.horizonDays === 30)!;
  const dir = outcome30.status === "complete" && outcome30.issuerPct !== null && outcome30.issuerPct < 0 ? "dist" : "neutral";
  return (
    <Link
      href={`/kasus/${encodeURIComponent(c.id)}`}
      className="row-hover grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-line px-1 py-3"
    >
      <div className="w-28">
        <span className={`tag ${patternTagClass(c.pattern)}`}>{PATTERN_LABEL[c.pattern] ?? c.pattern}</span>
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="mono text-sm font-bold">{c.symbol.replace(".JK", "")}</span>
          <span className="faint text-[11px]">{c.anchorDate}</span>
        </div>
        <p className="mt-0.5 truncate text-xs dim">{names.length} distinct holders · {outcome30.status === "complete" ? "30-day outcome measured" : `30-day outcome ${outcome30.status}`}</p>
        <p className="mt-0.5 text-[11px] faint">
          {names.slice(0, 2).join(", ")}
          {names.length > 2 ? ` +${names.length - 2}` : ""} · {fmtCurrency(val)}
        </p>
      </div>
      <div className="flex items-center gap-4 text-right">
        <div className={`mono text-xs ${dir}`}>30d {outcome30.status === "complete" ? fmtPct(outcome30.issuerPct, 1, "complete") : outcome30.status}</div>
      </div>
    </Link>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border-l-2 border-line px-3 py-1">
      <div className="text-[10px] uppercase tracking-wider faint">{label}</div>
      <div className="mono mt-0.5 text-lg">{value}</div>
      {sub && <div className="text-[10px] dim">{sub}</div>}
    </div>
  );
}
