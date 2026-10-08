// One-off probes vs provider — verifies whether "residual" gaps are
// provider-side (takdir) or just un-tried parameters. ~20 calls total.
import { readFileSync } from "fs";
import path from "path";
import { api, sectorsGet } from "../src/lib/sectors";

const envPath = path.join(process.cwd(), ".env.local");
try {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* env injected */ }

async function probe<T>(name: string, fn: () => Promise<T>, summarize: (r: T) => string) {
  try {
    const r = await fn();
    console.log(`[OK] ${name}: ${summarize(r)}`);
  } catch (e) {
    console.log(`[FAIL] ${name}: ${e instanceof Error ? e.message.slice(0, 140) : e}`);
  }
}

async function main() {
  // 1. filings deep history — is the 6-month bound ours or provider's?
  await probe("filings 2020-2024", () => api.filings({ start: "2020-01-01", end: "2024-12-31", limit: 100, offset: 0 }),
    (r) => `total=${r.pagination?.total_count} first=${r.results[0]?.timestamp} sym=${r.results[0]?.symbol}`);

  // 2. shareholders-composition year param
  await probe("holders BBCA default", () => api.shareholdersComposition("BBCA.JK"),
    (r) => `year=${r.year} rows=${r.data.length} first=${r.data[0]?.date} last=${r.data.at(-1)?.date}`);
  await probe("holders BBCA ?year=2025", () =>
    sectorsGet<{ year: number; data: { date: string }[] }>("/v2/company/shareholders-composition/BBCA.JK/", { year: "2025" }),
    (r) => `year=${r.year} rows=${r.data.length} first=${r.data[0]?.date} last=${r.data.at(-1)?.date}`);

  // 3. ghost symbols — live or dead on provider?
  for (const sym of ["FREN.JK", "XLSM.JK", "CNTX.JK", "RMBA.JK"]) {
    await probe(`daily ${sym}`, () => api.daily(sym, { start: "2026-09-01" }),
      (r) => `${Array.isArray(r) ? r.length : "?"} rows, last=${Array.isArray(r) ? (r as { date: string }[]).at(-1)?.date : "-"}`);
  }

  // 4. BIMA free-float via company report overview
  await probe("companyReport BIMA overview", () => api.companyReport("BIMA.JK", ["overview"]),
    (r) => `keys=${Object.keys(r as object).join(",")} ff=${JSON.stringify((r as { overview?: { free_float?: unknown } }).overview?.free_float ?? null)}`);

  // 5. a broker-404 symbol — confirm provider genuinely has no data
  await probe("brokerSummary DEAL", () => api.brokerSummary("DEAL.JK"),
    (r) => `rows=${r.data.length} window=${r.start}..${r.end}`);

  // 6. news endpoint shape — never pulled
  await probe("news latest", () => api.news({ limit: 5 }),
    (r) => `${Array.isArray(r) ? r.length : (r as { results?: unknown[] }).results?.length} items, first=${JSON.stringify((Array.isArray(r) ? r[0] : (r as { results?: unknown[] }).results?.[0]) ?? null).slice(0, 160)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
