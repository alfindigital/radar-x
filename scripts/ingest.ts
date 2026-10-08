// RADAR-X ingest pipeline. Usage:
//   npx tsx scripts/ingest.ts filings [--months 6] [--full]
//   npx tsx scripts/ingest.ts tickers
//   npx tsx scripts/ingest.ts taxonomy [--full] [--limit N]
//   npx tsx scripts/ingest.ts flows|prices|holders|broker [--limit N]
// Env: reads .env.local (SECTORS_API_KEY / SECTORS_API_KEYS pool)

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
import { getStore, writeJson } from "../src/lib/db";
import { loadRotation, type RotationSubsector, type SectorRotationArtifact } from "../src/lib/rotation";
import { loadTaxonomy, slugifyTaxonomy, type TaxonomyArtifact, type TaxonomyRow } from "../src/lib/taxonomy";
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

// Per-run outcome accounting. A run whose every call failed is a FAILED run —
// logging "ok" after a total outage made production think dead keys were fine.
const tally = { ok: 0, failed: 0 };
function tallyReset() {
  tally.ok = 0;
  tally.failed = 0;
}
function tallyStatus(): "ok" | "partial" | "failed" {
  if (tally.failed === 0) return "ok";
  return tally.ok === 0 ? "failed" : "partial";
}
async function logRun(job: string, calls: number, rows: number): Promise<void> {
  const status = tallyStatus();
  await store.log(job, calls, rows, status);
  if (status === "failed") process.exitCode = 1;
}

// Corrupt JSON is a data fault, not an empty store: `init` comes back only when
// the file is absent. A parse error or a non-object payload must halt here,
// before a later write flattens whatever evidence was on disk.
function readJsonOr<T>(file: string, init: T): T {
  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return init;
    throw e;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`${file}: corrupt JSON — refusing to treat it as empty`, { cause: e });
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`${file}: expected an object/array payload, got ${typeof parsed}`);
  }
  return parsed as T;
}

// Numeric flags gate paid upstream calls — `--limit -1` or `--limit abc` must
// die here, not after a provider round-trip.
function numFlag(name: string, def: number, { min = 0 }: { min?: number } = {}): number {
  const raw = flag(name);
  if (raw === undefined) return def;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min) {
    console.error(`--${name}: expected an integer >= ${min}, got "${raw}"`);
    process.exit(1);
  }
  return n;
}

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
  const chunks = from ? [{ start: from, end: to! }] : monthChunks(numFlag("months", 6, { min: 1 }));
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
  // One pass over the store: the per-symbol listers each re-parse the whole
  // JSON file, so N symbols would cost N full reads.
  const have =
    kind === "flow"
      ? new Set((await store.listFlowUniverse()).map((r) => r.symbol))
      : kind === "price"
        ? await store.listPriceSymbols()
        : kind === "holders"
          ? await store.listHolderSymbols()
          : await store.listBrokerSymbols();
  return syms.filter((s) => !have.has(s));
}

async function ingestFlows() {
  const limit = numFlag("limit", 200);
  const base = args.includes("--universe") ? await scopeUniverse() : await watchlist();
  let wl = await missing("flow", base);
  // Thinnest history first — a bounded --limit then maximizes backfill value
  // instead of re-fetching the same watchlist head on every run.
  const depth = new Map<string, number>();
  for (const r of await store.listFlowUniverse()) depth.set(r.symbol, (depth.get(r.symbol) ?? 0) + 1);
  wl = wl.sort((a, b) => (depth.get(a) ?? 0) - (depth.get(b) ?? 0)).slice(0, limit);
  let rows = 0;
  let calls = 0;
  tallyReset();
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
      tally.ok++;
    } catch (e) {
      tally.failed++;
      console.warn(`flow ${sym}: ${e instanceof Error ? e.message : e}`);
    }
  }
  await logRun("ingest_flows", calls, rows);
  console.log(`flows: ${rows} rows over ${calls} calls (${wl.length} symbols, ${tally.failed} failed)`);
}

