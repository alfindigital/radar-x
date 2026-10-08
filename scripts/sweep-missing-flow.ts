// One-off: fetch foreign-flow ONLY for symbols missing a given date whose
// local last flow date is recent (>= --since). Usage:
//   npx tsx scripts/sweep-missing-flow.ts [--date 2026-10-08] [--since 2026-10-01]
import { readFileSync } from "fs";
import path from "path";

try {
  const envPath = path.join(process.cwd(), ".env.local");
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
} catch { /* .env.local optional */ }

import { api } from "../src/lib/sectors";
import { getStore } from "../src/lib/db";

const args = process.argv.slice(2);
const flag = (n: string, d: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
const date = flag("date", new Date().toISOString().slice(0, 10));
const since = flag("since", "2026-10-01");

async function main() {
  const store = getStore();
  const prices = JSON.parse(readFileSync(path.join(process.cwd(), "data", "price_daily.json"), "utf8")) as { symbol: string; date: string }[];
  const uni = new Set(prices.filter((r) => r.date === date && r.symbol.endsWith(".JK")).map((r) => r.symbol));
  const rows = JSON.parse(readFileSync(path.join(process.cwd(), "data", "flow_daily.json"), "utf8")) as { symbol: string; date: string }[];
  const have = new Set(rows.filter((r) => r.date === date).map((r) => r.symbol));
  const last = new Map<string, string>();
  for (const r of rows) {
    const m = last.get(r.symbol);
    if (!m || r.date > m) last.set(r.symbol, r.date);
  }
  const missing = [...uni].filter((s) => !have.has(s));
  const wl = missing.filter((s) => (last.get(s) ?? "") >= since);
  console.log(`missing ${date}: ${missing.length} | recent (>=${since}): ${wl.length} | fetching`);
  let calls = 0, gotDate = 0, failed = 0, upserted = 0;
  for (const sym of wl) {
    try {
      const res = await api.foreignFlowSymbol(sym);
      calls++;
      if (res.data.some((r) => r.date === date)) gotDate++;
      upserted += await store.upsertFlowDaily(res.data.map((r) => ({
        symbol: res.symbol ?? sym,
        date: r.date,
        netForeignInflow: r.net_foreign_inflow,
        foreignBuyIdr: r.foreign_buy_idr,
        foreignSellIdr: r.foreign_sell_idr,
      })));
    } catch {
      failed++;
    }
  }
  console.log(`done: ${upserted} rows, ${calls} calls, ${gotDate} syms gained ${date}, ${failed} failed`);
  await store.log("sweep_missing_flow", calls, upserted, failed ? "partial" : "ok").catch(() => {});
}
main().catch((e) => { console.error(e); process.exit(1); });
