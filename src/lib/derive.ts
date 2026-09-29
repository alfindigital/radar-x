import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { detectCandidates } from "./cases";
import { measureOutcome } from "./outcomes";
import { computeScoresV2, type SymbolData } from "./score";
import type { Candidate, MeasuredOutcome, ScoreV2, Snapshot } from "./types";

const BENCH = "^IHSG";
const HORIZONS = [7, 30, 60] as const;

export type DerivedCase = Candidate & { outcomes: MeasuredOutcome[] };

export interface DerivedFileMeta {
  path: "scores.json" | "cases.json";
  sha256?: string;
  rows: number;
}

export interface DerivedManifest {
  schemaVersion: 2;
  engineVersion: "radarx-v2";
  asOf: string;
  inputHash: string;
  generatedAt: string;
  files: DerivedFileMeta[];
  limitations: string[];
}

export interface DerivedSnapshot {
  scores: ScoreV2[];
  cases: DerivedCase[];
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

function buildSymbolData(snapshot: Snapshot, symbol: string, asOf: string): SymbolData {
  return {
    symbol,
    insider: rowsFor(snapshot.insider, symbol).filter((row) => row.txnDate <= asOf),
    flow: rowsFor(snapshot.flow, symbol).filter((row) => row.date <= asOf),
    price: rowsFor(snapshot.price, symbol).filter((row) => row.date <= asOf),
    broker: rowsFor(snapshot.broker, symbol).filter((row) => row.date <= asOf),
    holders: rowsFor(snapshot.holders, symbol).filter((row) => row.month <= asOf),
    instBrokers: new Set(),
  };
}

export function buildDerived(snapshot: Snapshot, asOf: string): DerivedSnapshot {
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
  const data = [...symbols].sort().map((symbol) => buildSymbolData(snapshot, symbol, asOf));
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
  return {
    scores,
    cases,
    manifest: {
      schemaVersion: 2,
      engineVersion: "radarx-v2",
      asOf,
      inputHash: snapshot.manifest.inputHash,
      generatedAt: new Date().toISOString(),
      files: [
        { path: "scores.json", rows: scores.length },
        { path: "cases.json", rows: cases.length },
      ],
      limitations: [
        "Derived analytics use the immutable local Sectors snapshot and do not call an upstream provider.",
        "Retrospective outcomes are paired to common issuer and benchmark sessions and remain pending when incomplete.",
      ],
    },
  };
}

function digest(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function loadDerived(dataDir = path.join(process.cwd(), "data", "derived-v2")): Promise<DerivedSnapshot> {
  const manifest = JSON.parse(await readFile(path.join(dataDir, "manifest.json"), "utf8")) as DerivedManifest;
  if (manifest.schemaVersion !== 2 || manifest.engineVersion !== "radarx-v2") throw new Error("derived manifest version is unsupported");
  const content = {} as { scores: ScoreV2[]; cases: DerivedCase[] };
  for (const file of ["scores.json", "cases.json"] as const) {
    const bytes = await readFile(path.join(/*turbopackIgnore: true*/ dataDir, file));
    const meta = manifest.files.find((item) => item.path === file);
    if (!meta || (meta.sha256 && meta.sha256 !== digest(bytes))) throw new Error(`derived ${file} hash mismatch`);
    content[file.slice(0, -5) as "scores" | "cases"] = JSON.parse(bytes.toString("utf8"));
  }
  return { ...content, manifest };
}