async function ingestPrices() {
  const limit = numFlag("limit", 200);
  const base = args.includes("--universe") ? await scopeUniverse() : await watchlist();
  let wl = await missing("price", base);
  // Symbols with no/fewest OHLCV observations first — close-only universe rows
  // (observationKind absent here) count as zero depth.
  const depth = new Map<string, number>();
  const stored = readJsonOr<{ symbol: string; observationKind?: string }[]>(
    path.join(process.cwd(), "data", "price_daily.json"), []);
  for (const r of stored) if (r.observationKind === "ohlcv") depth.set(r.symbol, (depth.get(r.symbol) ?? 0) + 1);
  wl = wl.sort((a, b) => (depth.get(a) ?? 0) - (depth.get(b) ?? 0)).slice(0, limit);
  let rows = 0;
  let calls = 0;
  tallyReset();
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
        observationKind: "ohlcv" as const,
        fieldSources: {
          open: "sectors-daily" as const,
          high: "sectors-daily" as const,
          low: "sectors-daily" as const,
          close: "sectors-daily" as const,
          volume: "sectors-daily" as const,
          marketCap: "sectors-daily" as const,
        },
      }));
      rows += await store.upsertPriceDaily(mapped);
      tally.ok++;
    } catch (e) {
      tally.failed++;
      console.warn(`price ${sym}: ${e instanceof Error ? e.message : e}`);
    }
  }
  await logRun("ingest_prices", calls, rows);
  console.log(`prices: ${rows} rows over ${calls} calls (${wl.length} symbols, ${tally.failed} failed)`);
}

// --universe widens a watchlist-scoped command to the full taxonomy universe.
async function scopeUniverse(): Promise<string[]> {
  const tax = await loadTaxonomy();
  if (tax?.rows.length) return tax.rows.map((r) => r.symbol);
  const rot = await loadRotation();
  return [...new Set(rot?.subsectors.flatMap((s) => s.members) ?? [])];
}

async function ingestHolders() {
  const limit = numFlag("limit", 200);
  // Compose scope → (optional) missing filter → limit; --universe must not
  // silently discard the requested call budget.
  const base = args.includes("--universe") ? await scopeUniverse() : await watchlist();
  const wl = (await missing("holders", base)).slice(0, limit);
  const batch: HoldersMonthly[] = [];
  const year = flag("year"); // e.g. --year 2025 backfills a prior calendar year
  let calls = 0;
  tallyReset();
  for (let i = 0; i < wl.length; i++) {
    const sym = wl[i];
    try {
      const res = await api.shareholdersComposition(sym, year ? { year: numFlag("year", 0) } : {});
      calls++;
      tally.ok++;
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
      tally.failed++;
      console.warn(`holders ${sym}: ${e instanceof Error ? e.message : e}`);
    }
    // Batch upsert every 100 symbols — one file rewrite instead of per-call
    // (per-call rewrite on Windows races AV/file locks and loses billed rows).
    if (batch.length && ((i + 1) % 100 === 0 || i === wl.length - 1)) {
      const added = await store.upsertHolders(batch.splice(0));
      console.log(`holders: ${i + 1}/${wl.length} (+${added} rows, ${calls} calls)`);
    }
  }
  await logRun("ingest_holders", calls, wl.length);
  console.log(`holders done: ${wl.length} symbols, ${calls} calls, ${tally.failed} failed`);
}

async function ingestBroker() {
  const limit = numFlag("limit", 40);
  const base = args.includes("--universe") ? await scopeUniverse() : await watchlist();
  let wl = await missing("broker", base);
  // Rotate by last ATTEMPT, not last data: symbols whose provider legitimately
  // returns empty would otherwise sort stalest-first forever and burn the
  // --limit budget on every run.
  const last = new Map<string, string>();
  for (const r of readJsonOr<{ symbol: string; date: string }[]>(
    path.join(process.cwd(), "data", "broker_rows.json"), [])) {
    const m = last.get(r.symbol);
    if (!m || r.date > m) last.set(r.symbol, r.date);
  }
  const attemptsFile = path.join(process.cwd(), "data", "broker_attempts.json");
  const attempts = readJsonOr<{ attempted?: Record<string, string> }>(attemptsFile, {});
  const attempted = (attempts.attempted ??= {});
  wl = wl.sort(
    (a, b) =>
      (attempted[a] ?? "").localeCompare(attempted[b] ?? "") ||
      (last.get(a) ?? "").localeCompare(last.get(b) ?? ""),
  ).slice(0, limit);
  const batch = new Map<string, BrokerSummaryRow[]>();
  const now = new Date().toISOString();
  let rows = 0;
  let calls = 0;
  tallyReset();
  for (let i = 0; i < wl.length; i++) {
    const sym = wl[i];
    try {
      const res = await api.brokerSummary(sym);
      calls++;
      tally.ok++;
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
      tally.failed++;
      console.warn(`broker ${sym}: ${e instanceof Error ? e.message : e}`);
    }
    // Stamp every attempt — success, empty, or failure all push the symbol to
    // the back of the queue for the next run.
    attempted[sym] = now;
    // Batch upsert every 50 symbols — one read+write of the 50MiB store per
    // batch instead of one per symbol (a full backfill otherwise rewrites it
    // hundreds of times). Attempt stamps persist on the same cadence so a
    // killed run doesn't send the same symbols back to the head.
    if ((i + 1) % 50 === 0 || i === wl.length - 1) {
      if (batch.size) {
        rows += await store.upsertBrokerRowsMulti(batch);
        batch.clear();
      }
      await writeJson(attemptsFile, { schemaVersion: 1, generatedAt: now, attempted });
      console.log(`broker: ${i + 1}/${wl.length} (${calls} calls)`);
    }
  }
  await logRun("ingest_broker", calls, rows);
  console.log(`broker: ${rows} rows over ${calls} calls (${wl.length} symbols, ${tally.failed} failed)`);
}

