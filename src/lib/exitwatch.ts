// RADAR-X v3 — Exit Watch engine.
// Pure: feeds arrive as arguments; no fs, no fetch. Measures exit pressure
// (institutional / foreign / insider selling) vs retail absorption over the
// observation window. Bounded: scores are descriptive pressure readings, not
// proof of intent. Missing components stay missing — never silently zero.
//
// Source discipline: every scored component must come from evidence whose
// window equals the stated window and whose end does not pass as-of. A ~90d
// top-N aggregate cannot be trimmed into a 14d sum — it is kept as context
// and reported in the component reason instead of being scored.

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

/**
 * Window convention: a `days`-day window ending at asOf is exactly `days`
 * inclusive calendar dates: [asOf-(days-1) .. asOf]. Same convention as
 * getFlowRadar and the dossier "Nd" labels — the label counts dates.
 */
export function windowFrom(asOf: string, days: number): string {
  return shift(asOf, -(days - 1));
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
  if (cap && cap > 0) return cap;
  // Close-only coverage carries no marketCap — fall back to the taxonomy cap
  // so normalization still works for those symbols.
  return d.marketCapFallback && d.marketCapFallback > 0 ? d.marketCapFallback : null;
}

interface RawResult {
  raw: number | null;
  reason: string | null;
  observations: number;
  observedFrom: string | null;
  observedTo: string | null;
  /** Which saved feed produced the value — daily broker rows, a cohort overlay, filings, or daily flow. */
  source: string | null;
}

function missed(reason: string): RawResult {
  return { raw: null, reason, observations: 0, observedFrom: null, observedTo: null, source: null };
}

function sumBrokerTop(entries: { broker_code: string; net_idr?: number }[], codes: Set<string>): number {
  return entries.reduce((sum, e) => sum + (codes.has(e.broker_code) ? (e.net_idr ?? 0) : 0), 0);
}

type NetResult =
  | { ok: true; raw: number; observations: number; observedFrom: string | null; observedTo: string | null; source: string }
  | { ok: false; reason: string };

/** An aggregate top-N feed is scoreable only when its span IS the score window — it cannot be trimmed. */
function aggregateMatchesWindow(start: string | undefined, end: string | undefined, from: string, to: string): boolean {
  return start === from && end === to;
}

function aggregateContextNote(start: string | undefined, end: string | undefined): string {
  return `top-N aggregate covers ${start || "?"}→${end || "?"} (outside the ${WINDOW_DAYS}d window) · kept as context, not scored`;
}

/**
 * Institutional net (IDR) over the window. Source order:
 * 1) broker_rows daily detail labeled by registry cohort — only source that
 *    can be bounded to the window exactly
 * 2) cohort_top overlay — usable only when its span equals the window
 * 3) broker_top top-N labeled by registry cohort — same window rule
 * Wider aggregates stay context; the reason explains what exists.
 */
function institutionalNet(input: ExitWatchInput, from: string, to: string): NetResult {
  const rows = input.d.broker.filter((r) => r.date >= from && r.date <= to && input.d.instBrokers.has(r.brokerCode));
  if (rows.length) {
    return { ok: true, raw: rows.reduce((s, r) => s + r.netVal, 0), observations: rows.length, ...span(rows), source: "broker_rows" };
  }

  const contextNotes: string[] = [];
  const side = input.cohortTop?.institutional;
  if (side) {
    if (aggregateMatchesWindow(side.start, side.end, from, to)) {
      const observations = (side.top_buyers?.length ?? 0) + (side.top_sellers?.length ?? 0);
      if (observations) {
        const net =
          (side.top_buyers ?? []).reduce((s, e) => s + (e.net_idr ?? 0), 0) +
          (side.top_sellers ?? []).reduce((s, e) => s + (e.net_idr ?? 0), 0);
        return { ok: true, raw: net, observations, observedFrom: side.start, observedTo: side.end, source: "cohort_top" };
      }
      contextNotes.push("cohort overlay has no institutional entries");
    } else {
      contextNotes.push(`institutional ${aggregateContextNote(side.start, side.end)}`);
    }
  }

  if (input.brokerTop) {
    if (aggregateMatchesWindow(input.brokerTop.start, input.brokerTop.end, from, to)) {
      const sell = sumBrokerTop(input.brokerTop.topSellers, input.d.instBrokers);
      const buy = sumBrokerTop(input.brokerTop.topBuyers, input.d.instBrokers);
      const n =
        input.brokerTop.topSellers.filter((e) => input.d.instBrokers.has(e.broker_code)).length +
        input.brokerTop.topBuyers.filter((e) => input.d.instBrokers.has(e.broker_code)).length;
      if (n) return { ok: true, raw: buy + sell, observations: n, observedFrom: input.brokerTop.start, observedTo: input.brokerTop.end, source: "broker_top" };
      contextNotes.push("top-N aggregate has no institutional-labeled brokers");
    } else {
      contextNotes.push(`broker ${aggregateContextNote(input.brokerTop.start, input.brokerTop.end)}`);
    }
  }

  const anyLabeled = input.d.broker.some((r) => input.d.instBrokers.has(r.brokerCode));
  if (!anyLabeled && !contextNotes.length) return { ok: false, reason: "No broker observations labeled institutional in the saved snapshot." };
  return { ok: false, reason: contextNotes.join("; ") || `No institutional broker rows in the ${WINDOW_DAYS}d window.` };
}

