// Data store adapter. DATA_SOURCE=json → local files in ./data (dev + static demo).
// DATA_SOURCE=supabase → Supabase Postgres (prod). Same interface, swap via env.

import { promises as fs } from "fs";
import path from "path";
import type {
  BrokerSummaryRow,
  CaseRecord,
  FlowDaily,
  HoldersMonthly,
  InsiderTrade,
  PositioningScore,
  PriceDaily,
  Ticker,
} from "./types";

export interface DataStore {
  // tickers
  upsertTickers(rows: Ticker[]): Promise<number>;
  listTickers(): Promise<Ticker[]>;
  // insider trades
  upsertInsiderTrades(rows: InsiderTrade[]): Promise<number>;
  listInsiderTrades(filter?: { symbol?: string; holderName?: string; since?: string; limit?: number }): Promise<InsiderTrade[]>;
  // flows & prices
  upsertFlowDaily(rows: FlowDaily[]): Promise<number>;
  listFlowDaily(symbol: string, since?: string): Promise<FlowDaily[]>;
  listFlowUniverse(since?: string): Promise<FlowDaily[]>;
  upsertPriceDaily(rows: PriceDaily[]): Promise<number>;
  listPriceDaily(symbol: string, since?: string): Promise<PriceDaily[]>;
  // broker summary
  upsertBrokerRows(symbol: string, rows: BrokerSummaryRow[]): Promise<number>;
  listBrokerRows(symbol: string, since?: string): Promise<BrokerSummaryRow[]>;
  // holders
  upsertHolders(rows: HoldersMonthly[]): Promise<number>;
  getHolders(symbol: string): Promise<HoldersMonthly[]>;
  // cases & scores
  upsertCases(rows: CaseRecord[]): Promise<number>;
  listCases(filter?: { symbol?: string; pattern?: string; limit?: number }): Promise<CaseRecord[]>;
  getCase(id: string): Promise<CaseRecord | null>;
  upsertScores(rows: PositioningScore[]): Promise<number>;
  latestScores(limit?: number): Promise<PositioningScore[]>;
  getScore(symbol: string): Promise<PositioningScore | null>;
  // ingest log
  log(job: string, creditsEst: number, rows: number, status: string): Promise<void>;
}

// ---------- JSON file implementation ----------

const DATA_DIR = path.join(process.cwd(), "data");
const FILES = {
  tickers: "tickers.json",
  insider: "insider_trades.json",
  flow: "flow_daily.json",
  price: "price_daily.json",
  broker: "broker_rows.json",
  holders: "holders_monthly.json",
  cases: "cases.json",
  scores: "positioning_scores.json",
  log: "ingest_log.jsonl",
} as const;

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, file), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, file), JSON.stringify(data));
}

function insiderKey(r: InsiderTrade): string {
  return [r.symbol, r.holderName, r.txnType, r.txnDate, r.amount, r.price].join("|");
}

export class JsonStore implements DataStore {
  async upsertTickers(rows: Ticker[]): Promise<number> {
    const map = new Map<string, Ticker>();
    for (const r of await readJson<Ticker[]>(FILES.tickers, [])) map.set(r.symbol, r);
    for (const r of rows) map.set(r.symbol, r);
    await writeJson(FILES.tickers, [...map.values()]);
    return rows.length;
  }
  async listTickers(): Promise<Ticker[]> {
    return readJson<Ticker[]>(FILES.tickers, []);
  }

  async upsertInsiderTrades(rows: InsiderTrade[]): Promise<number> {
    const map = new Map<string, InsiderTrade>();
    for (const r of await readJson<InsiderTrade[]>(FILES.insider, [])) map.set(insiderKey(r), r);
    let added = 0;
    for (const r of rows) {
      const k = insiderKey(r);
      if (!map.has(k)) added++;
      map.set(k, r);
    }
    const all = [...map.values()].sort((a, b) => b.txnDate.localeCompare(a.txnDate));
    await writeJson(FILES.insider, all);
    return added;
  }
  async listInsiderTrades(filter: { symbol?: string; holderName?: string; since?: string; limit?: number } = {}): Promise<InsiderTrade[]> {
    let rows = await readJson<InsiderTrade[]>(FILES.insider, []);
    if (filter.symbol) rows = rows.filter((r) => r.symbol === filter.symbol);
    if (filter.holderName) rows = rows.filter((r) => r.holderName === filter.holderName);
    if (filter.since) rows = rows.filter((r) => r.txnDate >= filter.since!);
    rows.sort((a, b) => b.txnDate.localeCompare(a.txnDate));
    return filter.limit ? rows.slice(0, filter.limit) : rows;
  }

  async upsertFlowDaily(rows: FlowDaily[]): Promise<number> {
    const map = new Map<string, FlowDaily>();
    for (const r of await readJson<FlowDaily[]>(FILES.flow, [])) map.set(`${r.symbol}|${r.date}`, r);
    for (const r of rows) map.set(`${r.symbol}|${r.date}`, r);
    await writeJson(FILES.flow, [...map.values()]);
    return rows.length;
  }
  async listFlowDaily(symbol: string, since?: string): Promise<FlowDaily[]> {
    const rows = (await readJson<FlowDaily[]>(FILES.flow, [])).filter((r) => r.symbol === symbol && (!since || r.date >= since));
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }

  async listFlowUniverse(since?: string): Promise<FlowDaily[]> {
    const rows = await readJson<FlowDaily[]>(FILES.flow, []);
    return rows.filter((r) => !since || r.date >= since);
  }

