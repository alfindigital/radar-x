// Case detail — evidence + measured outcome + provenance.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getCase, getIssuerDossier } from "@/lib/services";
import TimelineChart from "@/components/TimelineChart";
import { Stat } from "@/components/widgets";
import { fmtCurrency, fmtPct, fmtShares, PATTERN_LABEL, patternTagClass } from "@/components/fmt";
import { safeSourceUrl } from "@/lib/provenance";
import DataStatus from "@/components/DataStatus";

export const dynamic = "force-dynamic";

function outcomeDisplay(outcome: { status: "complete" | "pending" | "unavailable"; issuerPct: number | null }) {
  return outcome.status === "complete" ? fmtPct(outcome.issuerPct, 1, "complete") : fmtPct(null, 1, outcome.status);
}

export default async function CasePage({ params }: PageProps<"/cases/[id]">) {
  const { id } = await params;
  const c = await getCase(id);
  if (!c) notFound();

  const d = await getIssuerDossier(c.symbol);
  const names = c.holders;
  const outcome7 = c.outcomes.find((outcome) => outcome.horizonDays === 7)!;
  const outcome30 = c.outcomes.find((outcome) => outcome.horizonDays === 30)!;
  const outcome60 = c.outcomes.find((outcome) => outcome.horizonDays === 60)!;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`tag ${patternTagClass(c.pattern)}`}>{PATTERN_LABEL[c.pattern] ?? c.pattern}</span>
          <Link href={`/stock/${c.symbol.replace(".JK", "")}`} className="mono text-2xl font-bold">
            {c.symbol.replace(".JK", "")}
          </Link>
        </div>
        <p className="mt-1 text-xs dim">
          Anchor {c.anchorDate} · bounded window {c.windowStart} → {c.windowEnd}
        </p>
      </div>

      <section className="border-l-2 border-line pl-4">
        <p className="text-sm leading-relaxed dim">Candidate pattern from reported transactions; retrospective outcomes are measured separately and do not establish intent.</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Stat label="7-day return" value={outcomeDisplay(outcome7)} />
        <Stat
          label="30-day return"
          value={outcomeDisplay(outcome30)}
          sub={outcome30.status === "complete" && outcome30.benchmarkPct !== null ? `IHSG ${fmtPct(outcome30.benchmarkPct, 1, "complete")}` : undefined}
        />
        <Stat label="60-day return" value={outcomeDisplay(outcome60)} />
        <Stat
          label="Abnormal flow (z)"
          value={c.abnormalFlowZ !== null ? `${c.abnormalFlowZ >= 0 ? "+" : ""}${c.abnormalFlowZ.toFixed(1)}σ` : "Unavailable"}
          sub={`volume ${c.abnormalVolumeZ !== null ? `${c.abnormalVolumeZ >= 0 ? "+" : ""}${c.abnormalVolumeZ.toFixed(1)}σ` : "unavailable"} · pre-drift ${fmtPct(c.preDriftPct, 1, "complete")}`}
        />
      </div>

      <DataStatus asOf={d.asOf} />

      <section className="panel p-4">
        <h2 className="section-label mb-3">Timeline</h2>
        <TimelineChart price={d.price} flow={d.flow} insider={d.insider} anchorDate={c.anchorDate} />
      </section>

      <section>
        <h2 className="section-label mb-3">Reported ownership transactions in this pattern</h2>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-xs">
          <thead>
            <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider faint">
              <th className="py-2 pr-3 font-medium">Transaction date</th>
              <th className="py-2 pr-3 font-medium">Holder</th>
              <th className="py-2 pr-3 font-medium">Type</th>
              <th className="py-2 pr-3 font-medium text-right">Shares</th>
              <th className="py-2 pr-3 font-medium text-right">Value</th>
              <th className="py-2 pr-3 font-medium text-right">Ownership before → after</th>
              <th className="py-2 font-medium text-right">Source</th>
            </tr>
          </thead>
          <tbody className="mono">
            {c.insiderTrades.map((t, i) => (
              <tr key={i} className="border-b border-line/40">
                <td className="py-1.5 pr-3 faint">{t.txnDate}</td>
                <td className="max-w-[240px] truncate py-1.5 pr-3">
                  <Link href={`/person/${encodeURIComponent(t.holderName)}`}>{t.holderName}</Link>
                </td>
                <td className={`py-1.5 pr-3 ${t.txnType === "buy" ? "acc" : "dist"}`}>{t.txnType.toUpperCase()}</td>
                <td className="py-1.5 pr-3 text-right">{fmtShares(t.amount)}</td>
                <td className="py-1.5 pr-3 text-right">{fmtCurrency(t.value)}</td>
                <td className="py-1.5 text-right faint">
                  {t.pctBefore !== null && t.pctAfter !== null ? `${t.pctBefore}% → ${t.pctAfter}%` : "—"}
                </td>
                <td className="py-1.5 text-right">
                  {(() => { const url = safeSourceUrl(t.sourceUrl); return url ? <a href={url} target="_blank" rel="noreferrer" className="blue">Open</a> : <span className="faint">Unavailable</span>; })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[10px] faint">
          Involved holders: {names.join(", ")}. Source: IDX disclosure data via Sectors.
        </p>
        </div>
      </section>
    </div>
  );
}
