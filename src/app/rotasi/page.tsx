// Sector Rotation — saved subsector aggregates: market-cap change heatmap,
// valuation context, and member drill-down. Reads data/sector_rotation.json.

import Link from "next/link";
import { getSectorRotation } from "@/lib/services";
import { fmtIDR } from "@/components/fmt";
import type { RotationSubsector } from "@/lib/rotation";

export const dynamic = "force-dynamic";

function chgPct(v: number | null): number | null {
  return v === null ? null : v * 100;
}

function Cell({ s, maxAbs }: { s: RotationSubsector; maxAbs: number }) {
  const v = s.mcapChange1w;
  const intensity = v === null || maxAbs === 0 ? 0 : Math.min(1, Math.abs(v) / maxAbs);
  const alpha = 5 + Math.round(intensity * 20); // 5%..25%
  const tone = v === null ? "var(--watch)" : v >= 0 ? "var(--acc)" : "var(--dist)";
  const tip = [
    `${s.subSector} (${s.companyCount ?? "—"} issuers)`,
    `mcap Δ1w ${v === null ? "—" : `${(v * 100).toFixed(1)}%`} · YTD ${s.mcapChangeYtd === null ? "—" : `${(s.mcapChangeYtd * 100).toFixed(1)}%`}`,
    `median PE ${s.medianPe === null ? "—" : s.medianPe.toFixed(1)}x · max DD ${s.maxDrawdown === null ? "—" : `${(s.maxDrawdown * 100).toFixed(0)}%`}`,
    s.valuationLatest
      ? `PB ${s.valuationLatest.pb === null ? "—" : s.valuationLatest.pb.toFixed(2)}x (rank ${s.valuationLatest.pbRank ?? "—"}/33) · PS ${s.valuationLatest.ps === null ? "—" : s.valuationLatest.ps.toFixed(2)}x`
      : "valuation: not ingested",
    s.growthForecast
      ? `forecast ${s.growthForecast.year}: EPS ${s.growthForecast.epsGrowth === null ? "—" : `${(s.growthForecast.epsGrowth * 100).toFixed(0)}%`} · rev ${s.growthForecast.revGrowth === null ? "—" : `${(s.growthForecast.revGrowth * 100).toFixed(0)}%`}`
      : "growth forecast: not ingested",
    s.netForeignFlow === null ? "foreign flow: no stored rows" : `net foreign flow ${s.flowDate}: ${s.netForeignFlow >= 0 ? "+" : "−"}Rp${fmtIDR(Math.abs(s.netForeignFlow))}`,
  ].join("\n");
  return (
    <Link
      href={`/rotasi/${s.slug}`}
      title={tip}
      className="block rounded-md border border-line px-3 py-2.5 transition-colors hover:border-line-2"
      style={{ background: `color-mix(in srgb, ${tone} ${alpha}%, transparent)` }}
    >
      <div className="truncate text-[11px] font-medium">{s.subSector}</div>
      <div className="mono mt-0.5 flex items-baseline justify-between text-xs">
        <span className={v === null ? "faint" : v >= 0 ? "acc" : "dist"}>
          {v === null ? "—" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`}
        </span>
        <span className="faint text-[9px]">1w</span>
      </div>
    </Link>
  );
}

export default async function RotasiPage() {
  const board = await getSectorRotation();

  if (!board) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold tracking-tight">Sector Rotation</h1>
        <div className="panel p-5 text-xs dim">
          No saved subsector aggregates yet. Run <span className="mono text-ink">npm run ingest -- rotation</span> with a
          valid SECTORS_API_KEY to build <span className="mono">data/sector_rotation.json</span>.
        </div>
      </div>
    );
  }

  const all = board.sectors.flatMap((g) => g.subs);
  const maxAbs = all.reduce((m, s) => Math.max(m, Math.abs(s.mcapChange1w ?? 0)), 0);
  const sorted = [...all].sort((a, b) => (b.mcapChange1w ?? -Infinity) - (a.mcapChange1w ?? -Infinity));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sector Rotation</h1>
          <p className="mt-1.5 text-[13px] dim">
            Aggregate market-cap movement across {all.length} IDX subsectors · as of{" "}
            <span className="mono">{board.asOf ?? "—"}</span>
            {board.flowDate ? (
              <>
                {" "}· foreign flow aggregated from the saved <span className="mono">{board.flowDate}</span> session
              </>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-4 text-[10px] faint">
          <span>
            <span className="acc">■</span> mcap expansion 1w
          </span>
          <span>
            <span className="dist">■</span> mcap contraction 1w
          </span>
          <span>intensity ∝ |Δ|</span>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {board.sectors.map((g) => (
          <section key={g.slug} className="panel p-4">
            <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-widest faint">{g.label}</h2>
            <div className="grid grid-cols-1 gap-1.5">
              {g.subs.map((s) => (
                <Cell key={s.slug} s={s} maxAbs={maxAbs} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <section>
        <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-widest faint">All subsectors, ranked by 1-week mcap change</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider faint">
                <th className="py-2 pr-4 font-medium">#</th>
                <th className="py-2 pr-4 font-medium">Subsector</th>
                <th className="hidden py-2 pr-4 font-medium md:table-cell">Sector</th>
                <th className="py-2 pr-4 font-medium text-right">Δ 1w</th>
                <th className="hidden py-2 pr-4 font-medium text-right sm:table-cell">Δ YTD</th>
                <th className="hidden py-2 pr-4 font-medium text-right lg:table-cell">Median PE</th>
                <th className="hidden py-2 pr-4 font-medium text-right lg:table-cell">PB</th>
                <th className="hidden py-2 pr-4 font-medium text-right lg:table-cell">Max DD</th>
                <th className="hidden py-2 pr-4 font-medium text-right md:table-cell">Net foreign</th>
                <th className="hidden py-2 font-medium text-right xl:table-cell">Total mcap</th>
              </tr>
            </thead>
            <tbody className="mono text-xs">
              {sorted.map((s, i) => {
                const w = chgPct(s.mcapChange1w);
                const ytd = chgPct(s.mcapChangeYtd);
                return (
                  <tr key={s.slug} className="row-hover border-b border-line/60">
                    <td className="py-2.5 pr-4 faint">{i + 1}</td>
                    <td className="py-2.5 pr-4 font-sans font-medium">
                      <Link href={`/rotasi/${s.slug}`} className="hover:text-ink">{s.subSector}</Link>
                      <span className="faint ml-2">{s.companyCount ?? "—"}</span>
                    </td>
                    <td className="hidden py-2.5 pr-4 dim md:table-cell">{s.sector}</td>
                    <td className={`py-2.5 pr-4 text-right ${w === null ? "faint" : w >= 0 ? "acc" : "dist"}`}>
                      {w === null ? "—" : `${w >= 0 ? "+" : ""}${w.toFixed(1)}%`}
                    </td>
                    <td className={`hidden py-2.5 pr-4 text-right sm:table-cell ${ytd === null ? "faint" : ytd >= 0 ? "acc" : "dist"}`}>
                      {ytd === null ? "—" : `${ytd >= 0 ? "+" : ""}${ytd.toFixed(0)}%`}
                    </td>
                    <td className="hidden py-2.5 pr-4 text-right dim lg:table-cell">
                      {s.medianPe === null ? "—" : `${s.medianPe.toFixed(1)}×`}
                    </td>
                    <td
                      className="hidden py-2.5 pr-4 text-right dim lg:table-cell"
                      title={s.valuationLatest ? `PB rank ${s.valuationLatest.pbRank ?? "—"} of 33 subsectors` : undefined}
                    >
                      {s.valuationLatest?.pb == null ? "—" : `${s.valuationLatest.pb.toFixed(2)}×`}
                    </td>
                    <td className="hidden py-2.5 pr-4 text-right dist lg:table-cell">
                      {s.maxDrawdown === null ? "—" : `${(s.maxDrawdown * 100).toFixed(0)}%`}
                    </td>
                    <td className={`hidden py-2.5 pr-4 text-right md:table-cell ${s.netForeignFlow === null ? "faint" : s.netForeignFlow >= 0 ? "acc" : "dist"}`}>
                      {s.netForeignFlow === null ? "—" : `${s.netForeignFlow >= 0 ? "+" : "−"}Rp${fmtIDR(Math.abs(s.netForeignFlow))}`}
                    </td>
                    <td className="hidden py-2.5 text-right dim xl:table-cell">
                      {s.mcapTotal === null ? "—" : `Rp${fmtIDR(s.mcapTotal)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-[11px] leading-relaxed faint">
        Aggregates are provider-weighted: a single large issuer can dominate a subsector&apos;s move. Net foreign flow sums the
        saved flow session over mapped member issuers; unmapped issuers count as zero. {board.limitations.length ? "Saved artifact limitations apply." : ""}
      </p>
    </div>
  );
}
