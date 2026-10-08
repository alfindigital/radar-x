// Positioning Score engine — the core IP of RADAR-X.
// score = clip(0.30·insider_z + 0.25·foreign_trend + 0.20·instnet_z
//              + 0.15·retail_exodus_z + 0.10·fclass_shift, -100, 100)
// All components are cross-sectional robust z-scores (median/MAD) over the
// watchlist for the same anchor week → explainable, comparable, outlier-safe.

import type {
  BrokerSummaryRow,
  FlowDaily,
  HoldersMonthly,
  InsiderTrade,
  PositioningScore,
  PriceDaily,
  ScoreComponents,
  ComponentKey,
  ComponentV2,
  ScoreV2,
} from "./types";

const W = { insider: 0.3, foreign: 0.25, inst: 0.2, retail: 0.15, fclass: 0.1 } as const;
const Z_CLIP = 3;
const SCALE = 100 / Z_CLIP;

const INSIDER_WINDOW_D = 90;
const INST_WINDOW_D = 14;

export interface SymbolData {
  symbol: string;
  insider: InsiderTrade[];
  flow: FlowDaily[];
  price: PriceDaily[];
  broker: BrokerSummaryRow[];
  holders: HoldersMonthly[];
  instBrokers: Set<string>; // broker codes tagged institutional cohort
  retailBrokers: Set<string>; // broker codes tagged retail cohort
  // Fallback market cap for symbols whose price rows carry none (universe
  // close-only rows leave marketCap null) — populated from the taxonomy
  // artifact by buildDerived.
  marketCapFallback?: number | null;
}

export interface RawComponents {
  insiderNet90d: number; // IDR net insider buy, cluster-weighted
  foreignCum90dNorm: number; // cumulative net inflow / market cap
  instNet14d: number; // IDR net buy by institutional-cohort brokers
  retailExodus: number; // -change_in_shareholders MoM
  fclassShift: number; // Δ foreign institutional classes − Δ foreign individual
  dataPoints: number; // completeness indicator 0-5
}

const V2_WEIGHTS: Record<ComponentKey, number> = {
  insiderZ: 0.3,
  foreignTrend: 0.25,
  instNetZ: 0.2,
  retailExodusZ: 0.15,
  fclassShift: 0.1,
};

