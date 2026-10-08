import test from "node:test";
import assert from "node:assert/strict";
import { computeExitWatch, COVERAGE_FLOOR, type ExitWatchInput } from "../src/lib/exitwatch";
import type { SymbolData } from "../src/lib/score";
import type { BrokerSummaryRow, FlowDaily, InsiderTrade, PriceDaily } from "../src/lib/types";

const AS_OF = "2026-10-01";
const WIN_FROM = "2026-09-18"; // 14-day window = 14 inclusive dates [asOf-13, asOf]
const CAP = 1_000_000_000_000; // 1T IDR

function sd(overrides: Partial<SymbolData> = {}): SymbolData {
  return { symbol: "X.JK", insider: [], flow: [], price: [], broker: [], holders: [], instBrokers: new Set(["YP"]), retailBrokers: new Set(["CP"]), ...overrides };
}

function priceRow(date: string, close = 1000): PriceDaily {
  return { symbol: "X.JK", date, open: close, high: close, low: close, close, volume: 1e6, marketCap: CAP };
}

function bRow(code: string, netVal: number, date = "2026-09-25"): BrokerSummaryRow {
  return { symbol: "X.JK", date, brokerCode: code, buyVal: Math.max(netVal, 0), sellVal: Math.max(-netVal, 0), netVal, buyLot: 0, sellLot: 0, netLot: 0, avgBuy: null, avgSell: null, foreignBuyVal: null, foreignSellVal: null };
}

function fRow(net: number, date = "2026-09-25"): FlowDaily {
  return { symbol: "X.JK", date, netForeignInflow: net, foreignBuyIdr: Math.max(net, 0), foreignSellIdr: Math.max(-net, 0) };
}

function iRow(txnType: "buy" | "sell", value: number, txnDate = "2026-09-10"): InsiderTrade {
  return { symbol: "X.JK", holderName: "H", holderType: "insider", txnType, txnDate, filedAt: txnDate, amount: 1, price: 1, value, pctBefore: null, pctAfter: null, clusterHint: null, sourceUrl: null };
}

function input(overrides: Partial<ExitWatchInput> & { d?: SymbolData } = {}): ExitWatchInput {
  return { d: sd(), brokerTop: null, cohortTop: null, freeFloat: 0.5, suspensions: [], corpActions: [], ...overrides };
}

test("institutional selling + retail buying → high exit pressure", () => {
  const heavy = input({
    d: sd({
      price: [priceRow("2026-09-30")],
      broker: [bRow("YP", -5e9), bRow("CP", 4e9)],
      flow: [fRow(-2e9)],
      insider: [iRow("sell", 1e9)],
    }),
  });
  // calm universe so the heavy symbol stands out
  const calm = [1, 2, 3, 4, 5, 6, 7].map((i) =>
    input({ d: sd({ symbol: `C${i}.JK`, price: [{ ...priceRow("2026-09-30"), symbol: `C${i}.JK` }], broker: [bRow("YP", i * 1e7), bRow("CP", i * 1e7)], flow: [fRow(i * 1e7)] }) }),
  );
  const rows = computeExitWatch([heavy, ...calm], AS_OF);
  const h = rows[0];
  assert.equal(h.components.length, 4);
  assert.ok(h.score !== null && h.score > 50, `score=${h.score}`);
  assert.ok(h.coverage >= COVERAGE_FLOOR);
  assert.equal(h.tier, h.score! >= 75 ? "high" : h.score! >= 55 ? "elevated" : "watch");
  const inst = h.components.find((c) => c.key === "instExit")!;
  assert.ok(Math.abs(inst.raw! - 0.5) < 1e-9); // −(−5e9)/1T*100
  const ret = h.components.find((c) => c.key === "retailAbsorb")!;
  assert.ok(Math.abs(ret.raw! - 0.4) < 1e-9);
});

test("missing broker evidence → component missing, coverage can drop score to null", () => {
  const noBroker = input({ d: sd({ price: [priceRow("2026-09-30")], flow: [fRow(-1e9)], insider: [iRow("sell", 5e8)] }) });
  // universe where everyone has flow+insider so those rank
  const rest = [1, 2, 3, 4, 5].map((i) =>
    input({ d: sd({ symbol: `D${i}.JK`, price: [{ ...priceRow("2026-09-30"), symbol: `D${i}.JK` }], flow: [fRow(i * 1e8)], insider: [iRow("sell", i * 1e8)] }) }),
  );
  const rows = computeExitWatch([noBroker, ...rest], AS_OF);
  const n = rows[0];
  assert.equal(n.components.find((c) => c.key === "instExit")!.status, "missing");
  assert.equal(n.components.find((c) => c.key === "retailAbsorb")!.status, "missing");
  // coverage = 0.5 (foreign+insider) — exactly at floor → scored
  assert.equal(n.coverage, 0.5);
  assert.ok(n.score !== null);
});

