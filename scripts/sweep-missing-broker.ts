// One-off: fetch broker-summary ONLY for symbols missing a given date,
// skipping the N stalest already-verified positions. Usage:
//   npx tsx scripts/sweep-missing-broker.ts [--date 2026-10-08] [--skip N]
import { readFileSync } from "fs";
import path from "path";

// Same minimal .env.local loader as ingest.ts (no deps)
try {
  const envPath = path.join(process.cwd(), ".env.local");
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
} catch { /* .env.local optional */ }

import { api } from "../src/lib/sectors";
import { getStore } from "../src/lib/db";
import type { BrokerSummaryRow } from "../src/lib/types";

const args = process.argv.slice(2);
const flag = (n: string, d: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
const date = flag("date", new Date().toISOString().slice(0, 10));
const skip = Number(flag("skip", "0"));

async function main() {
  const store = getStore();
  const prices = JSON.parse(readFileSync(path.join(process.cwd(), "data", "price_daily.json"), "utf8")) as { symbol: string; date: string }[];
  const uni = new Set(prices.filter((r) => r.date === date && r.symbol.endsWith(".JK")).map((r) => r.symbol));
  const rows = JSON.parse(readFileSync(path.join(process.cwd(), "data", "broker_rows.json"), "utf8")) as { symbol: string; date: string }[];
  const have = new Set(rows.filter((r) => r.date === date).map((r) => r.symbol));
  const last = new Map<string, string>();
  for (const r of rows) {
    const m = last.get(r.symbol);
    if (!m || r.date > m) last.set(r.symbol, r.date);
  }
  const missing = [...uni].filter((s) => !have.has(s)).sort((a, b) => (last.get(a) ?? "").localeCompare(last.get(b) ?? ""));
  const wl = missing.slice(skip);
  console.log(`missing ${date}: ${missing.length} | skipping ${skip} stalest | fetching ${wl.length}`);
  const batch = new Map<string, BrokerSummaryRow[]>();
  let calls = 0, ok = 0, gotDate = 0, failed = 0, upserted = 0;
  for (let i = 0; i < wl.length; i++) {
    const sym = wl[i];
    try {
      const res = await api.brokerSummary(sym);
      calls++; ok++;
      const days = res.data.flatMap((d) =>
        d.summary.map((s) => ({
          symbol: sym,
          date: d.date,
          brokerCode: s.broker_code,
          buyVal: s.bval ?? 0,
          sellVal: s.sval ?? 0,
          netVal: s.nval ?? 0,
          buyLot: s.blot ?? 0,
          sellLot: s.slot ?? 0,
          netLot: s.nlot ?? 0,
          avgBuy: s.bavg_per_share,
          avgSell: s.savg_per_share,
          foreignBuyVal: s.f_bval,
          foreignSellVal: s.f_sval,
        })),
      );
      if (res.data.some((d) => d.date === date)) gotDate++;
      batch.set(sym, days);
    } catch {
      failed++;
    }
    if (batch.size && ((i + 1) % 25 === 0 || i === wl.length - 1)) {
      upserted += await store.upsertBrokerRowsMulti(batch);
      batch.clear();
      console.log(`${i + 1}/${wl.length} (${calls} calls, ${gotDate} got ${date})`);
    }
  }
  console.log(`done: ${upserted} rows, ${calls} calls, ${gotDate} syms gained ${date}, ${failed} failed`);
  await store.log("sweep_missing_broker", calls, upserted, failed ? "partial" : "ok").catch(() => {});
}
main().catch((e) => { console.error(e); process.exit(1); });
