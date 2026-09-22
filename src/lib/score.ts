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
}

export interface RawComponents {
  insiderNet90d: number; // IDR net insider buy, cluster-weighted
  foreignCum90dNorm: number; // cumulative net inflow / market cap
  instNet14d: number; // IDR net buy by institutional-cohort brokers
  retailExodus: number; // -change_in_shareholders MoM
  fclassShift: number; // Δ foreign institutional classes − Δ foreign individual
  dataPoints: number; // completeness indicator 0-5
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
    const cap = lastPrice?.marketCap;
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

  // retail exodus: latest month-over-month change in shareholder count
  const holders = [...d.holders].sort((a, b) => a.month.localeCompare(b.month));
  let retailExodus = 0;
  let fclassShift = 0;
  if (holders.length >= 2) {
    const cur = holders.at(-1)!;
    const prev = holders.at(-2)!;
    dataPoints++;
    retailExodus = -cur.changeInShareholders;
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
