// Data store adapter — local JSON files in ./data. Single backend; ingest writes
// here, compute derives artifacts, and the request path never touches this.

import { promises as fs } from "fs";
import path from "path";
import { mergePriceObservation } from "./price-merge";
import type {
  BrokerSummaryRow,
  FlowDaily,
  HoldersMonthly,
  InsiderTrade,
  PriceDaily,
  PriceObservation,
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
  /** Accepts partial observations — a close-only row never erases richer fields. */
  upsertPriceDaily(rows: PriceObservation[]): Promise<number>;
  listPriceDaily(symbol: string, since?: string): Promise<PriceDaily[]>;
  /** Distinct symbols with ≥1 stored row — one file read for the whole set. */
  listPriceSymbols(): Promise<Set<string>>;
  // broker summary
  upsertBrokerRows(symbol: string, rows: BrokerSummaryRow[]): Promise<number>;
  /** Batch upsert across symbols — one read+write instead of one per symbol. */
  upsertBrokerRowsMulti(batch: Map<string, BrokerSummaryRow[]>): Promise<number>;
  listBrokerRows(symbol: string, since?: string): Promise<BrokerSummaryRow[]>;
  /** Distinct symbols with ≥1 stored row — one file read for the whole set. */
  listBrokerSymbols(): Promise<Set<string>>;
  // holders
  upsertHolders(rows: HoldersMonthly[]): Promise<number>;
  getHolders(symbol: string): Promise<HoldersMonthly[]>;
  /** Distinct symbols with ≥1 stored row — one file read for the whole set. */
  listHolderSymbols(): Promise<Set<string>>;
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
  log: "ingest_log.jsonl",
} as const;

// Missing file → caller fallback. Corrupt JSON is a data fault, not an empty
// store — it must halt instead of letting a later write flatten the file.
async function readJson<T>(file: string, fallback: T): Promise<T> {
  let raw: string;
  try {
    raw = await fs.readFile(path.join(DATA_DIR, file), "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw e;
  }
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    throw new Error(`${file}: corrupt JSON — refusing to read it as empty`, { cause: e });
  }
}

// Writes go through a per-file queue + temp-then-rename so a crash mid-write
// can never leave a truncated file behind.
const fileLocks = new Map<string, Promise<unknown>>();

function serialized<T>(file: string, fn: () => Promise<T>): Promise<T> {
  const prev = fileLocks.get(file) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  fileLocks.set(file, next.catch(() => {}));
  return next;
}

// Exported for ingest's artifact writes — accepts a DATA_DIR-relative name or
// an absolute path.
export async function writeJson(file: string, data: unknown): Promise<void> {
  const target = path.isAbsolute(file) ? file : path.join(DATA_DIR, file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  const payload = JSON.stringify(data);
  // Windows (OneDrive/AV) can briefly hold the file — retry transient opens.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await fs.writeFile(tmp, payload);
      await fs.rename(tmp, target);
      return;
    } catch (e) {
      if (attempt === 4) {
        await fs.rm(tmp, { force: true }).catch(() => {});
        throw e;
      }
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
  }
}

function insiderKey(r: InsiderTrade): string {
  return [r.symbol, r.holderName, r.txnType, r.txnDate, r.amount, r.price].join("|");
}

export class JsonStore implements DataStore {
  async upsertTickers(rows: Ticker[]): Promise<number> {
    return serialized(FILES.tickers, async () => {
      const map = new Map<string, Ticker>();
      for (const r of await readJson<Ticker[]>(FILES.tickers, [])) map.set(r.symbol, r);
      for (const r of rows) map.set(r.symbol, r);
      await writeJson(FILES.tickers, [...map.values()]);
      return rows.length;
    });
  }
  async listTickers(): Promise<Ticker[]> {
    return readJson<Ticker[]>(FILES.tickers, []);
  }

  async upsertInsiderTrades(rows: InsiderTrade[]): Promise<number> {
    return serialized(FILES.insider, async () => {
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
    });
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
    return serialized(FILES.flow, async () => {
      const map = new Map<string, FlowDaily>();
      for (const r of await readJson<FlowDaily[]>(FILES.flow, [])) map.set(`${r.symbol}|${r.date}`, r);
      for (const r of rows) map.set(`${r.symbol}|${r.date}`, r);
      await writeJson(FILES.flow, [...map.values()]);
      return rows.length;
    });
  }
  async listFlowDaily(symbol: string, since?: string): Promise<FlowDaily[]> {
    const rows = (await readJson<FlowDaily[]>(FILES.flow, [])).filter((r) => r.symbol === symbol && (!since || r.date >= since));
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }

