// Dashboard aside — recent reported-ownership disclosures and the top
// candidate patterns give the landing a live edge.

import Link from "next/link";
import type { DerivedCase } from "@/lib/derive";
import type { InsiderTrade } from "@/lib/types";
import { CaseRow } from "@/components/widgets";
import { fmtCurrency } from "@/components/fmt";

export function BoardAside({ recentInsider, topCases }: { recentInsider: InsiderTrade[]; topCases: DerivedCase[] }) {
  return (
    <aside className="space-y-8">
      <section>
        <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-widest faint">Recent disclosures</h2>
        <div>
          {recentInsider.map((t, i) => (
            <div key={i} className="row-hover flex items-center justify-between gap-3 border-b border-line/60 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/stock/${t.symbol.replace(".JK", "")}`} className="taplink mono text-xs font-bold">
                    {t.symbol.replace(".JK", "")}
                  </Link>
                  <span className={`tag ${t.txnType === "buy" ? "tag-acc" : t.txnType === "sell" ? "tag-dist" : ""}`}>
                    {t.txnType}
                  </span>
                </div>
                <Link
                  href={`/person/${encodeURIComponent(t.holderName)}`}
                  className="mt-0.5 block truncate text-[11px] dim"
                >
                  {t.holderName}
                </Link>
              </div>
              <div className="shrink-0 text-right">
                <div className="mono text-[11px]">{fmtCurrency(t.value)}</div>
                <div className="faint text-[10px]">{t.txnDate}</div>
              </div>
            </div>
          ))}
          {!recentInsider.length && <p className="dim text-xs">No recent reported ownership data.</p>}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest faint">Candidate patterns</h2>
          <Link href="/cases" className="text-[11px] blue">
            All →
          </Link>
        </div>
        <div>
          {topCases.slice(0, 4).map((c) => (
            <CaseRow key={c.id} c={c} />
          ))}
          {!topCases.length && <p className="dim text-xs">No candidate patterns detected.</p>}
        </div>
      </section>
    </aside>
  );
}
