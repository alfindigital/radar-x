// Subsector drill-down — aggregate stats + member issuers linked to dossiers.

import Link from "next/link";
import { getSubsectorDetail } from "@/lib/services";
import { ScoreNumber, Stat } from "@/components/widgets";
import { fmtIDR, fmtPct } from "@/components/fmt";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/rotasi/[sub]">) {
  const { sub } = await params;
  return { title: `RADAR-X — ${sub}` };
}

export default async function SubsectorPage({ params }: PageProps<"/rotasi/[sub]">) {
  const { sub } = await params;
  const detail = await getSubsectorDetail(sub);

  if (!detail) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold tracking-tight">Subsector not found</h1>
        <p className="text-xs dim">
          No saved aggregate for <span className="mono">{sub}</span>. See{" "}
          <Link href="/rotasi" className="blue">all subsectors</Link>.
        </p>
      </div>
    );
  }

  const { row, memberScores } = detail;
  const monthly = Object.entries(row.monthlyPerf ?? {}).sort(([a], [b]) => a.localeCompare(b)).slice(-12);
  const mcapTotal = row.mcapTotal === null ? "—" : `Rp${fmtIDR(row.mcapTotal)}`;
  const w1 = row.mcapChange1w === null ? "—" : fmtPct(row.mcapChange1w * 100, 1, "complete");
  const y1 = row.mcapChange1y === null ? "—" : fmtPct(row.mcapChange1y * 100, 0, "complete");
  const ytd = row.mcapChangeYtd === null ? "—" : fmtPct(row.mcapChangeYtd * 100, 0, "complete");

  return (
    <div className="space-y-4">
      <div>
        <div className="section-label">
          <Link href="/rotasi" className="hover:text-ink">Sector rotation</Link> · {row.sector}
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{row.subSector}</h1>
        <p className="mt-1 text-xs dim">
          {row.companyCount ?? "—"} issuers · saved aggregate context
          {row.flowDate ? (
            <>
              {" "}· net foreign flow from the saved <span className="mono">{row.flowDate}</span> session
            </>
          ) : null}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Mcap Δ 1w" value={w1} sub={`YTD ${ytd}`} />
        <Stat label="Mcap Δ 1y" value={y1} sub={`total ${mcapTotal}`} />
        <Stat label="Median PE" value={row.medianPe === null ? "—" : `${row.medianPe.toFixed(1)}×`} sub={row.weightedPe === null ? undefined : `weighted ${row.weightedPe.toFixed(1)}×`} />
        <Stat label="Max drawdown" value={row.maxDrawdown === null ? "—" : `${(row.maxDrawdown * 100).toFixed(0)}%`} sub={row.rsd === null ? undefined : `RSD ${row.rsd.toFixed(2)}`} />
      </div>

      {(row.valuationLatest || row.growthHist || row.growthForecast) && (
        <section>
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-widest faint">Valuation &amp; growth (provider aggregates)</h2>
          <div className="grid gap-8 lg:grid-cols-2">
            {row.valuationHist && (
              <div>
                <p className="mb-2 text-[10px] faint">yearly valuation — PB / PE / PS / PCF</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider faint">
                      <th className="py-1.5 pr-4 font-medium">Year</th>
                      <th className="py-1.5 pr-4 font-medium text-right">PB</th>
                      <th className="py-1.5 pr-4 font-medium text-right">PE</th>
                      <th className="py-1.5 pr-4 font-medium text-right">PS</th>
                      <th className="py-1.5 font-medium text-right">PCF</th>
                    </tr>
                  </thead>
                  <tbody className="mono text-xs">
                    {Object.entries(row.valuationHist)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([year, v]) => (
                        <tr key={year} className={`border-b border-line/60 ${year === row.valuationLatest?.year ? "bg-line/10" : ""}`}>
                          <td className="py-1.5 pr-4 dim">
                            {year}
                            {year === row.valuationLatest?.year && row.valuationLatest.pbRank !== null && (
                              <span className="faint ml-2 text-[9px]">PB rank {row.valuationLatest.pbRank}/33</span>
                            )}
                          </td>
                          <td className="py-1.5 pr-4 text-right">{v.pb === null ? "—" : `${v.pb.toFixed(2)}×`}</td>
                          <td className="py-1.5 pr-4 text-right">{v.pe === null ? "—" : `${v.pe.toFixed(1)}×`}</td>
                          <td className="py-1.5 pr-4 text-right">{v.ps === null ? "—" : `${v.ps.toFixed(2)}×`}</td>
                          <td className="py-1.5 text-right">{v.pcf === null ? "—" : `${v.pcf.toFixed(2)}×`}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            <div>
              {row.growthHist && (
                <div>
                  <p className="mb-2 text-[10px] faint">weighted yearly growth — earnings / revenue</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider faint">
                        <th className="py-1.5 pr-4 font-medium">Year</th>
                        <th className="py-1.5 pr-4 font-medium text-right">Earnings</th>
                        <th className="py-1.5 font-medium text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="mono text-xs">
                      {Object.entries(row.growthHist)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .slice(-6)
                        .map(([year, g]) => (
                          <tr key={year} className="border-b border-line/60">
                            <td className="py-1.5 pr-4 dim">{year}</td>
                            <td className={`py-1.5 pr-4 text-right ${g.earnGrowth === null ? "faint" : g.earnGrowth >= 0 ? "acc" : "dist"}`}>
                              {g.earnGrowth === null ? "—" : fmtPct(g.earnGrowth * 100, 0, "complete")}
                            </td>
                            <td className={`py-1.5 text-right ${g.revGrowth === null ? "faint" : g.revGrowth >= 0 ? "acc" : "dist"}`}>
                              {g.revGrowth === null ? "—" : fmtPct(g.revGrowth * 100, 0, "complete")}
                            </td>
                          </tr>
                        ))}
                      {row.growthForecast && (
                        <tr className="bg-line/10">
                          <td className="py-1.5 pr-4 dim">
                            {row.growthForecast.year}
                            <span className="faint ml-2 text-[9px]">forecast</span>
                          </td>
                          <td className={`py-1.5 pr-4 text-right ${row.growthForecast.epsGrowth === null ? "faint" : row.growthForecast.epsGrowth >= 0 ? "acc" : "dist"}`}>
                            {row.growthForecast.epsGrowth === null ? "—" : fmtPct(row.growthForecast.epsGrowth * 100, 0, "complete")}
                          </td>
                          <td className={`py-1.5 text-right ${row.growthForecast.revGrowth === null ? "faint" : row.growthForecast.revGrowth >= 0 ? "acc" : "dist"}`}>
                            {row.growthForecast.revGrowth === null ? "—" : fmtPct(row.growthForecast.revGrowth * 100, 0, "complete")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-widest faint">Strongest 1-month movers</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider faint">
                  <th className="py-2 pr-4 font-medium">Issuer</th>
                  <th className="py-2 pr-4 font-medium text-right">Δ 1m</th>
                  <th className="hidden py-2 pr-4 font-medium text-right sm:table-cell">Δ 1y</th>
                  <th className="hidden py-2 pr-4 font-medium text-right md:table-cell">PE</th>
                  <th className="py-2 font-medium text-right">Close</th>
                </tr>
              </thead>
              <tbody className="mono text-xs">
                {row.topChange.map((m) => (
                  <tr key={m.symbol} className="row-hover border-b border-line/60">
                    <td className="py-2.5 pr-4">
                      <Link href={`/saham/${m.symbol.replace(".JK", "")}`} className="font-bold">
                        {m.symbol.replace(".JK", "")}
                      </Link>
                    </td>
                    <td className={`py-2.5 pr-4 text-right ${m.chg1m === null ? "faint" : m.chg1m >= 0 ? "acc" : "dist"}`}>
                      {fmtPct(m.chg1m === null ? null : m.chg1m * 100, 1, "complete")}
                    </td>
                    <td className={`hidden py-2.5 pr-4 text-right sm:table-cell ${m.chg1y === null ? "faint" : m.chg1y >= 0 ? "acc" : "dist"}`}>
                      {fmtPct(m.chg1y === null ? null : m.chg1y * 100, 0, "complete")}
                    </td>
                    <td className="hidden py-2.5 pr-4 text-right dim md:table-cell">{m.pe === null ? "—" : `${m.pe.toFixed(1)}×`}</td>
                    <td className="py-2.5 text-right dim">{m.lastClose === null ? "—" : fmtIDR(m.lastClose)}</td>
                  </tr>
                ))}
                {!row.topChange.length && (
                  <tr><td colSpan={5} className="py-8 text-center dim">No mover rows saved for this subsector.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {monthly.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-widest faint">Monthly mcap performance</h2>
              <div className="flex flex-wrap gap-1.5">
                {monthly.map(([date, v]) => (
                  <div
                    key={date}
                    title={date}
                    className="rounded-md border border-line px-2 py-1 text-center"
                    style={{ background: `color-mix(in srgb, ${v >= 0 ? "var(--acc)" : "var(--dist)"} ${Math.min(20, Math.abs(v) * 100)}%, transparent)` }}
                  >
                    <div className="faint text-[9px]">{date.slice(2, 7)}</div>
                    <div className={`mono text-[11px] ${v >= 0 ? "acc" : "dist"}`}>{`${v >= 0 ? "+" : ""}${(v * 100).toFixed(0)}%`}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-widest faint">
            Member issuers ({row.members.length}) · with positioning score
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider faint">
                  <th className="py-2 pr-4 font-medium">Issuer</th>
                  <th className="hidden py-2 pr-4 font-medium sm:table-cell">Industry</th>
                  <th className="py-2 font-medium text-right">Index</th>
                </tr>
              </thead>
              <tbody className="mono text-xs">
                {memberScores.map((m) => (
                  <tr key={m.symbol} className="row-hover border-b border-line/60">
                    <td className="py-2 pr-4">
                      <Link href={`/saham/${m.symbol.replace(".JK", "")}`} className="font-bold">
                        {m.symbol.replace(".JK", "")}
                      </Link>
                    </td>
                    <td className="hidden py-2 pr-4 dim sm:table-cell">{m.industry ?? "—"}</td>
                    <td className="py-2 text-right"><ScoreNumber score={m.score} size="sm" /></td>
                  </tr>
                ))}
                {!memberScores.length && (
                  <tr><td colSpan={3} className="py-8 text-center dim">Member list not ingested: run ingest rotation --refresh-members.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {row.netForeignFlow !== null && (
        <p className="text-[11px] faint">
          Net foreign flow on {row.flowDate}
          {row.flowObserved != null && row.flowExpected != null && (
            <>
              {" "}across {row.flowObserved} of {row.flowExpected} member issuers
            </>
          )}
          :{" "}
          <span className={`mono ${row.netForeignFlow >= 0 ? "acc" : "dist"}`}>
            {row.netForeignFlow >= 0 ? "+" : "−"}Rp{fmtIDR(Math.abs(row.netForeignFlow))}
          </span>
          . Members without stored flow rows are not counted.
        </p>
      )}
    </div>
  );
}
