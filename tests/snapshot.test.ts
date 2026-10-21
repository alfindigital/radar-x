import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { rm } from "node:fs/promises";
import { loadSnapshot, loadSnapshotParts } from "../src/lib/snapshot";

const files = [
  "tickers.json",
  "insider_trades.json",
  "flow_daily.json",
  "price_daily.json",
  "broker_rows.json",
  "holders_monthly.json",
] as const;

async function fixtureDir(overrides: Partial<Record<(typeof files)[number], unknown>> = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), "radarx-snapshot-"));
  await mkdir(dir, { recursive: true });
  const values: Record<string, unknown> = {
    "tickers.json": [{ symbol: "TEST.JK", name: "Test", subSector: null }],
    "insider_trades.json": [],
    "flow_daily.json": [],
    "price_daily.json": [],
    "broker_rows.json": [],
    "holders_monthly.json": [],
    ...overrides,
  };
  await Promise.all(files.map((file) => writeFile(path.join(dir, file), JSON.stringify(values[file]), "utf8")));
  return dir;
}

test("loads a typed snapshot with hashes and row metadata", async () => {
  const dir = await fixtureDir({
    "insider_trades.json": [
      {
        symbol: "TEST.JK",
        holderName: "A",
        holderType: "insider",
        txnType: "sell",
        txnDate: "2026-09-16",
        filedAt: "2026-09-18T18:00:00Z",
        amount: 10,
        price: 100,
        value: 1000,
        pctBefore: null,
        pctAfter: null,
        clusterHint: null,
        sourceUrl: "https://www.idx.co.id/report.pdf",
      },
    ],
    "price_daily.json": [{
      symbol: "TEST.JK",
      date: "2026-09-22",
      open: 100,
      high: 100,
      low: 100,
      close: 100,
      volume: 0,
      marketCap: null,
    }],
  });
  const snapshot = await loadSnapshot(dir);
  assert.equal(snapshot.insider.length, 1);
  assert.equal(snapshot.manifest.schemaVersion, 2);
  assert.equal(snapshot.manifest.files.length, files.length);
  assert.equal(snapshot.manifest.files.find((file) => file.path === "insider_trades.json")?.rows, 1);
  assert.equal(snapshot.price[0].observationKind, "legacy-unknown");
  assert.match(snapshot.manifest.inputHash, /^[a-f0-9]{64}$/);
});

test("rejects malformed required JSON instead of returning an empty dataset", async () => {
  const dir = await fixtureDir();
  await writeFile(path.join(dir, "flow_daily.json"), "{broken", "utf8");
  await assert.rejects(loadSnapshot(dir), /flow_daily\.json/);
});

test("loadSnapshotParts reads only the requested datasets", async () => {
  const dir = await fixtureDir({
    "flow_daily.json": [{ symbol: "TEST.JK", date: "2026-09-22", netForeignInflow: 5 }],
  });
  // The big files are absent: a part loader that touched them would throw.
  await rm(path.join(dir, "broker_rows.json"));
  await rm(path.join(dir, "price_daily.json"));
  const slice = await loadSnapshotParts(["tickers", "flow"], dir);
  assert.equal(slice.tickers.length, 1);
  assert.equal(slice.flow.length, 1);
  assert.deepEqual(Object.keys(slice).sort(), ["flow", "tickers"]);
  await assert.rejects(loadSnapshotParts(["broker"], dir), /broker_rows\.json/);
});

test("loadSnapshotParts normalises prices exactly like the full loader", async () => {
  const dir = await fixtureDir({
    "price_daily.json": [{ symbol: "TEST.JK", date: "2026-09-22", open: 100, high: 100, low: 100, close: 100, volume: 0, marketCap: null }],
  });
  const [full, slice] = await Promise.all([loadSnapshot(dir), loadSnapshotParts(["price"], dir)]);
  assert.deepEqual(slice.price, full.price);
  assert.equal(slice.price[0].observationKind, "legacy-unknown");
});

test("loadSnapshotParts rejects malformed JSON instead of returning an empty dataset", async () => {
  const dir = await fixtureDir();
  await writeFile(path.join(dir, "insider_trades.json"), "{broken", "utf8");
  await assert.rejects(loadSnapshotParts(["insider"], dir), /insider_trades\.json/);
});
