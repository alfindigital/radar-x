// RADAR-X ingest pipeline. Usage:
//   npx tsx scripts/ingest.ts filings [--months 6] [--full]
//   npx tsx scripts/ingest.ts tickers
//   npx tsx scripts/ingest.ts taxonomy [--full] [--limit N]
//   npx tsx scripts/ingest.ts flows|prices|holders|broker [--limit N]
// Env: reads .env.local (SECTORS_API_KEY, DATA_SOURCE)

import { readFileSync } from "fs";
import path from "path";

// --- minimal .env.local loader (no deps) ---
try {
  const envPath = path.join(process.cwd(), ".env.local");
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
} catch {
  /* .env.local optional in CI/prod (env injected) */
}

import { api, universeAll, type FilingRaw } from "../src/lib/sectors";
import { getStore } from "../src/lib/db";
import { loadRotation, type RotationSubsector, type SectorRotationArtifact } from "../src/lib/rotation";
import { loadTaxonomy, slugifyTaxonomy, type TaxonomyArtifact, type TaxonomyRow } from "../src/lib/taxonomy";
import { writeFile } from "fs/promises";
import type {
  BrokerSummaryRow,
  FlowDaily,
  HoldersMonthly,
  InsiderTrade,
  PriceDaily,
  Ticker,
} from "../src/lib/types";

const store = getStore();
const args = process.argv.slice(2);
const cmd = args[0];
const flag = (name: string, def?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};

function monthChunks(months: number): { start: string; end: string }[] {
  const chunks: { start: string; end: string }[] = [];
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  for (let i = months - 1; i >= 0; i--) {
    const s = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const e = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0));
    const end = e.toISOString().slice(0, 10);
    chunks.push({ start: s.toISOString().slice(0, 10), end: end > today ? today : end });
  }
  return chunks;
}

function mapFiling(f: FilingRaw): InsiderTrade | null {
  const txnDate = f.price_transaction?.[0]?.date ?? f.timestamp?.slice(0, 10);
  if (!f.symbol || !txnDate || !f.holder_name) return null;
  const clusterMatch = f.body?.match(/cluster-(buy|sell)/i);
  return {
    symbol: f.symbol,
    holderName: f.holder_name,
    holderType: f.holder_type ?? "insider",
    txnType: (f.transaction_type as InsiderTrade["txnType"]) ?? "others",
    txnDate,
    filedAt: f.timestamp,
    amount: f.amount_transaction ?? 0,
    price: f.price ?? 0,
    value: f.transaction_value ?? 0,
    pctBefore: f.share_percentage_before,
    pctAfter: f.share_percentage_after,
    clusterHint: clusterMatch ? `cluster-${clusterMatch[1].toLowerCase()}` : null,
    sourceUrl: f.source,
  };
}

async function ingestFilings() {
  // --from/--to (inclusive) overrides --months for targeted gap-fills.
  const from = flag("from");
  const to = flag("to", new Date().toISOString().slice(0, 10));
  const chunks = from ? [{ start: from, end: to! }] : monthChunks(Number(flag("months", "6")));
  let totalAdded = 0;
  let calls = 0;
  for (const c of chunks) {
    let offset = 0;
     
    while (true) {
      const res = await api.filings({ start: c.start, end: c.end, limit: 100, offset });
      calls++;
      const mapped = res.results.map(mapFiling).filter((r): r is InsiderTrade => r !== null);
      totalAdded += await store.upsertInsiderTrades(mapped);
      if (!res.pagination?.has_next || res.results.length === 0) break;
      offset += res.results.length;
    }
  }
  await store.log("ingest_filings", calls, totalAdded, "ok");
  console.log(`filings: +${totalAdded} rows (${calls} calls, ${chunks.length}mo)`);
}

async function ingestTickers() {
  let offset = 0;
  const rows: Ticker[] = [];
  let calls = 0;
   
  while (true) {
    const res = await api.companies({ limit: 100, offset });
    calls++;
    rows.push(...res.results.map((r) => ({ symbol: r.symbol, name: r.company_name, subSector: null })));
    if (!res.pagination.has_next) break;
    offset = res.pagination.next_offset ?? offset + res.results.length;
  }
  await store.upsertTickers(rows);
  await store.log("ingest_tickers", calls, rows.length, "ok");
  console.log(`tickers: ${rows.length} (${calls} calls)`);
}

async function watchlist(): Promise<string[]> {
  // Union of insider-active symbols + top tickers already stored.
  const insider = await store.listInsiderTrades({ limit: 10000 });
  const active = [...new Set(insider.map((r) => r.symbol))];
  return active;
}

async function missing(kind: "flow" | "price" | "holders" | "broker", syms: string[]): Promise<string[]> {
  if (!args.includes("--only-missing")) return syms;
  const out: string[] = [];
  for (const s of syms) {
    const n =
      kind === "flow"
        ? (await store.listFlowDaily(s)).length
        : kind === "price"
          ? (await store.listPriceDaily(s)).length
          : kind === "holders"
            ? (await store.getHolders(s)).length
            : (await store.listBrokerRows(s)).length;
    if (n === 0) out.push(s);
  }
  return out;
}

