// Issuer Dossier — hero timeline + score breakdown + holders composition + cases.

import { getIssuerDossier } from "@/lib/services";
import Link from "next/link";
import TimelineChart from "@/components/TimelineChart";
import TradesTable from "@/components/TradesTable";
import { CaseRow, ScoreBreakdown, ScoreMarker, ScoreNumber, Stat } from "@/components/widgets";
import { fmtCurrency, fmtNum, fmtShares } from "@/components/fmt";
import { ExitPressureBadge } from "@/components/ExitPressureBadge";
import { FlagChips } from "@/components/FlagChips";
import { CohortNetChart } from "@/components/CohortNetChart";
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
  const maxN = Math.max(...sorted.map((h) => Math.abs(h.changeInShareholders ?? 0)), 1);

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
        {/* Zero-axis bars: pixel heights scale with |Δ|, zero sits on the axis. */}
        <div className="relative flex h-10 gap-1">
          <div className="absolute inset-x-0 top-1/2 h-px bg-line-2" aria-hidden />
          {sorted.map((h) => {
            const v = h.changeInShareholders;
            const px = Math.round((Math.abs(v ?? 0) / maxN) * 18); // ≤18px either side of the axis
            return (
              <div
                key={h.month}
                className="relative flex-1"
                title={`${h.month}: ${v === null ? "not reported" : fmtNum(v)}`}
              >
                {v !== null && v !== 0 && (
                  <div
                    className="absolute left-0 right-0"
                    style={{
                      height: Math.max(2, px),
                      backgroundColor:
                        v < 0
                          ? "color-mix(in srgb, var(--acc) 70%, transparent)"
                          : "color-mix(in srgb, var(--dist) 70%, transparent)",
                      ...(v < 0 ? { bottom: "50%" } : { top: "50%" }),
                    }}
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

function OwnershipSection({ o, covered, knownHolders }: { o: IssuerOwnership; covered: boolean; knownHolders: Set<string> }) {
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
    <div className="space-y-4">
      {(o.groups.length > 0 || o.whales.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {o.groups.map((g) => (
            <span key={g} className="tag blue">
              {g}
            </span>
          ))}
          {o.whales.map((w) =>
            knownHolders.has(w) ? (
              <Link key={w} href={`/person/${encodeURIComponent(w)}`} className="tag hover:border-line">
                {w}
              </Link>
            ) : (
              <span key={w} className="tag tip-c" data-tip="Reported holder · no ownership-transaction dossier in the snapshot">
                {w}
              </span>
            ),
          )}
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
                        <Link href={`/stock/${h.holderSymbol.replace(".JK", "")}`} className="blue hover:underline">
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
                      <span className="mono acc shrink-0">+{fmtShares(Math.abs(t.changeAmount))}</span>
                    </div>
                  ))}
                  {buyers.length === 0 && <p className="dim text-xs">—</p>}
                </div>
                <div>
                  {sellers.map((t) => (
                    <div key={`s-${t.name}`} className="flex items-baseline justify-between gap-2 py-0.5 text-xs">
                      <span className="truncate">{t.name}</span>
                      <span className="mono dist shrink-0">−{fmtShares(Math.abs(t.changeAmount))}</span>
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

export default async function DossierPage({ params }: PageProps<"/stock/[ticker]">) {
  const { ticker } = await params;
  const d = await getIssuerDossier(ticker);

  const ws = d.windowStats;
  const lastPrice = d.price.at(-1);

  return (
    <div className="space-y-4">
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
                {ws.priceChangePct !== null && (
                  <span className={ws.priceChangePct >= 0 ? "acc" : "dist"}>
                    {ws.priceChangePct >= 0 ? "+" : ""}
                    {ws.priceChangePct.toFixed(1)}%
                  </span>
                )}{" "}
                {ws.priceFrom ?? "—"}→{ws.priceTo} · {ws.priceObs} obs
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
        <Stat
          label={`Insider buys (${ws.days}d)`}
          value={ws.insiderBuys === null ? "None reported" : fmtCurrency(ws.insiderBuys)}
          sub={`${ws.from}→${ws.to}`}
        />
        <Stat
          label={`Insider sells (${ws.days}d)`}
          value={ws.insiderSells === null ? "None reported" : fmtCurrency(ws.insiderSells)}
          sub={`${ws.from}→${ws.to}`}
        />
        <Stat
          label={`Net foreign flow (${ws.days}d)`}
          value={ws.foreignNet === null ? "—" : fmtCurrency(ws.foreignNet)}
          sub={
            ws.foreignNet === null
              ? "no flow observations in window"
              : ws.foreignNet > 0
                ? `net foreign buyer · ${ws.foreignObs} obs`
                : ws.foreignNet < 0
                  ? `net foreign seller · ${ws.foreignObs} obs`
                  : `flat · ${ws.foreignObs} obs`
          }
        />
        {(() => {
          const latestHolders = d.holders.at(-1);
          // Fall back to the most recent month that actually reported a count,
          // so the reader sees the figure AND its age — never a silent zero.
          const lastReported = [...d.holders].reverse().find((h) => h.nShareholders != null);
          return (
            <Stat
              label="Reported shareholders"
              value={lastReported ? fmtNum(lastReported.nShareholders as number) : "—"}
              sub={
                lastReported
                  ? lastReported === latestHolders
                    ? lastReported.changeInShareholders != null
                      ? `Δ ${fmtNum(lastReported.changeInShareholders)} last month`
                      : "Δ not reported"
                    : `as of ${lastReported.month} — stale`
                  : latestHolders
                    ? "not reported"
                    : undefined
              }
            />
          );
        })()}
        <Stat
          label="Free float"
          value={d.freeFloat == null ? "—" : `${(d.freeFloat * 100).toFixed(1)}%`}
          sub={d.freeFloat != null && d.freeFloat < 0.25 ? "low float, thin public liquidity" : undefined}
        />
      </div>

      {d.exit && (
        <section className="panel space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="section-label">Exit Watch</h2>
              <div className="mt-2 flex items-center gap-3">
                <ExitPressureBadge score={d.exit.score} coverage={d.exit.coverage} />
                <span className="faint text-[11px]">
                  {d.exit.window.days}-day window {d.exit.window.from ?? "—"} → {d.exit.window.to} · coverage {d.exit.coverage.toFixed(2)}
                </span>
              </div>
            </div>
            <FlagChips flags={d.exit.flags} />
          </div>

          <div>
            <h3 className="section-label mb-1">
              Cohort net flow ({d.exit.series.length} sessions)
            </h3>
            <CohortNetChart days={d.exit.series} />
          </div>

          <div>
            <h3 className="section-label mb-2">Components</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {d.exit.components.map((c) => (
                <div key={c.key} className="rounded-md border border-line p-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] uppercase tracking-wider faint">{c.key}</span>
                    <span className="mono text-[11px]">
                      {c.status === "available" && c.raw !== null ? `${c.raw > 0 ? "+" : ""}${c.raw.toFixed(3)}% cap` : "—"}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] dim">
                    {c.status === "available"
                      ? `z ${c.z !== null && c.z >= 0 ? "+" : ""}${c.z?.toFixed(2)} · ${c.observations} obs`
                      : (c.reason ?? "No usable evidence")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(d.suspensions.length > 0 || d.corpActions.length > 0) && (
            <div className="border-t border-line pt-3">
              <h3 className="section-label mb-2">Context</h3>
              <ul className="space-y-1 text-xs dim">
                {d.suspensions.slice(0, 3).map((s, i) => (
                  <li key={`s${i}`}>
                    <span className="tag tag-watch">SUSP</span> <span className="mono">{s.suspension_date}</span>{" "}
                    {s.reason ?? "suspension"}{" "}
                    {s.pdf_url && (
                      <a href={s.pdf_url} target="_blank" rel="noreferrer" className="blue text-[10px]">
                        source ↗
                      </a>
                    )}
                  </li>
                ))}
                {d.corpActions.slice(0, 5).map((c, i) => (
                  <li key={`c${i}`}>
                    <span className="tag">{c.type.replace(/_/g, " ").toUpperCase()}</span>{" "}
                    <span className="mono">{c.date ?? "date TBD"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

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
        <OwnershipSection o={d.ownership} covered={d.ownershipCovered} knownHolders={d.knownHolderNames} />
      </section>

      <section>
        <h2 className="section-label mb-3">Reported ownership transactions</h2>
        <TradesTable trades={d.insider} limit={30} />
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
