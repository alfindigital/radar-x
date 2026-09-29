import test from "node:test";
import assert from "node:assert/strict";
import { measureOutcome } from "../src/lib/outcomes";
import type { PriceDaily } from "../src/lib/types";

function p(symbol: string, date: string, close: number): PriceDaily {
  return { symbol, date, open: close, high: close, low: close, close, volume: 100, marketCap: null };
}

test("nineteen elapsed days is not a thirty-day outcome", () => {
  const result = measureOutcome(
    [p("X.JK", "2026-09-01", 100), p("X.JK", "2026-09-20", 80)],
    [p("^IHSG", "2026-09-01", 1000), p("^IHSG", "2026-09-20", 990)],
    "2026-09-01",
    30,
    "2026-09-20",
  );
  assert.equal(result.status, "pending");
  assert.equal(result.issuerPct, null);
  assert.equal(result.startDate, "2026-09-01");
  assert.equal(result.targetDate, "2026-10-01");
});

test("matched complete window has exact returns", () => {
  const result = measureOutcome(
    [p("X.JK", "2026-09-01", 100), p("X.JK", "2026-10-01", 110)],
    [p("^IHSG", "2026-09-01", 1000), p("^IHSG", "2026-10-01", 1020)],
    "2026-09-01",
    30,
    "2026-10-01",
  );
  assert.equal(result.status, "complete");
  assert.equal(result.startDate, "2026-09-01");
  assert.equal(result.endDate, "2026-10-01");
  assert.ok(Math.abs(result.issuerPct! - 10) < 1e-9);
  assert.ok(Math.abs(result.benchmarkPct! - 2) < 1e-9);
  assert.ok(Math.abs(result.excessPp! - 8) < 1e-9);
});

test("weekend target uses the first common session within seven days", () => {
  const result = measureOutcome(
    [p("X.JK", "2026-09-01", 100), p("X.JK", "2026-09-09", 105)],
    [p("^IHSG", "2026-09-01", 1000), p("^IHSG", "2026-09-09", 1010)],
    "2026-09-01",
    7,
    "2026-09-09",
  );
  assert.equal(result.status, "complete");
  assert.equal(result.endDate, "2026-09-09");
  assert.equal(result.elapsedDays, 8);
});

test("missing benchmark is unavailable instead of issuer-only", () => {
  const result = measureOutcome([p("X.JK", "2026-09-01", 100)], [], "2026-09-01", 7, "2026-09-10");
  assert.equal(result.status, "unavailable");
  assert.match(result.reason ?? "", /benchmark/i);
});

test("conflicting duplicate dates are rejected and input order is irrelevant", () => {
  assert.throws(
    () => measureOutcome([p("X.JK", "2026-09-01", 100), p("X.JK", "2026-09-01", 101)], [p("^IHSG", "2026-09-01", 1000)], "2026-09-01", 7, "2026-09-10"),
    /duplicate/i,
  );
  const result = measureOutcome(
    [p("X.JK", "2026-09-08", 110), p("X.JK", "2026-09-01", 100)],
    [p("^IHSG", "2026-09-08", 1010), p("^IHSG", "2026-09-01", 1000)],
    "2026-09-01",
    7,
    "2026-09-08",
  );
  assert.equal(result.status, "complete");
});

test("zero start closes and missing start sessions are unavailable", () => {
  const zero = measureOutcome([p("X.JK", "2026-09-01", 0)], [p("^IHSG", "2026-09-01", 1000)], "2026-09-01", 7, "2026-09-10");
  assert.equal(zero.status, "unavailable");
  const missing = measureOutcome([p("X.JK", "2026-09-20", 100)], [p("^IHSG", "2026-09-20", 1000)], "2026-09-01", 7, "2026-09-20");
  assert.equal(missing.status, "unavailable");
  assert.match(missing.reason ?? "", /start/i);
});
