// Service layer — the only thing UI/route handlers talk to.
// Reads the verified local snapshot and derived-v2 artifacts; never fetches or writes during a request.

import { loadDerived, type DerivedCase } from "./derive";
import { rankFlowRows, type FlowRadarRow } from "./flow";
import { measureOutcome } from "./outcomes";
import { loadRotation, type RotationSubsector } from "./rotation";
import { loadTaxonomy, taxonomyBySymbol } from "./taxonomy";
import { loadSnapshot } from "./snapshot";
import type { SymbolData } from "./score";
import type {
  BrokerSummaryRow,
  CandidatePattern,
  FlowDaily,
  HoldersMonthly,
  InsiderTrade,
  PriceDaily,
  ScoreV2,
  Ticker,
} from "./types";

const BENCH = "^IHSG";

export interface RadarBoard {
  week: string | null;
  asOf: string;
  scores: ScoreV2[];
  sparks: Record<string, number[]>;
  recentInsider: InsiderTrade[];
  topCases: DerivedCase[];
  universe: number;
}

export interface IssuerDossier {
  status: "available" | "known-uncovered" | "unknown";
  ticker: Ticker | null;
  score: ScoreV2 | null;
  insider: InsiderTrade[];
  flow: FlowDaily[];
  price: PriceDaily[];
  broker: BrokerSummaryRow[];
  holders: HoldersMonthly[];
  cases: DerivedCase[];
  lazy: boolean; // true = fetched live this visit
  asOf: string;
}

export interface PersonDossier {
  holderName: string;
  trades: InsiderTrade[];
  stats: {
    totalTrades: number;
    buys: number;
    sells: number;
    totalValue: number;
    symbols: number;
    sellThenDown: number; // sells where 30d fwd < 0
    sellMeasured: number;
    buyThenUp: number;
    buyMeasured: number;
  };
  symbols: string[];
}

function loadSymbol(snapshot: Awaited<ReturnType<typeof loadSnapshot>>, symbol: string): SymbolData {
  return {
    symbol,
    insider: snapshot.insider.filter((row) => row.symbol === symbol),
    flow: snapshot.flow.filter((row) => row.symbol === symbol),
    price: snapshot.price.filter((row) => row.symbol === symbol),
    broker: snapshot.broker.filter((row) => row.symbol === symbol),
    holders: snapshot.holders.filter((row) => row.symbol === symbol),
    instBrokers: new Set(),
  };
}

export async function getRadarBoard(): Promise<RadarBoard> {
  const [snapshot, derived] = await Promise.all([loadSnapshot(), loadDerived()]);
  const scores = derived.scores;
  const insider = [...snapshot.insider].sort((a, b) => b.txnDate.localeCompare(a.txnDate)).slice(0, 15);
  const cases = derived.cases.slice(0, 12);
  const sparkSyms = scores.slice(0, 40).map((s) => s.symbol);
  const sparks: Record<string, number[]> = {};
  sparkSyms.forEach((symbol) => {
    const rows = snapshot.flow.filter((row) => row.symbol === symbol).sort((a, b) => a.date.localeCompare(b.date));
    sparks[symbol] = rows.slice(-30).map((r) => r.netForeignInflow);
  });
  return {
    week: derived.manifest.asOf,
    asOf: derived.manifest.asOf,
    scores,
    sparks,
    recentInsider: insider,
    topCases: cases,
    universe: snapshot.tickers.length,
  };
}

