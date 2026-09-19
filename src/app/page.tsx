// RADAR Board — ranked positioning scores + fresh insider feed + top cases.

import Link from "next/link";
import { getRadarBoard } from "@/lib/services";
import { CaseCard, ScoreBadge } from "@/components/widgets";
import { fmtIDR } from "@/components/fmt";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const { week, scores, recentInsider, topCases, universe } = await getRadarBoard();

  const accumulating = scores.filter((s) => s.score >= 25);
  const distributing = scores.filter((s) => s.score <= -25);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold tracking-tight">RADAR Board</h1>
          <p className="text-xs dim">
            Peta posisi smart money — {scores.length} emiten dengan aktivitas insider terpantau dari {universe} emiten IDX.
            Minggu berjalan: <span className="mono">{week ?? "—"}</span>
          </p>
        </div>
        <div className="flex gap-4 text-xs dim">
          <span>
            <span className="acc">▲</span> {accumulating.length} akumulasi
          </span>
          <span>
            <span className="dist">▼</span> {distributing.length} distribusi
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider faint">
                <th className="px-4 py-2.5 font-medium">#</th>
                <th className="px-2 py-2.5 font-medium">Emiten</th>
                <th className="px-2 py-2.5 font-medium text-right">Skor</th>
                <th className="hidden px-2 py-2.5 font-medium text-right md:table-cell">Insider</th>
                <th className="hidden px-2 py-2.5 font-medium text-right md:table-cell">Flow asing</th>
                <th className="hidden px-4 py-2.5 font-medium text-right lg:table-cell">Institusi</th>
              </tr>
            </thead>
            <tbody className="mono text-xs">
              {scores.map((s, i) => (
                <tr key={s.symbol} className="table-row border-b border-line/50">
                  <td className="px-4 py-2.5 faint">{i + 1}</td>
                  <td className="px-2 py-2.5">
                    <Link href={`/saham/${s.symbol.replace(".JK", "")}`} className="font-bold">
                      {s.symbol.replace(".JK", "")}
                    </Link>
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <ScoreBadge score={s.score} size="sm" />
                  </td>
                  <td className={`hidden px-2 py-2.5 text-right md:table-cell ${s.components.insiderZ >= 0 ? "acc" : "dist"}`}>
                    {s.components.insiderZ >= 0 ? "+" : ""}
                    {s.components.insiderZ.toFixed(1)}σ
                  </td>
                  <td className={`hidden px-2 py-2.5 text-right md:table-cell ${s.components.foreignTrend >= 0 ? "acc" : "dist"}`}>
                    {s.components.foreignTrend >= 0 ? "+" : ""}
                    {s.components.foreignTrend.toFixed(1)}σ
                  </td>
                  <td className={`hidden px-4 py-2.5 text-right lg:table-cell ${s.components.instNetZ >= 0 ? "acc" : "dist"}`}>
                    {s.components.instNetZ >= 0 ? "+" : ""}
                    {s.components.instNetZ.toFixed(1)}σ
                  </td>
                </tr>
              ))}
              {!scores.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center dim">
                    Skor belum dihitung. Jalankan <code className="mono">npx tsx scripts/compute.ts</code> setelah ingest.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <aside className="space-y-6">
          <section className="panel p-4">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider dim">Feed insider terbaru</h2>
            <div className="space-y-2.5">
              {recentInsider.map((t, i) => (
                <div key={i} className="border-b border-line/40 pb-2.5 text-xs last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/saham/${t.symbol.replace(".JK", "")}`} className="mono font-bold">
                      {t.symbol.replace(".JK", "")}
                    </Link>
                    <span className={`tag ${t.txnType === "buy" ? "tag-acc" : t.txnType === "sell" ? "tag-dist" : ""}`}>
                      {t.txnType.toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate">
                    <Link href={`/orang/${encodeURIComponent(t.holderName)}`} className="dim">
                      {t.holderName}
                    </Link>
                  </div>
                  <div className="faint mt-0.5 flex justify-between">
                    <span>{t.txnDate}</span>
                    <span className="mono">Rp{fmtIDR(t.value)}</span>
                  </div>
                </div>
              ))}
              {!recentInsider.length && <p className="dim text-xs">Belum ada data insider.</p>}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="px-1 text-xs font-bold uppercase tracking-wider dim">Kasus teratas</h2>
            {topCases.slice(0, 4).map((c) => (
              <CaseCard key={c.id} c={c} />
            ))}
            {!topCases.length && <p className="dim px-1 text-xs">Belum ada kasus terdeteksi.</p>}
            {topCases.length > 0 && (
              <Link href="/kasus" className="block px-1 text-xs blue">
                Semua kasus →
              </Link>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
