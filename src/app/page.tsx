// Exit Watch board (default) — v2 radar board preserved behind ?v=radar.

import Link from "next/link";
import { getExitBoard, getMarketContext } from "@/lib/services";
import { ExitPressureBadge } from "@/components/ExitPressureBadge";
import { FlagChips } from "@/components/FlagChips";
import DataStatus from "@/components/DataStatus";
import RadarBoardView from "@/components/RadarBoardView";
import type { ExitComponent, ExitWatchRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const SCOPES = [
  { key: "all", label: "All" },
  { key: "flagged", label: "Flagged" },
  { key: "suppressed", label: "Suppressed" },
] as const;

const COMPONENT_CELLS: { key: ExitComponent["key"]; label: string; hint: string }[] = [
  { key: "instExit", label: "INST", hint: "Net flow of brokers classified institutional, normalized by market cap" },
  { key: "foreignExit", label: "FOR", hint: "Net foreign flow normalized by market cap" },
  { key: "insiderExit", label: "INS", hint: "Reported insider sell value (90d) normalized by market cap" },
  { key: "retailAbsorb", label: "RET", hint: "Net flow of brokers classified retail — absorption side" },
];

function ComponentCell({ c, kind }: { c: ExitComponent; kind: ExitComponent["key"] }) {
  if (c.status !== "available" || c.z === null) {
    return (
      <div className="min-w-[52px]" title={c.reason ?? "No usable evidence for this component in the window."}>
        <div className="faint text-[9px] uppercase tracking-wider">{COMPONENT_CELLS.find((m) => m.key === c.key)?.label}</div>
        <div className="faint mono text-xs">—</div>
      </div>
    );
  }
  const exitSide = (c.raw ?? 0) > 0;
  const color =
    kind === "instExit"
      ? "var(--cohort-inst)"
      : kind === "retailAbsorb"
        ? "var(--cohort-retail)"
        : exitSide
          ? "var(--dist)"
          : "var(--acc)";
  const pct = Math.min(100, (Math.abs(c.z) / 3) * 100);
  return (
    <div className="min-w-[52px]" title={`z ${c.z >= 0 ? "+" : ""}${c.z.toFixed(2)} · raw ${c.raw?.toFixed(3)}% of cap · ${c.observations} obs`}>
      <div className="faint text-[9px] uppercase tracking-wider">{COMPONENT_CELLS.find((m) => m.key === c.key)?.label}</div>
      <div className="mono text-xs" style={{ color }}>
        {exitSide ? "−" : "+"}
        {Math.abs(c.z).toFixed(1)}
      </div>
      <div className="mt-0.5 h-[3px] w-full rounded-full bg-panel-2">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function Row({ row, rank }: { row: ExitWatchRow; rank: number }) {
  return (
    <tr className="row-hover border-b border-line/60">
      <td className="py-3 pr-4 faint">{rank}</td>
      <td className="py-3 pr-4">
        <Link href={`/saham/${row.symbol.replace(".JK", "")}`} className="mono text-sm font-bold">
          {row.symbol.replace(".JK", "")}
        </Link>
      </td>
      <td className="py-3 pr-4">
        <ExitPressureBadge score={row.score} coverage={row.coverage} />
      </td>
      <td className="hidden py-3 pr-4 md:table-cell">
        <div className="flex gap-3">
          {row.components.map((c) => (
            <ComponentCell key={c.key} c={c} kind={c.key} />
          ))}
        </div>
      </td>
      <td className="py-3">
        <FlagChips flags={row.flags} />
      </td>
    </tr>
  );
}

export default async function BoardPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  if (params.v === "radar") {
    const filter = typeof params.f === "string" ? params.f : "semua";
    return <RadarBoardView filter={filter} />;
  }

  const ROW_CAP = 150;
  const scope = typeof params.scope === "string" ? params.scope : "all";
  const [board, market] = await Promise.all([getExitBoard(), getMarketContext()]);
  // "Flagged" = alert flags only; sparse_broker is coverage context, not an alert.
  const flagged = board.rows.filter((r) => r.flags.suspension_recent || r.flags.corp_action_near || r.flags.float_constraint);
  const suppressed = board.rows.filter((r) => r.score === null);
  const base = scope === "flagged" ? flagged : scope === "suppressed" ? suppressed : board.rows.filter((r) => r.score !== null);
  const shown = base.slice(0, ROW_CAP);
  const truncated = base.length - shown.length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Exit Watch</h1>
          <p className="mt-1 text-xs dim">
            Which cohorts appear to be leaving — and who is absorbing · {board.counts.publishable} scored · {board.counts.insufficient} suppressed (low coverage) · {flagged.length} flagged · as of <span className="mono">{board.asOf}</span>
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="tag">EOD {board.asOf}</span>
          <Link href="/?v=radar" className="dim hover:text-ink">
            View: <span className="blue">Radar (v2)</span>
          </Link>
        </div>
      </div>

      <DataStatus asOf={board.asOf} />

      {(market.ihsg || market.mostTraded.rows.length > 0) && (
        <section className="panel flex flex-wrap items-center gap-x-5 gap-y-1 px-3 py-2 text-xs">
          {market.ihsg && (
            <span className="dim">
              IHSG <span className="mono text-ink">{market.ihsg.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
              {market.ihsg.changePct !== null && (
                <span className={`mono ml-1 ${market.ihsg.changePct < 0 ? "dist" : "acc"}`}>
                  {market.ihsg.changePct >= 0 ? "+" : ""}
                  {market.ihsg.changePct.toFixed(2)}%
                </span>
              )}{" "}
              <span className="faint">({market.ihsg.date})</span>
            </span>
          )}
          {market.mostTraded.rows.length > 0 && (
            <span className="dim">
              <span className="faint">heaviest volume {market.mostTraded.date}:</span>{" "}
              {market.mostTraded.rows.map((r) => (
                <Link key={r.symbol} href={`/saham/${r.symbol.replace(".JK", "")}`} className="mono mr-2 hover:text-ink">
                  {r.symbol.replace(".JK", "")}
                </Link>
              ))}
            </span>
          )}
        </section>
      )}

      {!board.rows.length && (
        <div className="panel p-6 text-sm dim">
          Exit Watch feeds are not ingested yet in this environment — run <code className="mono">npm run ingest</code> then{" "}
          <code className="mono">npm run compute -- --as-of YYYY-MM-DD</code> to build the local snapshot.
        </div>
      )}

      {board.rows.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-1">
            {SCOPES.map((s) => (
              <Link
                key={s.key}
                href={s.key === "all" ? "/" : `/?scope=${s.key}`}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${scope === s.key ? "bg-panel-2 text-ink" : "faint hover:text-ink"}`}
              >
                {s.label}
                {s.key === "flagged" && <span className="faint"> · {flagged.length}</span>}
                {s.key === "suppressed" && <span className="faint"> · {suppressed.length}</span>}
              </Link>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider faint">
                  <th className="py-2 pr-4 font-medium">#</th>
                  <th className="py-2 pr-4 font-medium">Issuer</th>
                  <th className="py-2 pr-4 font-medium">Exit pressure</th>
                  <th className="hidden py-2 pr-4 font-medium md:table-cell">
                    Components <span className="normal-case">(z · INST/FOR/INS exit-side · RET absorb-side)</span>
                  </th>
                  <th className="py-2 font-medium">Flags</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {shown.map((row, i) => (
                  <Row key={row.symbol} row={row} rank={i + 1} />
                ))}
                {!shown.length && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center dim">
                      No issuers in this scope for the saved snapshot.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {truncated > 0 && (
            <p className="mt-2 text-[11px] faint">
              Showing first {shown.length} of {base.length} in this scope.
            </p>
          )}

          {scope === "all" && suppressed.length > 0 && (
            <p className="mt-4 text-xs dim">
              {suppressed.length} issuers suppressed — insufficient component coverage to publish a reading.{" "}
              <Link href="/?scope=suppressed" className="blue">
                View suppressed →
              </Link>
            </p>
          )}

          <p className="mt-4 text-[10px] faint">
            Exit pressure is a bounded descriptive reading over labeled broker-cohort flow, foreign flow, and reported
            insider transactions — not proof of intent or a prediction. Coverage gate ≥0.5 · feeds hashed in manifest ·{" "}
            <Link href="/metodologi" className="blue">
              methodology
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
