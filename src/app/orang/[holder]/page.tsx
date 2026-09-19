// Person Dossier — full insider history + descriptive batting average.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getPersonDossier } from "@/lib/services";
import TradesTable from "@/components/TradesTable";
import { Stat } from "@/components/widgets";
import { fmtIDR } from "@/components/fmt";

export const dynamic = "force-dynamic";

export default async function PersonPage({ params }: PageProps<"/orang/[holder]">) {
  const { holder } = await params;
  const d = await getPersonDossier(holder);
  if (!d) notFound();

  const s = d.stats;
  const sellAvg = s.sellMeasured ? Math.round((s.sellThenDown / s.sellMeasured) * 100) : null;
  const buyAvg = s.buyMeasured ? Math.round((s.buyThenUp / s.buyMeasured) * 100) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{d.holderName}</h1>
        <p className="mt-1 text-xs dim">
          {s.totalTrades} transaksi terdisclosure · {s.symbols} emiten:{" "}
          {d.symbols.map((sym) => (
            <Link key={sym} href={`/saham/${sym.replace(".JK", "")}`} className="mono mr-1">
              {sym.replace(".JK", "")}
            </Link>
          ))}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Total nilai transaksi" value={`Rp${fmtIDR(s.totalValue)}`} />
        <Stat label="Beli / Jual" value={`${s.buys} / ${s.sells}`} />
        <Stat
          label="Jual → turun 30h"
          value={sellAvg !== null ? `${s.sellThenDown}/${s.sellMeasured} (${sellAvg}%)` : "—"}
          sub="frekuensi historis, bukan prediksi"
        />
        <Stat
          label="Beli → naik 30h"
          value={buyAvg !== null ? `${s.buyThenUp}/${s.buyMeasured} (${buyAvg}%)` : "—"}
          sub="frekuensi historis, bukan prediksi"
        />
      </div>

      <section className="panel p-4">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider dim">Seluruh histori disclosure</h2>
        <TradesTable trades={d.trades} />
        <p className="mt-3 text-[10px] faint">
          &quot;Jual → turun&quot; = berapa kali saham turun dalam 30 hari kalender setelah tanggal transaksinya.
          Statistik deskriptif atas data publik — bukan ukuran kemampuan atau tuduhan apapun.
        </p>
      </section>
    </div>
  );
}
