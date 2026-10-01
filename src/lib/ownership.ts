// Ownership + free-float artifacts — loaded from data/ownership.json and
// data/free_float.json. Produced by `tsx scripts/ingest.ts ownership` (rolling,
// least-fetched-first) and the free-float pass inside `ingest boards`.
// Read-only at request time; missing or partial coverage degrades gracefully.

import { readFile } from "node:fs/promises";
import path from "node:path";

export interface OwnershipHolder {
  symbol: string;
  name: string;
  holderSymbol: string | null; // set when the holder is itself a listed issuer
  pct: number | null; // 0-100
  amount: number | null;
  value: number | null;
}

export interface OwnershipInstFlow {
  symbol: string;
  month: string; // EOM date "2026-08-31"
  netTransaction: number; // shares
}

export interface OwnershipInstTxn {
  symbol: string;
  month: string;
  side: string; // "buy" | "sell"
  name: string;
  changeAmount: number;
}

export interface OwnershipArtifact {
  schemaVersion: 1;
  engineVersion: "radarx-v2";
  source: "sectors";
  asOf: string | null;
  generatedAt: string;
  creditsEst: number;
  refreshed: Record<string, string>;
  holders: OwnershipHolder[];
  whales: { symbol: string; name: string }[];
  groups: { symbol: string; group: string }[];
  instFlow: OwnershipInstFlow[];
  instTxn: OwnershipInstTxn[];
  misses: string[];
}

export interface IssuerOwnership {
  holders: OwnershipHolder[];
  whales: string[];
  groups: string[];
  instFlow: OwnershipInstFlow[];
  instTxn: OwnershipInstTxn[];
}

const FILE = path.join(process.cwd(), "data", "ownership.json");

export async function loadOwnership(): Promise<OwnershipArtifact | null> {
  try {
    const parsed = JSON.parse(await readFile(/*turbopackIgnore: true*/ FILE, "utf8")) as OwnershipArtifact;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.holders)) return null;
    return parsed;
  } catch {
    return null;
  }
}

// Empty shape for symbols outside the current rolling coverage — the ingest
// refreshes least-recently-fetched first, so coverage grows over time.
const EMPTY_OWNERSHIP: IssuerOwnership = { holders: [], whales: [], groups: [], instFlow: [], instTxn: [] };

export function ownershipForSymbol(artifact: OwnershipArtifact | null, symbol: string): IssuerOwnership {
  if (!artifact || !(symbol in artifact.refreshed)) return EMPTY_OWNERSHIP;
  return {
    holders: artifact.holders.filter((r) => r.symbol === symbol),
    whales: artifact.whales.filter((r) => r.symbol === symbol).map((r) => r.name),
    groups: artifact.groups.filter((r) => r.symbol === symbol).map((r) => r.group),
    instFlow: artifact.instFlow.filter((r) => r.symbol === symbol),
    instTxn: artifact.instTxn.filter((r) => r.symbol === symbol),
  };
}

export interface FreeFloatArtifact {
  schemaVersion: number;
  engineVersion: string;
  source: string;
  asOf: string | null;
  generatedAt: string;
  rows: { symbol: string; companyName: string; freeFloat: number | null; subSector: string }[];
}

const FF_FILE = path.join(process.cwd(), "data", "free_float.json");

export async function loadFreeFloat(): Promise<FreeFloatArtifact | null> {
  try {
    const parsed = JSON.parse(await readFile(/*turbopackIgnore: true*/ FF_FILE, "utf8")) as FreeFloatArtifact;
    if (!Array.isArray(parsed.rows)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function freeFloatForSymbol(artifact: FreeFloatArtifact | null, symbol: string): number | null {
  return artifact?.rows.find((r) => r.symbol === symbol)?.freeFloat ?? null;
}
