// Dashboard — one board over both engines: the v2 positioning index
// (−100…+100, accumulation side surfaces first) and the v3 distribution
// pressure reading (0–100, the risk side). Legacy ?v=radar / ?f=… links land
// here; the standalone v2 board is gone.

import Link from "next/link";
import { getExitBoard, getMarketContext, getRadarBoard } from "@/lib/services";
import { PressureBadge } from "@/components/PressureBadge";
import { FlagChips } from "@/components/FlagChips";
import { Pager, TABLE_PAGE_SIZE, pageHref, paginate } from "@/components/Pager";
import DataStatus from "@/components/DataStatus";
import { BoardAside } from "@/components/BoardAside";
import Sparkline from "@/components/Sparkline";
import { StatStrip, Stat } from "@/components/StatStrip";
import { ScoreMarker } from "@/components/widgets";
import { scoreColor } from "@/components/fmt";
import type { ComponentKey, ComponentV2, ExitComponent, ExitFlags, ScoreV2 } from "@/lib/types";

export const dynamic = "force-dynamic";

const SCOPES = [
  { key: "all", label: "All" },
  { key: "accumulation", label: "Accumulation" },
  { key: "distribution", label: "Distribution" },
  { key: "pressure", label: "Pressure" },
  { key: "flagged", label: "Flagged" },
  { key: "suppressed", label: "Suppressed" },
] as const;

// Old links keep working: v3 scopes are unchanged, and the v2 board's ?f=
// filters map onto the matching scope.
const LEGACY_SCOPE: Record<string, string> = {
  positive: "accumulation",
  negative: "distribution",
  akumulasi: "accumulation",
  distribusi: "distribution",
};

interface BoardRow {
  symbol: string;
  pos: number | null;      // v2 positioning index −100..+100
  pressure: number | null; // v3 distribution pressure 0–100
  coverage: number;        // v3 component coverage
  components: ExitComponent[];
  flags: ExitFlags | null;
}

const isFlagged = (r: BoardRow) =>
  !!r.flags && (r.flags.suspension_recent || r.flags.corp_action_near || r.flags.float_constraint);

const SCOPE_FILTER: Record<string, (r: BoardRow) => boolean> = {
  all: (r) => r.pos !== null || r.pressure !== null,
  accumulation: (r) => r.pos !== null && r.pos >= 25,
  distribution: (r) => r.pos !== null && r.pos <= -25,
  pressure: (r) => r.pressure !== null && r.pressure >= 55,
  flagged: isFlagged,
  suppressed: (r) => r.pos === null && r.pressure === null,
};

const byPosition = (a: BoardRow, b: BoardRow) =>
  (b.pos ?? -Infinity) - (a.pos ?? -Infinity) ||
  (b.pressure ?? -Infinity) - (a.pressure ?? -Infinity) ||
  a.symbol.localeCompare(b.symbol);

// Hero lists: top-N per side, long enough to read as a tape, short enough that
// the contrast registers before the first scroll.
const HERO_COUNT = 8;

// Hero rows carry plain-language drivers instead of z-scores: the label is the
// top-contributing component, so the wording stays honest to the evidence.
const PRESSURE_DRIVER: Record<ExitComponent["key"], string> = {
  instExit: "Institutional selling",
  foreignExit: "Foreign outflow",
  insiderExit: "Insider selling",
  retailAbsorb: "Retail absorbing",
};

const ACC_DRIVER: Record<ComponentKey, string> = {
  insiderZ: "Insider buying",
  foreignTrend: "Foreign inflow",
  instNetZ: "Institutional brokers",
  retailExodusZ: "Retail thinning",
  fclassShift: "Foreign holder shift",
};

function pressureDrivers(row: BoardRow): string {
  return row.components
    .filter((c) => c.status === "available" && c.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 2)
    .map((c) => PRESSURE_DRIVER[c.key])
    .join(" · ");
}

