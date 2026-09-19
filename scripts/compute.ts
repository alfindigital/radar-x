// Compute positioning scores + detect cases over stored data.
// Usage: npx tsx scripts/compute.ts

import { getStore } from "../src/lib/db";
import { computeScores, rawComponents, type SymbolData } from "../src/lib/score";
import { detectCases } from "../src/lib/cases";

const BENCH = "^IHSG";

async function main() {
  const store = getStore();
  const bench = await store.listPriceDaily(BENCH);
  const anchor = bench.at(-1)?.date ?? new Date().toISOString().slice(0, 10);

  const trades = await store.listInsiderTrades({ limit: 100000 });
  const symbols = [...new Set(trades.map((t) => t.symbol))].sort();
  console.log(`computing ${symbols.length} symbols @ ${anchor}`);

  const all: { data: SymbolData; raw: ReturnType<typeof rawComponents> }[] = [];
  let totalCases = 0;

  for (const symbol of symbols) {
    const data: SymbolData = {
      symbol,
      insider: await store.listInsiderTrades({ symbol }),
      flow: await store.listFlowDaily(symbol),
      price: await store.listPriceDaily(symbol),
      broker: await store.listBrokerRows(symbol),
      holders: await store.getHolders(symbol),
      instBrokers: new Set(),
    };
    all.push({ data, raw: rawComponents(data, anchor) });
    const cases = detectCases(symbol, {
      insider: data.insider,
      flow: data.flow,
      price: data.price,
      bench,
    });
    if (cases.length) {
      totalCases += await store.upsertCases(cases);
    }
  }

  const scores = computeScores(all, anchor);
  await store.upsertScores(scores);

  const top = [...scores].sort((a, b) => b.score - a.score).slice(0, 15);
  const bottom = [...scores].sort((a, b) => a.score - b.score).slice(0, 10);
  console.log(`scores: ${scores.length} | cases: ${totalCases}`);
  console.log("TOP accumulation:", top.map((s) => `${s.symbol}:${s.score}`).join("  "));
  console.log("TOP distribution:", bottom.map((s) => `${s.symbol}:${s.score}`).join("  "));
  await store.log("compute", 0, scores.length + totalCases, "ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
