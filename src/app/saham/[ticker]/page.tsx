// Issuer Dossier — hero timeline + score breakdown + holders composition + cases.

import { getIssuerDossier } from "@/lib/services";
import TimelineChart from "@/components/TimelineChart";
import TradesTable from "@/components/TradesTable";
import { CaseRow, ScoreBreakdown, ScoreMarker, ScoreNumber, Stat } from "@/components/widgets";
import { fmtIDR, fmtNum, fmtShares } from "@/components/fmt";
import type { HoldersMonthly } from "@/lib/types";

export const dynamic = "force-dynamic";

function HoldersChart({ holders }: { holders: HoldersMonthly[] }) {
  if (holders.length < 2) {
    return <p className="dim py-6 text-center text-xs">Data komposisi bulanan belum cukup.</p>;
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
          <span>kepemilikan institusi asing (rdana + lemb.keu)</span>
          <span className="blue">per bulan</span>
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
              title={`${h.month}: ${fmtShares(inst(h))} lembar`}
            />
          ))}
        </div>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-[10px] faint">
          <span>kepemilikan individu (lokal + asing)</span>
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
              title={`${h.month}: ${fmtShares(indiv(h))} lembar`}
            />
          ))}
        </div>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-[10px] faint">
          <span>Δ jumlah pemegang saham (ritel kabur/masuk)</span>
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
          <span>hijau = ritel berkurang · merah = ritel bertambah</span>
          <span>{sorted.at(-1)!.month.slice(0, 7)}</span>
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
            {d.ticker?.name !== d.ticker?.symbol ? d.ticker?.name : ""} {d.lazy && <span className="tag">live fetch</span>}
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
                90h · {lastPrice.date}
              </div>
            </>
          )}
        </div>
      </div>

      <section className="panel p-4">
        <TimelineChart price={d.price} flow={d.flow} insider={d.insider} />
      </section>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Stat label="Insider beli 90h" value={`Rp${fmtIDR(buyVal)}`} />
        <Stat label="Insider jual 90h" value={`Rp${fmtIDR(sellVal)}`} />
        <Stat
          label="Net flow asing 90h"
          value={`Rp${fmtIDR(netFlow)}`}
          sub={netFlow >= 0 ? "asing net buyer" : "asing net seller"}
        />
        <Stat
          label="Jumlah pemegang saham"
          value={d.holders.length ? fmtNum(d.holders.at(-1)!.nShareholders) : "—"}
          sub={d.holders.length ? `Δ ${fmtNum(d.holders.at(-1)!.changeInShareholders)} bln lalu` : undefined}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="section-label mb-4">Kenapa skornya segini</h2>
          {d.score ? <ScoreBreakdown score={d.score} /> : <p className="dim py-4 text-xs">Skor belum dihitung untuk emiten ini.</p>}
        </section>
        <section>
          <h2 className="section-label mb-4">Komposisi pemilik (bulanan)</h2>
          <HoldersChart holders={d.holders} />
        </section>
      </div>

      <section>
        <h2 className="section-label mb-3">Transaksi insider tercatat</h2>
        <TradesTable trades={insider90} limit={30} />
      </section>

      {d.cases.length > 0 && (
        <section>
          <h2 className="section-label mb-2">Kasus terdeteksi di emiten ini</h2>
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
