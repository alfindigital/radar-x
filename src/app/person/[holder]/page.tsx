// Person dossier — full reported ownership history and measured outcomes.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getPersonDossier } from "@/lib/services";
import TradesTable from "@/components/TradesTable";
import { Stat } from "@/components/widgets";
import { fmtCurrency } from "@/components/fmt";
import { Pager, pageHref, paginate } from "@/components/Pager";

export const dynamic = "force-dynamic";

export default async function PersonPage({ params, searchParams }: PageProps<"/person/[holder]">) {
  const { holder } = await params;
  const sp = await searchParams;
  const d = await getPersonDossier(holder);
  if (!d) notFound();

  const s = d.stats;
  const tradesPg = paginate(d.trades, sp.page);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">{d.holderName}</h1>
        <p className="mt-1 text-xs dim">
          {s.totalTrades} reported transactions · {s.symbols} issuers:{" "}
          {d.symbols.map((sym) => (
            <Link key={sym} href={`/stock/${sym.replace(".JK", "")}`} className="mono mr-1">
              {sym.replace(".JK", "")}
            </Link>
          ))}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Stat label="Total transaction value" value={fmtCurrency(s.totalValue)} />
        <Stat label="Buys / sells" value={`${s.buys} / ${s.sells}`} />
        <Stat
          label="Measured 30-day sell outcomes"
          value={`${s.sellThenDown}/${s.sellMeasured}`}
          sub="complete outcomes where the issuer fell"
        />
        <Stat
          label="Measured 30-day buy outcomes"
          value={`${s.buyThenUp}/${s.buyMeasured}`}
          sub="complete outcomes where the issuer rose"
        />
      </div>

      <section>
        <h2 className="section-label mb-3">Full reported ownership history</h2>
        <TradesTable trades={tradesPg.rows} />
        <Pager s={tradesPg} href={pageHref(`/person/${encodeURIComponent(holder)}`, "page")} />
        <p className="mt-3 text-[10px] faint">
          Counts use complete issuer outcomes measured 30 calendar days after a transaction when a valid matched price exists.
          They are descriptive public-data statistics, not a skill score or allegation.
        </p>
      </section>
    </div>
  );
}