async function ingestIndex() {
  tallyReset();
  const start = flag("from") ?? new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  const res = await api.indexDailyRange("ihsg", { start });
  tally.ok++;
  // The index endpoint returns a single price per day — a close-only
  // observation, not a fabricated OHLC.
  const mapped = res.map((r) => ({
    symbol: "^IHSG",
    date: r.date,
    open: null,
    high: null,
    low: null,
    close: r.price,
    volume: null,
    marketCap: null,
    observationKind: "close-only" as const,
    fieldSources: { close: "sectors-close" as const },
  }));
  let calls = 1;
  const n = await store.upsertPriceDaily(mapped);
  console.log(`index ihsg: ${n} rows`);

  // --all: merge every index's range into index_daily.json (dedupe by
  // code|date) so the history accretes instead of being bounded by whatever
  // window the last `boards` full run happened to fetch.
  if (args.includes("--all")) {
    const idxFile = path.join(process.cwd(), "data", "index_daily.json");
    const art = readJsonOr(idxFile, {
      schemaVersion: 1, engineVersion: "radarx-v2", source: "sectors",
      asOf: null as string | null, generatedAt: "",
      rows: [] as { indexCode: string; date: string; price: number }[],
    });
    const have = new Set(art.rows.map((r) => `${r.indexCode}|${r.date}`));
    const idxLatest = await api.indexDailyAll();
    calls++;
    tally.ok++;
    const codes = [...new Set(idxLatest.map((r) => r.index_code.toLowerCase().replace(/[^a-z0-9]/g, "")))];
    let added = 0;
    for (const code of codes) {
      try {
        const rows = await api.indexDailyRange(code, { start });
        calls++;
        tally.ok++;
        for (const r of rows) {
          const key = `${r.index_code}|${r.date}`;
          if (have.has(key)) continue;
          have.add(key);
          art.rows.push({ indexCode: r.index_code, date: r.date, price: r.price });
          added++;
        }
      } catch (e) {
        calls++;
        tally.failed++;
        console.warn(`index ${code}: ${e instanceof Error ? e.message : e}`);
      }
    }
    art.asOf = art.rows.map((r) => r.date).sort().at(-1) ?? art.asOf;
    art.generatedAt = new Date().toISOString();
    await writeJson(idxFile, art);
    console.log(`index --all: +${added} rows across ${codes.length} indices (${art.rows.length} total, ${tally.failed} failed)`);
  }
  await logRun("ingest_index", calls, n);
}

