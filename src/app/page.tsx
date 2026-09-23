// RADAR Board — ranked positioning scores + sparklines + insider feed + cases.

import Link from "next/link";
import { getRadarBoard } from "@/lib/services";
import { CaseRow, ScoreMarker, ScoreNumber } from "@/components/widgets";
import Sparkline from "@/components/Sparkline";
import { fmtIDR } from "@/components/fmt";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "semua", label: "Semua" },
  { key: "akumulasi", label: "Akumulasi" },
  { key: "distribusi", label: "Distribusi" },
];

export default async function BoardPage({ searchParams }: PageProps<"/">) {
  const { f } = await searchParams;
  const filter = typeof f === "string" ? f : "semua";
  const { week, scores, sparks, recentInsider, topCases, universe } = await getRadarBoard();

  const shown =
    filter === "akumulasi" ? scores.filter((s) => s.score >= 25)
    : filter === "distribusi" ? scores.filter((s) => s.score <= -25)
    : scores;

  const nAcc = scores.filter((s) => s.score >= 25).length;
  const nDist = scores.filter((s) => s.score <= -25).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Radar Board</h1>
          <p className="mt-1 text-xs dim">
            Peta posisi smart money — {scores.length} emiten dengan aktivitas insider terpantau dari{" "}
            {universe} emiten IDX · minggu <span className="mono">{week ?? "—"}</span>
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="tag">EOD {week ?? "—"}</span>
          <span className="dim">
            <span className="acc">▲</span> {nAcc} akumulasi
          </span>
          <span className="dim">
            <span className="dist">▼</span> {nDist} distribusi
          </span>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_300px]">
        <section>
          <div className="mb-3 flex items-center gap-1">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={t.key === "semua" ? "/" : `/?f=${t.key}`}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  filter === t.key ? "bg-panel-2 text-ink" : "faint hover:text-ink"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider faint">
                  <th className="py-2 pr-4 font-medium">#</th>
                  <th className="py-2 pr-4 font-medium">Emiten</th>
                  <th className="py-2 pr-4 font-medium">Net flow asing 30h</th>
                  <th className="hidden py-2 pr-4 font-medium text-right md:table-cell">Insider</th>
                  <th className="hidden py-2 pr-4 font-medium text-right lg:table-cell">Institusi</th>
                  <th className="py-2 pr-4 font-medium text-right">Skor</th>
                  <th className="hidden py-2 font-medium sm:table-cell"></th>
                </tr>
              </thead>
              <tbody className="mono text-xs">
                {shown.map((s, i) => (
                  <tr key={s.symbol} className="row-hover border-b border-line/60">
                    <td className="py-3 pr-4 faint">{i + 1}</td>
                    <td className="py-3 pr-4">
                      <Link href={`/saham/${s.symbol.replace(".JK", "")}`} className="font-bold text-sm">
                        {s.symbol.replace(".JK", "")}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">
                      <Sparkline values={sparks[s.symbol] ?? []} cumulative />
                    </td>
                    <td className={`hidden py-3 pr-4 text-right md:table-cell ${s.components.insiderZ >= 0 ? "acc" : "dist"}`}>
                      {s.components.insiderZ >= 0 ? "+" : ""}
                      {s.components.insiderZ.toFixed(1)}σ
                    </td>
                    <td className={`hidden py-3 pr-4 text-right lg:table-cell ${s.components.instNetZ >= 0 ? "acc" : "dist"}`}>
                      {s.components.instNetZ >= 0 ? "+" : ""}
                      {s.components.instNetZ.toFixed(1)}σ
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
                      Skor belum dihitung. Jalankan <code className="mono">npx tsx scripts/compute.ts</code>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-8">
          <section>
            <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-widest faint">Feed insider</h2>
            <div>
              {recentInsider.map((t, i) => (
                <div key={i} className="row-hover flex items-center justify-between gap-3 border-b border-line/60 py-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/saham/${t.symbol.replace(".JK", "")}`} className="mono text-xs font-bold">
                        {t.symbol.replace(".JK", "")}
                      </Link>
                      <span className={`tag ${t.txnType === "buy" ? "tag-acc" : t.txnType === "sell" ? "tag-dist" : ""}`}>
                        {t.txnType}
                      </span>
                    </div>
                    <Link
                      href={`/orang/${encodeURIComponent(t.holderName)}`}
                      className="mt-0.5 block truncate text-[11px] dim"
                    >
                      {t.holderName}
                    </Link>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="mono text-[11px]">Rp{fmtIDR(t.value)}</div>
                    <div className="faint text-[10px]">{t.txnDate}</div>
                  </div>
                </div>
              ))}
              {!recentInsider.length && <p className="dim text-xs">Belum ada data insider.</p>}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[10px] font-semibold uppercase tracking-widest faint">Kasus teratas</h2>
              <Link href="/kasus" className="text-[11px] blue">
                Semua →
              </Link>
            </div>
            <div>
              {topCases.slice(0, 4).map((c) => (
                <CaseRow key={c.id} c={c} />
              ))}
              {!topCases.length && <p className="dim text-xs">Belum ada kasus terdeteksi.</p>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
