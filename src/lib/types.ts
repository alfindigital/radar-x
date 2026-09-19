// RADAR-X domain types — mapped from Sectors API v2 payloads.

export type HolderType = "insider" | "institution" | "corporate-investor" | string;
export type TxnType = "buy" | "sell" | "others";

/** One insider/institution transaction parsed from GET /v2/filings/ */
export interface InsiderTrade {
  symbol: string; // "BBCA.JK"
  holderName: string;
  holderType: HolderType;
  txnType: TxnType;
  txnDate: string; // actual trade date YYYY-MM-DD (price_transaction[0].date)
  filedAt: string; // filing timestamp ISO
  amount: number; // shares
  price: number; // IDR per share
  value: number; // IDR
  pctBefore: number | null;
  pctAfter: number | null;
  clusterHint: string | null; // extracted from body ("cluster-sell ...")
  sourceUrl: string | null;
}

/** GET /v2/foreign-flow/{symbol}/ daily row */
export interface FlowDaily {
  symbol: string;
  date: string;
  netForeignInflow: number; // IDR, + = net buy
  foreignBuyIdr: number;
  foreignSellIdr: number;
}

/** GET /v2/daily/{symbol}/ row */
export interface PriceDaily {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  marketCap: number | null;
}

/** One broker row inside broker-summary data */
export interface BrokerSummaryRow {
  symbol: string;
  date: string;
  brokerCode: string;
  buyVal: number;
  sellVal: number;
  netVal: number;
  buyLot: number;
  sellLot: number;
  netLot: number;
  avgBuy: number | null;
  avgSell: number | null;
  foreignBuyVal: number | null;
  foreignSellVal: number | null;
}

/** GET /v2/company/shareholders-composition/{symbol}/ monthly row (EOM) */
export interface HoldersMonthly {
  symbol: string;
  month: string; // "2026-08-31"
  sharesNumber: number;
  nShareholders: number;
  changeInShareholders: number;
  local: Record<string, number>; // insurance_l, corporate_l, ... (raw keys preserved)
  foreign: Record<string, number>; // *_f keys
}

export type CasePattern =
  | "EXIT_AHEAD"
  | "STEALTH_ACCUMULATION"
  | "INSIDER_CONTRA_BUY"
  | "CLUSTER_PATTERN";

export interface CaseEvidence {
  insiderTrades: InsiderTrade[];
  flowWindow: FlowDaily[];
  priceWindow: PriceDaily[];
  abnormalFlowZ: number;
  abnormalVolumeZ: number;
  preDriftPct: number;
}

export interface CaseOutcome {
  fwd7dPct: number | null;
  fwd30dPct: number | null;
  fwd60dPct: number | null;
  benchmarkFwd30dPct: number | null;
}

export interface CaseRecord {
  id: string; // deterministic: `${symbol}:${anchorDate}:${pattern}`
  symbol: string;
  pattern: CasePattern;
  direction: "accumulate" | "distribute";
  anchorDate: string; // event/anchor date (last insider trade or event date)
  windowStart: string;
  windowEnd: string;
  score: number; // 0-100
  evidence: CaseEvidence;
  outcome: CaseOutcome;
  narrative: string; // deterministic template text
  createdAt: string;
}

export interface ScoreComponents {
  insiderZ: number;
  foreignTrend: number;
  instNetZ: number;
  retailExodusZ: number;
  fclassShift: number;
}

export interface PositioningScore {
  symbol: string;
  week: string; // ISO week anchor date e.g. "2026-09-19"
  score: number; // -100..100
  components: ScoreComponents;
  computedAt: string;
}

export interface Ticker {
  symbol: string;
  name: string;
  subSector: string | null;
}
