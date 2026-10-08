import test from "node:test";
import assert from "node:assert/strict";
import { detectCandidates } from "../src/lib/cases";
import type { FlowDaily, InsiderTrade, PriceDaily } from "../src/lib/types";

function trade(holderName: string, txnDate: string, txnType: "buy" | "sell" = "buy"): InsiderTrade {
  return {
    symbol: "TEST.JK",
    holderName,
    holderType: "insider",
    txnType,
    txnDate,
    filedAt: `${txnDate}T18:00:00Z`,
    amount: 100,
    price: 100,
    value: 10000,
    pctBefore: 1,
    pctAfter: 2,
    clusterHint: null,
    sourceUrl: "https://example.test/disclosure",
  };
}

function price(date: string, close: number): PriceDaily {
  return { symbol: "TEST.JK", date, open: close, high: close, low: close, close, volume: 1000, marketCap: 1_000_000 };
}

const flow: FlowDaily[] = [
  { symbol: "TEST.JK", date: "2026-08-01", netForeignInflow: 100, foreignBuyIdr: 200, foreignSellIdr: 100 },
  { symbol: "TEST.JK", date: "2026-08-10", netForeignInflow: 120, foreignBuyIdr: 220, foreignSellIdr: 100 },
  { symbol: "TEST.JK", date: "2026-09-01", netForeignInflow: 500, foreignBuyIdr: 600, foreignSellIdr: 100 },
  { symbol: "TEST.JK", date: "2026-09-10", netForeignInflow: 500, foreignBuyIdr: 600, foreignSellIdr: 100 },
];

test("candidates require three distinct holders and stay inside a 30-day event window", () => {
  const candidates = detectCandidates("TEST.JK", {
    insider: [trade("A", "2026-09-01"), trade("B", "2026-09-10"), trade("C", "2026-09-20")],
    flow,
    price: [price("2026-08-01", 120), price("2026-08-20", 110), price("2026-09-01", 100), price("2026-09-10", 99), price("2026-09-20", 98), price("2026-10-30", 500)],
  });
  assert.ok(candidates.some((candidate) => candidate.pattern === "CLUSTER_PATTERN"));
  const cluster = candidates.find((candidate) => candidate.pattern === "CLUSTER_PATTERN")!;
  assert.deepEqual(cluster.holders, ["A", "B", "C"]);
  assert.ok(cluster.windowEnd <= "2026-10-20");
  assert.ok(cluster.priceWindow.every((row) => row.date <= cluster.anchorDate));
});

test("future prices cannot change candidate identity or evidence", () => {
  const base = { insider: [trade("A", "2026-09-01"), trade("B", "2026-09-10"), trade("C", "2026-09-20")], flow, price: [price("2026-08-01", 120), price("2026-09-01", 100), price("2026-09-20", 98), price("2026-10-30", 500)] };
  const altered = { ...base, price: [...base.price.slice(0, 3), price("2026-10-30", 1)] };
  const a = detectCandidates("TEST.JK", base);
  const b = detectCandidates("TEST.JK", altered);
  assert.deepEqual(a, b);
});

test("an interleaved seller does not split a buyer cluster", () => {
  const candidates = detectCandidates("TEST.JK", {
    insider: [trade("A", "2026-09-01"), trade("Z", "2026-09-05", "sell"), trade("B", "2026-09-10"), trade("C", "2026-09-20")],
    flow,
    price: [price("2026-08-01", 120), price("2026-09-01", 100), price("2026-09-10", 99), price("2026-09-20", 98)],
  });
  const cluster = candidates.find((candidate) => candidate.pattern === "CLUSTER_PATTERN")!;
  assert.deepEqual(cluster.holders, ["A", "B", "C"]);
  assert.deepEqual(cluster.insiderTrades.map((t) => t.holderName), ["A", "B", "C"]);
});

test("a fourth holder after the bounded window starts a separate event", () => {
  const candidates = detectCandidates("TEST.JK", {
    insider: [trade("A", "2026-09-01"), trade("B", "2026-09-10"), trade("C", "2026-09-20"), trade("D", "2026-11-01")],
    flow,
    price: [price("2026-08-01", 120), price("2026-09-01", 100), price("2026-09-20", 98), price("2026-11-01", 95)],
  });
  assert.ok(candidates.every((candidate) => new Date(candidate.windowEnd).getTime() - new Date(candidate.insiderTrades[0].txnDate).getTime() <= 30 * 86_400_000));
});