  async listFlowUniverse(since?: string): Promise<FlowDaily[]> {
    const rows = await readJson<FlowDaily[]>(FILES.flow, []);
    return rows.filter((r) => !since || r.date >= since);
  }

  async upsertPriceDaily(rows: PriceObservation[]): Promise<number> {
    return serialized(FILES.price, async () => {
      const map = new Map<string, PriceObservation>();
      for (const r of await readJson<PriceObservation[]>(FILES.price, [])) map.set(`${r.symbol}|${r.date}`, r);
      let applied = 0;
      for (const r of rows) {
        const merged = mergePriceObservation(map.get(`${r.symbol}|${r.date}`), r);
        if (merged.close === null) continue; // a price row without a close carries no usable info
        map.set(`${r.symbol}|${r.date}`, merged);
        applied++;
      }
      await writeJson(FILES.price, [...map.values()]);
      return applied;
    });
  }
  async listPriceDaily(symbol: string, since?: string): Promise<PriceDaily[]> {
    const rows = (await readJson<PriceDaily[]>(FILES.price, [])).filter((r) => r.symbol === symbol && (!since || r.date >= since));
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }
  async listPriceSymbols(): Promise<Set<string>> {
    return new Set((await readJson<PriceDaily[]>(FILES.price, [])).map((r) => r.symbol));
  }

  async upsertBrokerRows(symbol: string, rows: BrokerSummaryRow[]): Promise<number> {
    return serialized(FILES.broker, async () => {
      const map = new Map<string, BrokerSummaryRow>();
      for (const r of await readJson<BrokerSummaryRow[]>(FILES.broker, [])) {
        map.set(`${r.symbol}|${r.date}|${r.brokerCode}`, r);
      }
      for (const r of rows) map.set(`${r.symbol}|${r.date}|${r.brokerCode}`, r);
      await writeJson(FILES.broker, [...map.values()]);
      return rows.length;
    });
  }
  async upsertBrokerRowsMulti(batch: Map<string, BrokerSummaryRow[]>): Promise<number> {
    return serialized(FILES.broker, async () => {
      const map = new Map<string, BrokerSummaryRow>();
      for (const r of await readJson<BrokerSummaryRow[]>(FILES.broker, [])) {
        map.set(`${r.symbol}|${r.date}|${r.brokerCode}`, r);
      }
      let applied = 0;
      for (const rows of batch.values()) {
        for (const r of rows) {
          map.set(`${r.symbol}|${r.date}|${r.brokerCode}`, r);
          applied++;
        }
      }
      await writeJson(FILES.broker, [...map.values()]);
      return applied;
    });
  }
  async listBrokerRows(symbol: string, since?: string): Promise<BrokerSummaryRow[]> {
    const rows = (await readJson<BrokerSummaryRow[]>(FILES.broker, [])).filter(
      (r) => r.symbol === symbol && (!since || r.date >= since),
    );
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }
  async listBrokerSymbols(): Promise<Set<string>> {
    return new Set((await readJson<BrokerSummaryRow[]>(FILES.broker, [])).map((r) => r.symbol));
  }

  async upsertHolders(rows: HoldersMonthly[]): Promise<number> {
    return serialized(FILES.holders, async () => {
      const map = new Map<string, HoldersMonthly>();
      for (const r of await readJson<HoldersMonthly[]>(FILES.holders, [])) map.set(`${r.symbol}|${r.month}`, r);
      for (const r of rows) map.set(`${r.symbol}|${r.month}`, r);
      await writeJson(FILES.holders, [...map.values()]);
      return rows.length;
    });
  }
  async getHolders(symbol: string): Promise<HoldersMonthly[]> {
    const rows = (await readJson<HoldersMonthly[]>(FILES.holders, [])).filter((r) => r.symbol === symbol);
    return rows.sort((a, b) => a.month.localeCompare(b.month));
  }
  async listHolderSymbols(): Promise<Set<string>> {
    return new Set((await readJson<HoldersMonthly[]>(FILES.holders, [])).map((r) => r.symbol));
  }

  async log(job: string, creditsEst: number, rows: number, status: string): Promise<void> {
    await serialized(FILES.log, async () => {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const line = JSON.stringify({ job, ran_at: new Date().toISOString(), credits_est: creditsEst, rows, status }) + "\n";
      await fs.appendFile(path.join(DATA_DIR, FILES.log), line);
    });
  }
}

// ---------- store selection ----------

let cached: DataStore | null = null;

export function getStore(): DataStore {
  if (cached) return cached;
  cached = new JsonStore();
  return cached;
}
