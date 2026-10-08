import test from "node:test";
import assert from "node:assert/strict";
import { getFlowRadar, getIssuerDossier, getRadarBoard } from "../src/lib/services";
import { loadDerived } from "../src/lib/derive";
import { loadSnapshot } from "../src/lib/snapshot";

test("board reads the complete latest cohort without an upstream request", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => {
    throw new Error("upstream network must not be used by snapshot services");
  }) as typeof fetch;
  try {
    const board = await getRadarBoard();
    const expected = await loadDerived();
    assert.equal(board.scores.length, expected.scores.length);
    assert.deepEqual(board.scores, expected.scores);
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

test("flow radar ranks window rows against the exchange session calendar", async () => {
  const radar = await getFlowRadar(14);
  assert.ok(radar.rows.length > 0, "expected ranked flow rows for the current window");
  assert.ok(radar.rows.every((r) => r.expectedSessions > 0));
});

test("known issuers use the verified derived-v2 score and do not mutate the snapshot", async () => {
  const before = await loadSnapshot();
  const derived = await loadDerived();
  const dossier = await getIssuerDossier("BBCA");
  const after = await loadSnapshot();
  assert.equal(dossier.status, "available");
  assert.equal(dossier.asOf, derived.manifest.asOf);
  assert.equal(dossier.score?.methodVersion, "radarx-v2");
  assert.equal(after.manifest.inputHash, before.manifest.inputHash);
});
