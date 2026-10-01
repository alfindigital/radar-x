// Issuer Dossier — hero timeline + score breakdown + holders composition + cases.

import { getIssuerDossier } from "@/lib/services";
import Link from "next/link";
import TimelineChart from "@/components/TimelineChart";
import TradesTable from "@/components/TradesTable";
import { CaseRow, ScoreBreakdown, ScoreMarker, ScoreNumber, Stat } from "@/components/widgets";
import { fmtCurrency, fmtNum, fmtShares } from "@/components/fmt";
import type { HoldersMonthly } from "@/lib/types";
import type { IssuerOwnership } from "@/lib/ownership";
import DataStatus from "@/components/DataStatus";

export const dynamic = "force-dynamic";

function HoldersChart({ holders }: { holders: HoldersMonthly[] }) {
  if (holders.length < 2) {
    return <p className="dim py-6 text-center text-xs">Not enough monthly holder observations.</p>;
  }
  const sorted = [...holders].sort((a, b) => a.month.localeCompare(b.month));
  const inst = (h: HoldersMonthly) =>
    (h.foreign["mutual_fund_f"] ?? 0) + (h.foreign["financial_institutions_f"] ?? 0);
  const indiv = (h: HoldersMonthly) => (h.local["individual_l"] ?? 0) + (h.foreign["individual_f"] ?? 0);
  const maxInst = Math.max(...sorted.map(inst), 1);
  const maxInd = Math.max(...sorted.map(indiv), 1);
  const maxN = Math.max(...sorted.map((h) => Math.abs(h.changeInShareholders)), 1);

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex justify-between text-[10px] faint">
          <span>foreign institutional holders</span>
          <span className="blue">monthly</span>
        </div>
        <div className="flex h-16 items-end gap-1">
          {sorted.map((h) => (
            <div
              key={h.month}
              className="flex-1 rounded-t"
              style={{
                height: `${Math.max(3, (inst(h) / maxInst) * 100)}%`,
                backgroundColor: "color-mix(in srgb, var(--sky) 70%, transparent)",
              }}
              title={`${h.month}: ${fmtShares(inst(h))} shares`}
            />
          ))}
        </div>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-[10px] faint">
          <span>individual holders (local + foreign)</span>
        </div>
        <div className="flex h-12 items-end gap-1">
          {sorted.map((h) => (
            <div
              key={h.month}
              className="flex-1 rounded-t"
              style={{
                height: `${Math.max(3, (indiv(h) / maxInd) * 100)}%`,
                backgroundColor: "color-mix(in srgb, var(--watch) 60%, transparent)",
              }}
              title={`${h.month}: ${fmtShares(indiv(h))} shares`}
            />
          ))}
        </div>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-[10px] faint">
          <span>Δ reported shareholder count</span>
        </div>
        <div className="flex h-10 items-center gap-1">
          {sorted.map((h) => {
            const v = h.changeInShareholders;
            const hgt = Math.max(8, (Math.abs(v) / maxN) * 100);
            return (
              <div key={h.month} className="flex flex-1 flex-col items-center justify-center" title={`${h.month}: ${fmtNum(v)}`}>
                {v < 0 ? (
                  <div
                    className="w-full rounded-t"
                    style={{ height: `${hgt}%`, minHeight: 4, backgroundColor: "color-mix(in srgb, var(--acc) 70%, transparent)" }}
                  />
                ) : (
                  <div
                    className="w-full rounded-b"
                    style={{ height: `${hgt}%`, minHeight: 4, backgroundColor: "color-mix(in srgb, var(--dist) 70%, transparent)" }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex justify-between text-[9px] faint">
          <span>{sorted[0].month.slice(0, 7)}</span>
          <span>green = count down · red = count up</span>
          <span>{sorted.at(-1)!.month.slice(0, 7)}</span>
        </div>
      </div>
    </div>
  );
}

function OwnershipSection({ o, covered }: { o: IssuerOwnership; covered: boolean }) {
  if (!covered) {
    return (
      <p className="dim py-4 text-xs">
        This issuer is outside the current ownership-snapshot coverage; the rolling ingest fills coverage progressively.
      </p>
    );
  }
  const holders = [...o.holders].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));
  const flows = [...o.instFlow].sort((a, b) => a.month.localeCompare(b.month));
  const maxFlow = Math.max(...flows.map((f) => Math.abs(f.netTransaction)), 1);
  const latestTxnMonth = o.instTxn.reduce((m, t) => (t.month > m ? t.month : m), "");
  const latestTxns = o.instTxn.filter((t) => t.month === latestTxnMonth);
  const buyers = latestTxns.filter((t) => t.side === "buy").sort((a, b) => b.changeAmount - a.changeAmount);
  const sellers = latestTxns.filter((t) => t.side === "sell").sort((a, b) => b.changeAmount - a.changeAmount);

  return (
    <div className="space-y-6">
      {(o.groups.length > 0 || o.whales.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {o.groups.map((g) => (
            <span key={g} className="tag blue">
              {g}
            </span>
          ))}
          {o.whales.map((w) => (
            <Link key={w} href={`/orang/${encodeURIComponent(w)}`} className="tag hover:border-line">
              {w}
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-[10px] faint">major reported holders</p>
          {holders.length === 0 ? (
            <p className="dim py-3 text-xs">No named holders reported.</p>
          ) : (
            <table className="w-full text-xs">
              <tbody>
                {holders.map((h) => (
                  <tr key={h.name} className="border-b border-line/40 last:border-0">
                    <td className="py-1.5 pr-3">
                      {h.holderSymbol ? (
                        <Link href={`/saham/${h.holderSymbol.replace(".JK", "")}`} className="blue hover:underline">
                          {h.name}
                        </Link>
                      ) : (
                        h.name
                      )}
                    </td>
                    <td className="mono py-1.5 text-right">{h.pct == null ? "—" : `${h.pct.toFixed(2)}%`}</td>
                    <td className="mono dim py-1.5 pl-3 text-right">{h.value == null ? "" : fmtCurrency(h.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <p className="mb-2 flex justify-between text-[10px] faint">
            <span>institutional net transactions</span>
            <span className="blue">monthly</span>
          </p>
          {flows.length === 0 ? (
            <p className="dim py-3 text-xs">No institutional transaction flow reported.</p>
          ) : (
            <div className="space-y-1">
              <div className="flex h-16 items-center gap-1">
                {flows.map((f) => {
                  const hgt = Math.max(4, (Math.abs(f.netTransaction) / maxFlow) * 50);
                  const up = f.netTransaction >= 0;
                  return (
                    <div key={f.month} className="flex flex-1 flex-col items-center justify-center" title={`${f.month.slice(0, 7)}: ${fmtNum(f.netTransaction)} shares`}>
                      <div className={up ? "w-full rounded-t" : "w-full rounded-b"}
                        style={{
                          height: hgt,
                          backgroundColor: up
                            ? "color-mix(in srgb, var(--acc) 70%, transparent)"
                            : "color-mix(in srgb, var(--dist) 70%, transparent)",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[9px] faint">
                <span>{flows[0].month.slice(0, 7)}</span>
                <span>green = net institutional buy</span>
                <span>{flows.at(-1)!.month.slice(0, 7)}</span>
              </div>
            </div>
          )}

          {latestTxns.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[10px] faint">top institutional movers · {latestTxnMonth.slice(0, 7)}</p>
              <div className="grid gap-x-6 sm:grid-cols-2">
                <div>
                  {buyers.map((t) => (
                    <div key={`b-${t.name}`} className="flex items-baseline justify-between gap-2 py-0.5 text-xs">
                      <span className="truncate">{t.name}</span>
                      <span className="mono acc shrink-0">+{fmtShares(t.changeAmount)}</span>
                    </div>
                  ))}
                  {buyers.length === 0 && <p className="dim text-xs">—</p>}
                </div>
                <div>
                  {sellers.map((t) => (
                    <div key={`s-${t.name}`} className="flex items-baseline justify-between gap-2 py-0.5 text-xs">
                      <span className="truncate">{t.name}</span>
                      <span className="mono dist shrink-0">−{fmtShares(t.changeAmount)}</span>
                    </div>
                  ))}
                  {sellers.length === 0 && <p className="dim text-xs">—</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function DossierPage({ params }: PageProps<"/saham/[ticker]">) {
  const { ticker } = await params;
  const d = await getIssuerDossier(ticker);

  const insider90 = d.insider;
  const buyVal = insider90.filter((t) => t.txnType === "buy").reduce((s, t) => s + t.value, 0);
  const sellVal = insider90.filter((t) => t.txnType === "sell").reduce((s, t) => s + t.value, 0);
  const netFlow = d.flow.reduce((s, f) => s + f.netForeignInflow, 0);
  const lastPrice = d.price.at(-1);
  const firstPrice = d.price.at(0);
  const priceChg =
    lastPrice && firstPrice && firstPrice.close ? ((lastPrice.close - firstPrice.close) / firstPrice.close) * 100 : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="mono text-3xl font-bold tracking-tight">{d.ticker?.symbol.replace(".JK", "") ?? ticker.toUpperCase()}</h1>
            {d.score && (
              <div className="flex items-center gap-3 border-l border-line pl-4">
                <ScoreNumber score={d.score.score} size="lg" />
                <ScoreMarker score={d.score.score} />
              </div>
            )}
          </div>
          <p className="mt-1 text-xs dim">
            {d.ticker?.name !== d.ticker?.symbol ? d.ticker?.name : ""} <span className="tag">{d.status}</span>
          </p>
        </div>
        <div className="mono text-right text-xs dim">
          {lastPrice && (
            <>
              <div className="text-lg text-ink">{fmtNum(lastPrice.close)}</div>
              <div>
                {priceChg !== null && (
                  <span className={priceChg >= 0 ? "acc" : "dist"}>
                    {priceChg >= 0 ? "+" : ""}
                    {priceChg.toFixed(1)}%
                  </span>
                )}{" "}
                90d · {lastPrice.date}
              </div>
            </>
          )}
        </div>
      </div>

      <DataStatus asOf={d.asOf} detail={d.status === "known-uncovered" ? "The issuer is listed but has no disclosure-derived coverage." : undefined} />

      <section className="panel p-4">
        <TimelineChart price={d.price} flow={d.flow} insider={d.insider} />
      </section>

      <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-5">
        <Stat label="Insider buys (90d)" value={fmtCurrency(buyVal)} />
        <Stat label="Insider sells (90d)" value={fmtCurrency(sellVal)} />
        <Stat
          label="Net foreign flow (90d)"
          value={fmtCurrency(netFlow)}
          sub={netFlow >= 0 ? "net foreign buyer" : "net foreign seller"}
        />
        <Stat
          label="Reported shareholders"
          value={d.holders.length ? fmtNum(d.holders.at(-1)!.nShareholders) : "—"}
          sub={d.holders.length ? `Δ ${fmtNum(d.holders.at(-1)!.changeInShareholders)} last month` : undefined}
        />
        <Stat
          label="Free float"
          value={d.freeFloat == null ? "—" : `${(d.freeFloat * 100).toFixed(1)}%`}
          sub={d.freeFloat != null && d.freeFloat < 0.25 ? "low float — thin public liquidity" : undefined}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="section-label mb-4">Index evidence</h2>
          {d.score ? <ScoreBreakdown score={d.score} /> : <p className="dim py-4 text-xs">No disclosure-derived index is available for this issuer.</p>}
        </section>
        <section>
          <h2 className="section-label mb-4">Holder composition (monthly)</h2>
          <HoldersChart holders={d.holders} />
        </section>
      </div>

      <section>
        <h2 className="section-label mb-3">Reported ownership</h2>
        <OwnershipSection o={d.ownership} covered={d.ownershipCovered} />
      </section>

      <section>
        <h2 className="section-label mb-3">Reported ownership transactions</h2>
        <TradesTable trades={insider90} limit={30} />
      </section>

      {d.cases.length > 0 && (
        <section>
          <h2 className="section-label mb-2">Candidate patterns for this issuer</h2>
          <div>
            {d.cases.map((c) => (
              <CaseRow key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
