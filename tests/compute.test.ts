import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildDerived } from "../src/lib/derive";
import { loadDerived } from "../src/lib/derive";
import { parseArgs, resolveOutputDir } from "../scripts/compute";
import type { Snapshot } from "../src/lib/types";

function snapshot(): Snapshot {
  const trade = (holderName: string, txnDate: string) => ({
    symbol: "TEST.JK",
    holderName,
    holderType: "insider",
    txnType: "buy" as const,
    txnDate,
    filedAt: `${txnDate}T18:00:00Z`,
    amount: 100,
    price: 100,
    value: 10000,
    pctBefore: null,
    pctAfter: null,
    clusterHint: null,
    sourceUrl: "https://example.test/disclosure",
  });
  return {
    tickers: [{ symbol: "TEST.JK", name: "Test", subSector: null }],
    insider: [trade("A", "2026-09-01"), trade("B", "2026-09-10"), trade("C", "2026-09-20")],
    flow: [{ symbol: "TEST.JK", date: "2026-09-20", netForeignInflow: 100, foreignBuyIdr: 200, foreignSellIdr: 100 }],
    price: [
      { symbol: "TEST.JK", date: "2026-09-01", open: 100, high: 100, low: 100, close: 100, volume: 100, marketCap: 1000 },
      { symbol: "TEST.JK", date: "2026-09-20", open: 98, high: 98, low: 98, close: 98, volume: 100, marketCap: 1000 },
      { symbol: "^IHSG", date: "2026-09-01", open: 1000, high: 1000, low: 1000, close: 1000, volume: 100, marketCap: null },
      { symbol: "^IHSG", date: "2026-09-20", open: 990, high: 990, low: 990, close: 990, volume: 100, marketCap: null },
    ],
    broker: [],
    holders: [],
    cases: [],
    scores: [],
    indexes: { insiderBySymbol: {}, flowBySymbol: {}, priceBySymbol: {}, brokerBySymbol: {}, holdersBySymbol: {}, casesBySymbol: {}, scoresBySymbol: {} },
    manifest: { schemaVersion: 2, engineVersion: "radarx-v2", asOf: "2026-09-22", files: [], inputHash: "input-hash", generatedAt: "2026-09-22T00:00:00Z" },
  };
}

test("derived analytical output is stable for identical inputs and as-of", () => {
  const a = buildDerived(snapshot(), "2026-09-22");
  const b = buildDerived(snapshot(), "2026-09-22");
  assert.deepEqual(a.scores, b.scores);
  assert.deepEqual(a.cases, b.cases);
  assert.equal(a.manifest.asOf, "2026-09-22");
});

test("changing source rows removes obsolete candidate IDs without mutating raw hashes", () => {
  const source = snapshot();
  const before = buildDerived(source, "2026-09-22");
  const changed = { ...source, insider: source.insider.slice(0, 2) };
  const after = buildDerived(changed, "2026-09-22");
  assert.ok(before.cases.some((row) => row.pattern === "CLUSTER_PATTERN"));
  assert.equal(after.cases.some((row) => row.pattern === "CLUSTER_PATTERN"), false);
  assert.equal(changed.manifest.inputHash, source.manifest.inputHash);
});

test("post-anchor prices can change outcomes but not candidate membership", () => {
  const source = snapshot();
  const altered = { ...source, price: [...source.price, { symbol: "TEST.JK", date: "2026-10-30", open: 1, high: 1, low: 1, close: 1, volume: 100, marketCap: 1000 }] };
  const before = buildDerived(source, "2026-09-22");
  const after = buildDerived(altered, "2026-09-22");
  assert.deepEqual(after.cases.map((row) => ({ id: row.id, evidence: row.priceWindow })), before.cases.map((row) => ({ id: row.id, evidence: row.priceWindow })));
});

test("compute CLI requires an explicit as-of and keeps output under data", () => {
  assert.throws(() => parseArgs([]), /--as-of/);
  assert.throws(() => parseArgs(["--as-of", "2026-09-22", "--wat"]), /unknown/);
  assert.throws(() => resolveOutputDir("data/positioning_scores.json"), /raw JSON/);
  assert.throws(() => resolveOutputDir(".."), /inside/);
  assert.match(resolveOutputDir("data/derived-v2"), /derived-v2/);
});

test("derived reader rejects a member hash mismatch", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "radarx-derived-"));
  await writeFile(path.join(dir, "scores.json"), "[]", "utf8");
  await writeFile(path.join(dir, "cases.json"), "[]", "utf8");
  await writeFile(path.join(dir, "manifest.json"), JSON.stringify({
    schemaVersion: 2,
    engineVersion: "radarx-v2",
    asOf: "2026-09-22",
    inputHash: "input",
    generatedAt: "2026-09-22T00:00:00Z",
    files: [{ path: "scores.json", rows: 0, sha256: "bad" }, { path: "cases.json", rows: 0, sha256: "bad" }],
    limitations: [],
  }), "utf8");
  await assert.rejects(loadDerived(dir), /hash mismatch/);
});
