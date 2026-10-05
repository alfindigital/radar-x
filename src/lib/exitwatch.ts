// RADAR-X v3 — Exit Watch engine.
// Pure: feeds arrive as arguments; no fs, no fetch. Measures exit pressure
// (institutional / foreign / insider selling) vs retail absorption over the
// observation window. Bounded: scores are descriptive pressure readings, not
// proof of intent. Missing components stay missing — never silently zero.

import { standardize, type SymbolData } from "./score";
import type {
  BrokerTopSymbol,
  CohortTopSymbol,
  CorpActionRow,
  ExitComponent,
  ExitComponentKey,
  ExitFlags,
  ExitWatchRow,
  SuspensionRow,
} from "./types";

export const EXIT_WEIGHTS: Record<ExitComponentKey, number> = {
  instExit: 0.3,
  foreignExit: 0.25,
  insiderExit: 0.25,
  retailAbsorb: 0.2,
};

export const COVERAGE_FLOOR = 0.5;
const WINDOW_DAYS = 14;
const INSIDER_DAYS = 90;
const SUSPENSION_RECENT_DAYS = 14;
const CORP_ACTION_NEAR_DAYS = 7;
const FLOAT_CONSTRAINT = 0.2; // fraction
const SPARSE_BROKER_OBS = 5;
const DAY_MS = 86_400_000;

export interface ExitWatchInput {
  d: SymbolData;
  brokerTop: BrokerTopSymbol | null;
  cohortTop: CohortTopSymbol | null;
  freeFloat: number | null;
  suspensions: SuspensionRow[];
  corpActions: CorpActionRow[];
}

