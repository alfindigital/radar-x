import test from "node:test";
import assert from "node:assert/strict";
import { availableBy, safeSourceUrl } from "../src/lib/provenance";

test("unverified timestamps cannot support an as-of claim", () => {
  assert.equal(availableBy("2026-09-18T18:00:00", false, "2026-09-22"), false);
  assert.equal(availableBy("2026-09-18T18:00:00Z", true, "2026-09-16"), false);
  assert.equal(availableBy("2026-09-18T18:00:00Z", true, "2026-09-22"), true);
});

test("source links reject executable schemes", () => {
  assert.equal(safeSourceUrl("javascript:alert(1)"), null);
  assert.equal(safeSourceUrl("data:text/html,hi"), null);
  assert.equal(safeSourceUrl("https://www.idx.co.id/report.pdf"), "https://www.idx.co.id/report.pdf");
});