async function ingestFlows() {
  const limit = Number(flag("limit", "200"));
  const wl = await missing("flow", (await watchlist()).slice(0, limit));
  let rows = 0;
  let calls = 0;
  for (const sym of wl) {
    try {
      const res = await api.foreignFlowSymbol(sym);
      calls++;
      const mapped: FlowDaily[] = res.data.map((r) => ({
        symbol: res.symbol ?? sym,
        date: r.date,
        netForeignInflow: r.net_foreign_inflow,
        foreignBuyIdr: r.foreign_buy_idr,
        foreignSellIdr: r.foreign_sell_idr,
      }));
      rows += await store.upsertFlowDaily(mapped);
    } catch (e) {
      console.warn(`flow ${sym}: ${e instanceof Error ? e.message : e}`);
    }
  }
  await store.log("ingest_flows", calls, rows, "ok");
  console.log(`flows: ${rows} rows over ${calls} calls (${wl.length} symbols)`);
}

async function ingestPrices() {
  const limit = Number(flag("limit", "200"));
  const wl = await missing("price", (await watchlist()).slice(0, limit));
  let rows = 0;
  let calls = 0;
  for (const sym of wl) {
    try {
      const start = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
      const res = await api.daily(sym, { start });
      calls++;
      const mapped: PriceDaily[] = res.map((r) => ({
        symbol: r.symbol ?? sym,
        date: r.date,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume,
        marketCap: r.market_cap,
      }));
      rows += await store.upsertPriceDaily(mapped);
    } catch (e) {
      console.warn(`price ${sym}: ${e instanceof Error ? e.message : e}`);
    }
  }
  await store.log("ingest_prices", calls, rows, "ok");
  console.log(`prices: ${rows} rows over ${calls} calls (${wl.length} symbols)`);
}

// --universe widens a watchlist-scoped command to the full taxonomy universe.
async function scopeUniverse(): Promise<string[]> {
  const tax = await loadTaxonomy();
  if (tax?.rows.length) return tax.rows.map((r) => r.symbol);
  const rot = await loadRotation();
  return [...new Set(rot?.subsectors.flatMap((s) => s.members) ?? [])];
}

async function ingestHolders() {
  const limit = Number(flag("limit", "200"));
  const wl = args.includes("--universe")
    ? await scopeUniverse()
    : await missing("holders", (await watchlist()).slice(0, limit));
  const batch: HoldersMonthly[] = [];
  let calls = 0;
  for (let i = 0; i < wl.length; i++) {
    const sym = wl[i];
    try {
      const res = await api.shareholdersComposition(sym);
      calls++;
      batch.push(
        ...res.data.map((r) => {
          const local: Record<string, number> = {};
          const foreign: Record<string, number> = {};
          for (const [k, v] of Object.entries(r)) {
            if (k.endsWith("_l") && typeof v === "number") local[k] = v;
            if (k.endsWith("_f") && typeof v === "number") foreign[k] = v;
          }
          return {
            symbol: sym,
            month: r.date,
            sharesNumber: r.shares_number,
            nShareholders: r.numbers_of_shareholders,
            changeInShareholders: r.change_in_shareholders,
            local,
            foreign,
          };
        }),
      );
    } catch (e) {
      console.warn(`holders ${sym}: ${e instanceof Error ? e.message : e}`);
    }
    // Batch upsert every 100 symbols — one file rewrite instead of per-call
    // (per-call rewrite on Windows races AV/file locks and loses billed rows).
    if (batch.length && ((i + 1) % 100 === 0 || i === wl.length - 1)) {
      const added = await store.upsertHolders(batch.splice(0));
      console.log(`holders: ${i + 1}/${wl.length} (+${added} rows, ${calls} calls)`);
    }
  }
  await store.log("ingest_holders", calls, wl.length, "ok");
  console.log(`holders done: ${wl.length} symbols, ${calls} calls`);
}

async function ingestBroker() {
  const limit = Number(flag("limit", "40"));
  const wl = args.includes("--universe")
    ? await scopeUniverse()
    : await missing("broker", (await watchlist()).slice(0, limit));
  const batch = new Map<string, BrokerSummaryRow[]>();
  let rows = 0;
  let calls = 0;
  for (let i = 0; i < wl.length; i++) {
    const sym = wl[i];
    try {
      const res = await api.brokerSummary(sym);
      calls++;
      batch.set(sym, res.data.flatMap((d) =>
        d.summary.map((s) => ({
          symbol: sym,
          date: d.date,
          brokerCode: s.broker_code,
          buyVal: s.bval ?? 0,
          sellVal: s.sval ?? 0,
          netVal: s.nval ?? 0,
          buyLot: s.blot ?? 0,
          sellLot: s.slot ?? 0,
          netLot: s.nlot ?? 0,
          avgBuy: s.bavg_per_share,
          avgSell: s.savg_per_share,
          foreignBuyVal: s.f_bval,
          foreignSellVal: s.f_sval,
        })),
      ));
    } catch (e) {
      console.warn(`broker ${sym}: ${e instanceof Error ? e.message : e}`);
    }
    // Batch upsert every 50 symbols — per-call rewrite races file locks.
    if (batch.size && ((i + 1) % 50 === 0 || i === wl.length - 1)) {
      for (const [s, rows_] of batch) rows += await store.upsertBrokerRows(s, rows_);
      batch.clear();
      console.log(`broker: ${i + 1}/${wl.length} (${calls} calls)`);
    }
  }
  await store.log("ingest_broker", calls, rows, "ok");
  console.log(`broker: ${rows} rows over ${calls} calls (${wl.length} symbols)`);
}