function shift(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

function span(rows: { date?: string; txnDate?: string; suspension_date?: string }[]) {
  const dates = rows
    .map((r) => r.date ?? r.txnDate ?? r.suspension_date)
    .filter((v): v is string => typeof v === "string")
    .sort();
  return { observedFrom: dates[0] ?? null, observedTo: dates.at(-1) ?? null };
}

function latestCap(d: SymbolData, asOf: string): number | null {
  const cap = [...d.price]
    .filter((row) => row.date <= asOf && Number.isFinite(row.marketCap) && (row.marketCap ?? 0) > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1)?.marketCap;
  return cap && cap > 0 ? cap : null;
}

function missing(reason: string): Pick<ExitComponent, "raw" | "z" | "contribution" | "status" | "reason" | "observations" | "observedFrom" | "observedTo"> {
  return { raw: null, z: null, contribution: 0, status: "missing", reason, observations: 0, observedFrom: null, observedTo: null };
}

interface RawResult {
  raw: number | null;
  reason: string | null;
  observations: number;
  observedFrom: string | null;
  observedTo: string | null;
}

function sumBrokerTop(entries: { broker_code: string; net_idr?: number }[], codes: Set<string>): number {
  return entries.reduce((sum, e) => sum + (codes.has(e.broker_code) ? (e.net_idr ?? 0) : 0), 0);
}

/**
 * Institutional net (IDR) over the window. Preferred source order:
 * 1) cohort_top.json — true per-cohort top-N (when the precision pass ran)
 * 2) broker_rows (daily detail, watchlist symbols) labeled by registry cohort
 * 3) broker_top.json top-N labeled by registry cohort (266-issuer fallback)
 * Returns {raw, observations, from, to} or null when no labeled evidence.
 */
function institutionalNet(input: ExitWatchInput, from: string, asOf: string) {
  if (input.cohortTop?.institutional) {
    const side = input.cohortTop.institutional;
    const observations = (side.top_buyers?.length ?? 0) + (side.top_sellers?.length ?? 0);
    if (observations === 0) return null; // empty side is missing evidence, never a zero
    const net =
      (side.top_buyers ?? []).reduce((s, e) => s + (e.net_idr ?? 0), 0) +
      (side.top_sellers ?? []).reduce((s, e) => s + (e.net_idr ?? 0), 0);
    return { raw: net, observations, observedFrom: side.start || from, observedTo: side.end || asOf, source: "cohort-top" as const };
  }
  const rows = input.d.broker.filter((r) => r.date >= from && r.date <= asOf && input.d.instBrokers.has(r.brokerCode));
  if (rows.length) {
    return { raw: rows.reduce((s, r) => s + r.netVal, 0), observations: rows.length, ...span(rows), source: "broker-rows" as const };
  }
  if (input.brokerTop) {
    const sell = sumBrokerTop(input.brokerTop.topSellers, input.d.instBrokers);
    const buy = sumBrokerTop(input.brokerTop.topBuyers, input.d.instBrokers);
    const n = input.brokerTop.topSellers.filter((e) => input.d.instBrokers.has(e.broker_code)).length +
      input.brokerTop.topBuyers.filter((e) => input.d.instBrokers.has(e.broker_code)).length;
    if (n === 0) return null;
    return { raw: buy + sell, observations: n, observedFrom: input.brokerTop.start || from, observedTo: input.brokerTop.end || asOf, source: "broker-top" as const };
  }
  return null;
}

/** Retail net (IDR) — same source order as institutionalNet. */
function retailNet(input: ExitWatchInput, from: string, asOf: string) {
  if (input.cohortTop?.retail) {
    const side = input.cohortTop.retail;
    const observations = (side.top_buyers?.length ?? 0) + (side.top_sellers?.length ?? 0);
    if (observations === 0) return null;
    const net =
      (side.top_buyers ?? []).reduce((s, e) => s + (e.net_idr ?? 0), 0) +
      (side.top_sellers ?? []).reduce((s, e) => s + (e.net_idr ?? 0), 0);
    return { raw: net, observations, observedFrom: side.start || from, observedTo: side.end || asOf, source: "cohort-top" as const };
  }
  const rows = input.d.broker.filter((r) => r.date >= from && r.date <= asOf && input.d.retailBrokers.has(r.brokerCode));
  if (rows.length) {
    return { raw: rows.reduce((s, r) => s + r.netVal, 0), observations: rows.length, ...span(rows), source: "broker-rows" as const };
  }
  if (input.brokerTop) {
    const buy = sumBrokerTop(input.brokerTop.topBuyers, input.d.retailBrokers);
    const sell = sumBrokerTop(input.brokerTop.topSellers, input.d.retailBrokers);
    const n = input.brokerTop.topBuyers.filter((e) => input.d.retailBrokers.has(e.broker_code)).length +
      input.brokerTop.topSellers.filter((e) => input.d.retailBrokers.has(e.broker_code)).length;
    if (n === 0) return null;
    return { raw: buy + sell, observations: n, observedFrom: input.brokerTop.start || from, observedTo: input.brokerTop.end || asOf, source: "broker-top" as const };
  }
  return null;
}

function rawComponents(input: ExitWatchInput, asOf: string): Record<ExitComponentKey, RawResult> {
  const cap = latestCap(input.d, asOf);
  const winFrom = shift(asOf, -WINDOW_DAYS);
  const insFrom = shift(asOf, -INSIDER_DAYS);
  const norm = (v: number) => (cap ? (v / cap) * 100 : null);

  // instExit: positive raw = net institutional selling pressure
  const inst = institutionalNet(input, winFrom, asOf);
  const instExit: RawResult = !cap
    ? { raw: null, reason: "Market capitalization is unavailable for normalization.", observations: 0, observedFrom: null, observedTo: null }
    : inst === null
      ? { raw: null, reason: "No broker observations labeled institutional in the window.", observations: 0, observedFrom: null, observedTo: null }
      : { raw: norm(-inst.raw), reason: null, observations: inst.observations, observedFrom: inst.observedFrom, observedTo: inst.observedTo };

  // foreignExit: positive raw = net foreign selling pressure
  const fRows = input.d.flow.filter((r) => r.date >= winFrom && r.date <= asOf);
  const foreignExit: RawResult = !fRows.length
    ? { raw: null, reason: "Foreign-flow observations are unavailable in the window.", observations: 0, observedFrom: null, observedTo: null }
    : !cap
      ? { raw: null, reason: "Market capitalization is unavailable for normalization.", observations: fRows.length, ...span(fRows) }
      : { raw: norm(-fRows.reduce((s, r) => s + r.netForeignInflow, 0)), reason: null, observations: fRows.length, ...span(fRows) };

  // insiderExit: positive raw = net insider selling (sell − buy value, 90d)
  const iRows = input.d.insider.filter((r) => r.txnDate >= insFrom && r.txnDate <= asOf);
  const insiderNet = iRows.reduce((s, r) => s + (r.txnType === "sell" ? r.value : r.txnType === "buy" ? -r.value : 0), 0);
  const insiderExit: RawResult = !iRows.length
    ? { raw: null, reason: "No insider transactions reported in the 90-day window.", observations: 0, observedFrom: null, observedTo: null }
    : !cap
      ? { raw: null, reason: "Market capitalization is unavailable for normalization.", observations: iRows.length, ...span(iRows) }
      : { raw: norm(insiderNet), reason: null, observations: iRows.length, ...span(iRows) };

  // retailAbsorb: positive raw = retail net buying (absorption pressure)
  const ret = retailNet(input, winFrom, asOf);
  const retailAbsorb: RawResult = !cap
    ? { raw: null, reason: "Market capitalization is unavailable for normalization.", observations: 0, observedFrom: null, observedTo: null }
    : ret === null
      ? { raw: null, reason: "No broker observations labeled retail in the window.", observations: 0, observedFrom: null, observedTo: null }
      : { raw: norm(ret.raw), reason: null, observations: ret.observations, observedFrom: ret.observedFrom, observedTo: ret.observedTo };

  return { instExit, foreignExit, insiderExit, retailAbsorb };
}

function deriveFlags(input: ExitWatchInput, asOf: string): ExitFlags {
  const suspension_recent = input.suspensions.some(
    (r) => daysBetween(r.suspension_date, asOf) >= 0 && daysBetween(r.suspension_date, asOf) <= SUSPENSION_RECENT_DAYS,
  );
  const corp_action_near = input.corpActions.some(
    (r) => r.date !== null && Math.abs(daysBetween(r.date, asOf)) <= CORP_ACTION_NEAR_DAYS,
  );
  const float_constraint = input.freeFloat !== null && input.freeFloat < FLOAT_CONSTRAINT;
  const winFrom = shift(asOf, -WINDOW_DAYS);
  const labeled =
    input.d.broker.filter(
      (r) => r.date >= winFrom && r.date <= asOf && (input.d.instBrokers.has(r.brokerCode) || input.d.retailBrokers.has(r.brokerCode)),
    ).length +
    (input.brokerTop
      ? input.brokerTop.topBuyers.concat(input.brokerTop.topSellers).filter(
          (e) => input.d.instBrokers.has(e.broker_code) || input.d.retailBrokers.has(e.broker_code),
        ).length
      : 0) +
    (input.cohortTop
      ? [input.cohortTop.retail, input.cohortTop.institutional].reduce(
          (s, side) => s + (side?.top_buyers?.length ?? 0) + (side?.top_sellers?.length ?? 0),
          0,
        )
      : 0);
  return { suspension_recent, corp_action_near, float_constraint, sparse_broker: labeled < SPARSE_BROKER_OBS };
}

export function computeExitWatch(inputs: ExitWatchInput[], asOf: string): ExitWatchRow[] {
  const keys = Object.keys(EXIT_WEIGHTS) as ExitComponentKey[];
  const raws = inputs.map((input) => rawComponents(input, asOf));
  const zByKey = Object.fromEntries(keys.map((key) => [key, standardize(raws.map((r) => r[key].raw))])) as Record<
    ExitComponentKey,
    (number | null)[]
  >;

  return inputs.map((input, i) => {
    const components: ExitComponent[] = keys.map((key) => {
      const r = raws[i][key];
      const z = r.raw !== null ? zByKey[key][i] : null;
      const weight = EXIT_WEIGHTS[key];
      if (r.raw === null) {
        return { key, weight, raw: null, z: null, contribution: 0, status: "missing", reason: r.reason, observations: r.observations, observedFrom: r.observedFrom, observedTo: r.observedTo };
      }
      if (z === null) {
        return { key, weight, raw: r.raw, z: null, contribution: 0, status: "missing", reason: "Too few comparable symbols to rank this component.", observations: r.observations, observedFrom: r.observedFrom, observedTo: r.observedTo };
      }
      const contribution = (Math.max(-3, Math.min(3, z)) / 3) * weight * 100;
      return { key, weight, raw: r.raw, z, contribution, status: "available", reason: null, observations: r.observations, observedFrom: r.observedFrom, observedTo: r.observedTo };
    });
    const coverage = components.filter((c) => c.status === "available").reduce((s, c) => s + c.weight, 0) / keys.reduce((s, k) => s + EXIT_WEIGHTS[k], 0);
    const publishable = coverage >= COVERAGE_FLOOR;
    const score = publishable ? Math.max(0, Math.min(100, Math.round(50 + components.reduce((s, c) => s + c.contribution, 0)))) : null;
    const tier: ExitWatchRow["tier"] =
      score === null ? null : score >= 75 ? "high" : score >= 55 ? "elevated" : score >= 35 ? "watch" : "low";
    const winFrom = shift(asOf, -WINDOW_DAYS);
    const byDay = new Map<string, { instNet: number; retailNet: number }>();
    for (const r of input.d.broker) {
      if (r.date < winFrom || r.date > asOf) continue;
      const slot = byDay.get(r.date) ?? { instNet: 0, retailNet: 0 };
      if (input.d.instBrokers.has(r.brokerCode)) slot.instNet += r.netVal;
      else if (input.d.retailBrokers.has(r.brokerCode)) slot.retailNet += r.netVal;
      else continue;
      byDay.set(r.date, slot);
    }
    const series = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v }));
    return {
      symbol: input.d.symbol,
      score,
      tier,
      coverage: Math.round(coverage * 1000) / 1000,
      components,
      flags: deriveFlags(input, asOf),
      series,
      window: { days: WINDOW_DAYS, from: winFrom, to: asOf },
      asOf,
    };
  });
}
