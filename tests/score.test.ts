import test from "node:test";
import assert from "node:assert/strict";
import { computeScoresV2, standardize, type SymbolData } from "../src/lib/score";

test("missing observations do not move the valid cohort", () => {
  const base = standardize([1, 2, 3, 4, 5]);
  const extended = standardize([1, 2, 3, 4, 5, null, null]);
  assert.deepEqual(extended.slice(0, 5), base);
  assert.equal(extended[5], null);
});

test("identical observations are central and never infinite", () => {
  const values = standardize([5, 5, 5, 5, 5]);
  assert.deepEqual(values, [0, 0, 0, 0, 0]);
});

function symbolData(symbol: string, overrides: Partial<SymbolData> = {}): SymbolData {
  return {
    symbol,
    insider: [],
    flow: [],
    price: [],
    broker: [],
    holders: [],
    instBrokers: new Set(),
    retailBrokers: new Set(),
    ...overrides,
  };
}

test("all-missing components do not publish a singleton score", () => {
  const [result] = computeScoresV2([symbolData("A.JK")], "2026-09-22");
  assert.equal(result.score, null);
  assert.equal(result.coverageWeight, 0);
  assert.equal(result.components.insiderZ.status, "missing");
});

test("fewer than five observations are unrankable", () => {
  const data = Array.from({ length: 4 }, (_, i) => symbolData(`A${i}.JK`, {
    insider: [{ symbol: `A${i}.JK`, holderName: "H", holderType: "insider", txnType: "buy", txnDate: "2026-09-22", filedAt: "2026-09-22T00:00:00Z", amount: 1, price: 10, value: i + 1, pctBefore: null, pctAfter: null, clusterHint: null, sourceUrl: null }],
  }));
  const results = computeScoresV2(data, "2026-09-22");
  assert.equal(results[0].components.insiderZ.status, "unrankable");
  assert.equal(results[0].score, null);
});

test("two rankable components publish a bounded score and ignore future holders", () => {
  const data = Array.from({ length: 5 }, (_, i) => symbolData(`A${i}.JK`, {
    insider: [{ symbol: `A${i}.JK`, holderName: "H", holderType: "insider", txnType: "buy", txnDate: "2026-09-22", filedAt: "2026-09-22T00:00:00Z", amount: 1, price: 10, value: (i + 1) * 100, pctBefore: null, pctAfter: null, clusterHint: null, sourceUrl: null }],
    flow: [{ symbol: `A${i}.JK`, date: "2026-09-22", netForeignInflow: (i - 2) * 10, foreignBuyIdr: 10, foreignSellIdr: 10 }],
    price: [{ symbol: `A${i}.JK`, date: "2026-09-22", open: 10, high: 10, low: 10, close: 10, volume: 100, marketCap: 1000 }],
    holders: [
      { symbol: `A${i}.JK`, month: "2026-08-31", sharesNumber: 100, nShareholders: 10, changeInShareholders: i, local: {}, foreign: {} },
      { symbol: `A${i}.JK`, month: "2026-09-30", sharesNumber: 100, nShareholders: 10, changeInShareholders: 100, local: {}, foreign: {} },
    ],
  }));
  const before = computeScoresV2(data, "2026-09-22");
  const after = computeScoresV2(data, "2026-09-22");
  assert.deepEqual(after, before);
  assert.ok(before.every((row) => row.score !== null));
  assert.ok(before.every((row) => row.score! >= -100 && row.score! <= 100));
  assert.equal(before[0].components.retailExodusZ.status, "missing");
  assert.equal(before[0].components.insiderZ.status, "available");
  assert.equal(before[0].components.foreignTrend.status, "available");
});

test("a holder month after as-of cannot change earlier raw components", () => {
  const base = symbolData("A.JK", {
    holders: [
      { symbol: "A.JK", month: "2026-07-31", sharesNumber: 100, nShareholders: 10, changeInShareholders: 1, local: {}, foreign: {} },
      { symbol: "A.JK", month: "2026-08-31", sharesNumber: 100, nShareholders: 10, changeInShareholders: 2, local: {}, foreign: {} },
    ],
  });
  const future = symbolData("A.JK", {
    holders: [...base.holders, { symbol: "A.JK", month: "2026-10-31", sharesNumber: 100, nShareholders: 10, changeInShareholders: 999, local: {}, foreign: {} }],
  });
  const a = computeScoresV2([base], "2026-09-22")[0];
  const b = computeScoresV2([future], "2026-09-22")[0];
  assert.equal(a.components.retailExodusZ.raw, b.components.retailExodusZ.raw);
  assert.equal(a.components.retailExodusZ.observedTo, "2026-08-31");
});
