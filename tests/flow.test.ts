import test from "node:test";
import assert from "node:assert/strict";
import { rankFlowRows } from "../src/lib/flow";

const row = (date: string, netForeignInflow: number) => ({
  symbol: "TEST.JK",
  date,
  netForeignInflow,
  foreignBuyIdr: Math.max(netForeignInflow, 0),
  foreignSellIdr: Math.max(-netForeignInflow, 0),
});

test("missing reference sessions break an unverified positive streak", () => {
  const [result] = rankFlowRows([row("2026-09-14", 10), row("2026-09-16", 12)], ["2026-09-14", "2026-09-15", "2026-09-16"]);
  assert.equal(result.streak, 1);
  assert.equal(result.streakStatus, "incomplete");
  assert.equal(result.expectedSessions, 3);
  assert.equal(result.missingSessions, 1);
});

test("adjacent positive reference sessions form a complete streak", () => {
  const [result] = rankFlowRows([row("2026-09-15", 10), row("2026-09-16", 12)], ["2026-09-15", "2026-09-16"]);
  assert.equal(result.streak, 2);
  assert.equal(result.streakStatus, "complete");
});

test("zero and negative rows end a positive streak without changing signed totals", () => {
  const [result] = rankFlowRows([row("2026-09-14", -10), row("2026-09-15", 0), row("2026-09-16", 12)], ["2026-09-14", "2026-09-15", "2026-09-16"]);
  assert.equal(result.cumNet, 2);
  assert.equal(result.streak, 1);
  assert.equal(result.streakStatus, "complete");
});
