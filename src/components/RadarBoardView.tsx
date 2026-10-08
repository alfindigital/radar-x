// v2 Radar Board — preserved behind ?v=radar. Extracted verbatim from the
// original page.tsx so both views can share the route.

import Link from "next/link";
import { getRadarBoard } from "@/lib/services";
import { CaseRow, ScoreMarker, ScoreNumber } from "@/components/widgets";
import Sparkline from "@/components/Sparkline";
import { fmtCurrency } from "@/components/fmt";
import { selectBoard } from "@/lib/board";
import DataStatus from "@/components/DataStatus";

const TABS = [
  { key: "all", label: "All Cohorts" },
  { key: "positive", label: "Positive Disparity (Accumulation)" },
  { key: "negative", label: "Negative Disparity (Distribution)" },
];

// Legacy keys (?f=semua / ?f=akumulasi / ?f=distribusi) keep working for old links.
const FILTER_ALIASES: Record<string, string> = {
  semua: "all",
  akumulasi: "positive",
  distribusi: "negative",
};

export default async function RadarBoardView({ filter }: { filter: string }) {
  const { week, asOf, scores, sparks, recentInsider, topCases, universe } = await getRadarBoard();

  const resolved = FILTER_ALIASES[filter] ?? filter;
  const board = selectBoard(scores, resolved === "positive" ? "accumulation" : resolved === "negative" ? "distribution" : "all", 120);
  const shown = board.rows;
  const nAcc = board.accumulation;
  const nDist = board.distribution;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Radar Board</h1>
          <p className="mt-1.5 text-[13px] dim">
            Reported ownership activity · coverage {scores.length}/{universe} IDX issuers · as of <span className="mono">{week ?? "—"}</span>
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="tag">EOD {week ?? "—"}</span>
          <span className="dim">
            <span className="acc">▲</span> {nAcc} positive positioning
          </span>
          <span className="dim">
            <span className="dist">▼</span> {nDist} negative positioning
          </span>
        </div>
      </div>

      <DataStatus asOf={asOf} />

      <div className="grid gap-8 xl:grid-cols-[1fr_300px]">
        <section>
          <div className="tabbar mb-3">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={t.key === "all" ? "/?v=radar" : `/?v=radar&f=${t.key}`}
                aria-current={resolved === t.key ? "page" : undefined}
                className={`tab ${resolved === t.key ? "tab-active" : ""}`}
              >
                {t.label}
              </Link>
            ))}
          </div>

          <div className="table-sticky">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider faint">
                  <th className="py-2 pr-4 font-medium">#</th>
                  <th className="py-2 pr-4 font-medium">Issuer</th>
                  <th className="py-2 pr-4 font-medium">Foreign flow</th>
                  <th className="hidden py-2 pr-4 font-medium text-right md:table-cell">Reported ownership</th>
                  <th className="hidden py-2 pr-4 font-medium text-right lg:table-cell">Broker context</th>
                  <th className="py-2 pr-4 font-medium text-right">Index</th>
                  <th className="hidden py-2 font-medium sm:table-cell"></th>
                </tr>
              </thead>
              <tbody className="mono text-xs">
                {shown.map((s, i) => (
                  <tr key={s.symbol} className="row-hover border-b border-line/60">
                    <td className="py-3 pr-4 faint">{i + 1}</td>
                    <td className="tapcell py-3 pr-4">
                      <Link href={`/stock/${s.symbol.replace(".JK", "")}`} className="taplink font-bold text-sm">
                        {s.symbol.replace(".JK", "")}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">
                      <Sparkline values={sparks[s.symbol] ?? []} cumulative />
                    </td>
                    <td className={`hidden py-3 pr-4 text-right md:table-cell ${(s.components.insiderZ.z ?? 0) >= 0 ? "acc" : "dist"}`}>
                      {s.components.insiderZ.z === null ? "—" : `${s.components.insiderZ.z >= 0 ? "+" : ""}${s.components.insiderZ.z.toFixed(1)}σ`}
                    </td>
                    <td className={`hidden py-3 pr-4 text-right lg:table-cell ${(s.components.instNetZ.z ?? 0) >= 0 ? "acc" : "dist"}`}>
                      {s.components.instNetZ.z === null ? "—" : `${s.components.instNetZ.z >= 0 ? "+" : ""}${s.components.instNetZ.z.toFixed(1)}σ`}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <ScoreNumber score={s.score} />
                    </td>
                    <td className="hidden py-3 sm:table-cell">
                      <ScoreMarker score={s.score} />
                    </td>
                  </tr>
                ))}
                {!shown.length && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center dim">
                      No candidates match this filter in the saved snapshot.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

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
      </div>
    </div>
  );
}
