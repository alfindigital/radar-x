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

function key(): string {
  const k = process.env.SECTORS_API_KEY;
  if (!k) throw new Error("SECTORS_API_KEY not set");
  return k;
}

export async function sectorsGet<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  let attempt = 0;
  let res: Response;
   
  while (true) {
    res = await fetch(url.toString(), {
      headers: { Authorization: key() },
      cache: "no-store",
    });
    if (res.status !== 429) break;
    attempt++;
    if (attempt > 5) break;
    const wait = Math.min(30000, 1500 * 2 ** attempt) + Math.random() * 500;
    await new Promise((r) => setTimeout(r, wait));
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new SectorsError(res.status, path, body.slice(0, 300));
  }
  return (await res.json()) as T;
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

// ---- Typed helpers ----

export const api = {
  filings: (p: { start?: string; end?: string; limit?: number; offset?: number; symbol?: string; transaction_type?: TxnTypeStr; holder_type?: string }) =>
    sectorsGet<FilingsResponse>("/v2/filings/", p as Record<string, string | number>),
  foreignFlowSymbol: (symbol: string) =>
    sectorsGet<ForeignFlowSymbolResponse>(`/v2/foreign-flow/${encodeURIComponent(symbol)}/`),
  daily: (symbol: string, p: { start?: string; end?: string } = {}) =>
    sectorsGet<DailyRow[]>(`/v2/daily/${encodeURIComponent(symbol)}/`, p as Record<string, string | number>),
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
};

type TxnTypeStr = "buy" | "sell" | "others";
