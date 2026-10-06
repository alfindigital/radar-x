// Sector rotation artifact — sector/subsector aggregate context loaded from
// data/sector_rotation.json. Produced by `tsx scripts/ingest.ts rotation`.
// Read-only at request time; a missing file degrades the page, it never fetches.

import { readFile } from "node:fs/promises";
import path from "node:path";

export interface RotationMover {
  symbol: string;
  name: string;
  pe: number | null;
  chg1m: number | null;
  chg1y: number | null;
  lastClose: number | null;
}

export interface RotationSubsector {
  slug: string; // kebab-case subsector slug (path param + where filter value)
  sector: string; // display label from the report, e.g. "Financials"
  sectorSlug: string; // taxonomy parent slug, e.g. "financials"
  subSector: string; // display label, e.g. "Banks"
  companyCount: number | null;
  medianPe: number | null;
  weightedPe: number | null;
  mcapTotal: number | null;
  mcapChange1w: number | null; // fractions, not percent
  mcapChange1y: number | null;
  mcapChangeYtd: number | null;
  perfQuantile: number | null; // 0..1 rank of the subsector's recent performance
  monthlyPerf: Record<string, number> | null;
  maxDrawdown: number | null;
  rsd: number | null;
  topChange: RotationMover[]; // strongest 1m movers inside the subsector
  members: string[]; // .JK symbols belonging to this subsector
  netForeignFlow: number | null; // latest stored foreign-flow day, summed over observed members (IDR)
  flowDate: string | null;
  flowObserved: number | null; // members with a stored flow row on flowDate
  flowExpected: number | null; // members mapped to this subsector
  // valuation/growth sections — present only when ingested with those sections
  valuationLatest: {
    year: string;
    pb: number | null;
    pe: number | null;
    ps: number | null;
    pcf: number | null;
    pbRank: number | null;
    peRank: number | null;
    psRank: number | null;
    pcfRank: number | null;
  } | null;
  valuationHist: Record<string, { pb: number | null; pe: number | null; ps: number | null; pcf: number | null }> | null;
  growthHist: Record<string, { earnGrowth: number | null; revGrowth: number | null }> | null;
  growthForecast: { year: string; epsGrowth: number | null; revGrowth: number | null } | null;
}

export interface SectorRotationArtifact {
  schemaVersion: 1;
  engineVersion: "radarx-v2";
  asOf: string | null; // latest observed monthly-performance date
  generatedAt: string;
  source: "sectors";
  sections: string[];
  creditsEst: number | null;
  subsectors: RotationSubsector[];
  limitations: string[];
}

const FILE = path.join(process.cwd(), "data", "sector_rotation.json");

export async function loadRotation(): Promise<SectorRotationArtifact | null> {
  try {
    const parsed = JSON.parse(await readFile(/*turbopackIgnore: true*/ FILE, "utf8")) as SectorRotationArtifact;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.subsectors)) return null;
    return parsed;
  } catch {
    return null;
  }
}
