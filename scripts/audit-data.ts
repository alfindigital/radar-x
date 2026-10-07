import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const DATA_FILES = [
  "tickers.json",
  "insider_trades.json",
  "flow_daily.json",
  "price_daily.json",
  "broker_rows.json",
  "holders_monthly.json",
] as const;

type JsonRow = Record<string, unknown>;

function asDate(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
}

function rowDate(row: JsonRow): string | null {
  return asDate(row.date) ?? asDate(row.txnDate) ?? asDate(row.month) ?? asDate(row.week) ?? asDate(row.anchorDate);
}

function rowKey(file: string, row: JsonRow): string {
  switch (file) {
    case "tickers.json": return String(row.symbol ?? "");
    case "insider_trades.json": return [row.symbol, row.holderName, row.txnType, row.txnDate, row.amount, row.price].join("|");
    case "flow_daily.json":
    case "price_daily.json": return [row.symbol, row.date].join("|");
    case "broker_rows.json": return [row.symbol, row.date, row.brokerCode].join("|");
    case "holders_monthly.json": return [row.symbol, row.month].join("|");
    default: return JSON.stringify(row);
  }
}

async function auditFile(dataDir: string, file: string) {
  const fullPath = path.join(dataDir, file);
  let bytes: Buffer;
  try {
    bytes = await fs.readFile(fullPath);
  } catch {
    return { path: `data/${file}`, status: "missing" as const };
  }
  const parsed: unknown = JSON.parse(bytes.toString("utf8"));
  if (!Array.isArray(parsed)) throw new Error(`${file} must contain a JSON array`);
  const rows = parsed as JsonRow[];
  const dates = rows.map(rowDate).filter((value): value is string => value !== null).sort();
  const symbols = new Set(rows.map((row) => String(row.symbol ?? "")).filter(Boolean));
  const keys = rows.map((row) => rowKey(file, row));
  const duplicateCount = keys.length - new Set(keys).size;
  const missingSourceCount = rows.filter((row) => "sourceUrl" in row && (!row.sourceUrl || typeof row.sourceUrl !== "string")).length;
  const zeroVolumeCount = file === "price_daily.json"
    ? rows.filter((row) => row.symbol !== "IHSG" && row.symbol !== "^IHSG" && Number(row.volume) === 0).length
    : 0;
  const transactionFeedLagCount = file === "insider_trades.json"
    ? rows.filter((row) => {
        const txn = asDate(row.txnDate);
        const filed = typeof row.filedAt === "string" ? row.filedAt : null;
        const filedDate = filed ? filed.slice(0, 10) : null;
        return Boolean(txn && filedDate && filedDate > txn);
      }).length
    : 0;
  return {
    path: `data/${file}`,
    status: "ok" as const,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    rows: rows.length,
    symbols: symbols.size,
    minDate: dates[0] ?? null,
    maxDate: dates.at(-1) ?? null,
    duplicateCount,
    missingSourceCount,
    transactionFeedLagCount,
    zeroVolumeCount,
  };
}

// Derived lineage: every member file's sha256 must match the manifest, and the
// manifest must name an inputHash. A generation that fails verification is a
// gate failure, not a warning.
async function auditDerived(dataDir: string) {
  const dir = path.join(dataDir, "derived-v2");
  let manifest: { asOf?: string; inputHash?: string; files?: { path: string; rows?: number; sha256: string }[] };
  try {
    manifest = JSON.parse(await fs.readFile(path.join(dir, "manifest.json"), "utf8"));
  } catch {
    return { status: "missing" as const, files: [] as never[], failures: ["data/derived-v2/manifest.json missing or unreadable"] };
  }
  const failures: string[] = [];
  const files = [];
  for (const member of manifest.files ?? []) {
    let bytes: Buffer;
    try {
      bytes = await fs.readFile(path.join(dir, member.path));
    } catch {
      failures.push(`derived-v2/${member.path} listed in manifest but missing`);
      continue;
    }
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const match = sha256 === member.sha256;
    if (!match) failures.push(`derived-v2/${member.path} sha256 mismatch (manifest ${member.sha256.slice(0, 12)}… vs actual ${sha256.slice(0, 12)}…)`);
    files.push({ path: `data/derived-v2/${member.path}`, rows: member.rows ?? null, sha256, match });
  }
  if (!manifest.asOf) failures.push("derived-v2 manifest has no asOf");
  if (!manifest.inputHash) failures.push("derived-v2 manifest has no inputHash lineage");
  if (!manifest.files?.length) failures.push("derived-v2 manifest lists no member files");
  return { status: failures.length ? ("failed" as const) : ("ok" as const), asOf: manifest.asOf ?? null, inputHash: manifest.inputHash ?? null, files, failures };
}

async function main() {
  const dataDir = path.join(process.cwd(), "data");
  const files = [];
  const failures: string[] = [];
  for (const file of DATA_FILES) {
    const result = await auditFile(dataDir, file);
    files.push(result);
    if (result.status === "missing") failures.push(`required file missing: data/${file}`);
    else if (result.rows === 0) failures.push(`required file empty: data/${file}`);
  }
  const derived = await auditDerived(dataDir);
  failures.push(...derived.failures);
  const okFiles = files.filter((file) => file.status === "ok");
  const report = {
    generatedAt: new Date().toISOString(),
    dataDir,
    sourcePolicy: "read-only; no provider calls and no source writes",
    files,
    derived,
    totals: {
      rows: okFiles.reduce((sum, file) => sum + file.rows, 0),
      missingFiles: files.filter((file) => file.status === "missing").length,
      duplicateRows: okFiles.reduce((sum, file) => sum + file.duplicateCount, 0),
      missingSourceRows: okFiles.reduce((sum, file) => sum + file.missingSourceCount, 0),
      transactionFeedLagRows: okFiles.reduce((sum, file) => sum + file.transactionFeedLagCount, 0),
      suspiciousZeroVolumeRows: okFiles.reduce((sum, file) => sum + file.zeroVolumeCount, 0),
    },
    failures,
    status: failures.length ? "failed" : "ok",
  };
  console.log(JSON.stringify(report, null, 2));
  if (failures.length) {
    console.error(`audit:data FAILED — ${failures.length} gate failure(s)`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
