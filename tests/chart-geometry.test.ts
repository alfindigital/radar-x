import test from "node:test";
import assert from "node:assert/strict";
import { FLOW_GEOMETRY, flowBarGeometry } from "../src/lib/chart-geometry";

test("flow extrema stay inside the panel around a shared zero line", () => {
  const positive = flowBarGeometry(10, 10);
  const negative = flowBarGeometry(-10, 10);
  assert.equal(positive.y, FLOW_GEOMETRY.zero - FLOW_GEOMETRY.maxHeight);
  assert.equal(negative.y, FLOW_GEOMETRY.zero);
  assert.equal(positive.height, FLOW_GEOMETRY.maxHeight);
  assert.ok(positive.y >= FLOW_GEOMETRY.top);
  assert.ok(negative.y + negative.height <= FLOW_GEOMETRY.bottom);
});
