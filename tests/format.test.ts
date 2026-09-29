import test from "node:test";
import assert from "node:assert/strict";
import { fmtCurrency, fmtIDR, fmtNum, fmtPct } from "../src/components/fmt";

test("English financial formatters use B/M/T and an accounting minus", () => {
  assert.equal(fmtIDR(1e9), "1.0B");
  assert.equal(fmtIDR(1e6), "1.0M");
  assert.equal(fmtCurrency(-236.2e9), "−Rp236.2B");
  assert.equal(fmtNum(1234567), "1,234,567");
});

test("percentage formatter distinguishes pending from unavailable", () => {
  assert.equal(fmtPct(null, 1, "pending"), "Pending");
  assert.equal(fmtPct(null, 1, "unavailable"), "Unavailable");
  assert.equal(fmtPct(0, 1, "complete"), "+0.0%");
});