test("below floor → score null but row still emitted", () => {
  const bare = input({ d: sd({ symbol: "E.JK", price: [priceRow("2026-09-30")] }) }); // only cap — all components missing
  const full = [1, 2, 3, 4, 5].map((i) =>
    input({
      d: sd({ symbol: `F${i}.JK`, price: [{ ...priceRow("2026-09-30"), symbol: `F${i}.JK` }], broker: [bRow("YP", -i * 1e8), bRow("CP", i * 1e8)], flow: [fRow(-i * 1e8)], insider: [iRow("sell", i * 1e8)] }),
    }),
  );
  const rows = computeExitWatch([bare, ...full], AS_OF);
  const b = rows[0];
  assert.equal(b.coverage, 0);
  assert.equal(b.score, null);
  assert.equal(b.tier, null);
});

test("flags: suspension within 14d, corp action ±7d, thin float, sparse broker", () => {
  const flagged = input({
    suspensions: [{ symbol: "X.JK", suspension_date: "2026-09-28", reason: "r" }],
    corpActions: [{ symbol: "X.JK", type: "dividend", date: "2026-10-05", raw: {} }],
    freeFloat: 0.12,
    d: sd({ price: [priceRow("2026-09-30")] }),
  });
  const calm = [1, 2, 3, 4, 5].map((i) => input({ d: sd({ symbol: `G${i}.JK`, price: [{ ...priceRow("2026-09-30"), symbol: `G${i}.JK` }] }) }));
  const [f] = computeExitWatch([flagged, ...calm], AS_OF);
  assert.deepEqual(f.flags, { suspension_recent: true, corp_action_near: true, float_constraint: true, sparse_broker: true, suspended: false });
});

test("still-suspended tape (suspension record + zero-volume window) is quarantined from the board", () => {
  // Mirrors COAL.JK 2026-10-08: suspended 2026-08-12, regular tape frozen at
  // close 31 vol 0, yet negotiated-market broker rows keep flowing and would
  // otherwise publish a HIGH exit-pressure score on an untradeable stock.
  const frozen = input({
    suspensions: [{ symbol: "X.JK", suspension_date: "2026-08-12", reason: "going concern" }],
    d: sd({
      price: [{ ...priceRow("2026-09-30"), volume: 0 }, { ...priceRow("2026-09-25"), volume: 0 }],
      broker: [bRow("YP", -5e9), bRow("CP", 4e9)],
      flow: [fRow(-2e9)],
      insider: [iRow("sell", 1e9)],
    }),
  });
  // A merely illiquid symbol with no suspension record is NOT quarantined.
  const illiquid = input({ d: sd({ symbol: "L.JK", price: [{ ...priceRow("2026-09-30", 500), volume: 0 }] }) });
  // A resumed symbol (suspension record but live volume) is NOT quarantined.
  const resumed = input({
    suspensions: [{ symbol: "R.JK", suspension_date: "2026-08-12", reason: "r" }],
    d: sd({ symbol: "R.JK", price: [{ ...priceRow("2026-09-30"), symbol: "R.JK" }] }),
  });
  const calm = [1, 2, 3, 4, 5].map((i) => input({ d: sd({ symbol: `S${i}.JK`, price: [{ ...priceRow("2026-09-30"), symbol: `S${i}.JK` }] }) }));
  const rows = computeExitWatch([frozen, illiquid, resumed, ...calm], AS_OF);
  assert.equal(rows[0].flags.suspended, true);
  assert.equal(rows[0].score, null);
  assert.equal(rows[0].tier, null);
  assert.equal(rows[1].flags.suspended, false);
  assert.equal(rows[2].flags.suspended, false);
});

test("broker_top labeling used when daily rows absent; cohort_top preferred over both", () => {
  const bt = {
    start: WIN_FROM, end: AS_OF,
    topBuyers: [{ rank: 1, broker_code: "CP", net_idr: 3e9 }],
    topSellers: [{ rank: 1, broker_code: "YP", net_idr: -4e9 }],
  };
  const sym = input({
    d: sd({ price: [priceRow("2026-09-30")], flow: [fRow(-1e9)], insider: [iRow("sell", 5e8)] }),
    brokerTop: bt,
  });
  const rest = [1, 2, 3, 4, 5].map((i) =>
    input({ d: sd({ symbol: `H${i}.JK`, price: [{ ...priceRow("2026-09-30"), symbol: `H${i}.JK` }], broker: [bRow("YP", -i * 1e7), bRow("CP", i * 1e7)], flow: [fRow(i * 1e7)], insider: [iRow("buy", i * 1e7)] }) }),
  );
  const [row] = computeExitWatch([sym, ...rest], AS_OF);
  const inst = row.components.find((c) => c.key === "instExit")!;
  assert.ok(Math.abs(inst.raw! - 0.4) < 1e-9); // −(−4e9)/1T*100 via broker_top label
  assert.equal(inst.observedFrom, WIN_FROM);
  // now override with cohort_top — different number wins
  const sym2 = { ...sym, cohortTop: { institutional: { start: WIN_FROM, end: AS_OF, top_sellers: [{ rank: 1, broker_code: "YP", net_idr: -7e9 }] } } };
  const [row2] = computeExitWatch([sym2, ...rest], AS_OF);
  assert.ok(Math.abs(row2.components.find((c) => c.key === "instExit")!.raw! - 0.7) < 1e-9);
});

