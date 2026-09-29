import test from "node:test";
import assert from "node:assert/strict";
import { mergePriceObservation } from "../src/lib/price-merge";
import type { PriceObservation } from "../src/lib/types";

const rich: PriceObservation = {
  symbol: "BBCA.JK",
  date: "2026-09-22",
  open: 9000,
  high: 9200,
  low: 8900,
  close: 9100,
  volume: 12345,
  marketCap: 1000000,
  observationKind: "ohlcv",
  fieldSources: { open: "sectors-daily", volume: "sectors-daily" },
};

test("close-only updates preserve richer fields from the existing observation", () => {
  const merged = mergePriceObservation(rich, {
    symbol: "BBCA.JK",
    date: "2026-09-22",
    open: null,
    high: null,
    low: null,
    close: 9150,
    volume: null,
    marketCap: null,
    observationKind: "close-only",
    fieldSources: { close: "sectors-close" },
  });
  assert.equal(merged.close, 9150);
  assert.equal(merged.volume, 12345);
  assert.equal(merged.open, 9000);
  assert.equal(merged.fieldSources?.volume, "sectors-daily");
  assert.equal(merged.fieldSources?.close, "sectors-close");
});

test("new close-only observations keep unknown fields null", () => {
  const merged = mergePriceObservation(undefined, {
    symbol: "BBCA.JK",
    date: "2026-09-23",
    open: null,
    high: null,
    low: null,
    close: 9200,
    volume: null,
    marketCap: null,
    observationKind: "close-only",
  });
  assert.equal(merged.open, null);
  assert.equal(merged.volume, null);
  assert.equal(merged.close, 9200);
});

test("different symbol/date pairs are rejected", () => {
  assert.throws(() => mergePriceObservation(rich, { ...rich, date: "2026-09-23" }), /symbol and date/);
});
