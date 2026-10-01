// Issuer taxonomy artifact — per-issuer sector/subsector/industry/sub-industry
// loaded from data/taxonomy.json. Produced by `tsx scripts/ingest.ts taxonomy`
// (one company/report?sections=overview call per symbol; mostly static data).
// Read-only at request time; a missing file degrades gracefully, never fetches.

import { readFile } from "node:fs/promises";
import path from "node:path";

export interface TaxonomyRow {
  symbol: string; // .JK symbol
  companyName: string | null;
  sector: string | null; // display label, e.g. "Financials"
  subSector: string | null;
  industry: string | null;
  subIndustry: string | null;
  sectorSlug: string | null; // kebab-case, join key to rotation.sectorSlug
  subSectorSlug: string | null; // join key to rotation.slug
  listingBoard: string | null;
  marketCap: number | null;
  listingDate: string | null;
}

export interface TaxonomyArtifact {
  schemaVersion: 1;
  engineVersion: "radarx-v2";
  asOf: string | null;
  generatedAt: string;
  source: "sectors";
  creditsEst: number | null;
  rows: TaxonomyRow[];
  misses: string[]; // symbols whose overview call failed during ingest
}

export function slugifyTaxonomy(label: string | null | undefined): string | null {
  if (!label) return null;
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || null;
}

const FILE = path.join(process.cwd(), "data", "taxonomy.json");

export async function loadTaxonomy(): Promise<TaxonomyArtifact | null> {
  try {
    const parsed = JSON.parse(await readFile(/*turbopackIgnore: true*/ FILE, "utf8")) as TaxonomyArtifact;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.rows)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function taxonomyBySymbol(artifact: TaxonomyArtifact | null): Map<string, TaxonomyRow> {
  const map = new Map<string, TaxonomyRow>();
  for (const r of artifact?.rows ?? []) map.set(r.symbol, r);
  return map;
}
