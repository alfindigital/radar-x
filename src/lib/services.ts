// Service layer — the only thing UI/route handlers talk to.
// Reads the store; lazy-backfills a ticker on demand (24h cache).

import { getStore } from "./db";
import { api } from "./sectors";
import { rawComponents, computeScores, type SymbolData } from "./score";
import { detectCases } from "./cases";
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
    store.latestScores(120),
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

  let data = await loadSymbol(symbol);
  let lazy = false;

  // Lazy backfill: unknown ticker with no stored data → fetch live once.
  // Fetched rows are used in-memory; persistence is best-effort (serverless fs is read-only).
  if (!data.insider.length && !data.price.length) {
    lazy = true;
    try {
      const start = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
      const [flowRes, priceRes, holdersRes] = await Promise.all([
        api.foreignFlowSymbol(symbol).catch(() => null),
        api.daily(symbol, { start }).catch(() => null),
        api.shareholdersComposition(symbol).catch(() => null),
      ]);
      const priceRows: PriceDaily[] = (priceRes ?? []).map((r) => ({
        symbol: r.symbol ?? symbol,
        date: r.date,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume,
        marketCap: r.market_cap,
      }));
      const flowRows: FlowDaily[] = (flowRes?.data ?? []).map((r) => ({
        symbol: flowRes?.symbol ?? symbol,
        date: r.date,
        netForeignInflow: r.net_foreign_inflow,
        foreignBuyIdr: r.foreign_buy_idr,
        foreignSellIdr: r.foreign_sell_idr,
      }));
      const holderRows: HoldersMonthly[] = (holdersRes?.data ?? []).map((r) => {
        const local: Record<string, number> = {};
        const foreign: Record<string, number> = {};
        for (const [k, v] of Object.entries(r)) {
          if (k.endsWith("_l") && typeof v === "number") local[k] = v;
          if (k.endsWith("_f") && typeof v === "number") foreign[k] = v;
        }
        return {
          symbol,
          month: r.date,
          sharesNumber: r.shares_number,
          nShareholders: r.numbers_of_shareholders,
          changeInShareholders: r.change_in_shareholders,
          local,
          foreign,
        };
      });
      await Promise.allSettled([
        priceRows.length ? store.upsertPriceDaily(priceRows) : null,
        flowRows.length ? store.upsertFlowDaily(flowRows) : null,
        holderRows.length ? store.upsertHolders(holderRows) : null,
      ]);
      data = { ...data, price: priceRows, flow: flowRows, holders: holderRows };
      // recompute this symbol's score solo — tag with the latest batch week so it
      // joins the cohort instead of becoming its own "latest week"
      const existing = await store.latestScores(500);
      const anchor = existing[0]?.week ?? new Date().toISOString().slice(0, 10);
      const raw = rawComponents(data, anchor);
      const rebuilt = computeScores([{ data, raw }], anchor);
      if (rebuilt.length) await store.upsertScores(rebuilt).catch(() => {});
      const cases = detectCases(symbol, {
        insider: data.insider,
        flow: data.flow,
        price: data.price,
        bench: await store.listPriceDaily(BENCH),
      });
      if (cases.length) await store.upsertCases(cases).catch(() => {});
    } catch {
      // keep whatever we have — empty dossier renders an honest empty state
    }
  }

  const [score, cases, tickers] = await Promise.all([
    store.getScore(symbol),
    store.listCases({ symbol }),
    store.listTickers(),
  ]);
  return {
    ticker: tickers.find((t) => t.symbol === symbol) ?? { symbol, name: symbol, subSector: null },
    score,
    insider: data.insider,
    flow: data.flow,
    price: data.price,
    broker: data.broker,
    holders: data.holders,
    cases,
    lazy,
  };
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
