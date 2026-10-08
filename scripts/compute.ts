import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDerived,
  cohortsFromRegistry,
  EMPTY_COHORTS,
  indexBySymbol,
  NO_FEEDS,
  type DerivedSnapshot,
  type ExitFeeds,
} from "../src/lib/derive";
import { loadBrokerTop, loadCohortTop, loadCorpActions, loadRegistry, loadSuspensions } from "../src/lib/feeds";
import { loadFreeFloat } from "../src/lib/ownership";
import { loadSnapshot } from "../src/lib/snapshot";
import { loadTaxonomy } from "../src/lib/taxonomy";

export interface ComputeArgs {
  asOf: string;
  outputDir: string;
}

function validDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const iso = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toISOString().slice(0, 10);
  return iso === value; // rejects rollovers like 2026-02-30
}

export function parseArgs(argv: string[]): ComputeArgs {
  let asOf: string | undefined;
  let outputDir = path.join("data", "derived-v2");
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--as-of") {
      asOf = argv[++i];
    } else if (arg === "--output") {
      outputDir = argv[++i];
    } else {
      throw new Error(`unknown compute flag: ${arg}`);
    }
  }
  const today = new Date().toISOString().slice(0, 10);
  if (asOf === "today") asOf = today; // ops shorthand for the daily pipeline
  if (!asOf || !validDate(asOf)) throw new Error("compute requires --as-of YYYY-MM-DD (a real calendar date)");
  if (asOf > today) throw new Error(`compute --as-of cannot be in the future (${asOf} > ${today})`);
  return { asOf, outputDir };
}

export function resolveOutputDir(outputDir: string): string {
  const dataRoot = path.resolve(process.cwd(), "data");
  const resolved = path.resolve(process.cwd(), outputDir);
  const relative = path.relative(dataRoot, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("compute output must stay inside the repository data directory");
  if (path.extname(resolved).toLowerCase() === ".json") throw new Error("compute output must be a derived directory, never a raw JSON file");
  return resolved;
}

function hash(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function writeAtomic(filePath: string, bytes: Buffer): Promise<void> {
  const tempPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(tempPath, bytes);
  await rename(tempPath, filePath);
}

export async function writeDerived(outputDir: string, derived: DerivedSnapshot): Promise<void> {
  const resolved = resolveOutputDir(outputDir);
  await mkdir(resolved, { recursive: true });
  const scoresBytes = Buffer.from(`${JSON.stringify(derived.scores, null, 2)}\n`, "utf8");
  const casesBytes = Buffer.from(`${JSON.stringify(derived.cases, null, 2)}\n`, "utf8");
  const exitBytes = Buffer.from(`${JSON.stringify(derived.exitWatch, null, 2)}\n`, "utf8");
  const files = [
    { path: "scores.json" as const, rows: derived.scores.length, sha256: hash(scoresBytes), engineVersion: "radarx-v2" as const },
    { path: "cases.json" as const, rows: derived.cases.length, sha256: hash(casesBytes) },
    { path: "exitwatch.json" as const, rows: derived.exitWatch.length, sha256: hash(exitBytes), engineVersion: "radarx-v3" as const },
  ];
  await writeAtomic(path.join(resolved, "scores.json"), scoresBytes);
  await writeAtomic(path.join(resolved, "cases.json"), casesBytes);
  await writeAtomic(path.join(resolved, "exitwatch.json"), exitBytes);
  const manifestBytes = Buffer.from(`${JSON.stringify({ ...derived.manifest, files }, null, 2)}\n`, "utf8");
  await writeAtomic(path.join(resolved, "manifest.json"), manifestBytes);
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);
  const snapshot = await loadSnapshot();
  const registry = await loadRegistry();
  const cohorts = registry
    ? cohortsFromRegistry(registry.data)
    : EMPTY_COHORTS;
  if (!registry) console.warn("broker_registry.json missing — cohort components fall back to foreign proxy");

  const [brokerTop, cohortTop, suspensions, corpActions, freeFloat, taxonomy] = await Promise.all([
    loadBrokerTop(),
    loadCohortTop(),
    loadSuspensions(),
    loadCorpActions(),
    loadFreeFloat(),
    loadTaxonomy(),
  ]);
  const feedHashes: Record<string, string> = {};
  for (const name of ["broker_registry.json", "broker_top.json", "cohort_top.json", "suspensions.json", "corporate_actions.json", "free_float.json"]) {
    try {
      feedHashes[name] = hash(await readFile(path.join(process.cwd(), "data", name)));
    } catch {
      /* optional feed absent */
    }
  }
  const feeds: ExitFeeds = {
    ...NO_FEEDS,
    brokerTop: brokerTop?.data ?? null,
    cohortTop: cohortTop?.data ?? null,
    suspensionsBySymbol: suspensions ? indexBySymbol(suspensions.data) : null,
    corpActionsBySymbol: corpActions ? indexBySymbol(corpActions.data) : null,
    freeFloat: freeFloat ? new Map(freeFloat.rows.map((r) => [r.symbol, r.freeFloat]).filter((e): e is [string, number] => e[1] !== null)) : null,
    feedHashes,
  };
  for (const [name, feed] of [
    ["broker_top", brokerTop],
    ["suspensions", suspensions],
    ["corporate_actions", corpActions],
    ["free_float", freeFloat],
  ] as const) {
    if (!feed) console.warn(`${name}.json missing — related exit components will show as missing`);
  }

  // Market-cap fallback from the taxonomy artifact: symbols covered only by
  // universe close rows carry no marketCap, which would otherwise knock out
  // every cap-normalized component (foreignTrend, exitwatch normalization).
  const caps = new Map(
    (taxonomy?.rows ?? [])
      .filter((r) => typeof r.marketCap === "number" && r.marketCap > 0)
      .map((r) => [r.symbol, r.marketCap as number]),
  );
  const derived = buildDerived(snapshot, args.asOf, cohorts, feeds, caps);
  await writeDerived(args.outputDir, derived);
  const scores = derived.scores.filter((row) => row.score !== null).length;
  const complete = derived.cases.flatMap((row) => row.outcomes).filter((outcome) => outcome.status === "complete").length;
  const pending = derived.cases.flatMap((row) => row.outcomes).filter((outcome) => outcome.status === "pending").length;
  const publishable = derived.exitWatch.filter((row) => row.score !== null).length;
  console.log(`derived-v2 as-of ${args.asOf}: ${scores}/${derived.scores.length} scores, ${derived.cases.length} candidates, ${complete} complete outcomes, ${pending} pending outcomes`);
  console.log(`exitwatch: ${publishable}/${derived.exitWatch.length} publishable (coverage>=0.5), feeds: ${Object.keys(feedHashes).join(",")}`);
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entry && entry === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
