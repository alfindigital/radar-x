# TECH_SPEC V3 — RADAR-X "Exit Watch"

Delta over radar-x v2 (`specs/TECH_SPEC.md`). Stack unchanged: Next.js 16
(App Router, `force-dynamic`), React 19, Tailwind v4, tsx, JSON store +
`data/derived-v2` sha256-verified artifacts.

## ⚠️ Landed-state reconciliation (2026-10-02, post-merge)

A parallel session landed the feed layer before this spec was executed. The
plan binds to **their** on-disk shapes — do not re-ingest:

| Landed file | Shape | Plan equivalent | Delta |
|---|---|---|---|
| `broker_registry.json` | `{rows:[{code,name,is_foreign,cohort,license_type}]}` — 88 brokers | same | none |
| `free_float.json` | `{rows:[{symbol,companyName,freeFloat,subSector}]}` — 961 issuers | same | none |
| `suspensions.json` | `{rows:[{symbol,suspension_date,reason,pdf_url}]}` — 604 rows | same | snake_case fields |
| `corporate_actions.json` | `{types:{<type>:{start,end,<type>:[…]}}}` nested | same | nested per-type, not flat rows |
| `broker_top.json` | `{data:{<symbol>:{start,end,topBuyers[],topSellers[]}}}` — 266 issuers, **all-cohort** + `foreign_*` fields | ≈ `cohort_top.json` | **no cohort split** |
| `brokers_top.json` | `{sessions:[{date,metric,cohort:"all",results[]}]}` accreting | ≈ daily ranking | cohort field exists per-session — cohort variants accrete in place |

**Cohort strategy (decided):** registry-label existing rows — join
`broker_top.json`/`broker_rows.json` `broker_code` → `broker_registry.cohort`
at derive time (0 calls, 266-issuer coverage). Optional precision pass:
`api.brokerSummaryTop(symbol, cohort)` for top ~30 flagged issuers (~60 calls,
Task 12 only if budget allows) landing as `cohort_top.json`.

**Naming:** keep their file names (rename = churn for cosmetic gain). New
cohort-split feed uses `cohort_top.json` — distinct from both.

**Loader gap:** new feeds are envelope-style files written by ingest directly;
`loadSnapshot` does not read them. Add `src/lib/feeds.ts` (envelope-aware
readers) rather than bending `snapshot.ts`'s bare-array contract.

**.env.local:** primary key was dead (401); repointed to live vault key
`sectors-api-key-4`. Pool `SECTORS_API_KEYS` = 11 live keys.

## New Sectors endpoints (all verified 200 on 2026-10-01)

| Endpoint | Params | Cost | Stores to |
|---|---|---|---|
| `GET /v2/brokers/` | `cohort?`, `origin?` | 1 | `data/broker_registry.json` |
| `GET /v2/broker-summary/{symbol}/top/` | `cohort` = retail\|institutional, `origin?`, `start?`, `end?` | 1 | `data/cohort_top.json` |
| `GET /v2/brokers/top/` | `metric=net`, `cohort`, `n_brokers`, `date?` | 2 | `data/broker_top_daily.json` |
| `GET /v2/suspensions/` | `symbol?`, pagination | 1/page | `data/suspensions.json` |
| `GET /v2/corporate-actions/` | `start?`, `end?`, `type` csv | 1/type | `data/corporate_actions.json` |
| `GET /v2/free-float/` | `sector?`\|`sub_sector?`\|`industry?`, `sub_industry?` | 1/call | `data/free_float.json` |

Notes: `broker-summary/*/top/` window ≈ last 90d EOD (start/end echoed in
payload). `corporate-actions` window clamps to 90d ending at `end`, `end` may
be future. `suspensions` rows carry `symbol`, `suspension_date`, `reason`,
`pdf_url`. `free-float` requires one taxonomy filter per call — iterate
`/v2/subsectors/` list.

## New raw types (`src/lib/types.ts`)

```ts
export type BrokerCohort = "retail" | "mixed" | "institutional" | "unknown";

export interface BrokerRegistryRow {
  code: string;              // "CC"
  name: string;
  isForeign: boolean;        // from is_foreign
  cohort: BrokerCohort | null;
  licenseType: string | null;
}

export interface CohortTopRow {
  symbol: string;
  cohort: "retail" | "institutional";
  side: "buyer" | "seller";
  rank: number;
  brokerCode: string;
  netIdr: number;            // signed, + = net buy
  grossIdr: number | null;
  asOf: string;              // response `end` date
}

export interface SuspensionRow {
  symbol: string;
  suspensionDate: string;
  reason: string;
  pdfUrl: string | null;
}

export interface CorpActionRow {
  symbol: string;
  type: "agm" | "bonus" | "dividend" | "right_issue" | "stock_split" | "upcoming_dividend" | "warrant";
  keyDate: string;           // ex_date / date / trading_period_start / agm_date
  raw: Record<string, unknown>;
}

export interface FreeFloatRow { symbol: string; freeFloat: number; }

export interface BrokerTopRow {
  date: string;              // ranking date
  cohort: "retail" | "institutional";
  metric: "net";
  rank: number;
  brokerCode: string;
  gross: number | null;
  net: number;
}
```

## New derived artifact — `data/derived-v2/exitwatch.json`

Computed in `buildDerived` alongside scores/cases; manifest gains the file.

