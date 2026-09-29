// Service layer — the only thing UI/route handlers talk to.
// Reads the store; lazy-backfills a ticker on demand (24h cache).

import { getStore } from "./db";
import type { SymbolData } from "./score";
import type {
  BrokerSummaryRow,
  CaseRecord,
  FlowDaily,
  HoldersMonthly,
  InsiderTrade,
  PositioningScore,
  PriceDaily,
  Ticker,
} from "./types";

const BENCH = "^IHSG";

export interface RadarBoard {
  week: string | null;
  scores: PositioningScore[];
  sparks: Record<string, number[]>;
  recentInsider: InsiderTrade[];
  topCases: CaseRecord[];
  universe: number;
}

export interface IssuerDossier {
  status: "available" | "known-uncovered" | "unknown";
  ticker: Ticker | null;
  score: PositioningScore | null;
  insider: InsiderTrade[];
  flow: FlowDaily[];
  price: PriceDaily[];
  broker: BrokerSummaryRow[];
  holders: HoldersMonthly[];
  cases: CaseRecord[];
  lazy: boolean; // true = fetched live this visit
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

async function loadSymbol(symbol: string): Promise<SymbolData> {
  const store = getStore();
  return {
    symbol,
    insider: await store.listInsiderTrades({ symbol }),
    flow: await store.listFlowDaily(symbol),
    price: await store.listPriceDaily(symbol),
    broker: await store.listBrokerRows(symbol),
    holders: await store.getHolders(symbol),
    instBrokers: new Set(),
  };
}

export async function getRadarBoard(): Promise<RadarBoard> {
  const store = getStore();
  const [scores, insider, cases, tickers] = await Promise.all([
    store.latestScores(),
    store.listInsiderTrades({ limit: 15 }),
    store.listCases({ limit: 12 }),
    store.listTickers(),
  ]);
  const sparkSyms = scores.slice(0, 40).map((s) => s.symbol);
  const flowRows = await Promise.all(sparkSyms.map((s) => store.listFlowDaily(s)));
  const sparks: Record<string, number[]> = {};
  flowRows.forEach((rows, i) => {
    sparks[sparkSyms[i]] = rows.slice(-30).map((r) => r.netForeignInflow);
  });
  return {
    week: scores[0]?.week ?? null,
    scores,
    sparks,
    recentInsider: insider,
    topCases: cases,
    universe: tickers.length || new Set(insider.map((t) => t.symbol)).size,
  };
}

export async function getIssuerDossier(symbolRaw: string): Promise<IssuerDossier> {
  const store = getStore();
  const symbol = symbolRaw.toUpperCase().endsWith(".JK")
    ? symbolRaw.toUpperCase()
    : `${symbolRaw.toUpperCase()}.JK`;
  const [data, tickers] = await Promise.all([
    loadSymbol(symbol),
    store.listTickers(),
  ]);
  const ticker = tickers.find((t) => t.symbol === symbol) ?? null;
  if (!ticker) {
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
    };
  }
  const [score, cases] = await Promise.all([
    store.getScore(symbol),
    store.listCases({ symbol }),
  ]);
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
  };
}

export interface FlowRadarRow {
  symbol: string;
  days: number;
  cumNet: number; // IDR cumulative net foreign inflow over window
  cumBuy: number;
  cumSell: number;
  lastDate: string;
  streak: number; // consecutive net-buy days ending at lastDate
}

// Foreign-flow radar over the full stored universe — every emiten with
// foreign-investor participation, not just insider-active ones.
export async function getFlowRadar(windowDays = 14): Promise<{ from: string | null; to: string | null; rows: FlowRadarRow[] }> {
  const store = getStore();
  const all = await store.listFlowUniverse();
  if (!all.length) return { from: null, to: null, rows: [] };
  const to = all.reduce((m, r) => (r.date > m ? r.date : m), all[0].date);
  const from = new Date(new Date(to).getTime() - windowDays * 864e5).toISOString().slice(0, 10);

  const bySym = new Map<string, FlowRadarRow & { nets: [string, number][] }>();
  for (const r of all) {
    if (r.date < from || r.date > to) continue;
    let e = bySym.get(r.symbol);
    if (!e) {
      e = { symbol: r.symbol, days: 0, cumNet: 0, cumBuy: 0, cumSell: 0, lastDate: r.date, streak: 0, nets: [] };
      bySym.set(r.symbol, e);
    }
    e.days++;
    e.cumNet += r.netForeignInflow;
    e.cumBuy += r.foreignBuyIdr;
    e.cumSell += r.foreignSellIdr;
    if (r.date > e.lastDate) e.lastDate = r.date;
    e.nets.push([r.date, r.netForeignInflow]);
  }
  for (const e of bySym.values()) {
    for (const [, net] of e.nets.sort((a, b) => b[0].localeCompare(a[0]))) {
      if (net > 0) e.streak++;
      else break;
    }
  }
  const rows = [...bySym.values()].sort((a, b) => b.cumNet - a.cumNet);
  return { from, to, rows };
}

export async function getCaseFeed(pattern?: string): Promise<CaseRecord[]> {
  return getStore().listCases({ pattern, limit: 100 });
}

export async function getCase(id: string): Promise<CaseRecord | null> {
  return getStore().getCase(decodeURIComponent(id));
}

export async function getPersonDossier(holderRaw: string): Promise<PersonDossier | null> {
  const store = getStore();
  const holderName = decodeURIComponent(holderRaw);
  const trades = await store.listInsiderTrades({ holderName });
  if (!trades.length) return null;

  const bench = await store.listPriceDaily(BENCH);
  void bench;
  let sellThenDown = 0;
  let sellMeasured = 0;
  let buyThenUp = 0;
  let buyMeasured = 0;
  const symbols = [...new Set(trades.map((t) => t.symbol))];

  for (const t of trades) {
    const prices = await store.listPriceDaily(t.symbol);
    if (prices.length < 10) continue;
    const anchor = t.txnDate;
    const base = [...prices].reverse().find((p) => p.date <= anchor)?.close;
    const fwdDate = new Date(new Date(anchor).getTime() + 30 * 864e5).toISOString().slice(0, 10);
    const lastDate = prices.at(-1)!.date;
    if (lastDate < fwdDate) continue;
    const fwd = prices.find((p) => p.date >= fwdDate)?.close;
    if (!base || !fwd) continue;
    const ret = ((fwd - base) / base) * 100;
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
