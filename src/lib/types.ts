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
  observationKind?: "ohlcv" | "close-only" | "legacy-unknown";
  fieldSources?: Partial<Record<"open" | "high" | "low" | "close" | "volume" | "marketCap", "sectors-daily" | "sectors-close" | "legacy-unknown" | "arjum">>;
}

/** A normalized observation that can represent a close-only or partially known row. */
export type PriceObservation = Omit<PriceDaily, "open" | "high" | "low" | "close" | "volume"> & {
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
};

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

export type CandidatePattern = "CLUSTER_PATTERN" | "INSIDER_CONTRA_BUY" | "STEALTH_ACCUMULATION";

export interface Candidate {
  id: string;
  symbol: string;
  pattern: CandidatePattern;
  direction: "accumulate" | "distribute";
  anchorDate: string;
  windowStart: string;
  windowEnd: string;
  holders: string[];
  insiderTrades: InsiderTrade[];
  flowWindow: FlowDaily[];
  priceWindow: PriceDaily[];
  abnormalFlowZ: number;
  abnormalVolumeZ: number;
  preDriftPct: number;
}

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

export interface SourceFileMeta {
  path: string;
  provider: "sectors";
  sha256: string;
  rows: number;
  minDate: string | null;
  maxDate: string | null;
  retrievedAt: string | null;
  auditedAt: string;
  provenanceStatus: "legacy-normalized";
  limitations: string[];
}

export interface SnapshotManifest {
  schemaVersion: 2;
  engineVersion: "radarx-v2";
  asOf: string | null;
  files: SourceFileMeta[];
  inputHash: string;
  generatedAt: string;
}

export interface SnapshotIndexes {
  insiderBySymbol: Record<string, number[]>;
  flowBySymbol: Record<string, number[]>;
  priceBySymbol: Record<string, number[]>;
  brokerBySymbol: Record<string, number[]>;
  holdersBySymbol: Record<string, number[]>;
  casesBySymbol: Record<string, number[]>;
  scoresBySymbol: Record<string, number[]>;
}

export interface Snapshot {
  tickers: Ticker[];
  insider: InsiderTrade[];
  flow: FlowDaily[];
  price: PriceDaily[];
  broker: BrokerSummaryRow[];
  holders: HoldersMonthly[];
  cases: CaseRecord[];
  scores: PositioningScore[];
  indexes: SnapshotIndexes;
  manifest: SnapshotManifest;
}

export interface Ticker {
  symbol: string;
  name: string;
  subSector: string | null;
}