```ts
export interface ExitWatchRow {
  symbol: string;
  asOf: string;
  score: number | null;      // 0..100; null when no usable signal
  coverageWeight: number;    // Σ weights of available components
  components: Record<"instExit" | "foreignExit" | "insiderExit" | "retailAbsorb", ComponentV2>;
  flags: ExitFlag[];
  exitNetIdr14d: number | null;   // Σ institutional net_sell − context
  retailNetIdr14d: number | null; // Σ retail net_buy
}

export type ExitFlag =
  | "suspended-before"     // symbol appears in suspensions.json
  | "thin-float"           // freeFloat < 0.15
  | "action-in-7d"         // corporate action keyDate within 7d of asOf
  | "price-streak";        // ≥3 consecutive sessions |chg| ≥ 10%
```

### Formula (methodVersion `"radarx-v3"`)

Window: trailing 14 stored trading days ending at `asOf` (90d for insider).

| Component | Weight | Raw signal | Normalization |
|---|---|---|---|
| `instExit` | 0.30 | Σ net sell IDR of institutional-cohort brokers (cohort-tagged `broker_rows` ∪ `cohort_top` sellers) | robust z vs cross-section, ÷ symbol median traded value |
| `foreignExit` | 0.25 | −(Σ net foreign inflow 14d) / latest marketCap | robust z |
| `insiderExit` | 0.25 | Σ sell-side insider trade value, 90d | robust z |
| `retailAbsorb` | 0.20 | Σ retail-cohort brokers net buy (retail absorbs supply) | robust z |

`score = clip(50 + Σ(w·z)·SCALE, 0, 100)` — SCALE = 100/(2·3) with z clipped
±3 (v2 convention). Missing component → `status:"missing"`, weight dropped,
`coverageWeight` exposes shortfall. Score shown only when coverage ≥ 0.5.

### Why these weights

Exit pressure comes from *who leaves* (institutions + foreign + insiders);
`retailAbsorb` earns weight because retail net-buying *during* that exit is the
literal "exit liquidity" condition. `instExit` leads because broker-cohort data
is the freshest, most granular exit signal Sectors v2 exposes.

## Store additions (`src/lib/db.ts`)

New `data/*.json` files with keyed upserts (same pattern):
`broker_registry` (key `code`), `suspensions` (`symbol|date`),
`corporate_actions` (`symbol|type|keyDate`), `free_float` (`symbol`),
`cohort_top` (`symbol|cohort|side|brokerCode|asOf`), `broker_top`
(`date|cohort|brokerCode`). `DataStore` gains matching upsert/list methods;
`Snapshot` gains the new arrays + `brokers` registry; `snapshot.ts`
`DATA_FILES` extended; `indexes` gains `suspBySymbol`, `cohortBySymbol`.

## Ingest additions (`scripts/ingest.ts`)

| Command | Behavior | Est. calls |
|---|---|---|
| `registry` | `api.brokers()` → registry | 1 |
| `suspensions` | paginate `api.suspensions()` | ~3–6 |
| `corpactions` | `api.corporateActions({type: all7})` on ±30d window | 7 |
| `freefloat` | loop `api.freeFloat({sub_sector})` over `/v2/subsectors/` | ~60 |
| `cohorttop` | per watchlist symbol ×2 cohorts → `api.brokerSummaryTop` | 2×N |
| `brokertop` | `api.brokersTop({metric:"net",cohort})` ×2 for latest day | 4/day |

`watchlist()` for `cohorttop` = insider-active ∪ top-|net-flow| last 14d ∪
top-changes symbols, capped by `--limit` (default 80 → 160 calls ≈ manageable).

`npm run backfill` gains `registry && suspensions && corpactions` steps;
`cohorttop`/`freefloat`/`brokertop` are explicit commands (credit budget).

## Services (`src/lib/services.ts`)

```ts
getExitWatchBoard(): { asOf: string; rows: ExitWatchRow[]; counts: {flagged:number; scored:number} }
getIssuerDossier(symbol): IssuerDossier & {   // extended, not broken
  exitWatch: ExitWatchRow | null;
  cohort: { instNet14d: number|null; retailNet14d: number|null; days: {date:string; instNet:number|null; retailNet:number|null}[] };
  suspensions: SuspensionRow[];
  actions: CorpActionRow[];
  freeFloat: number | null;
}
getBrokerBoard(): { asOf: string|null; inst: BrokerTopRow[]; retail: BrokerTopRow[]; flaggedCounts: Record<string,number> }
getBrokerProfile(code): { broker: BrokerRegistryRow|null; top: BrokerTopRow[]; presence: {symbol:string; side:"buyer"|"seller"; netIdr:number}[] }
```

## UI deltas (reuse tokens: `--acc` green buy-side, `--dist` red sell-side)

- `src/app/page.tsx` → Exit Watch board (score col = `ExitWatchRow.score`,
  flag chips, `?v=radar` keeps old board).
- `src/components/TugOfWar.tsx` — per-day paired bars instNet vs retailNet.
- `src/components/FlagChips.tsx`, `src/app/broker/page.tsx`,
  `src/app/broker/[code]/page.tsx`.
- `metodologi` page: v3 formula, windows, weight table, honesty rules.

## Constraints

- Zero new runtime deps.
- All derived values deterministic; `inputHash` propagates into manifest.
- Missing/partial data renders honestly (`—` + `coverageWeight`), never
  silently zero.
- No call during request lifecycle; snapshot only (zero-friction judges).
- No secret values in repo; `.env.local` stays gitignored.
- Credit ceiling for one-time v3 build: ≤ ~500 calls total.
