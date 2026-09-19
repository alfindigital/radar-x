// Small display widgets: ScoreNumber, ScoreMarker, ScoreBreakdown, CaseRow, Stat.

import Link from "next/link";
import type { CaseRecord, PositioningScore } from "@/lib/types";
import { fmtIDR, fmtPct, PATTERN_LABEL, patternTagClass, scoreColor } from "./fmt";

export function ScoreNumber({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "text-3xl" : size === "sm" ? "text-sm" : "text-base";
  return (
    <span className={`mono font-bold tabular-nums ${sz} ${scoreColor(score)}`}>
      {score > 0 ? "+" : ""}
      {score}
    </span>
  );
}

export function ScoreMarker({ score }: { score: number }) {
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

const COMPONENT_META: { key: keyof PositioningScore["components"]; label: string; weight: number; hint: string }[] = [
  { key: "insiderZ", label: "Insider net 90h", weight: 0.3, hint: "Transaksi insider bersih (Rp), cluster ditimbang lebih berat" },
  { key: "foreignTrend", label: "Flow asing 90h", weight: 0.25, hint: "Net inflow kumulatif dinormalisasi market cap" },
  { key: "instNetZ", label: "Kohort institusi 14h", weight: 0.2, hint: "Net buy broker institusi/asing 2 minggu" },
  { key: "retailExodusZ", label: "Eksodus ritel", weight: 0.15, hint: "Perubahan jumlah pemegang saham bulanan" },
  { key: "fclassShift", label: "Shift kelas asing", weight: 0.1, hint: "Δ institusi asing vs individu asing bulanan" },
];

export function ScoreBreakdown({ score }: { score: PositioningScore }) {
  return (
    <div className="space-y-3">
      {COMPONENT_META.map((m) => {
        const z = score.components[m.key];
        const pos = z >= 0;
        const pct = Math.min(100, (Math.abs(z) / 3) * 100);
        return (
          <div key={m.key} title={`${m.hint} — bobot ${(m.weight * 100).toFixed(0)}%`}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="dim">
                {m.label} <span className="faint">{(m.weight * 100).toFixed(0)}%</span>
              </span>
              <span className={`mono ${pos ? "acc" : "dist"}`}>
                {pos ? "+" : ""}
                {z.toFixed(2)}σ
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
      <p className="pt-1 text-[10px] faint">σ = z-score vs seluruh emiten terpantau. Di-clip ±3σ.</p>
    </div>
  );
}

export function CaseRow({ c }: { c: CaseRecord }) {
  const names = [...new Set(c.evidence.insiderTrades.map((t) => t.holderName))];
  const val = c.evidence.insiderTrades.reduce((s, t) => s + t.value, 0);
  const dir = c.outcome.fwd30dPct !== null && c.outcome.fwd30dPct < 0 ? "dist" : "acc";
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
        <p className="mt-0.5 truncate text-xs dim">{c.narrative}</p>
        <p className="mt-0.5 text-[11px] faint">
          {names.slice(0, 2).join(", ")}
          {names.length > 2 ? ` +${names.length - 2}` : ""} · Rp{fmtIDR(val)}
        </p>
      </div>
      <div className="flex items-center gap-4 text-right">
        <div className={`mono text-xs ${dir}`}>30h {fmtPct(c.outcome.fwd30dPct)}</div>
        <ScoreNumber score={c.score} />
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