async function ingestIndex() {
  const start = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  const res = await api.indexDailyRange("ihsg", { start });
  const mapped: PriceDaily[] = res.map((r) => ({
    symbol: "^IHSG",
    date: r.date,
    open: r.price,
    high: r.price,
    low: r.price,
    close: r.price,
    volume: 0,
    marketCap: null,
  }));
  const n = await store.upsertPriceDaily(mapped);
  await store.log("ingest_index", 1, n, "ok");
  console.log(`index ihsg: ${n} rows`);
}

// Full-universe refresh: /v2/close/ + /v2/foreign-flow/ per trading day.
// Covers ALL emiten (~25-32 credits/day/feed). Auto-detects missing days from
// stored data; --days N forces an N-calendar-day backfill window.
async function ingestUniverse() {
  const forced = Number(flag("days", "0"));
  const from = flag("from");
  const to = flag("to", new Date().toISOString().slice(0, 10));
  let days: string[];
  if (from) {
    days = [];
    for (let d = new Date(from); d.toISOString().slice(0, 10) <= to!; d = new Date(d.getTime() + 864e5)) {
      days.push(d.toISOString().slice(0, 10));
    }
  } else {
    const n = forced || 3;
    days = [];
    for (let i = n; i >= 0; i--) {
      days.push(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
    }
  }

  const feed = flag("feed", "both"); // both | close | flow
  let calls = 0;
  let priceRows = 0;
  let flowRowsN = 0;
  for (const day of days) {
    let dayHasData = false;
    if (feed !== "flow") {
      try {
        const close = await universeAll(api.closeUniverse, day);
        calls += close.calls;
        dayHasData = close.rows.length > 0;
        priceRows += await store.upsertPriceDaily(
          close.rows.map((r) => ({
            symbol: r.symbol,
            date: r.date,
            open: r.close,
            high: r.close,
            low: r.close,
            close: r.close,
            volume: 0,
            marketCap: null,
          })),
        );
        if (close.rows.length) console.log(`${day}: close=${close.rows.length}`);
      } catch {
        continue; // future/non-trading day → 400 (free), skip
      }
    }
    if (feed === "close") continue;
    let flow;
    try {
      flow = await universeAll(api.flowUniverse, day);
    } catch {
      continue;
    }
    calls += flow.calls;
    if (!dayHasData && flow.rows.length === 0) continue;
    flowRowsN += await store.upsertFlowDaily(
      flow.rows.map((r) => ({
        symbol: r.symbol,
        date: r.date,
        netForeignInflow: r.net_foreign_inflow,
        foreignBuyIdr: r.foreign_buy_idr,
        foreignSellIdr: r.foreign_sell_idr,
      })),
    );
    console.log(`${day}: flow=${flow.rows.length}`);
  }
  await store.log("ingest_universe", calls, priceRows + flowRowsN, "ok");
  console.log(`universe: +${priceRows} prices, +${flowRowsN} flows (${calls} calls)`);
}

// Sector rotation context: /v2/subsectors/ + /v2/subsector/report/{slug}/ per
// subsector → data/sector_rotation.json. Each requested section costs 1 credit
// per subsector (default 4 sections × 33 subsectors ≈ 133 credits). Member
// lists are fetched once via companies?where=sub_sector=… and reused on later
// refreshes unless --refresh-members is passed. Latest stored foreign-flow day
// is aggregated per subsector from the local snapshot at no API cost.
async function ingestRotation() {
  const sections = (flag("sections", "market_cap,statistics,stability,companies") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const existing = await loadRotation();
  const refreshMembers = args.includes("--refresh-members");

  const taxonomy = await api.subsectors();
  let calls = 1;

  const flowRows = await store.listFlowUniverse();
  const latestFlowDate = flowRows.reduce<string | null>((m, r) => (!m || r.date > m ? r.date : m), null);
  const flowBySymbol = new Map<string, number>();
  for (const r of flowRows) {
    if (r.date === latestFlowDate) flowBySymbol.set(r.symbol, r.netForeignInflow);
  }

  const rows: RotationSubsector[] = [];
  for (const t of taxonomy) {
    let rep;
    try {
      rep = await api.subsectorReport(t.subsector, sections);
    } catch (e) {
      console.warn(`rotation ${t.subsector}: ${e instanceof Error ? e.message : e}`);
      continue;
    }
    calls++;

    let members = existing?.subsectors.find((s) => s.slug === t.subsector)?.members ?? [];
    if (refreshMembers || members.length === 0) {
      members = [];
      let offset = 0;
       
      while (true) {
        const res = await api.companies({ where: `sub_sector = '${t.subsector}'`, limit: 100, offset });
        calls++;
        members.push(...res.results.map((r) => r.symbol));
        if (!res.pagination.has_next || res.results.length === 0) break;
        offset = res.pagination.next_offset ?? offset + res.results.length;
      }
    }

    const mc = rep.market_cap;
    const chg = mc?.mcap_summary?.mcap_change;
    const topChange = Object.entries(rep.companies?.top_change_companies ?? {})
      .map(([symbol, c]) => ({
        symbol,
        name: c.name,
        pe: c.pe,
        chg1m: c["1mth"],
        chg1y: c["1yr"],
        lastClose: c.last_close,
      }))
      .sort((a, b) => (b.chg1m ?? -Infinity) - (a.chg1m ?? -Infinity))
      .slice(0, 8);

    const netFlow = members.reduce((sum, sym) => sum + (flowBySymbol.get(sym) ?? 0), 0);
    const hasFlow = members.some((sym) => flowBySymbol.has(sym));

    const vHist = rep.valuation?.historical_valuation ?? null;
    const vYear = vHist ? Object.keys(vHist).sort().at(-1) : undefined;
    const v = vYear ? vHist![vYear] : null;
    const gHist = rep.growth?.weighted_avg_growth_data ?? null;
    const fYears = rep.growth?.growth_forecasts ? Object.keys(rep.growth.growth_forecasts).sort() : [];
    const gF = fYears.length ? rep.growth!.growth_forecasts![fYears.at(-1)!] : null;

    rows.push({
      slug: t.subsector,
      sector: rep.sector ?? t.sector,
      sectorSlug: t.sector,
      subSector: rep.sub_sector ?? t.subsector,
      companyCount: rep.statistics?.total_companies ?? null,
      medianPe: rep.statistics?.filtered_median_pe ?? null,
      weightedPe: rep.statistics?.filtered_weighted_avg_pe ?? null,
      mcapTotal: mc?.total_market_cap ?? null,
      mcapChange1w: chg?.["1w"] ?? null,
      mcapChange1y: chg?.["1y"] ?? null,
      mcapChangeYtd: chg?.ytd ?? null,
      perfQuantile: mc?.mcap_summary?.performance_quantile ?? null,
      monthlyPerf: mc?.mcap_summary?.monthly_performance ?? null,
      maxDrawdown: rep.stability?.weighted_max_drawdown ?? null,
      rsd: rep.stability?.weighted_rsd_close ?? null,
      topChange,
      members: members.sort(),
      netForeignFlow: hasFlow ? netFlow : null,
      flowDate: hasFlow ? latestFlowDate : null,
      valuationLatest: vYear && v
        ? {
            year: vYear,
            pb: v.pb, pe: v.pe, ps: v.ps, pcf: v.pcf,
            pbRank: v.pb_rank ?? null, peRank: v.pe_rank ?? null,
            psRank: v.ps_rank ?? null, pcfRank: v.pcf_rank ?? null,
          }
        : null,
      valuationHist: vHist
        ? Object.fromEntries(
            Object.entries(vHist).map(([y, r]) => [y, { pb: r.pb, pe: r.pe, ps: r.ps, pcf: r.pcf }]),
          )
        : null,
      growthHist: gHist
        ? Object.fromEntries(
            Object.entries(gHist).map(([y, r]) => [y, { earnGrowth: r.avg_annual_earning_growth, revGrowth: r.avg_annual_revenue_growth }]),
          )
        : null,
      growthForecast: gF && fYears.length
        ? { year: fYears.at(-1)!, epsGrowth: gF.eps_growth, revGrowth: gF.revenue_growth }
        : null,
    });
  }

  const asOf = rows
    .flatMap((r) => Object.keys(r.monthlyPerf ?? {}))
    .sort()
    .at(-1) ?? latestFlowDate;

  const artifact: SectorRotationArtifact = {
    schemaVersion: 1,
    engineVersion: "radarx-v2",
    asOf,
    generatedAt: new Date().toISOString(),
    source: "sectors",
    sections,
    creditsEst: calls,
    subsectors: rows.sort((a, b) => a.sectorSlug.localeCompare(b.sectorSlug) || a.slug.localeCompare(b.slug)),
    limitations: [
      "Subsector aggregates are provider-weighted; a single large issuer can dominate mcap_change.",
      "netForeignFlow aggregates the latest stored foreign-flow session over member symbols; symbols without stored flow rows count as zero.",
      "Member lists refresh only with --refresh-members; new listings between refreshes are unmapped.",
    ],
  };
  await writeFile(path.join(process.cwd(), "data", "sector_rotation.json"), JSON.stringify(artifact));
  await store.log("ingest_rotation", calls, rows.length, "ok");
  console.log(`rotation: ${rows.length} subsectors, asOf=${asOf} (${calls} calls)`);
}

// Per-issuer taxonomy: company/report/{symbol}?sections=overview for every
// symbol in the universe → data/taxonomy.json. Mostly static data; re-run is
// incremental — symbols already stored are skipped unless --full is passed.
// Universe comes from sector_rotation.json members (0 calls) or, when absent,
// the companies directory (~10 calls). ~1 credit per symbol.
async function ingestTaxonomy() {
  const rotation = await loadRotation();
  const existing = await loadTaxonomy();
  const done = new Set(existing?.rows.map((r) => r.symbol) ?? []);

  let universe = rotation?.subsectors.flatMap((s) => s.members) ?? [];
  let calls = 0;
  if (universe.length === 0) {
    let offset = 0;
    while (true) {
      const res = await api.companies({ limit: 100, offset });
      calls++;
      universe.push(...res.results.map((r) => r.symbol));
      if (!res.pagination.has_next || res.results.length === 0) break;
      offset = res.pagination.next_offset ?? offset + res.results.length;
    }
  }
  universe = [...new Set(universe)].sort();

  const limit = Number(flag("limit", "0")) || 0;
  const pending = args.includes("--full")
    ? universe
    : universe.filter((s) => !done.has(s) || existing?.misses.includes(s));
  const targets = limit > 0 ? pending.slice(0, limit) : pending;

  const rows: TaxonomyRow[] = args.includes("--full") ? [] : [...(existing?.rows ?? [])];
  const misses: string[] = args.includes("--full") ? [] : [...(existing?.misses ?? [])];

  for (let i = 0; i < targets.length; i++) {
    const sym = targets[i];
    try {
      const rep = await api.companyReport(sym, ["overview"]);
      calls++;
      const o = rep.overview ?? {};
      rows.push({
        symbol: rep.symbol ?? sym,
        companyName: rep.company_name ?? null,
        sector: o.sector ?? null,
        subSector: o.sub_sector ?? null,
        industry: o.industry ?? null,
        subIndustry: o.sub_industry ?? null,
        sectorSlug: slugifyTaxonomy(o.sector),
        subSectorSlug: slugifyTaxonomy(o.sub_sector),
        listingBoard: o.listing_board ?? null,
        marketCap: o.market_cap ?? null,
        listingDate: o.listing_date ?? null,
      });
      const mi = misses.indexOf(sym);
      if (mi >= 0) misses.splice(mi, 1);
    } catch (e) {
      calls++;
      if (!misses.includes(sym)) misses.push(sym);
      console.warn(`taxonomy ${sym}: ${e instanceof Error ? e.message : e}`);
    }
    if ((i + 1) % 100 === 0 || i === targets.length - 1) {
      console.log(`taxonomy: ${i + 1}/${targets.length} (${calls} calls)`);
    }
  }

  const asOf = new Date().toISOString().slice(0, 10);
  const artifact: TaxonomyArtifact = {
    schemaVersion: 1,
    engineVersion: "radarx-v2",
    asOf,
    generatedAt: new Date().toISOString(),
    source: "sectors",
    creditsEst: calls,
    rows: rows.sort((a, b) => a.symbol.localeCompare(b.symbol)),
    misses: misses.sort(),
  };
  await writeFile(path.join(process.cwd(), "data", "taxonomy.json"), JSON.stringify(artifact) + "\n");
  await store.log("ingest_taxonomy", calls, rows.length, "ok");
  console.log(`taxonomy: ${rows.length} mapped, ${misses.length} missed, asOf=${asOf} (${calls} calls)`);
}

async function ingestTopChanges(
  dir: (f: string) => string,
  meta: Record<string, unknown>,
  now: string,
  asOf: string,
): Promise<void> {
  const tc = await api.topChanges();
  const tcFile = dir("top_changes.json");
  let tcArtifact: { snapshots: { date: string; fetchedAt: string; topGainers: unknown; topLosers: unknown }[] } & Record<string, unknown> = { ...meta, snapshots: [] };
  try {
    tcArtifact = JSON.parse(readFileSync(tcFile, "utf8"));
  } catch { /* first run */ }
  const sessionDate =
    (Object.values((tc.top_gainers as Record<string, { latest_close_date?: string }[]>)["1d"] ?? [])[0] as { latest_close_date?: string } | undefined)
      ?.latest_close_date ?? asOf;
  if (!tcArtifact.snapshots.some((s) => s.date === sessionDate)) {
    tcArtifact.snapshots.push({ date: sessionDate, fetchedAt: now, topGainers: tc.top_gainers, topLosers: tc.top_losers });
    tcArtifact.asOf = sessionDate;
  }
  await writeFile(tcFile, JSON.stringify(tcArtifact));
  console.log(`top-changes: ${tcArtifact.snapshots.length} sessions, latest=${sessionDate}`);
}

// Market boards snapshot: index-daily history (≤90d window per index),
// idx-total series, broker registry, free-float per subsector, and a dated
// top-changes snapshot (accreted daily — the endpoint is current-snapshot only,
// no date param, so history must be captured going forward). ≈55 calls total.
async function ingestBoards() {
  const dir = (f: string) => path.join(process.cwd(), "data", f);
  let calls = 0;
  const now = new Date().toISOString();
  const asOf = now.slice(0, 10);
  const meta = { schemaVersion: 1, engineVersion: "radarx-v2" as const, source: "sectors" as const };
  const lite = args.includes("--lite"); // daily mode: 3 calls — top-changes + idx-total + latest index closes merged in

  if (lite) {
    // --- idx-total: append new dates ---
    const idxTotal = await api.idxTotal();
    calls++;
    const itFile = dir("idx_total.json");
    let itArt: { rows: { date: string; idx_total_market_cap: number }[] } & Record<string, unknown> = { ...meta, rows: [] };
    try { itArt = JSON.parse(readFileSync(itFile, "utf8")); } catch { /* first run */ }
    const itHave = new Set(itArt.rows.map((r) => r.date));
    const itNew = idxTotal.filter((r) => !itHave.has(r.date));
    itArt.rows.push(...itNew);
    itArt.asOf = itArt.rows.at(-1)?.date ?? asOf;
    itArt.generatedAt = now;
    await writeFile(itFile, JSON.stringify(itArt));

    // --- latest index closes merged into history ---
    const idxLatest = await api.indexDailyAll();
    calls++;
    const idFile = dir("index_daily.json");
    let idArt: { rows: { indexCode: string; date: string; price: number }[] } & Record<string, unknown> = { ...meta, rows: [] };
    try { idArt = JSON.parse(readFileSync(idFile, "utf8")); } catch { /* first run */ }
    const idHave = new Set(idArt.rows.map((r) => `${r.indexCode}|${r.date}`));
    const idNew = idxLatest.filter((r) => !idHave.has(`${r.index_code}|${r.date}`));
    idArt.rows.push(...idNew.map((r) => ({ indexCode: r.index_code, date: r.date, price: r.price })));
    idArt.asOf = idArt.rows.map((r) => r.date).sort().at(-1) ?? asOf;
    idArt.generatedAt = now;
    await writeFile(idFile, JSON.stringify(idArt));
    console.log(`boards --lite: idx-total +${itNew.length} dates, index +${idNew.length} closes`);

    // --- top-changes dated snapshot ---
    await ingestTopChanges(dir, meta, now, asOf);
    calls++;
    await store.log("ingest_boards_lite", calls, itNew.length + idNew.length, "ok");
    return;
  }

  // --- brokers registry (1 call, static) ---
  const brokers = await api.brokers();
  calls++;
  await writeFile(dir("broker_registry.json"), JSON.stringify({ ...meta, asOf, generatedAt: now, rows: brokers }));
  console.log(`brokers: ${brokers.length}`);

  // --- idx-total (~1 month of daily IDX aggregate mcap) ---
  const idxTotal = await api.idxTotal();
  calls++;
  await writeFile(dir("idx_total.json"), JSON.stringify({ ...meta, asOf, generatedAt: now, rows: idxTotal }));
  console.log(`idx-total: ${idxTotal.length} rows ${idxTotal[0]?.date}..${idxTotal.at(-1)?.date}`);

  // --- index-daily history per index (≤90d window; codes from live list) ---
  const idxCodesResp = await api.indexDailyAll();
  calls++;
  // API path codes are lowercase and strip non-alphanumerics (SRI-KEHATI → srikehati).
  const idxCodes = [...new Set(idxCodesResp.map((r) => r.index_code.toLowerCase().replace(/[^a-z0-9]/g, "")))];
  const idxRows: { indexCode: string; date: string; price: number }[] = [];
  for (const code of idxCodes) {
    try {
      const rows = await api.indexDailyRange(code, { start: "2026-07-01" });
      calls++;
      idxRows.push(...rows.map((r) => ({ indexCode: r.index_code, date: r.date, price: r.price })));
    } catch (e) {
      calls++;
      console.warn(`index ${code}: ${e instanceof Error ? e.message : e}`);
    }
  }
  await writeFile(dir("index_daily.json"), JSON.stringify({ ...meta, asOf, generatedAt: now, rows: idxRows }));
  console.log(`index-daily: ${idxRows.length} rows across ${idxCodes.length} indices`);

  // --- free-float per subsector (33 calls ≈ full IDX) ---
  const taxonomy = await api.subsectors();
  calls++;
  const ffRows: { symbol: string; companyName: string; freeFloat: number | null; subSector: string }[] = [];
  for (const t of taxonomy) {
    try {
      const rows = await api.freeFloat(t.subsector);
      calls++;
      ffRows.push(...rows.map((r) => ({ symbol: r.symbol, companyName: r.company_name, freeFloat: r.free_float, subSector: t.subsector })));
    } catch (e) {
      calls++;
      console.warn(`freefloat ${t.subsector}: ${e instanceof Error ? e.message : e}`);
    }
  }
  await writeFile(dir("free_float.json"), JSON.stringify({ ...meta, asOf, generatedAt: now, rows: ffRows }));
  console.log(`free-float: ${ffRows.length} rows`);

  // --- top-changes daily snapshot (accrete by session date) ---
  await ingestTopChanges(dir, meta, now, asOf);
  calls++;

  await store.log("ingest_boards", calls, brokers.length + idxTotal.length + idxRows.length + ffRows.length, "ok");
  console.log(`boards done (${calls} calls)`);
}

// Ownership layer: company/report/{symbol}?sections=ownership →
// data/ownership.json. Rolling refresh — the N least-recently-fetched symbols
// are pulled each run (default 100, --limit N, --full for all). Time-series
// blocks (institutional flow, top transactions) update on the provider's EOM
// cycle, so a rolling daily pull catches new monthly rows as they publish.
async function ingestOwnership() {
  const file = path.join(process.cwd(), "data", "ownership.json");
  const art = {
    schemaVersion: 1, engineVersion: "radarx-v2" as const, source: "sectors" as const,
    asOf: null as string | null, generatedAt: "", creditsEst: 0,
    refreshed: {} as Record<string, string>,
    holders: [] as { symbol: string; name: string; holderSymbol: string | null; pct: number | null; amount: number | null; value: number | null }[],
    whales: [] as { symbol: string; name: string }[],
    groups: [] as { symbol: string; group: string }[],
    instFlow: [] as { symbol: string; month: string; netTransaction: number }[],
    instTxn: [] as { symbol: string; month: string; side: string; name: string; changeAmount: number }[],
    misses: [] as string[],
  };
  try {
    const prev = JSON.parse(readFileSync(file, "utf8"));
    Object.assign(art, prev);
  } catch { /* first run */ }

  const tax = await loadTaxonomy();
  let universe = tax?.rows.map((r) => r.symbol) ?? [];
  if (!universe.length) {
    const rot = await loadRotation();
    universe = [...new Set(rot?.subsectors.flatMap((s) => s.members) ?? [])];
  }

  const limit = Number(flag("limit", "100")) || 100;
  const sorted = [...universe].sort((a, b) => (art.refreshed[a] ?? "").localeCompare(art.refreshed[b] ?? ""));
  const targets = args.includes("--full") ? universe : sorted.slice(0, limit);

  let calls = 0;
  const now = new Date().toISOString();
  for (let i = 0; i < targets.length; i++) {
    const sym = targets[i];
    try {
      const rep = await api.companyReport(sym, ["ownership"]);
      calls++;
      const o = rep.ownership ?? {};
      const clean = <T extends { symbol: string }>(rows: T[]) => rows.filter((r) => r.symbol !== sym);
      art.holders = clean(art.holders);
      art.whales = clean(art.whales);
      art.groups = clean(art.groups);
      art.instFlow = clean(art.instFlow);
      art.instTxn = clean(art.instTxn);

      for (const h of o.major_shareholders ?? []) {
        art.holders.push({
          symbol: sym, name: h.name, holderSymbol: h.symbol ?? null,
          pct: h.share_percentage == null ? null : Number(h.share_percentage),
          amount: h.share_amount ?? null, value: h.share_value ?? null,
        });
      }
      for (const w of o.whale_investors ?? []) art.whales.push({ symbol: sym, name: w });
      for (const g of o.conglomerates_group ?? []) art.groups.push({ symbol: sym, group: g });
      for (const f of o.institutional_transaction_flow ?? [])
        art.instFlow.push({ symbol: sym, month: f.date, netTransaction: f.net_transaction });
      const tt = o.top_transactions;
      for (const b of tt?.top_buyers ?? [])
        art.instTxn.push({ symbol: sym, month: tt?.date ?? "", side: "buy", name: b.name, changeAmount: b.changeAmount });
      for (const s of tt?.top_sellers ?? [])
        art.instTxn.push({ symbol: sym, month: tt?.date ?? "", side: "sell", name: s.name, changeAmount: s.changeAmount });

      art.refreshed[sym] = now;
      const mi = art.misses.indexOf(sym);
      if (mi >= 0) art.misses.splice(mi, 1);
    } catch (e) {
      calls++;
      if (!art.misses.includes(sym)) art.misses.push(sym);
      console.warn(`ownership ${sym}: ${e instanceof Error ? e.message : e}`);
    }
    if ((i + 1) % 50 === 0 || i === targets.length - 1) {
      console.log(`ownership: ${i + 1}/${targets.length} (${calls} calls)`);
      // checkpoint — a killed run keeps whatever already landed
      art.asOf = now.slice(0, 10);
      art.generatedAt = now;
      art.creditsEst = calls;
      await writeFile(file, JSON.stringify(art));
    }
  }
  await store.log("ingest_ownership", calls, targets.length, "ok");
  console.log(`ownership: ${targets.length} refreshed, ${Object.keys(art.refreshed).length} covered, ${art.misses.length} misses (${calls} calls)`);
}

// Cheap market-wide extras: suspensions history, corporate-actions calendar
// (7 types), broker leaderboard, most-traded, quarterly financial dates.
// ≈25 calls; safe to re-run (accreting artifacts dedupe by date).
async function ingestExtras() {
  const dir = (f: string) => path.join(process.cwd(), "data", f);
  const now = new Date().toISOString();
  const asOf = now.slice(0, 10);
  const meta = { schemaVersion: 1, engineVersion: "radarx-v2" as const, source: "sectors" as const };
  const read = <T extends object>(f: string, init: T): T & { asOf: string | null; generatedAt: string } => {
    try { return JSON.parse(readFileSync(dir(f), "utf8")); } catch { return init as T & { asOf: string | null; generatedAt: string }; }
  };
  let calls = 0;

  // --- suspensions: full paginated backfill, dedupe by symbol+date ---
  {
    const art = read("suspensions.json", { ...meta, rows: [] as Record<string, unknown>[] });
    const have = new Set(art.rows.map((r) => `${r.symbol}|${r.suspension_date}`));
    let offset = 0;
    let added = 0;
    while (true) {
      const res = await api.suspensions({ limit: 100, offset });
      calls++;
      for (const r of res.results) {
        const key = `${r.symbol}|${r.suspension_date}`;
        if (!have.has(key)) { art.rows.push(r as unknown as Record<string, unknown>); added++; }
      }
      if (!res.pagination?.has_next || res.results.length === 0) break;
      offset = res.pagination.next_offset ?? offset + res.results.length;
    }
    art.asOf = asOf; art.generatedAt = now;
    await writeFile(dir("suspensions.json"), JSON.stringify(art));
    console.log(`suspensions: +${added} rows → ${art.rows.length} total`);
  }

  // --- corporate-actions calendar: 7 types, one call each ---
  {
    const types = ["dividend", "upcoming_dividend", "bonus", "right_issue", "stock_split", "warrant", "agm"];
    const cal: Record<string, unknown> = { ...meta, asOf, generatedAt: now, types: {} };
    for (const t of types) {
      try {
        const res = await api.corporateActionsCalendar(t);
        calls++;
        (cal.types as Record<string, unknown>)[t] = res;
        console.log(`corp-actions ${t}: ${Array.isArray(res[t]) ? res[t].length : "?"} events`);
      } catch (e) {
        calls++;
        console.warn(`corp-actions ${t}: ${e instanceof Error ? e.message : e}`);
      }
    }
    await writeFile(dir("corporate_actions.json"), JSON.stringify(cal));
  }

  // --- brokers/top: daily leaderboard, accreted by session date ---
  {
    const res = await api.brokersTop();
    calls++;
    const art = read("brokers_top.json", { ...meta, sessions: [] as Record<string, unknown>[] });
    if (!art.sessions.some((s) => s.date === res.date)) art.sessions.push(res as unknown as Record<string, unknown>);
    art.asOf = res.date; art.generatedAt = now;
    await writeFile(dir("brokers_top.json"), JSON.stringify(art));
    console.log(`brokers/top: ${art.sessions.length} sessions, latest=${res.date} (${res.results.length} brokers)`);
  }

  // --- most-traded: dict keyed by date (~10 days per call), accreted ---
  {
    const res = await api.mostTraded();
    calls++;
    const art = read("most_traded.json", { ...meta, days: {} as Record<string, unknown> });
    let added = 0;
    for (const [date, rows] of Object.entries(res)) {
      if (!art.days[date]) { art.days[date] = rows; added++; }
    }
    art.asOf = Object.keys(art.days).sort().at(-1) ?? asOf;
    art.generatedAt = now;
    await writeFile(dir("most_traded.json"), JSON.stringify(art));
    console.log(`most-traded: +${added} days → ${Object.keys(art.days).length} total`);
  }

  // --- quarterly financial dates feed (LK freshness for all emiten) ---
  {
    const rows: Record<string, unknown>[] = [];
    let offset = 0;
    while (true) {
      const res = await api.quarterlyFinancialDates({ limit: 100, offset });
      calls++;
      rows.push(...(res.results as unknown as Record<string, unknown>[]));
      if (!res.pagination?.has_next || res.results.length === 0) break;
      offset = res.pagination.next_offset ?? offset + res.results.length;
    }
    await writeFile(dir("quarterly_dates.json"), JSON.stringify({ ...meta, asOf, generatedAt: now, rows }));
    console.log(`quarterly-dates: ${rows.length} rows`);
  }

  await store.log("ingest_extras", calls, 0, "ok");
  console.log(`extras done (${calls} calls)`);
}

// Per-symbol artifact ingest shared loop: fetch fn per symbol, collect into a
// symbol-keyed map, checkpoint-write the merged artifact every 50 symbols.
async function ingestPerSymbol(
  name: string,
  file: string,
  fetchOne: (sym: string) => Promise<unknown>,
  symbols?: string[],
) {
  const target = path.join(process.cwd(), "data", file);
  const art = {
    schemaVersion: 1, engineVersion: "radarx-v2" as const, source: "sectors" as const,
    asOf: null as string | null, generatedAt: "", creditsEst: 0,
    data: {} as Record<string, unknown>, misses: [] as string[],
  };
  try { Object.assign(art, JSON.parse(readFileSync(target, "utf8"))); } catch { /* first run */ }

  const universe = symbols ?? (args.includes("--universe") ? await scopeUniverse() : await watchlist());
  const limit = Number(flag("limit", "0")) || universe.length;
  const onlyMissing = args.includes("--only-missing");
  const targets = universe.filter((s) => !onlyMissing || !(s in art.data)).slice(0, limit);

  let calls = 0;
  const now = new Date().toISOString();
  for (let i = 0; i < targets.length; i++) {
    const sym = targets[i];
    try {
      art.data[sym] = await fetchOne(sym);
      calls++;
      const mi = art.misses.indexOf(sym);
      if (mi >= 0) art.misses.splice(mi, 1);
    } catch (e) {
      calls++;
      if (!art.misses.includes(sym)) art.misses.push(sym);
      console.warn(`${name} ${sym}: ${e instanceof Error ? e.message : e}`);
    }
    if ((i + 1) % 50 === 0 || i === targets.length - 1) {
      console.log(`${name}: ${i + 1}/${targets.length} (${calls} calls)`);
      art.asOf = now.slice(0, 10); art.generatedAt = now; art.creditsEst = calls;
      await writeFile(target, JSON.stringify(art));
    }
  }
  await store.log(`ingest_${name}`, calls, targets.length, "ok");
  console.log(`${name}: ${targets.length} processed, ${Object.keys(art.data).length} covered, ${art.misses.length} misses (${calls} calls)`);
}

// broker-summary/{s}/top — ranked top buyers/sellers per emiten (~3mo window).
async function ingestBrokerTop() {
  await ingestPerSymbol("brokertop", "broker_top.json", async (sym) => {
    const r = await api.brokerSummaryTop(sym);
    return { start: r.start, end: r.end, topBuyers: r.top_buyers ?? [], topSellers: r.top_sellers ?? [] };
  });
}

// financials/quarterly/{s} — per-emiten quarterly financials (latest LK).
async function ingestFinancials() {
  await ingestPerSymbol("financials", "financials_quarterly.json", (sym) => api.quarterlyFinancials(sym));
}

// company/corporate-actions/{s} — full per-emiten corporate action history.
async function ingestCorpActions() {
  await ingestPerSymbol("corpactions", "company_actions.json", async (sym) => {
    const r = await api.companyCorporateActions(sym);
    return r.corporate_actions ?? {};
  });
}

// get-segments — only emiten flagged by list_companies_with_segments (the list
// endpoint returns a symbol→years dict, not a paginated list).
async function ingestSegments() {
  const list = await api.companiesWithSegments();
  const syms = Object.keys(list ?? {});
  console.log(`segments list: ${syms.length} emiten`);
  await ingestPerSymbol("segments", "segments.json", (sym) => api.segments(sym), syms);
}

const commands: Record<string, () => Promise<void>> = {
  universe: ingestUniverse,
  rotation: ingestRotation,
  taxonomy: ingestTaxonomy,
  boards: ingestBoards,
  ownership: ingestOwnership,
  filings: ingestFilings,
  tickers: ingestTickers,
  flows: ingestFlows,
  prices: ingestPrices,
  holders: ingestHolders,
  broker: ingestBroker,
  index: ingestIndex,
  extras: ingestExtras,
  brokertop: ingestBrokerTop,
  financials: ingestFinancials,
  corpactions: ingestCorpActions,
  segments: ingestSegments,
};

if (!cmd || !commands[cmd]) {
  console.log(`usage: npx tsx scripts/ingest.ts <${Object.keys(commands).join("|")}> [--months N|--limit N]`);
  process.exit(1);
}

commands[cmd]().catch((e) => {
  console.error(e);
  process.exit(1);
});
