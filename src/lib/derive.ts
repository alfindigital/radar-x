import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { detectCandidates } from "./cases";
import { cachedFileLoad } from "./filecache";
import { computeExitWatch, type ExitWatchInput } from "./exitwatch";
import { measureOutcome } from "./outcomes";
import { computeScoresV2, type SymbolData } from "./score";
import type {
  BrokerTopSymbol,
  Candidate,
  CohortTopSymbol,
  CorpActionRow,
  ExitWatchRow,
  InsiderTrade,
  MeasuredOutcome,
  ScoreV2,
  Snapshot,
  SuspensionRow,
} from "./types";

const BENCH = "^IHSG";
const HORIZONS = [7, 30, 60] as const;

export type DerivedCase = Candidate & { outcomes: MeasuredOutcome[] };

export interface DerivedFileMeta {
  path: "scores.json" | "cases.json" | "exitwatch.json";
  sha256?: string;
  rows: number;
  engineVersion?: "radarx-v2" | "radarx-v3";
}

/** Feeds consumed by the v3 exit engine — loaded by the caller (async fs). */
export interface ExitFeeds {
  brokerTop: Map<string, BrokerTopSymbol> | null;
  cohortTop: Map<string, CohortTopSymbol> | null;
  freeFloat: Map<string, number> | null;
  suspensionsBySymbol: Map<string, SuspensionRow[]> | null;
  corpActionsBySymbol: Map<string, CorpActionRow[]> | null;
  /** sha256 per feed file actually consumed — folded into inputHash. */
  feedHashes: Record<string, string>;
}

export const NO_FEEDS: ExitFeeds = {
  brokerTop: null,
  cohortTop: null,
  freeFloat: null,
  suspensionsBySymbol: null,
  corpActionsBySymbol: null,
  feedHashes: {},
};

export function indexBySymbol<T extends { symbol: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) (map.get(row.symbol) ?? map.set(row.symbol, []).get(row.symbol)!).push(row);
  return map;
}

export interface DerivedManifest {
  schemaVersion: 2;
  engineVersion: "radarx-v2";
  asOf: string;
  inputHash: string;
  generatedAt: string;
  files: DerivedFileMeta[];
  limitations: string[];
  /** sha256 of each feed file consumed by the v3 engine (when present). */
  feedHashes?: Record<string, string>;
}

export interface DerivedSnapshot {
  scores: ScoreV2[];
  cases: DerivedCase[];
  exitWatch: ExitWatchRow[];
  manifest: DerivedManifest;
}

function assertAsOf(asOf: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || !Number.isFinite(Date.parse(`${asOf}T00:00:00Z`))) {
    throw new Error(`invalid --as-of date: ${asOf}`);
  }
}

function rowsFor<T extends { symbol: string }>(rows: T[], symbol: string): T[] {
  return rows.filter((row) => row.symbol === symbol);
}

export interface BrokerCohorts {
  instBrokers: Set<string>;
  retailBrokers: Set<string>;
}

export const EMPTY_COHORTS: BrokerCohorts = { instBrokers: new Set(), retailBrokers: new Set() };

/** Build cohort sets from broker_registry rows (cohort: institutional|retail|mixed|unknown). */
export function cohortsFromRegistry(rows: { code: string; cohort: string }[]): BrokerCohorts {
  return {
    instBrokers: new Set(rows.filter((r) => r.cohort === "institutional").map((r) => r.code)),
    retailBrokers: new Set(rows.filter((r) => r.cohort === "retail").map((r) => r.code)),
  };
}

// Knowledge-as-of: a filing only enters a reading once it was actually
// reported. A trade dated before asOf but filed after it must not leak in.
// Rows with a missing/unparseable filedAt keep event-date semantics — their
// timing is unverified, which the snapshot manifest already flags.
function knownBy(trade: InsiderTrade, asOf: string): boolean {
  const filedDay = typeof trade.filedAt === "string" ? trade.filedAt.slice(0, 10) : null;
  return filedDay === null || filedDay <= asOf;
}

function buildSymbolData(snapshot: Snapshot, symbol: string, asOf: string, cohorts: BrokerCohorts): SymbolData {
  const byDate = <T extends { date: string }>(a: T, b: T) => a.date.localeCompare(b.date);
  return {
    symbol,
    insider: rowsFor(snapshot.insider, symbol)
      .filter((row) => row.txnDate <= asOf && knownBy(row, asOf))
      .sort((a, b) => a.txnDate.localeCompare(b.txnDate)),
    flow: rowsFor(snapshot.flow, symbol).filter((row) => row.date <= asOf).sort(byDate),
    price: rowsFor(snapshot.price, symbol).filter((row) => row.date <= asOf).sort(byDate),
    broker: rowsFor(snapshot.broker, symbol).filter((row) => row.date <= asOf).sort(byDate),
    holders: rowsFor(snapshot.holders, symbol).filter((row) => row.month <= asOf).sort((a, b) => a.month.localeCompare(b.month)),
    instBrokers: cohorts.instBrokers,
    retailBrokers: cohorts.retailBrokers,
  };
}

