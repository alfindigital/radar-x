import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  loadBrokerTop,
  loadBrokersTop,
  loadCohortTop,
  loadCorpActions,
  loadRegistry,
  loadSuspensions,
} from "../src/lib/feeds";

async function fixtureDir(feeds: Record<string, unknown>) {
  const dir = await mkdtemp(path.join(tmpdir(), "radarx-feeds-"));
  await Promise.all(
    Object.entries(feeds).map(([file, value]) => writeFile(path.join(dir, file), JSON.stringify(value), "utf8")),
  );
  return dir;
}

const env = (extra: Record<string, unknown>) => ({
  schemaVersion: 1,
  asOf: "2026-10-01",
  generatedAt: "2026-10-01T08:00:00Z",
  ...extra,
});

test("loadRegistry parses rows with provenance meta", async () => {
  const dir = await fixtureDir({
    "broker_registry.json": env({
      rows: [
        { code: "YP", name: "Mirae Asset", is_foreign: true, cohort: "institutional" },
        { code: "CP", name: "Ciptadana", is_foreign: false, cohort: "retail" },
      ],
    }),
  });
  const feed = await loadRegistry(dir);
  assert.ok(feed);
  assert.equal(feed.data.length, 2);
  assert.equal(feed.data[0].cohort, "institutional");
  assert.equal(feed.meta.asOf, "2026-10-01");
  assert.equal(feed.meta.rows, 2);
  assert.equal(feed.meta.sha256.length, 64);
});

test("missing file returns null, not throw", async () => {
  const dir = await fixtureDir({});
  assert.equal(await loadRegistry(dir), null);
  assert.equal(await loadSuspensions(dir), null);
  assert.equal(await loadCohortTop(dir), null);
});

test("loadBrokerTop keeps per-symbol keyed map", async () => {
  const dir = await fixtureDir({
    "broker_top.json": env({
      data: {
        "BBCA.JK": {
          start: "2026-09-01",
          end: "2026-10-01",
          topBuyers: [{ rank: 1, broker_code: "YP", net_idr: 5e9, foreign_net_idr: 2e9 }],
          topSellers: [{ rank: 1, broker_code: "CC", net_idr: -4e9 }],
        },
      },
    }),
  });
  const feed = await loadBrokerTop(dir);
  const bca = feed?.data.get("BBCA.JK");
  assert.equal(bca?.topBuyers[0].broker_code, "YP");
  assert.equal(bca?.topSellers[0].net_idr, -4e9);
});

test("loadBrokersTop sorts sessions desc", async () => {
  const dir = await fixtureDir({
    "brokers_top.json": env({
      sessions: [
        { date: "2026-09-30", cohort: "all", results: [] },
        { date: "2026-10-01", cohort: "all", results: [{ rank: 1, broker_code: "YP", net: -1e9 }] },
      ],
    }),
  });
  const feed = await loadBrokersTop(dir);
  assert.equal(feed?.data[0].date, "2026-10-01");
  assert.equal(feed?.data[1].date, "2026-09-30");
});

test("loadCohortTop returns null when absent, map when present", async () => {
  const missing = await loadCohortTop(await fixtureDir({}));
  assert.equal(missing, null);
  const dir = await fixtureDir({
    "cohort_top.json": env({
      data: { "BBCA.JK": { retail: { start: "a", end: "b", top_buyers: [{ rank: 1, broker_code: "CP", net_idr: 1 }] } } },
    }),
  });
  const feed = await loadCohortTop(dir);
  assert.equal(feed?.data.get("BBCA.JK")?.retail?.top_buyers?.[0].broker_code, "CP");
});
