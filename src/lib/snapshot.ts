import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cachedFileLoad } from "./filecache";
import type {
  BrokerSummaryRow,
  FlowDaily,
  HoldersMonthly,
  InsiderTrade,
  PriceDaily,
  Snapshot,
  SnapshotIndexes,
  SourceFileMeta,
  Ticker,
} from "./types";

const DATA_FILES = [
  ["tickers.json", "tickers"],
  ["insider_trades.json", "insider"],
  ["flow_daily.json", "flow"],
  ["price_daily.json", "price"],
  ["broker_rows.json", "broker"],
  ["holders_monthly.json", "holders"],
] as const;

const DEFAULT_DATA_DIR = path.join(process.cwd(), "data");

/** One dataset of the snapshot. `broker` alone is ~70 MB, so request handlers load only the parts they read. */
export type SnapshotPart = "tickers" | "insider" | "flow" | "price" | "broker" | "holders";
export type SnapshotSlice<P extends SnapshotPart> = Pick<Snapshot, P>;

const PART_FILES: Record<SnapshotPart, string> = {
  tickers: "tickers.json",
  insider: "insider_trades.json",
  flow: "flow_daily.json",
  price: "price_daily.json",
  broker: "broker_rows.json",
  holders: "holders_monthly.json",
};

function asRows(file: string, value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error(`${file}: expected a JSON array`);
  return value.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`${file}: row ${index} must be an object`);
    }
    return row as Record<string, unknown>;
  });
}

function parseDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  return value.slice(0, 10);
}

function dateBounds(rows: Record<string, unknown>[]): { minDate: string | null; maxDate: string | null } {
  const dates = rows
    .flatMap((row) => [row.date, row.txnDate, row.month, row.week, row.anchorDate])
    .map(parseDate)
    .filter((value): value is string => value !== null)
    .sort();
  return { minDate: dates[0] ?? null, maxDate: dates.at(-1) ?? null };
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function emptyIndexes(): SnapshotIndexes {
  return {
    insiderBySymbol: {},
    flowBySymbol: {},
    priceBySymbol: {},
    brokerBySymbol: {},
    holdersBySymbol: {},
  };
}

function indexRows(index: Record<string, number[]>, rows: Array<{ symbol?: string }>): void {
  rows.forEach((row, position) => {
    if (!row.symbol) return;
    (index[row.symbol] ??= []).push(position);
  });
}

function normalizePriceRow(row: PriceDaily): PriceDaily {
  if (row.observationKind) return row;
  const flatOhlc = row.open === row.high && row.high === row.low && row.low === row.close;
  const ambiguous = row.volume === 0 || row.marketCap === null || flatOhlc;
  if (!ambiguous) return row;
  const fieldSources: PriceDaily["fieldSources"] = {};
  for (const field of ["open", "high", "low", "close", "volume", "marketCap"] as const) {
    fieldSources[field] = "legacy-unknown";
  }
  return { ...row, observationKind: "legacy-unknown", fieldSources };
}

async function readSnapshotFile(dataDir: string, file: string): Promise<{ rows: Record<string, unknown>[]; bytes: Buffer }> {
  let bytes: Buffer;
  try {
    bytes = await readFile(path.join(/*turbopackIgnore: true*/ dataDir, file));
  } catch (error) {
    throw new Error(`${file}: unable to read snapshot file`, { cause: error });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(`${file}: invalid JSON`, { cause: error });
  }
  return { rows: asRows(file, parsed), bytes };
}

async function loadPart(part: SnapshotPart, dataDir: string): Promise<unknown[]> {
  const file = PART_FILES[part];
  return cachedFileLoad(dataDir, [file], async () => {
    const { rows } = await readSnapshotFile(dataDir, file);
    return part === "price" ? (rows as unknown as PriceDaily[]).map(normalizePriceRow) : rows;
  });
}

/**
 * Request-path loader: reads and parses only the requested datasets, each
 * cached on its own. Unlike `loadSnapshot` it skips the content hashes,
 * date bounds and symbol indexes that only the build/audit scripts need, and
 * the returned type contains exactly the requested keys, so touching a part
 * that was not loaded fails to compile instead of silently reading nothing.
 */
export async function loadSnapshotParts<P extends SnapshotPart>(
  parts: readonly P[],
  dataDir = DEFAULT_DATA_DIR,
): Promise<SnapshotSlice<P>> {
  const entries = await Promise.all(parts.map(async (part) => [part, await loadPart(part, dataDir)] as const));
  return Object.fromEntries(entries) as unknown as SnapshotSlice<P>;
}

/** Full snapshot with manifest and indexes — for compute/audit/ingest scripts, not request handlers. */
export async function loadSnapshot(dataDir = DEFAULT_DATA_DIR): Promise<Snapshot> {
  return cachedFileLoad(dataDir, DATA_FILES.map(([file]) => file), () => loadSnapshotUncached(dataDir));
}

async function loadSnapshotUncached(dataDir: string): Promise<Snapshot> {
  const raw = new Map<string, { rows: Record<string, unknown>[]; bytes: Buffer }>();
  for (const [file] of DATA_FILES) raw.set(file, await readSnapshotFile(dataDir, file));

  const auditedAt = new Date().toISOString();
  const files: SourceFileMeta[] = DATA_FILES.map(([file]) => {
    const entry = raw.get(file)!;
    const bounds = dateBounds(entry.rows);
    return {
      path: file,
      provider: "sectors",
      sha256: sha256(entry.bytes),
      rows: entry.rows.length,
      minDate: bounds.minDate,
      maxDate: bounds.maxDate,
      retrievedAt: null,
      auditedAt,
      provenanceStatus: "legacy-normalized",
      limitations: ["Legacy snapshot retrieval time and point-in-time publication availability are unverified."],
    };
  });
  const inputHash = sha256(Buffer.from(files.map((file) => `${file.path}:${file.sha256}`).join("\n"), "utf8"));

  const tickers = raw.get("tickers.json")!.rows as unknown as Ticker[];
  const insider = raw.get("insider_trades.json")!.rows as unknown as InsiderTrade[];
  const flow = raw.get("flow_daily.json")!.rows as unknown as FlowDaily[];
  const price = (raw.get("price_daily.json")!.rows as unknown as PriceDaily[]).map(normalizePriceRow);
  const broker = raw.get("broker_rows.json")!.rows as unknown as BrokerSummaryRow[];
  const holders = raw.get("holders_monthly.json")!.rows as unknown as HoldersMonthly[];
  const indexes = emptyIndexes();
  indexRows(indexes.insiderBySymbol, insider);
  indexRows(indexes.flowBySymbol, flow);
  indexRows(indexes.priceBySymbol, price);
  indexRows(indexes.brokerBySymbol, broker);
  indexRows(indexes.holdersBySymbol, holders);

  return {
    tickers,
    insider,
    flow,
    price,
    broker,
    holders,
    indexes,
    manifest: {
      schemaVersion: 2,
      engineVersion: "radarx-v2",
      asOf: files.reduce<string | null>((latest, file) => (file.maxDate && (!latest || file.maxDate > latest) ? file.maxDate : latest), null),
      files,
      inputHash,
      generatedAt: auditedAt,
    },
  };
}
