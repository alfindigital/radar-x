// Foreign Flow Radar — seluruh emiten IDX dengan aktivitas investor asing,
// di-ranking berdasarkan net inflow kumulatif. Berbeda dengan Board (composite
// score insider-active), halaman ini murni pilar asing — coverage ~700 emiten.

import Link from "next/link";
import { getFlowRadar } from "@/lib/services";
import { fmtIDR } from "@/components/fmt";

export const dynamic = "force-dynamic";

function FlowTable({ title, rows, sign }: { title: string; rows: { symbol: string; days: number; cumNet: number; streak: number }[]; sign: "acc" | "dist" }) {
  return (
    <section>
      <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-widest faint">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider faint">
              <th className="py-2 pr-4 font-medium">#</th>
              <th className="py-2 pr-4 font-medium">Emiten</th>
              <th className="py-2 pr-4 font-medium text-right">Net flow</th>
              <th className="hidden py-2 pr-4 font-medium text-right sm:table-cell">Hari aktif</th>
              <th className="hidden py-2 font-medium text-right md:table-cell">Streak beli</th>
            </tr>
          </thead>
          <tbody className="mono text-xs">
            {rows.map((r, i) => (
              <tr key={r.symbol} className="row-hover border-b border-line/60">
                <td className="py-2.5 pr-4 faint">{i + 1}</td>
                <td className="py-2.5 pr-4">
                  <Link href={`/saham/${r.symbol.replace(".JK", "")}`} className="font-bold text-sm">
                    {r.symbol.replace(".JK", "")}
                  </Link>
                </td>
                <td className={`py-2.5 pr-4 text-right ${sign === "acc" ? "acc" : "dist"}`}>
                  {r.cumNet >= 0 ? "+" : "-"}Rp{fmtIDR(Math.abs(r.cumNet))}
                </td>
                <td className="hidden py-2.5 pr-4 text-right dim sm:table-cell">{r.days}</td>
                <td className="hidden py-2.5 text-right md:table-cell">
                  {r.streak >= 3 ? <span className="acc">{r.streak}×</span> : <span className="faint">{r.streak || "—"}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function AsingPage() {
  const { from, to, rows } = await getFlowRadar(14);
  const acc = rows.filter((r) => r.cumNet > 0).slice(0, 50);
  const dist = rows.filter((r) => r.cumNet < 0).sort((a, b) => a.cumNet - b.cumNet).slice(0, 50);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Foreign Flow Radar</h1>
        <p className="mt-1 text-xs dim">
          Net flow investor asing kumulatif — <span className="mono">{rows.length}</span> emiten dengan
          aktivitas asing, <span className="mono">{from ?? "—"}</span> → <span className="mono">{to ?? "—"}</span>.
          Atribusi berdasarkan origin investor, bukan broker.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <FlowTable title="Akumulasi asing terbesar" rows={acc} sign="acc" />
        <FlowTable title="Distribusi asing terbesar" rows={dist} sign="dist" />
      </div>

      <p className="text-[11px] leading-relaxed faint">
        Emiten tanpa partisipasi asing pada hari bursa tidak muncul. Statistik deskriptif atas data publik —
        bukan nasihat investasi.
      </p>
    </div>
  );
}