function accDrivers(s: ScoreV2): string {
  return (Object.keys(ACC_DRIVER) as ComponentKey[])
    .map((k) => ({ k, c: s.components[k] }))
    .filter((x): x is { k: ComponentKey; c: ComponentV2 } => x.c?.status === "available" && x.c.contribution > 0)
    .sort((a, b) => b.c.contribution - a.c.contribution)
    .slice(0, 2)
    .map((x) => ACC_DRIVER[x.k])
    .join(" · ");
}

const COMPONENT_META: { key: ExitComponent["key"]; label: string; hint: string }[] = [
  { key: "instExit", label: "INST", hint: "Net flow of brokers classified institutional, normalized by market cap" },
  { key: "foreignExit", label: "FOR", hint: "Net foreign flow normalized by market cap" },
  { key: "insiderExit", label: "INS", hint: "Reported insider sell value (90d) normalized by market cap" },
  { key: "retailAbsorb", label: "RET", hint: "Net flow of brokers classified retail: absorption side" },
];

function componentTip(key: ExitComponent["key"], c: ExitComponent | undefined): string {
  const label = COMPONENT_META.find((m) => m.key === key)?.label ?? key;
  if (!c || c.status !== "available" || c.z === null) {
    return `${label}: n/a · ${c?.reason ?? "no usable evidence for this component in the window"}`;
  }
  const z = c.z;
  return `${label}: z ${z >= 0 ? "+" : "−"}${Math.abs(z).toFixed(2)} · raw ${c.raw !== null ? `${c.raw >= 0 ? "+" : "−"}${Math.abs(c.raw).toFixed(3)}` : "—"}% of cap · ${c.observations} obs${c.source ? ` · ${c.source}` : ""}${c.observedFrom ? ` · ${c.observedFrom}→${c.observedTo}` : ""}`;
}