export function buildDerived(
  snapshot: Snapshot,
  asOf: string,
  cohorts: BrokerCohorts = EMPTY_COHORTS,
  feeds: ExitFeeds = NO_FEEDS,
): DerivedSnapshot {
  assertAsOf(asOf);
  const symbols = new Set<string>([
    ...snapshot.tickers.map((row) => row.symbol),
    ...snapshot.insider.map((row) => row.symbol),
    ...snapshot.flow.map((row) => row.symbol),
    ...snapshot.price.map((row) => row.symbol),
    ...snapshot.broker.map((row) => row.symbol),
    ...snapshot.holders.map((row) => row.symbol),
  ]);
  symbols.delete(BENCH);
  const data = [...symbols].sort().map((symbol) => buildSymbolData(snapshot, symbol, asOf, cohorts));
  const scores = computeScoresV2(data, asOf);
  const benchmark = snapshot.price.filter((row) => row.symbol === BENCH && row.date <= asOf);
  const cases: DerivedCase[] = [];
  for (const symbolData of data) {
    if (!symbolData.insider.length) continue;
    const candidates = detectCandidates(symbolData.symbol, {
      insider: symbolData.insider,
      flow: symbolData.flow,
      price: symbolData.price,
      bench: benchmark,
    });
    for (const candidate of candidates) {
      const outcomes = HORIZONS.map((horizon) => measureOutcome(symbolData.price, benchmark, candidate.anchorDate, horizon, asOf));
      cases.push({ ...candidate, outcomes });
    }
  }
  cases.sort((a, b) => a.id.localeCompare(b.id));

  const exitInputs: ExitWatchInput[] = data.map((d) => ({
    d,
    brokerTop: feeds.brokerTop?.get(d.symbol) ?? null,
    cohortTop: feeds.cohortTop?.get(d.symbol) ?? null,
    freeFloat: feeds.freeFloat?.get(d.symbol) ?? null,
    suspensions: feeds.suspensionsBySymbol?.get(d.symbol) ?? [],
    corpActions: feeds.corpActionsBySymbol?.get(d.symbol) ?? [],
  }));
  const exitWatch = computeExitWatch(exitInputs, asOf);

  return {
    scores,
    cases,
    exitWatch,
    manifest: {
      schemaVersion: 2,
      engineVersion: "radarx-v2",
      asOf,
      inputHash: snapshot.manifest.inputHash,
      generatedAt: new Date().toISOString(),
      files: [
        { path: "scores.json", rows: scores.length, engineVersion: "radarx-v2" },
        { path: "cases.json", rows: cases.length },
        { path: "exitwatch.json", rows: exitWatch.length, engineVersion: "radarx-v3" },
      ],
      limitations: [
        "Derived analytics use the immutable local Sectors snapshot and do not call an upstream provider.",
        "Retrospective outcomes are paired to common issuer and benchmark sessions and remain pending when incomplete.",
        "Exit Watch is a bounded pressure reading over labeled broker cohorts — not proof of intent; missing components lower coverage instead of scoring zero.",
      ],
      feedHashes: feeds.feedHashes,
    },
  };
}

function digest(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function loadDerived(dataDir = path.join(process.cwd(), "data", "derived-v2")): Promise<DerivedSnapshot> {
  return cachedFileLoad(dataDir, ["manifest.json", "scores.json", "cases.json", "exitwatch.json"], () =>
    loadDerivedUncached(dataDir),
  );
}

async function loadDerivedUncached(dataDir: string): Promise<DerivedSnapshot> {
  const manifest = JSON.parse(await readFile(path.join(dataDir, "manifest.json"), "utf8")) as DerivedManifest;
  if (manifest.schemaVersion !== 2 || manifest.engineVersion !== "radarx-v2") throw new Error("derived manifest version is unsupported");
  const content = {} as { scores: ScoreV2[]; cases: DerivedCase[]; exitWatch: ExitWatchRow[] };
  for (const file of ["scores.json", "cases.json", "exitwatch.json"] as const) {
    let bytes: Buffer;
    try {
      bytes = await readFile(path.join(/*turbopackIgnore: true*/ dataDir, file));
    } catch {
      if (file === "exitwatch.json") {
        content.exitWatch = [];
        continue;
      }
      throw new Error(`missing derived artifact: ${file}`);
    }
    const meta = manifest.files.find((item) => item.path === file);
    if (!meta || (meta.sha256 && meta.sha256 !== digest(bytes))) throw new Error(`derived ${file} hash mismatch`);
    if (file === "exitwatch.json") content.exitWatch = JSON.parse(bytes.toString("utf8"));
    else content[file.slice(0, -5) as "scores" | "cases"] = JSON.parse(bytes.toString("utf8"));
  }
  return { ...content, manifest };
}