  async upsertPriceDaily(rows: PriceDaily[]): Promise<number> {
    const map = new Map<string, PriceDaily>();
    for (const r of await readJson<PriceDaily[]>(FILES.price, [])) map.set(`${r.symbol}|${r.date}`, r);
    for (const r of rows) map.set(`${r.symbol}|${r.date}`, r);
    await writeJson(FILES.price, [...map.values()]);
    return rows.length;
  }
  async listPriceDaily(symbol: string, since?: string): Promise<PriceDaily[]> {
    const rows = (await readJson<PriceDaily[]>(FILES.price, [])).filter((r) => r.symbol === symbol && (!since || r.date >= since));
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }

  async upsertBrokerRows(symbol: string, rows: BrokerSummaryRow[]): Promise<number> {
    const map = new Map<string, BrokerSummaryRow>();
    for (const r of await readJson<BrokerSummaryRow[]>(FILES.broker, [])) {
      map.set(`${r.symbol}|${r.date}|${r.brokerCode}`, r);
    }
    for (const r of rows) map.set(`${r.symbol}|${r.date}|${r.brokerCode}`, r);
    await writeJson(FILES.broker, [...map.values()]);
    return rows.length;
  }
  async listBrokerRows(symbol: string, since?: string): Promise<BrokerSummaryRow[]> {
    const rows = (await readJson<BrokerSummaryRow[]>(FILES.broker, [])).filter(
      (r) => r.symbol === symbol && (!since || r.date >= since),
    );
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }

  async upsertHolders(rows: HoldersMonthly[]): Promise<number> {
    const map = new Map<string, HoldersMonthly>();
    for (const r of await readJson<HoldersMonthly[]>(FILES.holders, [])) map.set(`${r.symbol}|${r.month}`, r);
    for (const r of rows) map.set(`${r.symbol}|${r.month}`, r);
    await writeJson(FILES.holders, [...map.values()]);
    return rows.length;
  }
  async getHolders(symbol: string): Promise<HoldersMonthly[]> {
    const rows = (await readJson<HoldersMonthly[]>(FILES.holders, [])).filter((r) => r.symbol === symbol);
    return rows.sort((a, b) => a.month.localeCompare(b.month));
  }

  async upsertCases(rows: CaseRecord[]): Promise<number> {
    const map = new Map<string, CaseRecord>();
    for (const r of await readJson<CaseRecord[]>(FILES.cases, [])) map.set(r.id, r);
    for (const r of rows) map.set(r.id, r);
    const all = [...map.values()].sort((a, b) => b.anchorDate.localeCompare(a.anchorDate) || b.score - a.score);
    await writeJson(FILES.cases, all);
    return rows.length;
  }
  async listCases(filter: { symbol?: string; pattern?: string; limit?: number } = {}): Promise<CaseRecord[]> {
    let rows = await readJson<CaseRecord[]>(FILES.cases, []);
    if (filter.symbol) rows = rows.filter((r) => r.symbol === filter.symbol);
    if (filter.pattern) rows = rows.filter((r) => r.pattern === filter.pattern);
    rows.sort((a, b) => b.score - a.score || b.anchorDate.localeCompare(a.anchorDate));
    return filter.limit ? rows.slice(0, filter.limit) : rows;
  }
  async getCase(id: string): Promise<CaseRecord | null> {
    const rows = await readJson<CaseRecord[]>(FILES.cases, []);
    return rows.find((r) => r.id === id) ?? null;
  }

  async upsertScores(rows: PositioningScore[]): Promise<number> {
    const map = new Map<string, PositioningScore>();
    for (const r of await readJson<PositioningScore[]>(FILES.scores, [])) map.set(`${r.symbol}|${r.week}`, r);
    for (const r of rows) map.set(`${r.symbol}|${r.week}`, r);
    await writeJson(FILES.scores, [...map.values()]);
    return rows.length;
  }
  async latestScores(limit = 50): Promise<PositioningScore[]> {
    const rows = await readJson<PositioningScore[]>(FILES.scores, []);
    const latestWeek = rows.reduce<string | null>((m, r) => (m === null || r.week > m ? r.week : m), null);
    const cur = rows.filter((r) => r.week === latestWeek).sort((a, b) => b.score - a.score);
    return cur.slice(0, limit);
  }
  async getScore(symbol: string): Promise<PositioningScore | null> {
    const rows = (await readJson<PositioningScore[]>(FILES.scores, []))
      .filter((r) => r.symbol === symbol)
      .sort((a, b) => b.week.localeCompare(a.week));
    return rows[0] ?? null;
  }

  async log(job: string, creditsEst: number, rows: number, status: string): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const line = JSON.stringify({ job, ran_at: new Date().toISOString(), credits_est: creditsEst, rows, status }) + "\n";
    await fs.appendFile(path.join(DATA_DIR, FILES.log), line);
  }
}

// ---------- store selection ----------

let cached: DataStore | null = null;

export function getStore(): DataStore {
  if (cached) return cached;
  const source = process.env.DATA_SOURCE ?? "json";
  if (source === "supabase") {
    // Supabase impl lands with deploy wiring; fall back loudly to json for now.
    console.warn("[db] DATA_SOURCE=supabase requested but SupabaseStore not wired yet — using JsonStore");
  }
  cached = new JsonStore();
  return cached;
}