function ComponentCell({ c, meta }: { c: ExitComponent | undefined; meta: (typeof COMPONENT_META)[number] }) {
  if (!c || c.status !== "available" || c.z === null) {
    return (
      <div className="min-w-[54px]" data-tip={componentTip(meta.key, c)}>
        <div className="faint text-[9px] uppercase tracking-wider">{meta.label}</div>
        <div className="faint mono text-[11px]">—</div>
      </div>
    );
  }
  // Display the signed z exactly as computed — positive z means above-cohort
  // pressure in that component's own direction (exit-side for INST/FOR/INS,
  // absorb-side for RET). Color marks the cohort role, not the sign.
  const z = c.z;
  const color =
    meta.key === "instExit"
      ? "var(--cohort-inst)"
      : meta.key === "retailAbsorb"
        ? "var(--cohort-retail)"
        : z >= 0
          ? "var(--dist)"
          : "var(--acc)";
  const pct = Math.min(100, (Math.abs(z) / 3) * 100);
  return (
    <div className="min-w-[54px]" data-tip={componentTip(meta.key, c)}>
      <div className="faint text-[9px] uppercase tracking-wider">{meta.label}</div>
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

function Row({ row, rank, spark }: { row: BoardRow; rank: number; spark: number[] }) {
  // Edge stripes are state, not decor (DESIGN.md): dist edge = pressure ≥75,
  // acc edge = positioning ≥+50. Dist wins conflicts — risk outranks momentum.
  const stripe =
    row.pressure !== null && row.pressure >= 75
      ? "row-signal"
      : row.pos !== null && row.pos >= 50
        ? "row-signal-acc"
        : "";
  // One focus stop per row exposes every component's evidence (z · raw · obs ·
  // window); the dossier page holds the full breakdown. Per-cell data-tips stay
  // hover-only for mouse users.
  const groupTip = COMPONENT_META.map((m) =>
    componentTip(m.key, row.components.find((c) => c.key === m.key)),
  ).join("\n");
  return (
    <tr className={`row-hover border-b border-line/60 ${stripe}`}>
      <td className="mono py-3 pl-1 pr-4 text-[11px] faint">{String(rank).padStart(2, "0")}</td>
      <td className="tapcell py-3 pr-4">
        <Link
          href={`/stock/${row.symbol.replace(".JK", "")}`}
          className="taplink mono text-[13px] font-semibold tracking-wide"
        >
          {row.symbol.replace(".JK", "")}
        </Link>
      </td>
      <td className="hidden py-2 pr-4 lg:table-cell">
        <Sparkline values={spark} cumulative />
      </td>
      <td className="py-3 pr-4 text-right">
        {row.pos === null ? (
          <span className="mono faint text-xs">—</span>
        ) : (
          <span className="inline-flex flex-col items-end gap-1">
            <span className={`mono text-[13px] font-bold tabular-nums leading-none ${scoreColor(row.pos)}`}>
              {row.pos > 0 ? "+" : ""}
              {row.pos}
            </span>
            <ScoreMarker score={row.pos} />
          </span>
        )}
      </td>
      <td className="py-3 pr-4">
        <PressureBadge score={row.pressure} coverage={row.coverage} />
      </td>
      <td className="hidden py-3 pr-4 md:table-cell">
        <div className="flex gap-4" role="group" aria-label={`Component evidence for ${row.symbol.replace(".JK", "")}`} tabIndex={0} data-ftip={groupTip}>
          {COMPONENT_META.map((m) => (
            <ComponentCell key={m.key} meta={m} c={row.components.find((c) => c.key === m.key)} />
          ))}
        </div>
      </td>
      <td className="py-3">{row.flags ? <FlagChips flags={row.flags} /> : <span className="mono faint text-xs">—</span>}</td>
    </tr>
  );
}

// Hero rows: ticker · plain-language driver · sparkline · score. The whole row
// is the dossier link — the answer lands on the list, evidence one click deep.
function HeroAccRow({ s, spark }: { s: ScoreV2; spark: number[] }) {
  const symbol = s.symbol.replace(".JK", "");
  return (
    <li>
      <Link
        href={`/stock/${symbol}`}
        className="row-hover flex items-center gap-3 border-b border-line/60 px-3.5 py-2.5"
        aria-label={`${symbol}: positioning index ${s.score === null ? "unavailable" : `${s.score > 0 ? "+" : ""}${s.score}`}`}
      >
        <span className="mono w-16 shrink-0 text-[13px] font-bold tracking-wide">{symbol}</span>
        <span className="min-w-0 flex-1 truncate text-[11px] dim">{accDrivers(s)}</span>
        <span className="hidden shrink-0 sm:block">
          <Sparkline values={spark} cumulative />
        </span>
        <span className={`mono text-base font-bold tabular-nums ${scoreColor(s.score ?? 0)}`}>
          {s.score === null ? "—" : `${s.score > 0 ? "+" : ""}${s.score}`}
        </span>
      </Link>
    </li>
  );
}

function HeroPressureRow({ row, spark }: { row: BoardRow; spark: number[] }) {
  const symbol = row.symbol.replace(".JK", "");
  const p = row.pressure ?? 0;
  const color = p >= 75 ? "var(--dist)" : p >= 55 ? "var(--watch)" : p >= 35 ? "var(--ink-dim)" : "var(--acc)";
  return (
    <li>
      <Link
        href={`/stock/${symbol}`}
        className="row-hover flex items-center gap-3 border-b border-line/60 px-3.5 py-2.5"
        aria-label={`${symbol}: distribution pressure ${row.pressure ?? "unavailable"}`}
      >
        <span className="mono w-16 shrink-0 text-[13px] font-bold tracking-wide">{symbol}</span>
        <span className="min-w-0 flex-1 truncate text-[11px] dim">{pressureDrivers(row)}</span>
        <span className="hidden shrink-0 xl:flex">{row.flags ? <FlagChips flags={row.flags} /> : null}</span>
        <span className="hidden shrink-0 sm:block">
          <Sparkline values={spark} cumulative />
        </span>
        <span className="mono text-base font-bold tabular-nums" style={{ color }}>
          {row.pressure ?? "—"}
        </span>
      </Link>
    </li>
  );
}

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;

  const rawScope =
    typeof params.scope === "string" ? params.scope : typeof params.f === "string" ? params.f : "all";
  const scope = LEGACY_SCOPE[rawScope] ?? (rawScope in SCOPE_FILTER ? rawScope : "all");

  const [board, market, radar] = await Promise.all([getExitBoard(), getMarketContext(), getRadarBoard()]);

  // Merge engines by symbol. v2-only rows surface with pressure "—".
  const posBySymbol = new Map(radar.scores.map((s) => [s.symbol, s.score]));
  const rows: BoardRow[] = board.rows.map((r) => ({
    symbol: r.symbol,
    pos: posBySymbol.get(r.symbol) ?? null,
    pressure: r.score,
    coverage: r.coverage,
    components: r.components,
    flags: r.flags,
  }));
  const seen = new Set(board.rows.map((r) => r.symbol));
  for (const s of radar.scores) {
    if (seen.has(s.symbol)) continue;
    rows.push({ symbol: s.symbol, pos: s.score, pressure: null, coverage: 0, components: [], flags: null });
  }

  const base = rows.filter(SCOPE_FILTER[scope]);
  const sorted =
    scope === "distribution"
      ? [...base].sort((a, b) => (a.pos ?? Infinity) - (b.pos ?? Infinity) || a.symbol.localeCompare(b.symbol))
      : scope === "pressure"
        ? [...base].sort((a, b) => (b.pressure ?? -Infinity) - (a.pressure ?? -Infinity) || a.symbol.localeCompare(b.symbol))
        : [...base].sort(byPosition);
  const pg = paginate(sorted, params.page);
  const shown = pg.rows;
  const page = pg.page;
  const hrefFor = pageHref("/", "page", { scope: scope === "all" ? undefined : scope });

  const nAcc = rows.filter((r) => r.pos !== null && r.pos >= 25).length;
  const nDist = rows.filter((r) => r.pos !== null && r.pos <= -25).length;
  const nPressure = rows.filter((r) => r.pressure !== null && r.pressure >= 55).length;
  const nFlagged = rows.filter(isFlagged).length;
  const nSuppressed = rows.filter(SCOPE_FILTER.suppressed).length;

  // The 5-second read: strongest accumulation-side names on the left,
  // strongest exit-side pressure on the right.
  const topAcc = radar.scores
    .filter((s) => s.score !== null && s.score >= 25)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, HERO_COUNT);
  const topPressure = rows
    .filter((r) => r.pressure !== null)
    .sort((a, b) => (b.pressure ?? 0) - (a.pressure ?? 0))
    .slice(0, HERO_COUNT);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mono faint text-[10px] uppercase tracking-wider">
            EOD {board.asOf} · {radar.universe} issuers
          </p>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight">Dashboard</h1>
        </div>
      </div>

      {/* Slim strip: only the numbers that carry today's story. Component
          counts and coverage tiers live on the tabs, not up here. */}
      <StatStrip>
        {market.ihsg ? (
          <Stat
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
          <Stat label="IHSG" value="—" />
        )}
        <Stat label="Accumulating" value={nAcc} color="var(--acc)" sub="index ≥ +25" />
        <Stat label="Under pressure" value={nPressure} color="var(--dist)" sub="score ≥ 55" />
        <Stat label="Flagged" value={nFlagged} color="var(--watch)" />
      </StatStrip>

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
        </div>
      )}

      <DataStatus asOf={board.asOf} />

      {!rows.length && (
        <div className="panel p-6 text-sm dim">
          Board feeds are not ingested yet in this environment. Run <code className="mono">npm run ingest</code> then{" "}
          <code className="mono">npm run compute -- --as-of YYYY-MM-DD</code> to build the local snapshot.
        </div>
      )}

      {rows.length > 0 && (
        <>
          {/* The answer, side by side. Accumulating leads on mobile: the first
              thing a visitor looks for is what smart money is buying. */}
          <section
            aria-label="Top reads"
            className="grid gap-px overflow-hidden border border-line bg-line/70 md:grid-cols-2"
            style={{ borderRadius: "var(--radius-sm)" }}
          >
            <div className="bg-panel">
              <header className="flex items-baseline justify-between border-b border-line px-3.5 py-2.5">
                <h2 className="mono text-[11px] font-semibold uppercase tracking-[0.14em] acc">▲ Accumulating</h2>
                <span className="mono faint text-[10px]">{nAcc} issuers</span>
              </header>
              <ul>
                {topAcc.map((s) => (
                  <HeroAccRow key={s.symbol} s={s} spark={radar.sparks[s.symbol] ?? []} />
                ))}
                {!topAcc.length && (
                  <li className="px-3.5 py-6 text-center text-xs dim">
                    No issuer reads accumulation-side in this snapshot.
                  </li>
                )}
              </ul>
              <Link href="/?scope=accumulation" className="block px-3.5 py-2.5 text-[11px] blue">
                All {nAcc} accumulating →
              </Link>
            </div>
            <div className="bg-panel">
              <header className="flex items-baseline justify-between border-b border-line px-3.5 py-2.5">
                <h2 className="mono text-[11px] font-semibold uppercase tracking-[0.14em] dist">▼ Under pressure</h2>
                <span className="mono faint text-[10px]">{nPressure} issuers</span>
              </header>
              <ul>
                {topPressure.map((row) => (
                  <HeroPressureRow key={row.symbol} row={row} spark={radar.sparks[row.symbol] ?? []} />
                ))}
                {!topPressure.length && (
                  <li className="px-3.5 py-6 text-center text-xs dim">No scored pressure readings in this snapshot.</li>
                )}
              </ul>
              <Link href="/?scope=pressure" className="block px-3.5 py-2.5 text-[11px] blue">
                All {nPressure} under pressure →
              </Link>
            </div>
          </section>

        {/* Detail layer: the merged instrument table behind scope tabs. */}
        <div id="board" className="grid gap-8 xl:grid-cols-[1fr_300px]">
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
                {s.key === "accumulation" && <span className="faint"> {nAcc}</span>}
                {s.key === "distribution" && <span className="faint"> {nDist}</span>}
                {s.key === "pressure" && <span className="faint"> {nPressure}</span>}
                {s.key === "flagged" && <span className="faint"> {nFlagged}</span>}
                {s.key === "suppressed" && <span className="faint"> {nSuppressed}</span>}
              </Link>
            ))}
          </div>

          <div className="table-sticky">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider faint">
                  <th className="mono py-2 pl-1 pr-4 font-normal">#</th>
                  <th className="mono py-2 pr-4 font-normal">Issuer</th>
                  <th className="mono hidden py-2 pr-4 font-normal lg:table-cell">Flow</th>
                  <th className="mono py-2 pr-4 font-normal text-right">Positioning</th>
                  <th className="mono py-2 pr-4 font-normal">Pressure</th>
                  <th className="mono hidden py-2 pr-4 font-normal md:table-cell">
                    Components (z · INST/FOR/INS pressure-side · RET absorb-side)
                  </th>
                  <th className="mono py-2 font-normal">Flags</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {shown.map((row, i) => (
                  <Row key={row.symbol} row={row} rank={(page - 1) * TABLE_PAGE_SIZE + i + 1} spark={radar.sparks[row.symbol] ?? []} />
                ))}
                {!shown.length && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center dim">
                      No issuers in this scope for the saved snapshot.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pager s={pg} href={hrefFor} />

          {scope === "all" && nSuppressed > 0 && (
            <p className="mt-4 text-xs dim">
              {nSuppressed} issuers unscored: insufficient component coverage on either engine to publish a reading.{" "}
              <Link href="/?scope=suppressed" className="blue">
                View suppressed →
              </Link>
            </p>
          )}

          <p className="mt-4 text-[10px] faint">
            Positioning (−100 to +100) compares issuers on observed accumulation versus distribution evidence;
            pressure (0–100) is a bounded reading over labeled broker-cohort flow, foreign flow, and reported insider
            transactions. Neither is proof of intent or a prediction. Coverage gate ≥0.5 · feeds hashed in manifest ·{" "}
            <Link href="/methodology" className="blue">
              methodology
            </Link>
          </p>
        </section>
        <BoardAside recentInsider={radar.recentInsider} topCases={radar.topCases} />
        </div>
        </>
      )}
    </div>
  );
}
