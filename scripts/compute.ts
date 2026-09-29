import { createHash } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDerived, type DerivedSnapshot } from "../src/lib/derive";
import { loadSnapshot } from "../src/lib/snapshot";

export interface ComputeArgs {
  asOf: string;
  outputDir: string;
}

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
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
  if (!asOf || !validDate(asOf)) throw new Error("compute requires --as-of YYYY-MM-DD");
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
  const files = [
    { path: "scores.json" as const, rows: derived.scores.length, sha256: hash(scoresBytes) },
    { path: "cases.json" as const, rows: derived.cases.length, sha256: hash(casesBytes) },
  ];
  await writeAtomic(path.join(resolved, "scores.json"), scoresBytes);
  await writeAtomic(path.join(resolved, "cases.json"), casesBytes);
  const manifestBytes = Buffer.from(`${JSON.stringify({ ...derived.manifest, files }, null, 2)}\n`, "utf8");
  await writeAtomic(path.join(resolved, "manifest.json"), manifestBytes);
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);
  const snapshot = await loadSnapshot();
  const derived = buildDerived(snapshot, args.asOf);
  await writeDerived(args.outputDir, derived);
  const scores = derived.scores.filter((row) => row.score !== null).length;
  const complete = derived.cases.flatMap((row) => row.outcomes).filter((outcome) => outcome.status === "complete").length;
  const pending = derived.cases.flatMap((row) => row.outcomes).filter((outcome) => outcome.status === "pending").length;
  console.log(`derived-v2 as-of ${args.asOf}: ${scores}/${derived.scores.length} scores, ${derived.cases.length} candidates, ${complete} complete outcomes, ${pending} pending outcomes`);
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entry && entry === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