test("empty cohort_top side is missing evidence, never a fabricated zero", () => {
  const sym = input({
    d: sd({ price: [priceRow("2026-09-30")], flow: [fRow(-1e9)], insider: [iRow("sell", 5e8)] }),
    cohortTop: {
      institutional: { start: WIN_FROM, end: AS_OF, top_buyers: [], top_sellers: [] },
      retail: { start: WIN_FROM, end: AS_OF, top_buyers: [], top_sellers: [] },
    },
  });
  const rest = [1, 2, 3, 4, 5].map((i) =>
    input({ d: sd({ symbol: `J${i}.JK`, price: [{ ...priceRow("2026-09-30"), symbol: `J${i}.JK` }], broker: [bRow("YP", -i * 1e7), bRow("CP", i * 1e7)], flow: [fRow(i * 1e7)], insider: [iRow("buy", i * 1e7)] }) }),
  );
  const [row] = computeExitWatch([sym, ...rest], AS_OF);
  assert.equal(row.components.find((c) => c.key === "instExit")!.status, "missing");
  assert.equal(row.components.find((c) => c.key === "instExit")!.raw, null);
  assert.equal(row.components.find((c) => c.key === "retailAbsorb")!.status, "missing");
  assert.equal(row.coverage, 0.5); // foreign + insider only
});

test("window.from is the 14-day bound, not the earliest component span", () => {
  const sym = input({
    d: sd({
      price: [priceRow("2026-09-30")],
      broker: [bRow("YP", -1e9), bRow("CP", 1e9)],
      flow: [fRow(-1e9)],
      insider: [iRow("sell", 5e8, "2026-07-05")], // inside the 90d insider window
    }),
  });
  const rest = [1, 2, 3, 4, 5].map((i) =>
    input({ d: sd({ symbol: `K${i}.JK`, price: [{ ...priceRow("2026-09-30"), symbol: `K${i}.JK` }], flow: [fRow(i * 1e7)] }) }),
  );
  const [row] = computeExitWatch([sym, ...rest], AS_OF);
  assert.equal(row.window.from, WIN_FROM);
  assert.equal(row.window.to, AS_OF);
});

test("window boundaries: rows before window.from are excluded, boundary rows count", () => {
  const sym = input({
    d: sd({
      price: [priceRow("2026-09-30")],
      broker: [bRow("YP", -1e9, "2026-09-17"), bRow("YP", -2e9, WIN_FROM)],
      flow: [fRow(-3e9, "2026-09-17"), fRow(-1e9, WIN_FROM)],
      insider: [iRow("sell", 5e8, "2026-07-03"), iRow("sell", 5e8, "2026-07-04")], // 90d window starts 07-04
    }),
  });
  const rest = [1, 2, 3, 4, 5].map((i) =>
    input({ d: sd({ symbol: `B${i}.JK`, price: [{ ...priceRow("2026-09-30"), symbol: `B${i}.JK` }], broker: [bRow("YP", i * 1e7)], flow: [fRow(i * 1e7)], insider: [iRow("buy", i * 1e7)] }) }),
  );
  const [row] = computeExitWatch([sym, ...rest], AS_OF);
  assert.ok(Math.abs(row.components.find((c) => c.key === "instExit")!.raw! - 0.2) < 1e-9); // −(−2e9)/1T*100
  assert.ok(Math.abs(row.components.find((c) => c.key === "foreignExit")!.raw! - 0.1) < 1e-9);
  const ins = row.components.find((c) => c.key === "insiderExit")!;
  assert.equal(ins.observedFrom, "2026-07-04");
  assert.ok(Math.abs(ins.raw! - 0.05) < 1e-9);
});

test("deterministic: same inputs → identical rows", () => {
  const rows = [input({ d: sd({ price: [priceRow("2026-09-30")] }) }), ...[1, 2, 3, 4, 5].map((i) => input({ d: sd({ symbol: `I${i}.JK` }) }))];
  assert.deepEqual(computeExitWatch(rows, AS_OF), computeExitWatch(rows, AS_OF));
});
