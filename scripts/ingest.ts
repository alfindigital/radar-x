// RADAR-X ingest pipeline. Usage:
//   npx tsx scripts/ingest.ts filings [--months 6] [--full]
//   npx tsx scripts/ingest.ts tickers
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
  const months = Number(flag("months", "6"));
  const chunks = monthChunks(months);
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
  console.log(`filings: +${totalAdded} rows (${calls} calls, ${months}mo)`);
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

async function ingestHolders() {
  const limit = Number(flag("limit", "200"));
  const wl = await missing("holders", (await watchlist()).slice(0, limit));
  let rows = 0;
  let calls = 0;
  for (const sym of wl) {
    try {
      const res = await api.shareholdersComposition(sym);
      calls++;
      const mapped: HoldersMonthly[] = res.data.map((r) => {
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
      });
      rows += await store.upsertHolders(mapped);
    } catch (e) {
      console.warn(`holders ${sym}: ${e instanceof Error ? e.message : e}`);
    }
  }
  await store.log("ingest_holders", calls, rows, "ok");
  console.log(`holders: ${rows} rows over ${calls} calls (${wl.length} symbols)`);
}

async function ingestBroker() {
  const limit = Number(flag("limit", "40"));
  const wl = await missing("broker", (await watchlist()).slice(0, limit));
  let rows = 0;
  let calls = 0;
  for (const sym of wl) {
    try {
      const res = await api.brokerSummary(sym);
      calls++;
      const mapped: BrokerSummaryRow[] = res.data.flatMap((d) =>
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
      );
      rows += await store.upsertBrokerRows(sym, mapped);
    } catch (e) {
      console.warn(`broker ${sym}: ${e instanceof Error ? e.message : e}`);
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

const commands: Record<string, () => Promise<void>> = {
  universe: ingestUniverse,
  filings: ingestFilings,
  tickers: ingestTickers,
  flows: ingestFlows,
  prices: ingestPrices,
  holders: ingestHolders,
  broker: ingestBroker,
  index: ingestIndex,
};

if (!cmd || !commands[cmd]) {
  console.log(`usage: npx tsx scripts/ingest.ts <${Object.keys(commands).join("|")}> [--months N|--limit N]`);
  process.exit(1);
}

commands[cmd]().catch((e) => {
  console.error(e);
  process.exit(1);
});
