// Sectors API v2 client — server-side only. API key never leaves the server.
// Billing rules: 2xx billed, 404 = 1 credit, 400/4xx/5xx free. Never use ?q= (3 credits).

const BASE = "https://api.sectors.app";

export class SectorsError extends Error {
  constructor(
    public status: number,
    public path: string,
    message: string,
  ) {
    super(`Sectors ${status} ${path}: ${message}`);
    this.name = "SectorsError";
  }
}

// Key pool: SECTORS_API_KEYS (csv) merged with SECTORS_API_KEY, deduped.
// 401/403 marks a key dead for the process; 429 marks it spent until the next
// backoff round. Deterministic errors (400/404/5xx) throw immediately — the
// request is bad, not the key.
function keys(): string[] {
  const multi = (process.env.SECTORS_API_KEYS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const single = process.env.SECTORS_API_KEY?.trim();
  const all = [...new Set(single ? [single, ...multi] : multi)];
  if (!all.length) throw new Error("SECTORS_API_KEY(S) not set");
  return all;
}

const keyPool = {
  dead: new Set<string>(),
  spent: new Set<string>(),
  rr: 0,
  pick(): string | null {
    const alive = keys().filter((k) => !this.dead.has(k) && !this.spent.has(k));
    if (!alive.length) return null;
    return alive[this.rr++ % alive.length];
  },
};

const REQUEST_TIMEOUT_MS = 30_000;

export async function sectorsGet<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  let res: Response | undefined;
  // Rotation must try EVERY eligible key, not stop after 5 attempts — the pool
  // size drives the cap, plus a few rounds for spent-key backoff.
  const poolSize = keys().length;
  const maxAttempts = poolSize + 3;
  let retryAfterMs: number | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const k = keyPool.pick();
    if (k === null) {
      // All keys dead → hard fail; all spent → back off, unspend, retry.
      if (keyPool.spent.size === 0) break;
      const wait = retryAfterMs ?? Math.min(30000, 1500 * 2 ** attempt) + Math.random() * 500;
      await new Promise((r) => setTimeout(r, wait));
      retryAfterMs = null;
      keyPool.spent.clear();
      continue;
    }
    const keyIndex = keys().indexOf(k);
    try {
      res = await fetch(url.toString(), {
        headers: { Authorization: k },
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (e) {
      // Network failure/timeout — treat the key as spent and keep rotating
      // rather than hanging the whole ingest run.
      keyPool.spent.add(k);
      console.warn(`sectors: key #${keyIndex + 1} fetch error (${e instanceof Error ? e.message : e}) — rotating`);
      continue;
    }
    if (res.ok) return (await res.json()) as T;
    if (res.status === 401 || res.status === 403) {
      keyPool.dead.add(k);
      console.warn(`sectors: key #${keyIndex + 1} ${res.status} — rotating`);
      continue;
    }
    if (res.status === 429) {
      const ra = Number(res.headers.get("retry-after"));
      if (Number.isFinite(ra) && ra > 0) retryAfterMs = Math.min(60000, ra * 1000);
      keyPool.spent.add(k);
      continue;
    }
    break;
  }
  const status = res?.status ?? 0;
  const body = res ? await res.text().catch(() => "") : "all pool keys dead or exhausted";
  throw new SectorsError(status, path, body.slice(0, 300));
}

// ---- Raw response shapes (subset of fields we use) ----

export interface FilingRaw {
  title: string;
  body: string;
  source: string | null;
  timestamp: string;
  sector: string | null;
  sub_sector: string | null;
  tags: string[] | null;
  symbol: string;
  transaction_type: string;
  holder_type: string;
  holder_name: string | null;
  holding_before: number | null;
  holding_after: number | null;
  amount_transaction: number | null;
  price: number | null;
  transaction_value: number | null;
  price_transaction: { date: string; type: string; price: number; amount_transacted: number }[] | null;
  share_percentage_before: number | null;
  share_percentage_after: number | null;
  share_percentage_transaction: number | null;
  idx_investor_slug: string | null;
  idx_conglomerates_group_slug: string | null;
}

export interface FilingsResponse {
  results: FilingRaw[];
  pagination?: { total_count?: number; has_next?: boolean; next_offset?: number } | null;
}

export interface ForeignFlowSymbolRow {
  symbol?: string;
  date: string;
  net_foreign_inflow: number;
  foreign_buy_idr: number;
  foreign_sell_idr: number;
  foreign_share?: number;
}

export interface ForeignFlowSymbolResponse {
  symbol: string;
  start: string;
  end: string;
  data: ForeignFlowSymbolRow[];
}

export interface DailyRow {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  market_cap: number | null;
}

export interface BrokerSummaryRowRaw {
  broker_code: string;
  bfreq: number | null;
  blot: number | null;
  bval: number | null;
  bavg_per_share: number | null;
  sfreq: number | null;
  slot: number | null;
  sval: number | null;
  savg_per_share: number | null;
  nlot: number | null;
  nval: number | null;
  navg_per_share: number | null;
  f_bval: number | null;
  f_sval: number | null;
  d_bavg_per_share: number | null;
  d_savg_per_share: number | null;
}

export interface BrokerSummaryResponse {
  symbol: string;
  start: string;
  end: string;
  data: { date: string; summary: BrokerSummaryRowRaw[] }[];
}

export interface ShareholdersCompositionRow {
  date: string;
  shares_number: number;
  insurance_l: number; corporate_l: number; pension_fund_l: number;
  financial_institutions_l: number; individual_l: number; mutual_fund_l: number;
  securities_companies_l: number; foundation_l: number; other_l: number; total_l: number;
  insurance_f: number; corporate_f: number; pension_fund_f: number;
  financial_institutions_f: number; individual_f: number; mutual_fund_f: number;
  securities_companies_f: number; foundation_f: number; other_f: number; total_f: number;
  numbers_of_shareholders: number;
  change_in_shareholders: number;
}

export interface ShareholdersCompositionResponse {
  symbol: string;
  year: number;
  data: ShareholdersCompositionRow[];
}

export interface CompanyRow {
  symbol: string;
  company_name: string;
}

export interface CompaniesResponse {
  results: CompanyRow[];
  pagination: { total_count: number; showing: number; has_next: boolean; next_offset: number | null };
}

export interface TopChangesResponse {
  top_gainers: Record<string, { name: string; symbol: string; price_change: number; last_close_price: number }[]>;
  top_losers?: Record<string, { name: string; symbol: string; price_change: number; last_close_price: number }[]>;
}

export interface UniverseCloseRow {
  symbol: string;
  date: string;
  close: number;
}

export interface UniverseFlowRow {
  symbol: string;
  date: string;
  net_foreign_inflow: number;
  foreign_buy_idr: number;
  foreign_sell_idr: number;
}

export interface UniverseResponse<T> {
  results: T[];
  pagination: { total_count: number; has_next: boolean; next_offset: number | null };
}

export interface NewsRow {
  title: string;
  body?: string;
  source?: string;
  timestamp: string;
  symbol?: string;
  sector?: string;
  sub_sector?: string;
  tags?: string[];
}

// ---- Subsector report & taxonomy (GET /v2/subsector/report/{slug}/) ----
// Sections are billed per-requested-section; callers pass only what they need.

export interface SubsectorTaxonomyRow {
  sector: string;
  subsector: string;
}

export interface SubsectorStatistics {
  total_companies: number;
  filtered_median_pe: number | null;
  filtered_weighted_avg_pe: number | null;
  min_company_pe: number | null;
  max_company_pe: number | null;
}

export interface SubsectorMarketCap {
  total_market_cap: number | null;
  avg_market_cap: number | null;
  quarterly_market_cap?: {
    prev_ttm_mcap?: Record<string, number>;
    current_ttm_mcap?: Record<string, number>;
    current_ttm_mcap_pavg?: Record<string, number>;
  };
  mcap_summary?: {
    mcap_change?: { "1w"?: number; "1y"?: number; ytd?: number };
    monthly_performance?: Record<string, number>;
    performance_quantile?: number;
  };
}

export interface SubsectorStability {
  weighted_max_drawdown: number | null;
  weighted_rsd_close: number | null;
}

export interface SubsectorChangeCompany {
  name: string;
  pe: number | null;
  "1mth": number | null;
  "1yr": number | null;
  last_close: number | null;
}

export interface SubsectorCompanies {
  top_companies?: Record<string, Record<string, { name: string } & Record<string, unknown>>>;
  top_change_companies?: Record<string, SubsectorChangeCompany>;
}

// valuation: yearly pb/pe/ps/pcf; the latest year also carries cross-subsector ranks.
export interface SubsectorValuation {
  historical_valuation?: Record<string, {
    pb: number | null;
    pe: number | null;
    ps: number | null;
    pcf: number | null;
    pb_rank?: number | null;
    pe_rank?: number | null;
    ps_rank?: number | null;
    pcf_rank?: number | null;
  }>;
}

export interface SubsectorGrowth {
  weighted_avg_growth_data?: Record<string, {
    avg_annual_earning_growth: number | null;
    avg_annual_revenue_growth: number | null;
  }>;
  growth_forecasts?: Record<string, {
    base_year: number | null;
    eps_growth: number | null;
    revenue_growth: number | null;
  }>;
}

export interface SubsectorReport {
  sector: string;
  sub_sector: string;
  statistics?: SubsectorStatistics;
  market_cap?: SubsectorMarketCap;
  stability?: SubsectorStability;
  companies?: SubsectorCompanies;
  valuation?: SubsectorValuation;
  growth?: SubsectorGrowth;
}

// ---- Company report (GET /v2/company/report/{symbol}/) ----
// Sections are billed per-requested-section; callers pass only what they need.

export interface CompanyReportOverview {
  listing_board?: string | null;
  industry?: string | null;
  sub_industry?: string | null;
  sector?: string | null;
  sub_sector?: string | null;
  market_cap?: number | null;
  market_cap_rank?: number | null;
  listing_date?: string | null;
  last_close_price?: number | null;
  latest_close_date?: string | null;
}

export interface OwnershipShareholder {
  name: string;
  symbol?: string; // present when the holder is itself a listed issuer
  share_amount?: number;
  share_percentage?: string; // fraction as string, e.g. "0.54942"
  share_value?: number;
}

export interface OwnershipTopTxn {
  date?: string;
  top_buyers?: { name: string; changeAmount: number }[];
  top_sellers?: { name: string; changeAmount: number }[];
}

export interface OwnershipBlock {
  major_shareholders?: OwnershipShareholder[];
  top_transactions?: OwnershipTopTxn;
  institutional_transaction_flow?: { date: string; net_transaction: number }[];
  whale_investors?: string[];
  conglomerates_group?: string[];
}

export interface CompanyReport {
  symbol: string;
  company_name?: string;
  overview?: CompanyReportOverview;
  ownership?: OwnershipBlock;
}

// ---- Market boards (idx-total, index-daily, brokers, free-float) ----

export interface IdxTotalRow {
  date: string;
  idx_total_market_cap: number;
}

export interface IndexDailyRow {
  index_code: string;
  date: string;
  price: number;
}

export interface BrokerRegistryRow {
  code: string;
  name: string;
  is_foreign: boolean;
  cohort: string; // retail | institutional | mixed
  license_type?: string;
}

export interface FreeFloatRow {
  symbol: string;
  company_name: string;
  free_float: number | null; // fraction
}

// ---- Extended IDX feeds (suspensions, corporate actions, broker boards, LK) ----

export interface Page<T> {
  results: T[];
  pagination?: { total_count?: number; showing?: number; has_next?: boolean; next_offset?: number };
}

export interface SuspensionRow {
  symbol: string;
  suspension_date?: string;
  reason?: string;
  pdf_url?: string;
}

// /v2/corporate-actions/?type=X → { start, end, [type]: event[] }. Event fields
// vary per action type (dividend vs right_issue vs agm) — keep them raw.
export type CorporateActionsCalendar = {
  start?: string;
  end?: string;
} & Record<string, unknown>;

export interface BrokersTopResponse {
  date: string;
  metric: string;
  origin: string;
  cohort: string;
  foreign: boolean;
  results: {
    rank: number;
    broker_code: string;
    gross?: number;
    net?: number;
    foreign_gross?: number;
    foreign_net?: number;
  }[];
}

// /v2/most-traded/ → { "YYYY-MM-DD": [{symbol, company_name, volume, price}, …] }
export type MostTradedResponse = Record<
  string,
  { symbol: string; company_name?: string; volume?: number; price?: number }[]
>;

export interface BrokerSummaryTopResponse {
  symbol: string;
  start: string;
  end: string;
  origin?: string;
  cohort?: string;
  top_buyers?: { rank: number; broker_code: string; net_idr?: number; buy_idr?: number; sell_idr?: number }[];
  top_sellers?: { rank: number; broker_code: string; net_idr?: number; buy_idr?: number; sell_idr?: number }[];
}

export interface QuarterlyDateRow {
  symbol: string;
  date: string;
  quarter?: string;
}

// /v2/company/corporate-actions/{symbol}/ → full history keyed by action type.
export interface CompanyCorporateActions {
  symbol: string;
  corporate_actions: Record<string, unknown[]>;
}

export interface SegmentsResponse {
  symbol: string;
  financial_year?: number;
  revenue_breakdown?: { value: number; source: string; target: string }[];
}

// ---- Typed helpers ----

export const api = {
  filings: (p: { start?: string; end?: string; limit?: number; offset?: number; symbol?: string; transaction_type?: TxnTypeStr; holder_type?: string }) =>
    sectorsGet<FilingsResponse>("/v2/filings/", p as Record<string, string | number>),
  foreignFlowSymbol: (symbol: string) =>
    sectorsGet<ForeignFlowSymbolResponse>(`/v2/foreign-flow/${encodeURIComponent(symbol)}/`),
  daily: (symbol: string, p: { start?: string; end?: string } = {}) =>
    sectorsGet<DailyRow[]>(`/v2/daily/${encodeURIComponent(symbol)}/`, p as Record<string, string | number>),
  indexDailyAll: () => sectorsGet<IndexDailyRow[]>("/v2/index-daily/"),
  indexDailyRange: (code: string, p: { start?: string; end?: string } = {}) =>
    sectorsGet<{ index_code: string; date: string; price: number }[]>(`/v2/index-daily/${encodeURIComponent(code)}/`, p as Record<string, string | number>),
  brokerSummary: (symbol: string) => sectorsGet<BrokerSummaryResponse>(`/v2/broker-summary/${encodeURIComponent(symbol)}/`),
  shareholdersComposition: (symbol: string) =>
    sectorsGet<ShareholdersCompositionResponse>(`/v2/company/shareholders-composition/${encodeURIComponent(symbol)}/`),
  companies: (p: { limit?: number; offset?: number; where?: string; order_by?: string }) =>
    sectorsGet<CompaniesResponse>("/v2/companies/", p as Record<string, string | number>),
  topChanges: () => sectorsGet<TopChangesResponse>("/v2/companies/top-changes/"),
  news: (p?: { symbol?: string; limit?: number }) => sectorsGet<{ results: NewsRow[] } | NewsRow[]>("/v2/news/", p as Record<string, string | number> | undefined),
  indexDaily: (code: string) => sectorsGet<DailyRow[] | { results: DailyRow[] }>(`/v2/index-daily/${encodeURIComponent(code)}/`),
  closeUniverse: (p: { date?: string; limit?: number; offset?: number }) =>
    sectorsGet<UniverseResponse<UniverseCloseRow>>("/v2/close/", p as Record<string, string | number>),
  flowUniverse: (p: { date?: string; limit?: number; offset?: number }) =>
    sectorsGet<UniverseResponse<UniverseFlowRow>>("/v2/foreign-flow/", p as Record<string, string | number>),
  subsectors: () => sectorsGet<SubsectorTaxonomyRow[]>("/v2/subsectors/"),
  // 1 credit per requested section. Available: statistics, market_cap,
  // stability, valuation, growth, companies.
  subsectorReport: (subSector: string, sections?: string[]) =>
    sectorsGet<SubsectorReport>(
      `/v2/subsector/report/${encodeURIComponent(subSector)}/`,
      sections?.length ? { sections: sections.join(",") } : undefined,
    ),
  // 1 credit per requested section. Available: overview, ownership, management,
  // financials, valuation, dividend, and more (see Sectors docs).
  companyReport: (symbol: string, sections?: string[]) =>
    sectorsGet<CompanyReport>(
      `/v2/company/report/${encodeURIComponent(symbol)}/`,
      sections?.length ? { sections: sections.join(",") } : undefined,
    ),
  idxTotal: () => sectorsGet<IdxTotalRow[]>("/v2/idx-total/"),
  brokers: () => sectorsGet<BrokerRegistryRow[]>("/v2/brokers/"),
  // Requires exactly one taxonomy filter; iterate sub_sector slugs for full IDX.
  freeFloat: (subSector: string) =>
    sectorsGet<FreeFloatRow[]>("/v2/free-float/", { sub_sector: subSector }),
  suspensions: (p?: { limit?: number; offset?: number }) =>
    sectorsGet<Page<SuspensionRow>>("/v2/suspensions/", p as Record<string, string | number> | undefined),
  // 1 credit per requested action type. Types: dividend, upcoming_dividend,
  // bonus, right_issue, stock_split, warrant, agm.
  corporateActionsCalendar: (type: string) =>
    sectorsGet<CorporateActionsCalendar>("/v2/corporate-actions/", { type }),
  brokersTop: (p?: { date?: string; metric?: string; origin?: string; cohort?: string }) =>
    sectorsGet<BrokersTopResponse>("/v2/brokers/top/", p as Record<string, string | number> | undefined),
  mostTraded: () => sectorsGet<MostTradedResponse>("/v2/most-traded/"),
  brokerSummaryTop: (symbol: string, p?: { cohort?: "retail" | "institutional" }) =>
    sectorsGet<BrokerSummaryTopResponse>(
      `/v2/broker-summary/${encodeURIComponent(symbol)}/top/`,
      p as Record<string, string> | undefined,
    ),
  quarterlyFinancialDates: (p?: { limit?: number; offset?: number; since?: string }) =>
    sectorsGet<Page<QuarterlyDateRow>>("/v2/companies/quarterly-financial-dates/", p as Record<string, string | number> | undefined),
  quarterlyFinancials: (symbol: string) =>
    sectorsGet<Record<string, unknown>[]>(`/v2/financials/quarterly/${encodeURIComponent(symbol)}/`),
  companyCorporateActions: (symbol: string) =>
    sectorsGet<CompanyCorporateActions>(`/v2/company/corporate-actions/${encodeURIComponent(symbol)}/`),
  // Returns { symbol: { financial_year: [2022, …] } } — a plain dict, not a page.
  companiesWithSegments: () =>
    sectorsGet<Record<string, { financial_year?: number[] }>>("/v2/companies/list_companies_with_segments/"),
  segments: (symbol: string, p?: { financial_year?: number }) =>
    sectorsGet<SegmentsResponse>(`/v2/company/get-segments/${encodeURIComponent(symbol)}/`, p as Record<string, string | number> | undefined),
};

// Pull every page of a full-universe daily feed (~25-32 credits/day).
export async function universeAll<T>(
  fn: (p: { date?: string; limit: number; offset: number }) => Promise<UniverseResponse<T>>,
  date?: string,
): Promise<{ rows: T[]; calls: number }> {
  const rows: T[] = [];
  let offset = 0;
  let calls = 0;
  while (true) {
    const res = await fn({ date, limit: 30, offset });
    calls++;
    rows.push(...res.results);
    if (!res.pagination?.has_next || res.results.length === 0) break;
    offset = res.pagination.next_offset ?? offset + res.results.length;
  }
  return { rows, calls };
}

type TxnTypeStr = "buy" | "sell" | "others";
