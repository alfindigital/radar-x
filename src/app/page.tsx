// Exit Watch board (default) — v2 radar board preserved behind ?v=radar.

import Link from "next/link";
import type { ReactNode } from "react";
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
  { key: "retailAbsorb", label: "RET", hint: "Net flow of brokers classified retail: absorption side" },
];

function componentLabel(key: ExitComponent["key"]) {
  return COMPONENT_CELLS.find((m) => m.key === key)?.label ?? key;
}

function componentTip(c: ExitComponent): string {
  if (c.status !== "available" || c.z === null) {
    return `${componentLabel(c.key)}: n/a · ${c.reason ?? "no usable evidence for this component in the window"}`;
  }
  const z = c.z;
  return `${componentLabel(c.key)}: z ${z >= 0 ? "+" : "−"}${Math.abs(z).toFixed(2)} · raw ${c.raw !== null ? `${c.raw >= 0 ? "+" : "−"}${Math.abs(c.raw).toFixed(3)}` : "—"}% of cap · ${c.observations} obs${c.source ? ` · ${c.source}` : ""}${c.observedFrom ? ` · ${c.observedFrom}→${c.observedTo}` : ""}`;
}

function ComponentCell({ c, kind }: { c: ExitComponent; kind: ExitComponent["key"] }) {
  const label = componentLabel(c.key);
  if (c.status !== "available" || c.z === null) {
    return (
      <div className="min-w-[54px]" data-tip={componentTip(c)}>
        <div className="faint text-[9px] uppercase tracking-wider">{label}</div>
        <div className="faint mono text-[11px]">—</div>
      </div>
    );
  }
  // Display the signed z exactly as computed — positive z means above-cohort
  // pressure in that component's own direction (exit-side for INST/FOR/INS,
  // absorb-side for RET). Color marks the cohort role, not the sign.
  const z = c.z;
  const color =
    kind === "instExit"
      ? "var(--cohort-inst)"
      : kind === "retailAbsorb"
        ? "var(--cohort-retail)"
        : z >= 0
          ? "var(--dist)"
          : "var(--acc)";
  const pct = Math.min(100, (Math.abs(z) / 3) * 100);
  return (
    <div className="min-w-[54px]" data-tip={componentTip(c)}>
      <div className="faint text-[9px] uppercase tracking-wider">{label}</div>
      <div className="mono text-[11px] leading-tight" style={{ color }}>
        {z >= 0 ? "+" : "−"}
        {Math.abs(z).toFixed(1)}
      </div>
      <div className="gauge mt-1">
        <i style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function Row({ row, rank }: { row: ExitWatchRow; rank: number }) {
  const hot = row.score !== null && row.score >= 75;
  // One focus stop per row exposes every component's evidence (z · raw · obs ·
  // window); the dossier page holds the full breakdown. Per-cell data-tips stay
  // hover-only for mouse users.
  const groupTip = row.components.map(componentTip).join("\n");
  return (
    <tr className={`row-hover border-b border-line/60 ${hot ? "row-signal" : ""}`}>
      <td className="mono py-3 pl-1 pr-4 text-[11px] faint">{String(rank).padStart(2, "0")}</td>
      <td className="tapcell py-3 pr-4">
        <Link
          href={`/stock/${row.symbol.replace(".JK", "")}`}
          className="taplink mono text-[13px] font-semibold tracking-wide"
        >
          {row.symbol.replace(".JK", "")}
        </Link>
      </td>
      <td className="py-3 pr-4">
        <ExitPressureBadge score={row.score} coverage={row.coverage} />
      </td>
      <td className="hidden py-3 pr-4 md:table-cell">
        <div className="flex gap-4" role="group" aria-label={`Component evidence for ${row.symbol.replace(".JK", "")}`} tabIndex={0} data-ftip={groupTip}>
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

// KPI cell inside the hairline stats band.
function StatCell({ label, value, sub, color }: { label: string; value: ReactNode; sub?: ReactNode; color?: string }) {
  return (
    <div className="bg-bg px-2.5 py-2">
      <div className="mono text-[9px] uppercase tracking-[0.12em] faint">{label}</div>
      <div className="mono mt-0.5 text-[15px] font-semibold tabular-nums" style={color ? { color } : undefined}>
        {value}
      </div>
      {sub && <div className="mono mt-0.5 text-[9px] faint">{sub}</div>}
    </div>
  );
}

export default async function BoardPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  if (params.v === "radar") {
    const filter = typeof params.f === "string" ? params.f : "all";
    return <RadarBoardView filter={filter} />;
  }

  const PAGE_SIZE = 150;
  const scope = typeof params.scope === "string" ? params.scope : "all";
  const pageParam = Number(typeof params.page === "string" ? params.page : "1");
  const [board, market] = await Promise.all([getExitBoard(), getMarketContext()]);
  // "Flagged" = alert flags only; sparse_broker is coverage context, not an alert.
  const flagged = board.rows.filter((r) => r.flags.suspension_recent || r.flags.corp_action_near || r.flags.float_constraint);
  const suppressed = board.rows.filter((r) => r.score === null);
  const base = scope === "flagged" ? flagged : scope === "suppressed" ? suppressed : board.rows.filter((r) => r.score !== null);
  const pageCount = Math.max(1, Math.ceil(base.length / PAGE_SIZE));
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? Math.min(pageParam, pageCount) : 1;
  const shown = base.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageHref = (p: number) => {
    const q = new URLSearchParams();
    if (scope !== "all") q.set("scope", scope);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">Exit Watch</h1>
          <p className="mt-1 max-w-2xl text-[13px] dim">
            Which cohorts appear to be leaving, and who is absorbing.
          </p>
        </div>
        <Link href="/?v=radar" className="mono faint text-[10px] uppercase tracking-wider hover:text-ink">
          View: <span className="acc">Radar v2</span>
        </Link>
      </div>

      {/* Stats band — hairline grid; the read at a glance before the tape. */}
      <section className="grid grid-cols-4 gap-px border border-line bg-line/70 sm:grid-cols-8">
        {market.ihsg ? (
          <StatCell
            label={`IHSG · ${market.ihsg.date}`}
            value={market.ihsg.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            sub={
              market.ihsg.changePct !== null ? (
                <span className={market.ihsg.changePct < 0 ? "dist" : "acc"}>
                  {market.ihsg.changePct >= 0 ? "+" : ""}
                  {market.ihsg.changePct.toFixed(2)}%
                </span>
              ) : undefined
            }
          />
        ) : (
          <StatCell label="IHSG" value="—" />
        )}
        <StatCell label="Scored" value={board.counts.publishable} sub={`of ${board.rows.length}`} />
        <StatCell label="High ≥75" value={board.counts.high} color="var(--dist)" />
        <StatCell label="Elev ≥55" value={board.counts.elevated} color="var(--watch)" />
        <StatCell label="Watch ≥35" value={board.counts.watch} color="var(--sky)" />
        <StatCell label="Low" value={board.counts.low} color="var(--ink-dim)" />
        <StatCell label="Suppressed" value={board.counts.insufficient} color="var(--ink-faint)" />
        <StatCell label="Flagged" value={flagged.length} color="var(--watch)" />
      </section>

      {(market.mostTraded.rows.length > 0 || market.ihsg) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border border-line px-2.5 py-1.5">
          {market.mostTraded.rows.length > 0 && (
            <span className="mono flex flex-wrap items-center gap-x-2 text-[10px] uppercase tracking-wider faint">
              Heaviest vol <span className="normal-case">{market.mostTraded.date}</span>
              {market.mostTraded.rows.map((r) => (
                <Link key={r.symbol} href={`/stock/${r.symbol.replace(".JK", "")}`} className="text-ink hover:text-acc">
                  {r.symbol.replace(".JK", "")}
                </Link>
              ))}
            </span>
          )}
          <span className="mono ml-auto text-[9px] uppercase tracking-wider faint">EOD {board.asOf}</span>
        </div>
      )}

      <DataStatus asOf={board.asOf} />

      {!board.rows.length && (
        <div className="panel p-6 text-sm dim">
          Exit Watch feeds are not ingested yet in this environment. Run <code className="mono">npm run ingest</code> then{" "}
          <code className="mono">npm run compute -- --as-of YYYY-MM-DD</code> to build the local snapshot.
        </div>
      )}

      {board.rows.length > 0 && (
        <section>
          <div className="tabbar mb-1">
            {SCOPES.map((s) => (
              <Link
                key={s.key}
                href={s.key === "all" ? "/" : `/?scope=${s.key}`}
                aria-current={scope === s.key ? "page" : undefined}
                className={`tab ${scope === s.key ? "tab-active" : ""}`}
              >
                {s.label}
                {s.key === "flagged" && <span className="faint"> {flagged.length}</span>}
                {s.key === "suppressed" && <span className="faint"> {suppressed.length}</span>}
              </Link>
            ))}
          </div>

          <div className="table-sticky">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider faint">
                  <th className="mono py-2 pl-1 pr-4 font-normal">#</th>
                  <th className="mono py-2 pr-4 font-normal">Issuer</th>
                  <th className="mono py-2 pr-4 font-normal">Exit pressure</th>
                  <th className="mono hidden py-2 pr-4 font-normal md:table-cell">
                    Components (z · INST/FOR/INS exit-side · RET absorb-side)
                  </th>
                  <th className="mono py-2 font-normal">Flags</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {shown.map((row, i) => (
                  <Row key={row.symbol} row={row} rank={(page - 1) * PAGE_SIZE + i + 1} />
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

          {pageCount > 1 && (
            <nav aria-label="Board pages" className="mt-3 flex items-center gap-3 text-[11px]">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="mono blue">
                  ← Prev
                </Link>
              ) : (
                <span className="mono faint">← Prev</span>
              )}
              <span className="mono faint">
                Page {page} of {pageCount} · {(page - 1) * PAGE_SIZE + 1}–
                {(page - 1) * PAGE_SIZE + shown.length} of {base.length}
              </span>
              {page < pageCount ? (
                <Link href={pageHref(page + 1)} className="mono blue">
                  Next →
                </Link>
              ) : (
                <span className="mono faint">Next →</span>
              )}
            </nav>
          )}

          {scope === "all" && suppressed.length > 0 && (
            <p className="mt-4 text-xs dim">
              {suppressed.length} issuers suppressed: insufficient component coverage to publish a reading.{" "}
              <Link href="/?scope=suppressed" className="blue">
                View suppressed →
              </Link>
            </p>
          )}

          <p className="mt-4 text-[10px] faint">
            Exit pressure is a bounded descriptive reading over labeled broker-cohort flow, foreign flow, and reported
            insider transactions; not proof of intent or a prediction. Coverage gate ≥0.5 · feeds hashed in manifest ·{" "}
            <Link href="/methodology" className="blue">
              methodology
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
