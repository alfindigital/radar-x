import test from "node:test";
import assert from "node:assert/strict";
import { cohortsFromRegistry } from "../src/lib/derive";
import { computeScoresV2, type SymbolData } from "../src/lib/score";
import type { BrokerSummaryRow } from "../src/lib/types";

const AS_OF = "2026-10-01";

function brokerRow(brokerCode: string, netVal: number, foreignNet: number, dayOffset = 1): BrokerSummaryRow {
  const date = `2026-09-${String(30 - dayOffset).padStart(2, "0")}`;
  return {
    symbol: "T.JK",
    date,
    brokerCode,
    buyVal: netVal > 0 ? netVal : 0,
    sellVal: netVal < 0 ? -netVal : 0,
    netVal,
    buyLot: 0,
    sellLot: 0,
    netLot: 0,
    avgBuy: null,
    avgSell: null,
    foreignBuyVal: foreignNet > 0 ? foreignNet : 0,
    foreignSellVal: foreignNet < 0 ? -foreignNet : 0,
  };
}

function sd(overrides: Partial<SymbolData>): SymbolData {
  return { symbol: "T.JK", insider: [], flow: [], price: [], broker: [], holders: [], instBrokers: new Set(), retailBrokers: new Set(), ...overrides };
}

test("cohortsFromRegistry splits institutional/retail and drops mixed/unknown", () => {
  const c = cohortsFromRegistry([
    { code: "YP", cohort: "institutional" },
    { code: "CP", cohort: "retail" },
    { code: "ZZ", cohort: "mixed" },
    { code: "??", cohort: "unknown" },
  ]);
  assert.deepEqual([...c.instBrokers], ["YP"]);
  assert.deepEqual([...c.retailBrokers], ["CP"]);
});

test("instNetZ uses institutional netVal when cohort set is populated", () => {
  // YP (institutional) net -100 over window; CP (retail) net +50.
  // Foreign proxy would report +9-(-?)… — foreign legs chosen so proxy ≠ inst net.
  const broker = [brokerRow("YP", -100, 30), brokerRow("CP", 50, -5)];
  // universe of ≥5 symbols so standardize() is rankable
  const universe = [0, 1, 2, 3, 4, 5].map((i) =>
    sd({ symbol: `U${i}.JK`, broker: [brokerRow("YP", -10 * i, 0)] }),
  );
  const withCohort = computeScoresV2([sd({ broker, instBrokers: new Set(["YP"]), retailBrokers: new Set(["CP"]) }), ...universe], AS_OF);
  const withoutCohort = computeScoresV2([sd({ broker }), ...universe], AS_OF);
  const a = withCohort[0].components.instNetZ;
  const b = withoutCohort[0].components.instNetZ;
  assert.equal(a.status, "available");
  assert.equal(a.raw, -100); // institutional net only
  assert.equal(b.raw, 25); // foreign proxy fallback: 30 + (-5) = 25
  assert.notEqual(a.raw, b.raw);
});

test("empty registry keeps foreign-proxy fallback (no crash)", () => {
  const universe = [0, 1, 2, 3, 4, 5].map((i) =>
    sd({ symbol: `V${i}.JK`, broker: [brokerRow("YP", -10 * i, i)] }),
  );
  const rows = computeScoresV2([sd({ broker: [brokerRow("YP", -10, 7)] }), ...universe], AS_OF);
  assert.equal(rows[0].components.instNetZ.status, "available");
  assert.equal(rows[0].components.instNetZ.raw, 7);
});
