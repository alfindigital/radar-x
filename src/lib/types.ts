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

export type ComponentKey = "insiderZ" | "foreignTrend" | "instNetZ" | "retailExodusZ" | "fclassShift";

export interface ComponentV2 {
  raw: number | null;
  z: number | null;
  weight: number;
  contribution: number;
  status: "available" | "missing" | "unrankable";
  reason: string | null;
  observedFrom: string | null;
  observedTo: string | null;
  observations: number;
}

export interface ScoreV2 {
  symbol: string;
  asOf: string;
  score: number | null;
  coverageWeight: number;
  components: Record<ComponentKey, ComponentV2>;
  methodVersion: "radarx-v2";
}

export interface MeasuredOutcome {
  status: "complete" | "pending" | "unavailable";
  reason: string | null;
  basis: "transaction-relative-retrospective";
  horizonDays: 7 | 30 | 60;
  startDate: string | null;
  targetDate: string | null;
  endDate: string | null;
  elapsedDays: number | null;
  startClose: number | null;
  endClose: number | null;
  issuerPct: number | null;
  benchmarkPct: number | null;
  excessPp: number | null;
  adjustmentBasis: "unverified";
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

// ── RADAR-X v3 — Exit Watch feed types (envelope data/*.json) ────────────────

export type BrokerCohort = "retail" | "institutional" | "mixed" | "unknown";

export interface FeedMeta {
  path: string;
  sha256: string;
  asOf: string | null;
  generatedAt: string | null;
  rows: number;
}

export interface Feed<T> {
  meta: FeedMeta;
  data: T;
}

export interface RegistryRow {
  code: string;
  name: string;
  is_foreign: boolean;
  cohort: BrokerCohort;
  license_type?: string;
}

export interface SuspensionRow {
  symbol: string;
  suspension_date: string;
  reason?: string;
  pdf_url?: string;
}

export interface CorpActionRow {
  symbol: string;
  type: string; // dividend | upcoming_dividend | bonus | right_issue | stock_split | warrant | agm
  date: string | null; // best per-type date (ex_date > date > agm_date > trading_period_start > recording_date)
  raw: Record<string, unknown>;
}

export interface BrokerTopEntry {
  rank: number;
  broker_code: string;
  net_idr?: number;
  buy_idr?: number;
  sell_idr?: number;
  foreign_net_idr?: number;
}

export interface BrokerTopSymbol {
  start: string;
  end: string;
  topBuyers: BrokerTopEntry[];
  topSellers: BrokerTopEntry[];
}

export interface BrokersTopSession {
  date: string;
  metric?: string;
  origin?: string;
  cohort?: string;
  foreign?: boolean;
  results: { rank: number; broker_code: string; gross?: number; net?: number; foreign_gross?: number; foreign_net?: number }[];
}

/** Per-cohort top-N precision overlay — data/cohort_top.json (TASK-11). */
export interface CohortTopSide {
  start: string;
  end: string;
  top_buyers?: BrokerTopEntry[];
  top_sellers?: BrokerTopEntry[];
}

export interface CohortTopSymbol {
  retail?: CohortTopSide;
  institutional?: CohortTopSide;
}

// ── Exit Watch engine ────────────────────────────────────────────────────────

export type ExitComponentKey = "instExit" | "foreignExit" | "insiderExit" | "retailAbsorb";

export interface ExitComponent {
  key: ExitComponentKey;
  weight: number;
  raw: number | null;      // exit/absorption pressure, positive = more pressure
  z: number | null;        // robust cross-sectional z
  contribution: number;    // clamp(z,-3,3)/3 * weight * 100
  status: "available" | "missing";
  reason: string | null;
  observations: number;
  observedFrom: string | null;
  observedTo: string | null;
}

export interface ExitFlags {
  suspension_recent: boolean;
  corp_action_near: boolean;
  float_constraint: boolean;
  sparse_broker: boolean;
}

export interface ExitWatchRow {
  symbol: string;
  score: number | null; // 0-100 exit pressure; null when coverage < floor
  tier: "high" | "elevated" | "watch" | "low" | null;
  coverage: number;     // sum of available weights / total weights
  components: ExitComponent[];
  flags: ExitFlags;
  /** Daily paired net flow (IDR) per cohort over the window — from labeled
   * broker_rows only; empty when only aggregate top-N feeds exist. */
  series: { date: string; instNet: number; retailNet: number }[];
  window: { days: number; from: string | null; to: string };
  asOf: string;
}
