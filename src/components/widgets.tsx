// Small display widgets: ScoreBadge, ComponentBar, ScoreBreakdown, CaseCard, Stat.

import Link from "next/link";
import type { CaseRecord, PositioningScore } from "@/lib/types";
import { fmtIDR, fmtPct, PATTERN_LABEL, patternTagClass, scoreColor } from "./fmt";

export function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const cls = scoreColor(score);
  const sz = size === "lg" ? "text-2xl px-3 py-1.5" : size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1";
  return (
    <span className={`mono inline-block rounded border font-bold ${sz} ${cls}`} style={{ borderColor: "currentColor" }}>
      {score > 0 ? "+" : ""}
      {score}
    </span>
  );
}

const COMPONENT_META: { key: keyof PositioningScore["components"]; label: string; weight: number; hint: string }[] = [
  { key: "insiderZ", label: "Insider net 90h", weight: 0.3, hint: "Transaksi insider bersih (Rp), cluster ditimbang lebih berat" },
  { key: "foreignTrend", label: "Flow asing 90h", weight: 0.25, hint: "Net inflow kumulatif dinormalisasi market cap" },
  { key: "instNetZ", label: "Kohort institusi 14h", weight: 0.2, hint: "Net buy broker institusi/asing 2 minggu" },
  { key: "retailExodusZ", label: "Eksodus ritel", weight: 0.15, hint: "Perubahan jumlah pemegang saham bulanan" },
  { key: "fclassShift", label: "Shift kelas asing", weight: 0.1, hint: "Δ institusi asing vs individu asing bulanan" },
];

export function ScoreBreakdown({ score }: { score: PositioningScore }) {
  return (
    <div className="space-y-2">
      {COMPONENT_META.map((m) => {
        const z = score.components[m.key];
        const pct = Math.min(100, (Math.abs(z) / 3) * 100);
        const pos = z >= 0;
        return (
          <div key={m.key} title={`${m.hint} — bobot ${(m.weight * 100).toFixed(0)}%`}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="dim">
                {m.label} <span className="faint">({(m.weight * 100).toFixed(0)}%)</span>
              </span>
              <span className={`mono ${pos ? "acc" : "dist"}`}>
                {pos ? "+" : ""}
                {z.toFixed(2)}σ
              </span>
            </div>
            <div className="mt-0.5 h-1.5 rounded bg-[var(--panel-2)]">
              <div
                className={`h-full rounded ${pos ? "bg-[var(--acc)]" : "bg-[var(--dist)]"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      <p className="pt-1 text-[10px] faint">σ = z-score vs seluruh emiten terpantau minggu ini. Di-clip di ±3σ.</p>
    </div>
  );
}

export function CaseCard({ c }: { c: CaseRecord }) {
  const names = [...new Set(c.evidence.insiderTrades.map((t) => t.holderName))];
  const val = c.evidence.insiderTrades.reduce((s, t) => s + t.value, 0);
  return (
    <Link href={`/kasus/${encodeURIComponent(c.id)}`} className="panel table-row block p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`tag ${patternTagClass(c.pattern)}`}>{PATTERN_LABEL[c.pattern] ?? c.pattern}</span>
            <span className="mono text-sm font-bold">{c.symbol.replace(".JK", "")}</span>
            <span className="faint text-xs">{c.anchorDate}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-xs dim">{c.narrative}</p>
          <p className="mt-1 text-[11px] faint">
            {names.slice(0, 2).join(", ")}
            {names.length > 2 ? ` +${names.length - 2}` : ""} · Rp{fmtIDR(val)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <ScoreBadge score={c.score} />
          <div className={`mono mt-1 text-xs ${c.outcome.fwd30dPct !== null && c.outcome.fwd30dPct < 0 ? "dist" : "acc"}`}>
            30h {fmtPct(c.outcome.fwd30dPct)}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="panel-2 p-3">
      <div className="text-[10px] uppercase tracking-wider faint">{label}</div>
      <div className="mono mt-1 text-lg">{value}</div>
      {sub && <div className="text-[10px] dim">{sub}</div>}
    </div>
  );
}