function decodeRouteParam(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export async function getIssuerDossier(symbolRaw: string): Promise<IssuerDossier> {
  const [snapshot, derived] = await Promise.all([loadSnapshot(), loadDerived()]);
  const decoded = decodeRouteParam(symbolRaw);
  const normalized = decoded?.toUpperCase() ?? "";
  const symbol = normalized.endsWith(".JK") ? normalized : `${normalized}.JK`;
  const ticker = snapshot.tickers.find((t) => t.symbol === symbol) ?? null;
  const data = ticker ? loadSymbol(snapshot, symbol) : null;
  if (!ticker || !data) {
    return {
      status: "unknown",
      ticker: null,
      score: null,
      insider: [],
      flow: [],
      price: [],
      broker: [],
      holders: [],
      cases: [],
      lazy: false,
      asOf: derived.manifest.asOf,
    };
  }
  const score = derived.scores.find((row) => row.symbol === symbol) ?? null;
  const cases = derived.cases.filter((row) => row.symbol === symbol);
  return {
    status: data.insider.length || data.price.length || data.flow.length ? "available" : "known-uncovered",
    ticker,
    score,
    insider: data.insider,
    flow: data.flow,
    price: data.price,
    broker: data.broker,
    holders: data.holders,
    cases,
    lazy: false,
    asOf: derived.manifest.asOf,
  };
}

// Foreign-flow radar over the full stored universe — every issuer with
// foreign-investor participation, not just insider-active ones.
export async function getFlowRadar(windowDays = 14): Promise<{ from: string | null; to: string | null; rows: FlowRadarRow[] }> {
  const [snapshot, derived] = await Promise.all([loadSnapshot(), loadDerived()]);
  const to = derived.manifest.asOf;
  const from = new Date(new Date(`${to}T00:00:00Z`).getTime() - (windowDays - 1) * 864e5).toISOString().slice(0, 10);
  const referenceDates = [...new Set(snapshot.price
    .filter((row) => row.symbol === BENCH && row.date >= from && row.date <= to)
    .map((row) => row.date))].sort();
  return { from, to, rows: rankFlowRows(snapshot.flow.filter((row) => row.date >= from && row.date <= to), referenceDates) };
}

export interface RotationBoard {
  asOf: string | null;
  generatedAt: string;
  flowDate: string | null;
  sectors: { slug: string; label: string; subs: RotationSubsector[] }[];
  limitations: string[];
}

// Sector/subsector aggregate context — a saved artifact, never fetched live.
export async function getSectorRotation(): Promise<RotationBoard | null> {
  const rot = await loadRotation();
  if (!rot) return null;
  const groups = new Map<string, { slug: string; label: string; subs: RotationSubsector[] }>();
  for (const s of rot.subsectors) {
    const g = groups.get(s.sectorSlug) ?? { slug: s.sectorSlug, label: s.sector, subs: [] };
    g.subs.push(s);
    groups.set(s.sectorSlug, g);
  }
  const sectors = [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
  for (const g of sectors) g.subs.sort((a, b) => (b.mcapChange1w ?? -Infinity) - (a.mcapChange1w ?? -Infinity));
  const flowDate = rot.subsectors.find((s) => s.flowDate)?.flowDate ?? null;
  return { asOf: rot.asOf, generatedAt: rot.generatedAt, flowDate, sectors, limitations: rot.limitations };
}

export interface SubsectorDetail {
  row: RotationSubsector;
  memberScores: { symbol: string; score: number | null; industry: string | null }[];
}

// Subsector drill-down: aggregate row + member issuers paired with their
// latest saved positioning score (null = issuer outside the scored cohort).
export async function getSubsectorDetail(slugRaw: string): Promise<SubsectorDetail | null> {
  const slug = decodeRouteParam(slugRaw)?.toLowerCase() ?? "";
  const rot = await loadRotation();
  const row = rot?.subsectors.find((s) => s.slug === slug);
  if (!rot || !row) return null;
  const derived = await loadDerived();
  const taxMap = taxonomyBySymbol(await loadTaxonomy());
  const memberScores = row.members.map((symbol) => ({
    symbol,
    score: derived.scores.find((s) => s.symbol === symbol)?.score ?? null,
    industry: taxMap.get(symbol)?.industry ?? null,
  }));
  memberScores.sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
  return { row, memberScores };
}

export async function getCaseFeed(pattern?: string): Promise<DerivedCase[]> {
  const derived = await loadDerived();
  const cases = pattern ? derived.cases.filter((row) => row.pattern === (pattern as CandidatePattern)) : derived.cases;
  return cases.slice(0, 100);
}

export async function getCase(id: string): Promise<DerivedCase | null> {
  const decoded = decodeRouteParam(id);
  if (!decoded) return null;
  const derived = await loadDerived();
  return derived.cases.find((row) => row.id === decoded) ?? null;
}

export async function getPersonDossier(holderRaw: string): Promise<PersonDossier | null> {
  const holderName = decodeRouteParam(holderRaw);
  if (!holderName) return null;
  const [snapshot, derived] = await Promise.all([loadSnapshot(), loadDerived()]);
  const trades = snapshot.insider.filter((trade) => trade.holderName === holderName);
  if (!trades.length) return null;

  const bench = snapshot.price.filter((row) => row.symbol === BENCH);
  let sellThenDown = 0;
  let sellMeasured = 0;
  let buyThenUp = 0;
  let buyMeasured = 0;
  const symbols = [...new Set(trades.map((t) => t.symbol))];

  for (const t of trades) {
    const prices = snapshot.price.filter((row) => row.symbol === t.symbol);
    const outcome = measureOutcome(prices, bench, t.txnDate, 30, derived.manifest.asOf);
    if (outcome.status !== "complete" || outcome.issuerPct === null) continue;
    const ret = outcome.issuerPct;
    if (t.txnType === "sell") {
      sellMeasured++;
      if (ret < 0) sellThenDown++;
    } else if (t.txnType === "buy") {
      buyMeasured++;
      if (ret > 0) buyThenUp++;
    }
  }

  return {
    holderName,
    trades,
    symbols,
    stats: {
      totalTrades: trades.length,
      buys: trades.filter((t) => t.txnType === "buy").length,
      sells: trades.filter((t) => t.txnType === "sell").length,
      totalValue: trades.reduce((s, t) => s + t.value, 0),
      symbols: symbols.length,
      sellThenDown,
      sellMeasured,
      buyThenUp,
      buyMeasured,
    },
  };
}
