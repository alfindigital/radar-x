// Foreign Flow Radar — signed foreign-flow ranking with benchmark-session coverage.

import Link from "next/link";
import type { ReactNode } from "react";
import { getFlowRadar } from "@/lib/services";
import { fmtIDR } from "@/components/fmt";
import { Pager, pageHref, paginate } from "@/components/Pager";

export const dynamic = "force-dynamic";

function FlowTable({ title, rows, sign, startAt = 1, children }: { title: string; rows: { symbol: string; days: number; observations: number; expectedSessions: number; missingSessions: number; cumNet: number; streak: number; streakStatus: string }[]; sign: "acc" | "dist"; startAt?: number; children?: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-widest faint">{title}</h2>
      <div className="table-sticky">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider faint">
              <th className="py-2 pr-4 font-medium">#</th>
              <th className="py-2 pr-4 font-medium">Issuer</th>
              <th className="py-2 pr-4 font-medium text-right">Net flow</th>
              <th className="hidden py-2 pr-4 font-medium text-right sm:table-cell">Observed / expected</th>
              <th className="hidden py-2 font-medium text-right md:table-cell">Positive streak</th>
            </tr>
          </thead>
          <tbody className="mono text-xs">
            {rows.map((r, i) => (
              <tr key={r.symbol} className="row-hover border-b border-line/60">
                <td className="py-2.5 pr-4 faint">{startAt + i}</td>
                <td className="tapcell py-2.5 pr-4">
                  <Link href={`/stock/${r.symbol.replace(".JK", "")}`} className="taplink font-bold text-sm">
                    {r.symbol.replace(".JK", "")}
                  </Link>
                </td>
                <td className={`py-2.5 pr-4 text-right ${sign === "acc" ? "acc" : "dist"}`}>
                  {r.cumNet >= 0 ? "+Rp" : "−Rp"}{fmtIDR(Math.abs(r.cumNet))}
                </td>
                <td className="hidden py-2.5 pr-4 text-right dim sm:table-cell">{r.observations}/{r.expectedSessions} {r.missingSessions ? `· ${r.missingSessions} missing` : ""}</td>
                <td className="hidden py-2.5 text-right md:table-cell">
                  {r.streak >= 3 ? <span className="acc">{r.streak}×</span> : <span className="faint">{r.streak || "—"}</span>} <span className="faint">{r.streakStatus}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {children}
    </section>
  );
}

export default async function ForeignPage({ searchParams }: PageProps<"/foreign">) {
  const params = await searchParams;
  const { from, to, rows } = await getFlowRadar(14);
  const acc = rows.filter((r) => r.cumNet > 0).slice(0, 50);
  const dist = rows.filter((r) => r.cumNet < 0).sort((a, b) => a.cumNet - b.cumNet).slice(0, 50);
  // Independent pagers: ?ap and ?dp keep each table's page in the URL so one
  // side's "next" does not reset the other.
  const accPg = paginate(acc, params.ap);
  const distPg = paginate(dist, params.dp);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">Foreign Flow Radar</h1>
        <p className="mt-1 max-w-2xl text-[13px] dim">
          Signed net foreign flow, {from ?? "—"} → {to ?? "—"}. Missing issuer rows are unknown, not zero.
        </p>
      </div>

      <section className="grid grid-cols-4 gap-px border border-line bg-line/70">
        <div className="bg-bg px-2.5 py-2">
          <div className="mono text-[9px] uppercase tracking-[0.12em] faint">Issuers observed</div>
          <div className="mono mt-0.5 text-[15px] font-semibold tabular-nums">{rows.length}</div>
        </div>
        <div className="bg-bg px-2.5 py-2">
          <div className="mono text-[9px] uppercase tracking-[0.12em] faint">Net accumulating</div>
          <div className="mono mt-0.5 text-[15px] font-semibold tabular-nums acc">
            {rows.filter((r) => r.cumNet > 0).length}
          </div>
        </div>
        <div className="bg-bg px-2.5 py-2">
          <div className="mono text-[9px] uppercase tracking-[0.12em] faint">Net distributing</div>
          <div className="mono mt-0.5 text-[15px] font-semibold tabular-nums dist">
            {rows.filter((r) => r.cumNet < 0).length}
          </div>
        </div>
        <div className="bg-bg px-2.5 py-2">
          <div className="mono text-[9px] uppercase tracking-[0.12em] faint">Window</div>
          <div className="mono mt-0.5 text-[15px] font-semibold tabular-nums">14d</div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <FlowTable title="Largest foreign accumulation" rows={accPg.rows} sign="acc" startAt={accPg.from}>
          <Pager s={accPg} href={pageHref("/foreign", "ap", { dp: distPg.page > 1 ? String(distPg.page) : undefined })} />
        </FlowTable>
        <FlowTable title="Largest foreign distribution" rows={distPg.rows} sign="dist" startAt={distPg.from}>
          <Pager s={distPg} href={pageHref("/foreign", "dp", { ap: accPg.page > 1 ? String(accPg.page) : undefined })} />
        </FlowTable>
      </div>

      <p className="text-[11px] leading-relaxed faint">
        Issuers without saved foreign-flow rows do not appear. Positive streaks are marked incomplete when a reference session is missing.
      </p>
    </div>
  );
}
