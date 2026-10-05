import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  BrokerTopSymbol,
  BrokersTopSession,
  CorpActionRow,
  CohortTopSymbol,
  Feed,
  RegistryRow,
  SuspensionRow,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

interface Envelope {
  schemaVersion?: number;
  engineVersion?: string;
  source?: string;
  asOf?: string;
  generatedAt?: string;
  [key: string]: unknown;
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Read one envelope-style feed file. Returns null when the file is absent —
 * feeds are optional so a fresh clone still boots. Throws on invalid JSON.
 */
async function readFeed<T>(
  file: string,
  pick: (env: Envelope) => T,
  countRows: (data: T) => number,
  dataDir = DATA_DIR,
): Promise<Feed<T> | null> {
  let bytes: Buffer;
  try {
    bytes = await readFile(path.join(/*turbopackIgnore: true*/ dataDir, file));
  } catch {
    return null;
  }
  const env = JSON.parse(bytes.toString("utf8")) as Envelope;
  const data = pick(env);
  return {
    meta: {
      path: file,
      sha256: sha256(bytes),
      asOf: typeof env.asOf === "string" ? env.asOf : null,
      generatedAt: typeof env.generatedAt === "string" ? env.generatedAt : null,
      rows: countRows(data),
    },
    data,
  };
}

function rowsOf(env: Envelope): Record<string, unknown>[] {
  return Array.isArray(env.rows) ? (env.rows as Record<string, unknown>[]) : [];
}

export function loadRegistry(dataDir = DATA_DIR): Promise<Feed<RegistryRow[]> | null> {
  return readFeed(
    "broker_registry.json",
    (env) => rowsOf(env) as unknown as RegistryRow[],
    (d) => d.length,
    dataDir,
  );
}


export function loadSuspensions(dataDir = DATA_DIR): Promise<Feed<SuspensionRow[]> | null> {
  return readFeed(
    "suspensions.json",
    (env) =>
      (rowsOf(env) as unknown as SuspensionRow[]).sort((a, b) =>
        (b.suspension_date ?? "").localeCompare(a.suspension_date ?? ""),
      ),
    (d) => d.length,
    dataDir,
  );
}

const ACTION_DATE_KEYS = ["ex_date", "date", "agm_date", "trading_period_start", "recording_date", "cum_date"] as const;

/** Flatten nested {types:{<type>:{start,end,<type>:[rows]}}} → CorpActionRow[]. */
export function loadCorpActions(dataDir = DATA_DIR): Promise<Feed<CorpActionRow[]> | null> {
  return readFeed(
    "corporate_actions.json",
    (env) => {
      const out: CorpActionRow[] = [];
      const types = env.types;
      if (!types || typeof types !== "object") return out;
      for (const [type, block] of Object.entries(types as Record<string, Record<string, unknown>>)) {
        const rows = block?.[type];
        if (!Array.isArray(rows)) continue;
        for (const raw of rows as Record<string, unknown>[]) {
          const symbol = typeof raw.symbol === "string" ? raw.symbol : null;
          if (!symbol) continue;
          const date = ACTION_DATE_KEYS.map((k) => raw[k]).find((v): v is string => typeof v === "string") ?? null;
          out.push({ symbol, type, date: date ? date.slice(0, 10) : null, raw });
        }
      }
      return out;
    },
    (d) => d.length,
    dataDir,
  );
}

export function loadBrokerTop(dataDir = DATA_DIR): Promise<Feed<Map<string, BrokerTopSymbol>> | null> {
  return readFeed(
    "broker_top.json",
    (env) => {
      const map = new Map<string, BrokerTopSymbol>();
      const data = env.data;
      if (data && typeof data === "object") {
        for (const [symbol, value] of Object.entries(data)) {
          const v = value as Record<string, unknown>;
          map.set(symbol, {
            start: typeof v.start === "string" ? v.start : "",
            end: typeof v.end === "string" ? v.end : "",
            topBuyers: Array.isArray(v.topBuyers) ? (v.topBuyers as BrokerTopSymbol["topBuyers"]) : [],
            topSellers: Array.isArray(v.topSellers) ? (v.topSellers as BrokerTopSymbol["topSellers"]) : [],
          });
        }
      }
      return map;
    },
    (d) => d.size,
    dataDir,
  );
}

export function loadBrokersTop(dataDir = DATA_DIR): Promise<Feed<BrokersTopSession[]> | null> {
  return readFeed(
    "brokers_top.json",
    (env) =>
      (Array.isArray(env.sessions) ? (env.sessions as BrokersTopSession[]) : []).sort((a, b) =>
        (b.date ?? "").localeCompare(a.date ?? ""),
      ),
    (d) => d.length,
    dataDir,
  );
}



/** Optional per-cohort top-N overlay written by `npm run ingest -- cohorttop`. */
export function loadCohortTop(dataDir = DATA_DIR): Promise<Feed<Map<string, CohortTopSymbol>> | null> {
  return readFeed(
    "cohort_top.json",
    (env) => {
      const map = new Map<string, CohortTopSymbol>();
      const data = env.data;
      if (data && typeof data === "object") {
        for (const [symbol, value] of Object.entries(data)) {
          if (value && typeof value === "object") map.set(symbol, value as CohortTopSymbol);
        }
      }
      return map;
    },
    (d) => d.size,
    dataDir,
  );
}
