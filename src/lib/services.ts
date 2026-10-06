// Service layer — the only thing UI/route handlers talk to.
// Reads the verified local snapshot and derived-v2 artifacts; never fetches or writes during a request.

import { loadDerived, type BrokerCohorts, type DerivedCase, cohortsFromRegistry, EMPTY_COHORTS } from "./derive";
import { loadBrokerTop, loadBrokersTop, loadCorpActions, loadIndexDaily, loadMostTraded, loadRegistry, loadSuspensions } from "./feeds";
import { rankFlowRows, type FlowRadarRow } from "./flow";
import { measureOutcome } from "./outcomes";
import { loadOwnership, loadFreeFloat, ownershipForSymbol, freeFloatForSymbol, type IssuerOwnership } from "./ownership";
import { loadRotation, type RotationSubsector } from "./rotation";
import { loadTaxonomy, taxonomyBySymbol } from "./taxonomy";
import { loadSnapshot } from "./snapshot";
import type { SymbolData } from "./score";
import type {
  BrokerCohort,
  BrokerSummaryRow,
  CandidatePattern,
  CorpActionRow,
  ExitWatchRow,
  FlowDaily,
  HoldersMonthly,
  InsiderTrade,
  PriceDaily,
  RegistryRow,
  ScoreV2,
  SuspensionRow,
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

export interface IssuerWindowStats {
  days: number; // declared lookback (90) — window holds `days` inclusive dates
  from: string; // asOf - (days-1)
  to: string; // asOf
  insiderBuys: number | null; // null = issuer has no reported transactions at all
  insiderSells: number | null;
  foreignNet: number | null; // null = no flow observations in the window
  foreignObs: number;
  priceFrom: string | null; // first observed session (sorted, ≤ asOf)
  priceTo: string | null;
  priceChangePct: number | null;
  priceObs: number;
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
  ownership: IssuerOwnership;
  ownershipCovered: boolean; // false = issuer outside current rolling coverage
  freeFloat: number | null; // 0-1 fraction, provider's latest value
  exit: ExitWatchRow | null; // v3 exit-pressure row; null when feed absent
  suspensions: SuspensionRow[];
  corpActions: CorpActionRow[];
  windowStats: IssuerWindowStats; // bounded aggregates matching the dossier labels
  knownHolderNames: Set<string>; // names with a real person dossier — gate whale links
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

function loadSymbol(
  snapshot: Awaited<ReturnType<typeof loadSnapshot>>,
  symbol: string,
  cohorts: BrokerCohorts,
): SymbolData {
  // Stored arrays are insertion-ordered, not date-ordered — every consumer
  // (charts, first/last lookups, windows) needs the deterministic order.
  const byDate = (a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date);
  return {
    symbol,
    insider: snapshot.insider.filter((row) => row.symbol === symbol).sort((a, b) => a.txnDate.localeCompare(b.txnDate)),
    flow: snapshot.flow.filter((row) => row.symbol === symbol).sort(byDate),
    price: snapshot.price.filter((row) => row.symbol === symbol).sort(byDate),
    broker: snapshot.broker.filter((row) => row.symbol === symbol).sort(byDate),
    holders: snapshot.holders.filter((row) => row.symbol === symbol).sort((a, b) => a.month.localeCompare(b.month)),
    instBrokers: cohorts.instBrokers,
    retailBrokers: cohorts.retailBrokers,
  };
}

// Dossier stats labeled "90d" must be computed over exactly the 90-day window
// ending at asOf — never over the whole stored history.
function issuerWindowStats(data: SymbolData, asOf: string, days = 90): IssuerWindowStats {
  // Inclusive-date convention: a `days`-day window holds `days` calendar
  // dates [asOf-(days-1) .. asOf] — same as exitwatch.windowFrom.
  const from = new Date(Date.parse(`${asOf}T00:00:00Z`) - (days - 1) * 864e5).toISOString().slice(0, 10);
  const insiderWin = data.insider.filter((t) => t.txnDate >= from && t.txnDate <= asOf && (t.txnType === "buy" || t.txnType === "sell"));
  const hasAnyInsider = data.insider.some((t) => t.txnType === "buy" || t.txnType === "sell");
  const flowWin = data.flow.filter((r) => r.date >= from && r.date <= asOf);
  const priceObs = data.price.filter((r) => r.date <= asOf);
  const first = priceObs[0] ?? null;
  const last = priceObs.at(-1) ?? null;
  return {
    days,
    from,
    to: asOf,
    insiderBuys: hasAnyInsider ? insiderWin.filter((t) => t.txnType === "buy").reduce((s, t) => s + t.value, 0) : null,
    insiderSells: hasAnyInsider ? insiderWin.filter((t) => t.txnType === "sell").reduce((s, t) => s + t.value, 0) : null,
    foreignNet: flowWin.length ? flowWin.reduce((s, r) => s + r.netForeignInflow, 0) : null,
    foreignObs: flowWin.length,
    priceFrom: first?.date ?? null,
    priceTo: last?.date ?? null,
    priceChangePct:
      first && last && first.close ? ((last.close - first.close) / first.close) * 100 : null,
    priceObs: priceObs.length,
  };
}

export async function getRadarBoard(): Promise<RadarBoard> {
  const [snapshot, derived] = await Promise.all([loadSnapshot(), loadDerived()]);
  const scores = derived.scores;
  const insider = [...snapshot.insider].sort((a, b) => b.txnDate.localeCompare(a.txnDate)).slice(0, 15);
  const cases = derived.cases.slice(0, 12);
  // Sparks must cover whichever rows the board actually renders — indexing the
  // flow feed once beats filtering per symbol and dropping most rows to "—".
  const flowBySymbol = new Map<string, FlowDaily[]>();
  for (const row of snapshot.flow) {
    const arr = flowBySymbol.get(row.symbol);
    if (arr) arr.push(row);
    else flowBySymbol.set(row.symbol, [row]);
  }
  const sparks: Record<string, number[]> = {};
  for (const s of scores) {
    const rows = flowBySymbol.get(s.symbol);
    if (!rows?.length) continue; // missing stays missing — no empty preview
    sparks[s.symbol] = rows
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30)
      .map((r) => r.netForeignInflow);
  }
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

const EMPTY_OWNERSHIP: IssuerOwnership = { holders: [], whales: [], groups: [], instFlow: [], instTxn: [] };

export async function getIssuerDossier(symbolRaw: string): Promise<IssuerDossier> {
  const [snapshot, derived, ownership, freeFloat, registry, suspensions, corpActions] = await Promise.all([
    loadSnapshot(),
    loadDerived(),
    loadOwnership(),
    loadFreeFloat(),
    loadRegistry(),
    loadSuspensions(),
    loadCorpActions(),
  ]);
  const cohorts = registry ? cohortsFromRegistry(registry.data) : EMPTY_COHORTS;
  const decoded = decodeRouteParam(symbolRaw);
  const normalized = decoded?.toUpperCase() ?? "";
  const symbol = normalized.endsWith(".JK") ? normalized : `${normalized}.JK`;
  const ticker = snapshot.tickers.find((t) => t.symbol === symbol) ?? null;
  const data = ticker ? loadSymbol(snapshot, symbol, cohorts) : null;
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
      ownership: EMPTY_OWNERSHIP,
      ownershipCovered: false,
      freeFloat: null,
      exit: null,
      suspensions: [],
      corpActions: [],
      windowStats: issuerWindowStats(loadSymbol(snapshot, symbol, cohorts), derived.manifest.asOf),
      knownHolderNames: new Set(snapshot.insider.map((t) => t.holderName)),
      lazy: false,
      asOf: derived.manifest.asOf,
    };
  }
  const score = derived.scores.find((row) => row.symbol === symbol) ?? null;
  const exit = derived.exitWatch.find((row) => row.symbol === symbol) ?? null;
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
    ownership: ownershipForSymbol(ownership, symbol),
    ownershipCovered: ownership ? symbol in ownership.refreshed : false,
    freeFloat: freeFloatForSymbol(freeFloat, symbol),
    exit,
    suspensions: (suspensions?.data ?? []).filter((r) => r.symbol === symbol),
    corpActions: (corpActions?.data ?? []).filter((r) => r.symbol === symbol),
    windowStats: issuerWindowStats(data, derived.manifest.asOf),
    knownHolderNames: new Set(snapshot.insider.map((t) => t.holderName)),
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
// Flow coverage is computed at read time against the current snapshot so the
// "observed/total" count is accurate even for artifacts written before the
// coverage fields existed.
export async function getSectorRotation(): Promise<RotationBoard | null> {
  const [rot, snapshot] = await Promise.all([loadRotation(), loadSnapshot()]);
  if (!rot) return null;
  const flowDate = rot.subsectors.find((s) => s.flowDate)?.flowDate ?? null;
  const flowCovered = new Set(
    flowDate ? snapshot.flow.filter((r) => r.date === flowDate).map((r) => r.symbol) : [],
  );
  const withCoverage = rot.subsectors.map((s) =>
    s.flowDate && s.flowObserved == null
      ? { ...s, flowObserved: s.members.filter((m) => flowCovered.has(m)).length, flowExpected: s.members.length }
      : s,
  );
  const groups = new Map<string, { slug: string; label: string; subs: RotationSubsector[] }>();
  for (const s of withCoverage) {
    const g = groups.get(s.sectorSlug) ?? { slug: s.sectorSlug, label: s.sector, subs: [] };
    g.subs.push(s);
    groups.set(s.sectorSlug, g);
  }
  const sectors = [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
  for (const g of sectors) g.subs.sort((a, b) => (b.mcapChange1w ?? -Infinity) - (a.mcapChange1w ?? -Infinity));
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
  const [rot, derived, snapshot] = await Promise.all([loadRotation(), loadDerived(), loadSnapshot()]);
  let row = rot?.subsectors.find((s) => s.slug === slug);
  if (!rot || !row) return null;
  if (row.flowDate && row.flowObserved == null) {
    const flowCovered = new Set(snapshot.flow.filter((r) => r.date === row!.flowDate).map((r) => r.symbol));
    row = { ...row, flowObserved: row.members.filter((m) => flowCovered.has(m)).length, flowExpected: row.members.length };
  }
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

// ── v3 Exit Watch ────────────────────────────────────────────────────────────

export interface ExitBoard {
  asOf: string;
  rows: ExitWatchRow[];
  counts: { publishable: number; high: number; elevated: number; watch: number; low: number; insufficient: number };
  feedHashes: Record<string, string>;
  limitations: string[];
}

// Exit Watch board — every scored row, publishable first (score desc),
// null-score rows last. Nulls are never coerced to zero.
export async function getExitBoard(): Promise<ExitBoard> {
  const derived = await loadDerived();
  // Tie-break saturated 100s by coverage then total |z| so the ordering stays
  // meaningful instead of arbitrary among equal scores.
  const intensity = (r: ExitWatchRow) =>
    r.components.reduce((s: number, c) => s + Math.abs(c.z ?? 0), 0);
  const rows = [...derived.exitWatch].sort(
    (a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity) || b.coverage - a.coverage || intensity(b) - intensity(a),
  );
  const counts = {
    publishable: rows.filter((r) => r.score !== null).length,
    high: rows.filter((r) => r.tier === "high").length,
    elevated: rows.filter((r) => r.tier === "elevated").length,
    watch: rows.filter((r) => r.tier === "watch").length,
    low: rows.filter((r) => r.tier === "low").length,
    insufficient: rows.filter((r) => r.score === null).length,
  };
  return {
    asOf: derived.manifest.asOf,
    rows,
    counts,
    feedHashes: derived.manifest.feedHashes ?? {},
    limitations: derived.manifest.limitations,
  };
}

export interface MarketContext {
  ihsg: { date: string; price: number; changePct: number | null } | null;
  mostTraded: { date: string | null; rows: { symbol: string; company_name?: string; volume?: number }[] };
}

// Market backdrop for the Exit Watch board — IHSG last close + heaviest-volume
// issuers of the latest saved session. Null/empty when feeds are absent.
export async function getMarketContext(): Promise<MarketContext> {
  const [idx, mt] = await Promise.all([loadIndexDaily(), loadMostTraded()]);
  const ihsgRows = (idx?.data ?? []).filter((r) => r.indexCode === "IHSG").sort((a, b) => a.date.localeCompare(b.date));
  const last = ihsgRows.at(-1) ?? null;
  const prev = ihsgRows.at(-2) ?? null;
  return {
    ihsg:
      last && prev
        ? { date: last.date, price: last.price, changePct: prev.price ? ((last.price - prev.price) / prev.price) * 100 : null }
        : last
          ? { date: last.date, price: last.price, changePct: null }
          : null,
    mostTraded: { date: mt?.data.date ?? null, rows: (mt?.data.rows ?? []).slice(0, 5) },
  };
}

export interface BrokerLeaderboardEntry {
  rank: number;
  broker_code: string;
  gross?: number;
  net?: number;
  cohort: BrokerCohort;
  name: string | null;
}

export interface BrokerBoard {
  date: string | null;
  sessionCohort: string;
  entries: BrokerLeaderboardEntry[];
  sessions: { date: string; cohort: string }[];
  registry: { total: number; byCohort: Record<string, number> };
  available: boolean;
}

// Broker leaderboard — latest brokers_top session, each row labeled with its
// registry cohort. When no registry/session exists the board reports itself
// unavailable rather than showing an unlabeled list.
export async function getBrokerBoard(cohort = "all"): Promise<BrokerBoard> {
  const [sessions, registry] = await Promise.all([loadBrokersTop(), loadRegistry()]);
  const cohortByCode = new Map<string, RegistryRow>((registry?.data ?? []).map((r) => [r.code, r]));
  const latest =
    sessions?.data.find((s) => s.results.length && (s.cohort ?? "all") === cohort) ??
    sessions?.data.find((s) => s.results.length) ??
    null;
  const byCohort: Record<string, number> = {};
  for (const r of registry?.data ?? []) byCohort[r.cohort] = (byCohort[r.cohort] ?? 0) + 1;
  return {
    date: latest?.date ?? null,
    sessionCohort: latest?.cohort ?? "all",
    entries: (latest?.results ?? []).map((r) => ({
      rank: r.rank,
      broker_code: r.broker_code,
      gross: r.gross,
      net: r.net,
      cohort: cohortByCode.get(r.broker_code)?.cohort ?? "unknown",
      name: cohortByCode.get(r.broker_code)?.name ?? null,
    })),
    sessions: (sessions?.data ?? []).map((s) => ({ date: s.date, cohort: s.cohort ?? "all" })),
    registry: { total: registry?.data.length ?? 0, byCohort },
    available: Boolean(latest && registry),
  };
}

export interface BrokerProfile {
  code: string;
  registry: RegistryRow | null;
  leaderboardAppearances: { date: string; rank: number; net?: number; cohort: string }[];
  symbolsTopBuyer: string[];
  symbolsTopSeller: string[];
}

export async function getBrokerProfile(codeRaw: string): Promise<BrokerProfile | null> {
  const code = decodeRouteParam(codeRaw)?.toUpperCase() ?? "";
  if (!code) return null;
  const [registry, sessions, brokerTop] = await Promise.all([loadRegistry(), loadBrokersTop(), loadBrokerTop()]);
  const registryRow = registry?.data.find((r) => r.code === code) ?? null;
  const appearances = (sessions?.data ?? [])
    .flatMap((s) => s.results.filter((r) => r.broker_code === code).map((r) => ({ date: s.date, rank: r.rank, net: r.net, cohort: s.cohort ?? "all" })))
    .sort((a, b) => b.date.localeCompare(a.date));
  const symbolsTopBuyer: string[] = [];
  const symbolsTopSeller: string[] = [];
  for (const [symbol, top] of brokerTop?.data ?? new Map()) {
    if (top.topBuyers.some((e: { broker_code: string }) => e.broker_code === code)) symbolsTopBuyer.push(symbol);
    if (top.topSellers.some((e: { broker_code: string }) => e.broker_code === code)) symbolsTopSeller.push(symbol);
  }
  if (!registryRow && !appearances.length && !symbolsTopBuyer.length && !symbolsTopSeller.length) return null;
  symbolsTopBuyer.sort();
  symbolsTopSeller.sort();
  return { code, registry: registryRow, leaderboardAppearances: appearances, symbolsTopBuyer, symbolsTopSeller };
}
