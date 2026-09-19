// Case detail — evidence + measured outcome + provenance.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getCase, getIssuerDossier } from "@/lib/services";
import TimelineChart from "@/components/TimelineChart";
import { ScoreBadge, Stat } from "@/components/widgets";
import { fmtIDR, fmtPct, fmtShares, PATTERN_LABEL, patternTagClass } from "@/components/fmt";

export const dynamic = "force-dynamic";

export default async function CasePage({ params }: PageProps<"/kasus/[id]">) {
  const { id } = await params;
  const c = await getCase(id);
  if (!c) notFound();

  const d = await getIssuerDossier(c.symbol);
  const names = [...new Set(c.evidence.insiderTrades.map((t) => t.holderName))];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`tag ${patternTagClass(c.pattern)}`}>{PATTERN_LABEL[c.pattern] ?? c.pattern}</span>
          <Link href={`/saham/${c.symbol.replace(".JK", "")}`} className="mono text-xl font-bold">
            {c.symbol.replace(".JK", "")}
          </Link>
          <ScoreBadge score={c.score} />
        </div>
        <p className="mt-1 text-xs dim">
          Jangkar {c.anchorDate} · window {c.windowStart} → {c.windowEnd}
        </p>
      </div>

      <section className="panel p-4">
        <p className="text-sm leading-relaxed">{c.narrative}</p>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Return 7 hari" value={fmtPct(c.outcome.fwd7dPct)} />
        <Stat
          label="Return 30 hari"
          value={fmtPct(c.outcome.fwd30dPct)}
          sub={c.outcome.benchmarkFwd30dPct !== null ? `IHSG ${fmtPct(c.outcome.benchmarkFwd30dPct)}` : undefined}
        />
        <Stat label="Return 60 hari" value={fmtPct(c.outcome.fwd60dPct)} />
        <Stat
          label="Flow abnormal (z)"
          value={`${c.evidence.abnormalFlowZ >= 0 ? "+" : ""}${c.evidence.abnormalFlowZ.toFixed(1)}σ`}
          sub={`volume ${c.evidence.abnormalVolumeZ >= 0 ? "+" : ""}${c.evidence.abnormalVolumeZ.toFixed(1)}σ · pre-drift ${fmtPct(c.evidence.preDriftPct)}`}
        />
      </div>

      <section className="panel p-4">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider dim">Timeline</h2>
        <TimelineChart price={d.price} flow={d.flow} insider={d.insider} anchorDate={c.anchorDate} />
      </section>

      <section className="panel p-4">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider dim">Transaksi insider dalam pola ini</h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider faint">
              <th className="py-2 pr-3 font-medium">Tanggal</th>
              <th className="py-2 pr-3 font-medium">Nama</th>
              <th className="py-2 pr-3 font-medium">Tipe</th>
              <th className="py-2 pr-3 font-medium text-right">Lembar</th>
              <th className="py-2 pr-3 font-medium text-right">Nilai</th>
              <th className="py-2 font-medium text-right">% sblm → ssdh</th>
            </tr>
          </thead>
          <tbody className="mono">
            {c.evidence.insiderTrades.map((t, i) => (
              <tr key={i} className="border-b border-line/40">
                <td className="py-1.5 pr-3 faint">{t.txnDate}</td>
                <td className="max-w-[240px] truncate py-1.5 pr-3">
                  <Link href={`/orang/${encodeURIComponent(t.holderName)}`}>{t.holderName}</Link>
                </td>
                <td className={`py-1.5 pr-3 ${t.txnType === "buy" ? "acc" : "dist"}`}>{t.txnType.toUpperCase()}</td>
                <td className="py-1.5 pr-3 text-right">{fmtShares(t.amount)}</td>
                <td className="py-1.5 pr-3 text-right">Rp{fmtIDR(t.value)}</td>
                <td className="py-1.5 text-right faint">
                  {t.pctBefore !== null && t.pctAfter !== null ? `${t.pctBefore}% → ${t.pctAfter}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[10px] faint">
          Pihak terlibat: {names.join(", ")}. Sumber: disclosure IDX via Sectors API.
        </p>
      </section>
    </div>
  );
}