/** Retail net (IDR) — same source order and window rule as institutionalNet. */
function retailNet(input: ExitWatchInput, from: string, to: string): NetResult {
  const rows = input.d.broker.filter((r) => r.date >= from && r.date <= to && input.d.retailBrokers.has(r.brokerCode));
  if (rows.length) {
    return { ok: true, raw: rows.reduce((s, r) => s + r.netVal, 0), observations: rows.length, ...span(rows), source: "broker_rows" };
  }

  const contextNotes: string[] = [];
  const side = input.cohortTop?.retail;
  if (side) {
    if (aggregateMatchesWindow(side.start, side.end, from, to)) {
      const observations = (side.top_buyers?.length ?? 0) + (side.top_sellers?.length ?? 0);
      if (observations) {
        const net =
          (side.top_buyers ?? []).reduce((s, e) => s + (e.net_idr ?? 0), 0) +
          (side.top_sellers ?? []).reduce((s, e) => s + (e.net_idr ?? 0), 0);
        return { ok: true, raw: net, observations, observedFrom: side.start, observedTo: side.end, source: "cohort_top" };
      }
      contextNotes.push("cohort overlay has no retail entries");
    } else {
      contextNotes.push(`retail ${aggregateContextNote(side.start, side.end)}`);
    }
  }

  if (input.brokerTop) {
    if (aggregateMatchesWindow(input.brokerTop.start, input.brokerTop.end, from, to)) {
      const sell = sumBrokerTop(input.brokerTop.topSellers, input.d.retailBrokers);
      const buy = sumBrokerTop(input.brokerTop.topBuyers, input.d.retailBrokers);
      const n =
        input.brokerTop.topSellers.filter((e) => input.d.retailBrokers.has(e.broker_code)).length +
        input.brokerTop.topBuyers.filter((e) => input.d.retailBrokers.has(e.broker_code)).length;
      if (n) return { ok: true, raw: buy + sell, observations: n, observedFrom: input.brokerTop.start, observedTo: input.brokerTop.end, source: "broker_top" };
      contextNotes.push("top-N aggregate has no retail-labeled brokers");
    } else {
      contextNotes.push(`broker ${aggregateContextNote(input.brokerTop.start, input.brokerTop.end)}`);
    }
  }

  const anyLabeled = input.d.broker.some((r) => input.d.retailBrokers.has(r.brokerCode));
  if (!anyLabeled && !contextNotes.length) return { ok: false, reason: "No broker observations labeled retail in the saved snapshot." };
  return { ok: false, reason: contextNotes.join("; ") || `No retail broker rows in the ${WINDOW_DAYS}d window.` };
}

