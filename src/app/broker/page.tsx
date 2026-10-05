// Broker board — latest leaderboard session with registry cohort labels.

import Link from "next/link";
import { getBrokerBoard } from "@/lib/services";
import { fmtCurrency } from "@/components/fmt";
import DataStatus from "@/components/DataStatus";

export const dynamic = "force-dynamic";

const COHORT_ORDER = ["institutional", "mixed", "retail", "unknown"] as const;

function CohortTag({ cohort }: { cohort: string }) {
  const cls = cohort === "institutional" ? "cohort-inst" : cohort === "retail" ? "cohort-retail" : "dim";
  return (
    <span className={`tag ${cls}`} title="Broker classification from the broker registry: describes the channel, not the ultimate trader.">
      {cohort}
    </span>
  );
}

const COHORT_TABS = [
  { key: "all", label: "All brokers" },
  { key: "institutional", label: "Institutional" },
  { key: "retail", label: "Retail" },
] as const;

export default async function BrokerBoardPage({ searchParams }: PageProps<"/broker">) {
  const params = await searchParams;
  const cohort = ["retail", "institutional"].includes(String(params.cohort)) ? String(params.cohort) : "all";
  const board = await getBrokerBoard(cohort);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">Broker board</h1>
          <p className="mt-1 max-w-2xl text-[13px] dim">
            Top brokers by reported activity; registry cohort labels describe the channel, not the ultimate trader.
          </p>
        </div>
      </div>

      {/* Registry cohort counts — same hairline-band language as the board stats. */}
      <section className="grid grid-cols-3 gap-px border border-line bg-line/70 sm:grid-cols-6">
        {COHORT_ORDER.map((c) => (
          <div key={c} className="bg-bg px-2.5 py-2">
            <div className="mono text-[9px] uppercase tracking-[0.12em] faint">{c}</div>
            <div
              className="mono mt-0.5 text-[15px] font-semibold tabular-nums"
              style={{ color: c === "institutional" ? "var(--cohort-inst)" : c === "retail" ? "var(--cohort-retail)" : undefined }}
            >
              {board.registry.byCohort[c] ?? 0}
            </div>
          </div>
        ))}
        <div className="bg-bg px-2.5 py-2">
          <div className="mono text-[9px] uppercase tracking-[0.12em] faint">Firms classified</div>
          <div className="mono mt-0.5 text-[15px] font-semibold tabular-nums">{board.registry.total}</div>
        </div>
        <div className="bg-bg px-2.5 py-2">
          <div className="mono text-[9px] uppercase tracking-[0.12em] faint">Session</div>
          <div className="mono mt-0.5 text-[15px] font-semibold tabular-nums">{board.date ?? "—"}</div>
        </div>
      </section>

      {board.date && <DataStatus asOf={board.date} />}

      {board.available && (
        <div className="flex items-center justify-between gap-3">
          <div className="tabbar flex-1">
            {COHORT_TABS.map((t) => (
              <Link
                key={t.key}
                href={t.key === "all" ? "/broker" : `/broker?cohort=${t.key}`}
                className={`tab ${cohort === t.key ? "tab-active" : ""}`}
              >
                {t.label}
              </Link>
            ))}
          </div>
          <span className="faint mono hidden text-[10px] uppercase tracking-wider sm:inline">session cohort: {board.sessionCohort}</span>
        </div>
      )}

      {!board.available && (
        <div className="panel p-6 text-sm dim">
          Broker leaderboard or registry feed not ingested yet. Run <code className="mono">npm run ingest</code> to build
          the local snapshot.
        </div>
      )}

      {board.available && (
        <section>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider faint">
                  <th className="py-2 pr-4 font-medium">#</th>
                  <th className="py-2 pr-4 font-medium">Broker</th>
                  <th className="py-2 pr-4 font-medium">Cohort</th>
                  <th className="py-2 pr-4 text-right font-medium">Gross</th>
                  <th className="py-2 text-right font-medium">Net</th>
                </tr>
              </thead>
              <tbody className="mono text-xs">
                {board.entries.map((e) => (
                  <tr key={e.broker_code} className="row-hover border-b border-line/60">
                    <td className="py-3 pr-4 faint">{e.rank}</td>
                    <td className="py-3 pr-4">
                      <Link href={`/broker/${e.broker_code}`} className="font-bold text-sm">
                        {e.broker_code}
                      </Link>
                      {e.name && <span className="ml-2 text-[11px] dim">{e.name}</span>}
                    </td>
                    <td className="py-3 pr-4">
                      <CohortTag cohort={e.cohort} />
                    </td>
                    <td className="py-3 pr-4 text-right">{e.gross != null ? fmtCurrency(e.gross) : "—"}</td>
                    <td className={`py-3 text-right ${(e.net ?? 0) < 0 ? "dist" : ""}`}>
                      {e.net != null ? fmtCurrency(e.net) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-[10px] faint">
            Leaderboard reflects the saved brokers/top session for cohort &ldquo;{board.sessionCohort}&rdquo;. The
            per-cohort leaderboard is published by Sectors; registry labels on each row describe the channel, not the
            ultimate trader. 42 of 88 brokers are classified &ldquo;mixed&rdquo; and are not counted as either side.
          </p>
        </section>
      )}
    </div>
  );
}
