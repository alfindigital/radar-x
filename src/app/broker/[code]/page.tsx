// Broker profile — registry metadata + leaderboard appearances + per-issuer top-N presence.

import Link from "next/link";
import { getBrokerProfile } from "@/lib/services";
import { fmtCurrency } from "@/components/fmt";

export const dynamic = "force-dynamic";

export default async function BrokerProfilePage({ params }: PageProps<"/broker/[code]">) {
  const { code } = await params;
  const p = await getBrokerProfile(code);

  if (!p) {
    return (
      <div className="space-y-4">
        <h1 className="mono text-2xl font-bold">{code.toUpperCase()}</h1>
        <p className="dim text-sm">No registry record, leaderboard appearance, or per-issuer top-N presence found for this code.</p>
        <Link href="/broker" className="blue text-xs">
          ← Broker board
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-4">
          <h1 className="mono text-3xl font-bold tracking-tight">{p.code}</h1>
          {p.registry && (
            <span className={`tag ${p.registry.cohort === "institutional" ? "cohort-inst" : p.registry.cohort === "retail" ? "cohort-retail" : ""}`}>
              {p.registry.cohort}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs dim">
          {p.registry?.name ?? "Not in broker registry"}
          {p.registry?.is_foreign ? " · foreign" : ""}
          {p.registry?.license_type ? ` · ${p.registry.license_type}` : ""}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="section-label mb-3">Leaderboard appearances</h2>
          {p.leaderboardAppearances.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider faint">
                  <th className="py-1 pr-3 font-medium">Date</th>
                  <th className="py-1 pr-3 font-medium">Rank</th>
                  <th className="py-1 text-right font-medium">Net</th>
                </tr>
              </thead>
              <tbody className="mono text-xs">
                {p.leaderboardAppearances.map((a) => (
                  <tr key={a.date} className="border-b border-line/40">
                    <td className="py-2 pr-3">{a.date}</td>
                    <td className="py-2 pr-3">#{a.rank}</td>
                    <td className={`py-2 text-right ${(a.net ?? 0) < 0 ? "dist" : ""}`}>
                      {a.net != null ? fmtCurrency(a.net) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="dim py-2 text-xs">No leaderboard appearances in the saved sessions.</p>
          )}
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="section-label mb-3">Top buyer of ({p.symbolsTopBuyer.length})</h2>
            <div className="flex flex-wrap gap-1.5">
              {p.symbolsTopBuyer.slice(0, 60).map((s) => (
                <Link key={s} href={`/saham/${s.replace(".JK", "")}`} className="tag hover:text-ink">
                  {s.replace(".JK", "")}
                </Link>
              ))}
              {p.symbolsTopBuyer.length > 60 && <span className="faint text-xs">+{p.symbolsTopBuyer.length - 60} more</span>}
              {!p.symbolsTopBuyer.length && <span className="dim text-xs">None in saved broker-top data.</span>}
            </div>
          </div>
          <div>
            <h2 className="section-label mb-3">Top seller of ({p.symbolsTopSeller.length})</h2>
            <div className="flex flex-wrap gap-1.5">
              {p.symbolsTopSeller.slice(0, 60).map((s) => (
                <Link key={s} href={`/saham/${s.replace(".JK", "")}`} className="tag hover:text-ink">
                  {s.replace(".JK", "")}
                </Link>
              ))}
              {p.symbolsTopSeller.length > 60 && <span className="faint text-xs">+{p.symbolsTopSeller.length - 60} more</span>}
              {!p.symbolsTopSeller.length && <span className="dim text-xs">None in saved broker-top data.</span>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