function rawComponents(input: ExitWatchInput, asOf: string): Record<ExitComponentKey, RawResult> {
  const cap = latestCap(input.d, asOf);
  const winFrom = windowFrom(asOf, WINDOW_DAYS);
  const insFrom = windowFrom(asOf, INSIDER_DAYS);
  const norm = (v: number) => (cap ? (v / cap) * 100 : null);

  // instExit: positive raw = net institutional selling pressure
  const inst = institutionalNet(input, winFrom, asOf);
  const instExit: RawResult = !cap
    ? missed("Market capitalization is unavailable for normalization.")
    : !inst.ok
      ? missed(inst.reason)
      : { raw: norm(-inst.raw), reason: null, observations: inst.observations, observedFrom: inst.observedFrom, observedTo: inst.observedTo, source: inst.source };

  // foreignExit: positive raw = net foreign selling pressure
  const fRows = input.d.flow.filter((r) => r.date >= winFrom && r.date <= asOf);
  const foreignExit: RawResult = !fRows.length
    ? missed("Foreign-flow observations are unavailable in the window.")
    : !cap
      ? { raw: null, reason: "Market capitalization is unavailable for normalization.", observations: fRows.length, ...span(fRows), source: null }
      : { raw: norm(-fRows.reduce((s, r) => s + r.netForeignInflow, 0)), reason: null, observations: fRows.length, ...span(fRows), source: "flow_daily" };

  // insiderExit: positive raw = net insider selling (sell − buy value, 90d).
  // 'others' filings are not buy/sell evidence — they never read as zero.
  const iRows = input.d.insider.filter((r) => r.txnDate >= insFrom && r.txnDate <= asOf && (r.txnType === "buy" || r.txnType === "sell"));
  const insiderNet = iRows.reduce((s, r) => s + (r.txnType === "sell" ? r.value : -r.value), 0);
  const insiderExit: RawResult = !iRows.length
    ? missed("No insider buy/sell transactions reported in the 90-day window.")
    : !cap
      ? { raw: null, reason: "Market capitalization is unavailable for normalization.", observations: iRows.length, ...span(iRows), source: null }
      : { raw: norm(insiderNet), reason: null, observations: iRows.length, ...span(iRows), source: "insider_filings" };

  // retailAbsorb: positive raw = retail net buying (absorption pressure)
  const ret = retailNet(input, winFrom, asOf);
  const retailAbsorb: RawResult = !cap
    ? missed("Market capitalization is unavailable for normalization.")
    : !ret.ok
      ? missed(ret.reason)
      : { raw: norm(ret.raw), reason: null, observations: ret.observations, observedFrom: ret.observedFrom, observedTo: ret.observedTo, source: ret.source };

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
  const winFrom = windowFrom(asOf, WINDOW_DAYS);
  // Still-suspended: the suspensions feed has no resume events, so reopening
  // is proven by the tape itself — any positive-volume row AFTER the latest
  // suspension means the stock traded again and the record is stale history,
  // not a live quarantine. Suspended names emit no regular-market rows at
  // all, so an absent window is the expected signature; quarantining on
  // "no volume in window" alone would also flag symbols whose price feed is
  // merely missing. Events dated after asOf are future knowledge and never
  // apply to an earlier reading. COAL.JK (suspended 2026-08-12) kept
  // accumulating negotiated-market broker rows that scored 85/high on a
  // frozen board — this flag quarantines that reading.
  const lastSusp = input.suspensions
    .map((r) => r.suspension_date)
    .filter((d) => d <= asOf)
    .sort()
    .at(-1);
  const suspended =
    lastSusp !== undefined &&
    !input.d.price.some((r) => r.date > lastSusp && r.date <= asOf && (r.volume ?? 0) > 0);
  // Sparse-evidence flag counts only window-bounded, cohort-labeled evidence —
  // the same evidence a score could actually draw on.
  const labeled =
    input.d.broker.filter(
      (r) => r.date >= winFrom && r.date <= asOf && (input.d.instBrokers.has(r.brokerCode) || input.d.retailBrokers.has(r.brokerCode)),
    ).length +
    (input.brokerTop && aggregateMatchesWindow(input.brokerTop.start, input.brokerTop.end, winFrom, asOf)
      ? input.brokerTop.topBuyers.concat(input.brokerTop.topSellers).filter(
          (e) => input.d.instBrokers.has(e.broker_code) || input.d.retailBrokers.has(e.broker_code),
        ).length
      : 0) +
    (input.cohortTop &&
    [input.cohortTop.retail, input.cohortTop.institutional].some((side) => side && aggregateMatchesWindow(side.start, side.end, winFrom, asOf))
      ? [input.cohortTop.retail, input.cohortTop.institutional].reduce(
          (s, side) => s + (side?.top_buyers?.length ?? 0) + (side?.top_sellers?.length ?? 0),
          0,
        )
      : 0);
  return { suspension_recent, corp_action_near, float_constraint, sparse_broker: labeled < SPARSE_BROKER_OBS, suspended };
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
        return { key, weight, raw: null, z: null, contribution: 0, status: "missing", reason: r.reason, observations: r.observations, observedFrom: r.observedFrom, observedTo: r.observedTo, source: null };
      }
      if (z === null) {
        return { key, weight, raw: r.raw, z: null, contribution: 0, status: "missing", reason: "Too few comparable symbols to rank this component.", observations: r.observations, observedFrom: r.observedFrom, observedTo: r.observedTo, source: r.source };
      }
      const contribution = (Math.max(-3, Math.min(3, z)) / 3) * weight * 100;
      return { key, weight, raw: r.raw, z, contribution, status: "available", reason: null, observations: r.observations, observedFrom: r.observedFrom, observedTo: r.observedTo, source: r.source };
    });
    const coverage = components.filter((c) => c.status === "available").reduce((s, c) => s + c.weight, 0) / keys.reduce((s, k) => s + EXIT_WEIGHTS[k], 0);
    const flags = deriveFlags(input, asOf);
    // Quarantine: a still-suspended tape keeps collecting negotiated-market
    // rows, which are block transfers, not live exit pressure. Evidence stays
    // attached to the row; it is only excluded from the publishable board.
    const publishable = coverage >= COVERAGE_FLOOR && !flags.suspended;
    const score = publishable ? Math.max(0, Math.min(100, Math.round(50 + components.reduce((s, c) => s + c.contribution, 0)))) : null;
    const tier: ExitWatchRow["tier"] =
      score === null ? null : score >= 75 ? "high" : score >= 55 ? "elevated" : score >= 35 ? "watch" : "low";
    const winFrom = windowFrom(asOf, WINDOW_DAYS);
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
      flags,
      series,
      window: { days: WINDOW_DAYS, from: winFrom, to: asOf },
      asOf,
    };
  });
}
