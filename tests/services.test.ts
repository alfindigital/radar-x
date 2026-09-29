import test from "node:test";
import assert from "node:assert/strict";
import { getIssuerDossier, getRadarBoard } from "../src/lib/services";
import { JsonStore } from "../src/lib/db";

test("board reads the complete latest cohort without an upstream request", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => {
    throw new Error("upstream network must not be used by snapshot services");
  }) as typeof fetch;
  try {
    const board = await getRadarBoard();
    const expected = await new JsonStore().latestScores();
    assert.equal(board.scores.length, expected.length);
    assert.equal(new Set(board.scores.map((row) => row.symbol)).size, expected.length);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("unknown issuer is explicit and does not trigger a provider fetch", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (() => {
    calls += 1;
    throw new Error("provider fetch must not be attempted");
  }) as typeof fetch;
  try {
    const dossier = await getIssuerDossier("NOTREAL");
    assert.equal(dossier.status, "unknown");
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