interface RawV2 {
  raw: number | null;
  reason: string | null;
  observedFrom: string | null;
  observedTo: string | null;
  observations: number;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function mad(xs: number[], med: number): number {
  if (xs.length === 0) return 1;
  const dev = xs.map((x) => Math.abs(x - med)).sort((a, b) => a - b);
  const m = median(dev);
  return m === 0 ? 1 : m;
}

function daysBefore(anchor: string, days: number): string {
  return new Date(new Date(anchor).getTime() - days * 864e5).toISOString().slice(0, 10);
}

function inclusiveStart(anchor: string, days: number): string {
  return daysBefore(anchor, days - 1);
}

function span<T extends { date?: string; txnDate?: string; month?: string }>(rows: T[]): { observedFrom: string | null; observedTo: string | null } {
  const dates = rows.map((row) => row.date ?? row.txnDate ?? row.month).filter((date): date is string => Boolean(date)).sort();
  return { observedFrom: dates[0] ?? null, observedTo: dates.at(-1) ?? null };
}

function missing(reason: string): RawV2 {
  return { raw: null, reason, observedFrom: null, observedTo: null, observations: 0 };
}

function rawV2(d: SymbolData, key: ComponentKey, asOf: string): RawV2 {
  if (key === "insiderZ") {
    const rows = d.insider.filter((row) => row.txnDate >= inclusiveStart(asOf, 90) && row.txnDate <= asOf && row.txnType !== "others");
    if (!rows.length) return missing("No reported ownership observations in the 90-day window.");
    const raw = rows.reduce((sum, row) => sum + (row.txnType === "buy" ? row.value : -row.value), 0);
    const dates = span(rows);
    return { raw, reason: null, ...dates, observations: rows.length };
  }

  if (key === "foreignTrend") {
    const rows = d.flow.filter((row) => row.date >= inclusiveStart(asOf, 90) && row.date <= asOf);
    if (!rows.length) return missing("No foreign-flow observations in the 90-day window.");
    const cap =
      [...d.price]
        .filter((row) => row.date <= asOf && Number.isFinite(row.marketCap) && (row.marketCap ?? 0) > 0)
        .sort((a, b) => a.date.localeCompare(b.date))
        .at(-1)?.marketCap ??
      (d.marketCapFallback && d.marketCapFallback > 0 ? d.marketCapFallback : undefined);
    if (!cap) return { ...missing("Market capitalization is unavailable for normalization."), observations: rows.length, ...span(rows) };
    const raw = (rows.reduce((sum, row) => sum + row.netForeignInflow, 0) / cap) * 100;
    const dates = span(rows);
    return { raw, reason: null, ...dates, observations: rows.length };
  }

  if (key === "instNetZ") {
    const rows = d.broker.filter((row) => row.date >= inclusiveStart(asOf, 14) && row.date <= asOf);
    if (!rows.length) return missing("Broker observations are unavailable in the 14-day window.");
    const eligible = d.instBrokers.size
      ? rows.filter((row) => d.instBrokers.has(row.brokerCode))
      : rows.filter((row) => Number.isFinite(row.foreignBuyVal) || Number.isFinite(row.foreignSellVal));
    if (!eligible.length) return missing("No eligible institutional broker observations are available.");
    const raw = eligible.reduce((sum, row) => sum + (d.instBrokers.size ? row.netVal : (row.foreignBuyVal ?? 0) - (row.foreignSellVal ?? 0)), 0);
    const dates = span(eligible);
    return { raw, reason: null, ...dates, observations: eligible.length };
  }

  const holders = d.holders.filter((row) => row.month <= asOf).sort((a, b) => a.month.localeCompare(b.month));
  if (holders.length < 2) return missing("Two holder-composition months before the as-of date are required.");
  const current = holders.at(-1)!;
  const previous = holders.at(-2)!;
  const dates = span([previous, current]);
  if (key === "retailExodusZ") {
    // The provider can publish a partial latest month (holder-class splits
    // populated, shareholder count still null) — read the latest month whose
    // change field is actually reported instead of dropping the component.
    const reported = [...holders].reverse().find((row) => row.changeInShareholders != null && Number.isFinite(row.changeInShareholders));
    if (!reported) return { ...missing("Shareholder-count change is invalid."), ...dates, observations: 2 };
    return { raw: -(reported.changeInShareholders as number), reason: null, ...span([reported]), observations: 1 };
  }
  const currentInstitutional = (current.foreign["mutual_fund_f"] ?? NaN) + (current.foreign["financial_institutions_f"] ?? NaN);
  const previousInstitutional = (previous.foreign["mutual_fund_f"] ?? NaN) + (previous.foreign["financial_institutions_f"] ?? NaN);
  const currentIndividual = current.foreign["individual_f"] ?? NaN;
  const previousIndividual = previous.foreign["individual_f"] ?? NaN;
  if (![currentInstitutional, previousInstitutional, currentIndividual, previousIndividual].every(Number.isFinite)) {
    return { ...missing("Foreign holder-class fields are incomplete."), ...dates, observations: 2 };
  }
  return { raw: (currentInstitutional - previousInstitutional) - (currentIndividual - previousIndividual), reason: null, ...dates, observations: 2 };
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function standardize(values: (number | null)[]): (number | null)[] {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (valid.length < 5) return values.map(() => null);
  const sorted = [...valid].sort((a, b) => a - b);
  const medianValue = quantile(sorted, 0.5);
  const iqr = quantile(sorted, 0.75) - quantile(sorted, 0.25);
  const scale = iqr / 1.349;
  return values.map((value) => {
    if (value === null || !Number.isFinite(value)) return null;
    if (scale === 0) return 0;
    return Math.max(-3, Math.min(3, (value - medianValue) / scale));
  });
}

export function computeScoresV2(data: SymbolData[], asOf: string): ScoreV2[] {
  const keys = Object.keys(V2_WEIGHTS) as ComponentKey[];
  const rawRows = data.map((row) => Object.fromEntries(keys.map((key) => [key, rawV2(row, key, asOf)])) as Record<ComponentKey, RawV2>);
  const zRows = Object.fromEntries(keys.map((key) => [key, standardize(rawRows.map((row) => row[key].raw))])) as Record<ComponentKey, (number | null)[]>;

  return data.map((row, index) => {
    const components = {} as Record<ComponentKey, ComponentV2>;
    let coverageWeight = 0;
    let rankable = 0;
    let weighted = 0;
    for (const key of keys) {
      const raw = rawRows[index][key];
      const z = zRows[key][index];
      const status = raw.raw === null ? "missing" : z === null ? "unrankable" : "available";
      const contribution = z === null ? 0 : z * V2_WEIGHTS[key] * (100 / 3);
      if (status === "available") {
        coverageWeight += V2_WEIGHTS[key];
        rankable++;
        weighted += contribution;
      }
      components[key] = {
        raw: raw.raw,
        z,
        weight: V2_WEIGHTS[key],
        contribution,
        status,
        reason: raw.reason ?? (status === "unrankable" ? "Fewer than five valid cohort observations." : null),
        observedFrom: raw.observedFrom,
        observedTo: raw.observedTo,
        observations: raw.observations,
      };
    }
    return {
      symbol: row.symbol,
      asOf,
      score: rankable >= 2 ? Math.round(Math.max(-100, Math.min(100, weighted))) : null,
      coverageWeight,
      components,
      methodVersion: "radarx-v2" as const,
    };
  }).sort((a, b) => a.symbol.localeCompare(b.symbol));
}

export function rawComponents(d: SymbolData, anchor: string): RawComponents {
  const w90 = daysBefore(anchor, INSIDER_WINDOW_D);
  const w14 = daysBefore(anchor, INST_WINDOW_D);
  let dataPoints = 0;

  // insider: net Rp, each additional distinct holder in same direction adds 25%
  const trades = d.insider.filter((t) => t.txnDate >= w90 && t.txnDate <= anchor && t.txnType !== "others");
  let insiderNet90d = 0;
  if (trades.length) {
    dataPoints++;
    const buys = trades.filter((t) => t.txnType === "buy");
    const sells = trades.filter((t) => t.txnType === "sell");
    const buyVal = buys.reduce((s, t) => s + t.value, 0);
    const sellVal = sells.reduce((s, t) => s + t.value, 0);
    const clusterBoost = (n: number) => 1 + 0.25 * Math.max(0, n - 1);
    insiderNet90d =
      buyVal * clusterBoost(new Set(buys.map((t) => t.holderName)).size) -
      sellVal * clusterBoost(new Set(sells.map((t) => t.holderName)).size);
  }

  // foreign: cumulative net inflow normalized by latest market cap
  const flow = d.flow.filter((f) => f.date >= w90 && f.date <= anchor);
  let foreignCum90dNorm = 0;
  if (flow.length >= 5) {
    dataPoints++;
    const cum = flow.reduce((s, f) => s + f.netForeignInflow, 0);
    // universe-close rows carry no marketCap — fall back to last row that has one
    const lastPrice = d.price.filter((p) => p.date <= anchor && p.marketCap).at(-1);
    const cap = lastPrice?.marketCap ?? (d.marketCapFallback && d.marketCapFallback > 0 ? d.marketCapFallback : undefined);
    foreignCum90dNorm = cap && cap > 0 ? (cum / cap) * 100 : 0; // % of market cap
  }

  // institutional cohort net buy 14d (fallback: foreign portion of broker rows)
  const brows = d.broker.filter((b) => b.date >= w14 && b.date <= anchor);
  let instNet14d = 0;
  if (brows.length) {
    dataPoints++;
    const instRows = d.instBrokers.size
      ? brows.filter((b) => d.instBrokers.has(b.brokerCode))
      : brows.filter((b) => (b.foreignBuyVal ?? 0) + (b.foreignSellVal ?? 0) > 0);
    instNet14d = instRows.reduce(
      (s, b) => s + (d.instBrokers.size ? b.netVal : (b.foreignBuyVal ?? 0) - (b.foreignSellVal ?? 0)),
      0,
    );
  }

  // retail exodus: latest month-over-month change in shareholder count.
  // Unreported is not zero — a null delta must not count as a measured point.
  const holders = [...d.holders].sort((a, b) => a.month.localeCompare(b.month));
  let retailExodus = 0;
  let fclassShift = 0;
  if (holders.length >= 2) {
    const cur = holders.at(-1)!;
    const prev = holders.at(-2)!;
    const hasChg = cur.changeInShareholders != null;
    const hasFclass = ["mutual_fund_f", "financial_institutions_f", "individual_f"].some(
      (k) => k in cur.foreign || k in prev.foreign,
    );
    if (hasChg || hasFclass) dataPoints++;
    if (hasChg) retailExodus = -(cur.changeInShareholders as number);
    const instNow = (cur.foreign["mutual_fund_f"] ?? 0) + (cur.foreign["financial_institutions_f"] ?? 0);
    const instPrev = (prev.foreign["mutual_fund_f"] ?? 0) + (prev.foreign["financial_institutions_f"] ?? 0);
    const indNow = cur.foreign["individual_f"] ?? 0;
    const indPrev = prev.foreign["individual_f"] ?? 0;
    fclassShift = (instNow - instPrev) - (indNow - indPrev);
  }

  return { insiderNet90d, foreignCum90dNorm, instNet14d, retailExodus, fclassShift, dataPoints };
}

export function computeScores(all: { data: SymbolData; raw: RawComponents }[], anchor: string): PositioningScore[] {
  const raws = all.map((a) => a.raw);
  const z = (key: keyof Omit<RawComponents, "dataPoints">, x: number): number => {
    const xs = raws.map((r) => r[key]);
    const med = median(xs);
    const scale = mad(xs, med) * 1.4826;
    return Math.max(-Z_CLIP, Math.min(Z_CLIP, (x - med) / scale));
  };

  return all.map(({ data, raw }) => {
    const components: ScoreComponents = {
      insiderZ: z("insiderNet90d", raw.insiderNet90d),
      foreignTrend: z("foreignCum90dNorm", raw.foreignCum90dNorm),
      instNetZ: z("instNet14d", raw.instNet14d),
      retailExodusZ: z("retailExodus", raw.retailExodus),
      fclassShift: z("fclassShift", raw.fclassShift),
    };
    const score =
      (W.insider * components.insiderZ +
        W.foreign * components.foreignTrend +
        W.inst * components.instNetZ +
        W.retail * components.retailExodusZ +
        W.fclass * components.fclassShift) *
      SCALE;
    return {
      symbol: data.symbol,
      week: anchor,
      score: Math.round(Math.max(-100, Math.min(100, score))),
      components,
      computedAt: new Date().toISOString(),
    };
  });
}
