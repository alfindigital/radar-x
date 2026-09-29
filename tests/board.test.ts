import test from "node:test";
import assert from "node:assert/strict";
import { selectBoard } from "../src/lib/board";

test("distribution is filtered before limit and sorted most negative first", () => {
  const rows = Array.from({ length: 120 }, (_, i) => ({ symbol: `P${i}`, score: 60 }));
  rows.push({ symbol: "NEG1", score: -30 }, { symbol: "NEG2", score: -86 });
  const result = selectBoard(rows, "distribution", 1);
  assert.equal(result.total, 122);
  assert.equal(result.distribution, 2);
  assert.deepEqual(result.rows.map((x) => x.symbol), ["NEG2"]);
});
