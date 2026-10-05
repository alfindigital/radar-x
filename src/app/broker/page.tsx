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
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Broker board</h1>
          <p className="mt-1.5 text-[13px] dim">
            Top brokers by reported activity · session <span className="mono">{board.date ?? "—"}</span> · cohort labels
            from the broker registry ({board.registry.total} firms classified)
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {COHORT_ORDER.filter((c) => board.registry.byCohort[c]).map((c) => (
            <span key={c} className="dim">
              <span className={c === "institutional" ? "cohort-inst" : c === "retail" ? "cohort-retail" : "faint"}>●</span>{" "}
              {board.registry.byCohort[c]} {c}
            </span>
          ))}
        </div>
      </div>

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