// Full-universe refresh: /v2/close/ + /v2/foreign-flow/ per trading day.
// Covers ALL emiten (~25-32 credits/day/feed). Auto-detects missing days from
// stored data; --days N forces an N-calendar-day backfill window.
async function ingestUniverse() {
  const forced = numFlag("days", 0);
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
  tallyReset();
  for (const day of days) {
    let dayHasData = false;
    if (feed !== "flow") {
      try {
        const close = await universeAll(api.closeUniverse, day);
        calls += close.calls;
        dayHasData = close.rows.length > 0;
        // The universe close endpoint returns only a close — open/high/low and
        // volume stay null instead of being fabricated as flat values.
        priceRows += await store.upsertPriceDaily(
          close.rows.map((r) => ({
            symbol: r.symbol,
            date: r.date,
            open: null,
            high: null,
            low: null,
            close: r.close,
            volume: null,
            marketCap: null,
            observationKind: "close-only" as const,
            fieldSources: { close: "sectors-close" as const },
          })),
        );
        if (close.rows.length) console.log(`${day}: close=${close.rows.length}`);
        tally.ok++;
      } catch (e) {
        calls++;
        tally.failed++;
        console.warn(`universe close ${day}: ${e instanceof Error ? e.message : e}`);
        continue; // future/non-trading day → 400 (free), skip
      }
    }
    if (feed === "close") continue;
    let flow;
    try {
      flow = await universeAll(api.flowUniverse, day);
      tally.ok++;
    } catch (e) {
      calls++;
      tally.failed++;
      console.warn(`universe flow ${day}: ${e instanceof Error ? e.message : e}`);
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
  await logRun("ingest_universe", calls, priceRows + flowRowsN);
  console.log(`universe: +${priceRows} prices, +${flowRowsN} flows (${calls} calls, ${tally.failed} day errors)`);
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
  tallyReset();
  for (const t of taxonomy) {
    let rep;
    try {
      rep = await api.subsectorReport(t.subsector, sections);
      tally.ok++;
    } catch (e) {
      tally.failed++;
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
    const flowObserved = members.filter((sym) => flowBySymbol.has(sym)).length;

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
      netForeignFlow: flowObserved > 0 ? netFlow : null,
      flowDate: flowObserved > 0 ? latestFlowDate : null,
      flowObserved,
      flowExpected: members.length,
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
  await writeJson(path.join(process.cwd(), "data", "sector_rotation.json"), artifact);
  await logRun("ingest_rotation", calls, rows.length);
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

  const limit = numFlag("limit", 0);
  const pending = args.includes("--full")
    ? universe
    : universe.filter((s) => !done.has(s) || existing?.misses.includes(s));
  const targets = limit > 0 ? pending.slice(0, limit) : pending;

  const rows: TaxonomyRow[] = args.includes("--full") ? [] : [...(existing?.rows ?? [])];
  const misses: string[] = args.includes("--full") ? [] : [...(existing?.misses ?? [])];
  tallyReset();

  for (let i = 0; i < targets.length; i++) {
    const sym = targets[i];
    try {
      const rep = await api.companyReport(sym, ["overview"]);
      calls++;
      tally.ok++;
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
      tally.failed++;
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
  await writeJson(path.join(process.cwd(), "data", "taxonomy.json"), artifact);
  await logRun("ingest_taxonomy", calls, rows.length);
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
  const tcArtifact = readJsonOr(tcFile, {
    ...meta, asOf: null as string | null,
    snapshots: [] as { date: string; fetchedAt: string; topGainers: unknown; topLosers: unknown }[],
  });
  const sessionDate =
    (Object.values((tc.top_gainers as Record<string, { latest_close_date?: string }[]>)["1d"] ?? [])[0] as { latest_close_date?: string } | undefined)
      ?.latest_close_date ?? asOf;
  if (!tcArtifact.snapshots.some((s) => s.date === sessionDate)) {
    tcArtifact.snapshots.push({ date: sessionDate, fetchedAt: now, topGainers: tc.top_gainers, topLosers: tc.top_losers });
    tcArtifact.asOf = sessionDate;
  }
  await writeJson(tcFile, tcArtifact);
  console.log(`top-changes: ${tcArtifact.snapshots.length} sessions, latest=${sessionDate}`);
}

// Market boards snapshot: index-daily history (≤90d window per index),
// idx-total series, broker registry, free-float per subsector, and a dated
// top-changes snapshot (accreted daily — the endpoint is current-snapshot only,
// no date param, so history must be captured going forward). ≈55 calls total.
async function ingestBoards() {
  const dir = (f: string) => path.join(process.cwd(), "data", f);
  tallyReset();
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
    const itArt = readJsonOr(itFile, {
      ...meta, asOf: null as string | null, generatedAt: "",
      rows: [] as { date: string; idx_total_market_cap: number }[],
    });
    const itHave = new Set(itArt.rows.map((r) => r.date));
    const itNew = idxTotal.filter((r) => !itHave.has(r.date));
    itArt.rows.push(...itNew);
    itArt.asOf = itArt.rows.at(-1)?.date ?? asOf;
    itArt.generatedAt = now;
    await writeJson(itFile, itArt);

    // --- latest index closes merged into history ---
    const idxLatest = await api.indexDailyAll();
    calls++;
    const idFile = dir("index_daily.json");
    const idArt = readJsonOr(idFile, {
      ...meta, asOf: null as string | null, generatedAt: "",
      rows: [] as { indexCode: string; date: string; price: number }[],
    });
    const idHave = new Set(idArt.rows.map((r) => `${r.indexCode}|${r.date}`));
    const idNew = idxLatest.filter((r) => !idHave.has(`${r.index_code}|${r.date}`));
    idArt.rows.push(...idNew.map((r) => ({ indexCode: r.index_code, date: r.date, price: r.price })));
    idArt.asOf = idArt.rows.map((r) => r.date).sort().at(-1) ?? asOf;
    idArt.generatedAt = now;
    await writeJson(idFile, idArt);
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
  tally.ok++;
  await writeJson(dir("broker_registry.json"), { ...meta, asOf, generatedAt: now, rows: brokers });
  console.log(`brokers: ${brokers.length}`);

  // --- idx-total (~1 month of daily IDX aggregate mcap) ---
  const idxTotal = await api.idxTotal();
  calls++;
  tally.ok++;
  await writeJson(dir("idx_total.json"), { ...meta, asOf, generatedAt: now, rows: idxTotal });
  console.log(`idx-total: ${idxTotal.length} rows ${idxTotal[0]?.date}..${idxTotal.at(-1)?.date}`);

  // --- index-daily history per index (≤90d window; codes from live list) ---
  const idxCodesResp = await api.indexDailyAll();
  calls++;
  tally.ok++;
  // API path codes are lowercase and strip non-alphanumerics (SRI-KEHATI → srikehati).
  const idxCodes = [...new Set(idxCodesResp.map((r) => r.index_code.toLowerCase().replace(/[^a-z0-9]/g, "")))];
  const idxRows: { indexCode: string; date: string; price: number }[] = [];
  for (const code of idxCodes) {
    try {
      const rows = await api.indexDailyRange(code, { start: "2026-07-01" });
      calls++;
      tally.ok++;
      idxRows.push(...rows.map((r) => ({ indexCode: r.index_code, date: r.date, price: r.price })));
    } catch (e) {
      calls++;
      tally.failed++;
      console.warn(`index ${code}: ${e instanceof Error ? e.message : e}`);
    }
  }
  await writeJson(dir("index_daily.json"), { ...meta, asOf, generatedAt: now, rows: idxRows });
  console.log(`index-daily: ${idxRows.length} rows across ${idxCodes.length} indices`);

  // --- free-float per subsector (33 calls ≈ full IDX) ---
  const taxonomy = await api.subsectors();
  calls++;
  tally.ok++;
  const ffRows: { symbol: string; companyName: string; freeFloat: number | null; subSector: string }[] = [];
  for (const t of taxonomy) {
    try {
      const rows = await api.freeFloat(t.subsector);
      calls++;
      tally.ok++;
      ffRows.push(...rows.map((r) => ({ symbol: r.symbol, companyName: r.company_name, freeFloat: r.free_float, subSector: t.subsector })));
    } catch (e) {
      calls++;
      tally.failed++;
      console.warn(`freefloat ${t.subsector}: ${e instanceof Error ? e.message : e}`);
    }
  }
  await writeJson(dir("free_float.json"), { ...meta, asOf, generatedAt: now, rows: ffRows });
  console.log(`free-float: ${ffRows.length} rows`);

  // --- top-changes daily snapshot (accrete by session date) ---
  await ingestTopChanges(dir, meta, now, asOf);
  calls++;
  tally.ok++;

  await logRun("ingest_boards", calls, brokers.length + idxTotal.length + idxRows.length + ffRows.length);
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
  Object.assign(art, readJsonOr(file, {}));

  const tax = await loadTaxonomy();
  let universe = tax?.rows.map((r) => r.symbol) ?? [];
  if (!universe.length) {
    const rot = await loadRotation();
    universe = [...new Set(rot?.subsectors.flatMap((s) => s.members) ?? [])];
  }

  const limit = numFlag("limit", 100);
  const sorted = [...universe].sort((a, b) => (art.refreshed[a] ?? "").localeCompare(art.refreshed[b] ?? ""));
  const targets = args.includes("--full") ? universe : sorted.slice(0, limit);

  let calls = 0;
  const now = new Date().toISOString();
  tallyReset();
  for (let i = 0; i < targets.length; i++) {
    const sym = targets[i];
    try {
      const rep = await api.companyReport(sym, ["ownership"]);
      calls++;
      tally.ok++;
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
      tally.failed++;
      if (!art.misses.includes(sym)) art.misses.push(sym);
      console.warn(`ownership ${sym}: ${e instanceof Error ? e.message : e}`);
    }
    if ((i + 1) % 50 === 0 || i === targets.length - 1) {
      console.log(`ownership: ${i + 1}/${targets.length} (${calls} calls)`);
      // checkpoint — a killed run keeps whatever already landed
      art.asOf = now.slice(0, 10);
      art.generatedAt = now;
      art.creditsEst = calls;
      await writeJson(file, art);
    }
  }
  await logRun("ingest_ownership", calls, targets.length);
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
  const read = <T extends object>(f: string, init: T): T & { asOf: string | null; generatedAt: string } =>
    readJsonOr(dir(f), init) as T & { asOf: string | null; generatedAt: string };
  let calls = 0;
  tallyReset();

  // --- suspensions: full paginated backfill, dedupe by symbol+date ---
  {
    const art = read("suspensions.json", { ...meta, rows: [] as Record<string, unknown>[] });
    const have = new Set(art.rows.map((r) => `${r.symbol}|${r.suspension_date}`));
    let added = 0;
    try {
      let offset = 0;
      while (true) {
        const res = await api.suspensions({ limit: 100, offset });
        calls++;
        for (const r of res.results) {
          const key = `${r.symbol}|${r.suspension_date}`;
          if (!have.has(key)) {
            have.add(key);
            art.rows.push(r as unknown as Record<string, unknown>);
            added++;
          }
        }
        if (!res.pagination?.has_next || res.results.length === 0) break;
        offset = res.pagination.next_offset ?? offset + res.results.length;
      }
      tally.ok++;
    } catch (e) {
      // The artifact accretes, so pages that already landed are still worth
      // persisting — a mid-pagination throw just stops the backfill early.
      tally.failed++;
      console.warn(`suspensions: ${e instanceof Error ? e.message : e}`);
    }
    art.asOf = asOf; art.generatedAt = now;
    await writeJson(dir("suspensions.json"), art);
    console.log(`suspensions: +${added} rows → ${art.rows.length} total`);
  }

  // --- corporate-actions calendar: 7 types, one call each ---
  {
    const types = ["dividend", "upcoming_dividend", "bonus", "right_issue", "stock_split", "warrant", "agm"];
    // Merge onto last-good: a failed type keeps its old block and lands in
    // staleTypes, so a bad fetch can never erase stored evidence.
    const cal = read("corporate_actions.json", {
      ...meta, asOf: null as string | null, generatedAt: "",
      types: {} as Record<string, unknown>, staleTypes: [] as string[],
    });
    const calTypes = (cal.types ??= {});
    const staleTypes: string[] = [];
    for (const t of types) {
      try {
        const res = await api.corporateActionsCalendar(t);
        calls++;
        tally.ok++;
        calTypes[t] = res;
        console.log(`corp-actions ${t}: ${Array.isArray(res[t]) ? res[t].length : "?"} events`);
      } catch (e) {
        calls++;
        tally.failed++;
        staleTypes.push(t);
        console.warn(`corp-actions ${t}: ${e instanceof Error ? e.message : e}`);
      }
    }
    cal.staleTypes = staleTypes;
    cal.asOf = asOf;
    cal.generatedAt = now;
    await writeJson(dir("corporate_actions.json"), cal);
  }

  // --- brokers/top: daily leaderboard, accreted by session date + cohort ---
  // One session per cohort per day: all (default call) + retail + institutional.
  {
    const art = read("brokers_top.json", { ...meta, sessions: [] as Record<string, unknown>[] });
    const key = (s: Record<string, unknown>) => `${s.date}|${s.cohort ?? "all"}`;
    for (const cohort of [undefined, "retail", "institutional"] as const) {
      try {
        const res = await api.brokersTop(cohort ? { cohort } : undefined);
        calls++;
        tally.ok++;
        if (!art.sessions.some((s) => key(s) === key(res as unknown as Record<string, unknown>))) {
          art.sessions.push(res as unknown as Record<string, unknown>);
        }
        art.asOf = res.date;
      } catch (e) {
        calls++;
        tally.failed++;
        console.warn(`brokers/top ${cohort ?? "all"}: ${e instanceof Error ? e.message : e}`);
      }
    }
    art.generatedAt = now;
    await writeJson(dir("brokers_top.json"), art);
    console.log(`brokers/top: ${art.sessions.length} sessions, latest=${art.asOf}`);
  }

  // --- most-traded: dict keyed by date (~10 days per call), accreted ---
  {
    try {
      const res = await api.mostTraded();
      calls++;
      const art = read("most_traded.json", { ...meta, days: {} as Record<string, unknown> });
      let added = 0;
      for (const [date, rows] of Object.entries(res)) {
        if (!art.days[date]) { art.days[date] = rows; added++; }
      }
      art.asOf = Object.keys(art.days).sort().at(-1) ?? asOf;
      art.generatedAt = now;
      await writeJson(dir("most_traded.json"), art);
      tally.ok++;
      console.log(`most-traded: +${added} days → ${Object.keys(art.days).length} total`);
    } catch (e) {
      calls++;
      tally.failed++;
      console.warn(`most-traded: ${e instanceof Error ? e.message : e}`);
    }
  }

  // --- quarterly financial dates feed (LK freshness for all emiten) ---
  {
    try {
      const rows: Record<string, unknown>[] = [];
      let offset = 0;
      while (true) {
        const res = await api.quarterlyFinancialDates({ limit: 100, offset });
        calls++;
        rows.push(...(res.results as unknown as Record<string, unknown>[]));
        if (!res.pagination?.has_next || res.results.length === 0) break;
        offset = res.pagination.next_offset ?? offset + res.results.length;
      }
      // Full-replace artifact — write only after a complete fetch so a partial
      // page stream can't truncate last-good.
      await writeJson(dir("quarterly_dates.json"), { ...meta, asOf, generatedAt: now, rows });
      tally.ok++;
      console.log(`quarterly-dates: ${rows.length} rows`);
    } catch (e) {
      calls++;
      tally.failed++;
      console.warn(`quarterly-dates: ${e instanceof Error ? e.message : e}`);
    }
  }

  await logRun("ingest_extras", calls, 0);
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
  Object.assign(art, readJsonOr(target, {}));

  const universe = symbols ?? (args.includes("--universe") ? await scopeUniverse() : await watchlist());
  const limit = numFlag("limit", 0) || universe.length;
  const onlyMissing = args.includes("--only-missing");
  const targets = universe.filter((s) => !onlyMissing || !(s in art.data)).slice(0, limit);

  let calls = 0;
  const now = new Date().toISOString();
  tallyReset();
  for (let i = 0; i < targets.length; i++) {
    const sym = targets[i];
    try {
      art.data[sym] = await fetchOne(sym);
      calls++;
      tally.ok++;
      const mi = art.misses.indexOf(sym);
      if (mi >= 0) art.misses.splice(mi, 1);
    } catch (e) {
      calls++;
      tally.failed++;
      if (!art.misses.includes(sym)) art.misses.push(sym);
      console.warn(`${name} ${sym}: ${e instanceof Error ? e.message : e}`);
    }
    if ((i + 1) % 50 === 0 || i === targets.length - 1) {
      console.log(`${name}: ${i + 1}/${targets.length} (${calls} calls)`);
      art.asOf = now.slice(0, 10); art.generatedAt = now; art.creditsEst = calls;
      await writeJson(target, art);
    }
  }
  await logRun(`ingest_${name}`, calls, targets.length);
  console.log(`${name}: ${targets.length} processed, ${Object.keys(art.data).length} covered, ${art.misses.length} misses (${calls} calls)`);
}

// brokers/top leaderboard for all three cohorts — standalone command so the
// cohort split can be refreshed without a full extras run.
async function ingestBrokerLeaderboard() {
  const dir = (f: string) => path.join(process.cwd(), "data", f);
  const now = new Date().toISOString();
  const meta = { schemaVersion: 1, engineVersion: "radarx-v2" as const, source: "sectors" as const };
  const art = readJsonOr(dir("brokers_top.json"), {
    ...meta, asOf: null as string | null, generatedAt: "", sessions: [] as Record<string, unknown>[],
  });
  let calls = 0;
  for (const cohort of [undefined, "retail", "institutional"] as const) {
    const res = await api.brokersTop(cohort ? { cohort } : undefined);
    calls++;
    const key = (s: Record<string, unknown>) => `${s.date}|${s.cohort ?? "all"}`;
    if (!art.sessions.some((s) => key(s) === key(res as unknown as Record<string, unknown>))) {
      art.sessions.push(res as unknown as Record<string, unknown>);
    }
    art.asOf = res.date;
  }
  art.generatedAt = now;
  await writeJson(dir("brokers_top.json"), art);
  await store.log("ingest_broker_leaderboard", calls, art.sessions.length, "ok");
  console.log(`brokers/top: ${art.sessions.length} sessions, latest=${art.asOf} (${calls} calls)`);
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

// broker-summary/{s}/top?cohort= — per-cohort top buyers/sellers (precision
// overlay for Exit Watch). Two calls per symbol (retail + institutional).
// Default targets: highest exit-pressure publishable symbols from
// data/derived-v2/exitwatch.json. --symbols=A,B overrides; --limit N caps.
async function ingestCohortTop() {
  const target = path.join(process.cwd(), "data", "cohort_top.json");
  const art = {
    schemaVersion: 1, engineVersion: "radarx-v3" as const, source: "sectors" as const,
    asOf: null as string | null, generatedAt: "", creditsEst: 0,
    data: {} as Record<string, unknown>, misses: [] as string[],
  };
  Object.assign(art, readJsonOr(target, {}));

  let symbols: string[];
  const explicit = flag("symbols");
  if (explicit) {
    symbols = explicit.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  } else {
    // Derived input — absent means compute hasn't run (fall back to watchlist
    // order); corrupt means the artifact can't be trusted, so it throws.
    const rows = readJsonOr<{ symbol: string; score: number | null }[] | null>(
      path.join(process.cwd(), "data", "derived-v2", "exitwatch.json"), null);
    if (rows === null) {
      console.warn("exitwatch.json missing — falling back to watchlist order");
      symbols = await watchlist();
    } else {
      symbols = rows.filter((r) => r.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).map((r) => r.symbol);
    }
  }
  const limit = numFlag("limit", 30);
  const onlyMissing = args.includes("--only-missing");
  const targets = symbols.filter((s) => !onlyMissing || !(s in art.data)).slice(0, limit);

  let calls = 0;
  const now = new Date().toISOString();
  tallyReset();
  for (let i = 0; i < targets.length; i++) {
    const sym = targets[i];
    try {
      const retail = await api.brokerSummaryTop(sym, { cohort: "retail" });
      const institutional = await api.brokerSummaryTop(sym, { cohort: "institutional" });
      calls += 2;
      // Refuse to store silently if the API ignored the cohort filter.
      if (retail.cohort && retail.cohort !== "retail") throw new Error(`cohort echo mismatch: ${retail.cohort}`);
      if (institutional.cohort && institutional.cohort !== "institutional") throw new Error(`cohort echo mismatch: ${institutional.cohort}`);
      tally.ok++;
      art.data[sym] = {
        retail: { start: retail.start, end: retail.end, top_buyers: retail.top_buyers ?? [], top_sellers: retail.top_sellers ?? [] },
        institutional: { start: institutional.start, end: institutional.end, top_buyers: institutional.top_buyers ?? [], top_sellers: institutional.top_sellers ?? [] },
      };
      const mi = art.misses.indexOf(sym);
      if (mi >= 0) art.misses.splice(mi, 1);
    } catch (e) {
      calls++;
      tally.failed++;
      if (!art.misses.includes(sym)) art.misses.push(sym);
      console.warn(`cohorttop ${sym}: ${e instanceof Error ? e.message : e}`);
    }
    if ((i + 1) % 10 === 0 || i === targets.length - 1) {
      console.log(`cohorttop: ${i + 1}/${targets.length} (${calls} calls)`);
      art.asOf = now.slice(0, 10); art.generatedAt = now; art.creditsEst = calls;
      await writeJson(target, art);
    }
  }
  await logRun("ingest_cohorttop", calls, targets.length);
  console.log(`cohorttop: ${targets.length} symbols, ${Object.keys(art.data).length} covered, ${art.misses.length} misses (${calls} calls)`);
}

// get-segments — only emiten flagged by list_companies_with_segments (the list
// endpoint returns a symbol→years dict, not a paginated list).
async function ingestSegments() {
  const list = await api.companiesWithSegments();
  const syms = Object.keys(list ?? {});
  console.log(`segments list: ${syms.length} emiten`);
  await ingestPerSymbol("segments", "segments.json", (sym) => api.segments(sym), syms);
}

// /v2/news/ — market-news snapshot, accreted by timestamp+title so a daily
// run builds a searchable archive. ~1-2 calls per run; the endpoint is
// snapshot-only (no date params), so history is captured going forward.
async function ingestNews() {
  const dir = (f: string) => path.join(process.cwd(), "data", f);
  const now = new Date().toISOString();
  const art = readJsonOr(dir("news.json"), {
    schemaVersion: 1, engineVersion: "radarx-v2", source: "sectors",
    asOf: null as string | null, generatedAt: "", items: [] as Record<string, unknown>[],
  });
  tallyReset();
  let res: Awaited<ReturnType<typeof api.news>>;
  try {
    res = await api.news({ limit: 100 });
    tally.ok++;
  } catch (e) {
    // Log the failure before the top-level handler exits — otherwise the run
    // record just vanishes and the outage looks like a skip.
    tally.failed++;
    await logRun("ingest_news", 1, art.items.length);
    throw e;
  }
  const items = Array.isArray(res) ? res : (res.results ?? []);
  const key = (r: { timestamp?: string; title?: string }) => `${r.timestamp}|${r.title}`;
  const have = new Set(art.items.map((r) => key(r as { timestamp?: string; title?: string })));
  let added = 0;
  for (const r of items) {
    const k = key(r as { timestamp?: string; title?: string });
    if (have.has(k)) continue;
    have.add(k);
    art.items.push(r as unknown as Record<string, unknown>);
    added++;
  }
  const dates = art.items.map((r) => String(r.timestamp ?? "")).filter(Boolean).sort();
  art.asOf = dates.at(-1)?.slice(0, 10) ?? now.slice(0, 10);
  art.generatedAt = now;
  await writeJson(dir("news.json"), art);
  await logRun("ingest_news", 1, art.items.length);
  console.log(`news: +${added} items → ${art.items.length} total, latest=${art.asOf}`);
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
  brokerleaderboard: ingestBrokerLeaderboard,
  brokertop: ingestBrokerTop,
  cohorttop: ingestCohortTop,
  financials: ingestFinancials,
  corpactions: ingestCorpActions,
  segments: ingestSegments,
  news: ingestNews,
};

if (!cmd || !commands[cmd]) {
  console.log(`usage: npx tsx scripts/ingest.ts <${Object.keys(commands).join("|")}> [--months N|--limit N]`);
  process.exit(1);
}

commands[cmd]().catch(async (e) => {
  console.error(e);
  // A thrown stage exits 1 — record it as a failed run too, so the ingest log
  // shows the failure instead of looking like the stage simply never ran.
  try {
    await store.log(`ingest_${cmd}`, 0, 0, "failed");
  } catch {
    /* logging itself is best-effort — the non-zero exit is what schedulers read */
  }
  process.exit(1);
});
