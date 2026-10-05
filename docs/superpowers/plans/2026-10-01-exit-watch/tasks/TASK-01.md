# TASK-01 — Contract types + `feeds.ts` readers + `cohort` param

**Status:** ✅ · **Depends on:** none · **Gate:** G1
**Plan:** `../2026-10-01-exit-watch.md` · **Spec:** `specs/TECH_SPEC_V3.md` §reconciliation

## Goal

Typed, provenance-aware access to the 9 envelope-style feeds that landed
upstream — without bending `loadSnapshot` (which reads bare JSON arrays).
Plus the missing `cohort` param on `api.brokerSummaryTop` for the optional
precision pass.

## Files

- **Create** `src/lib/feeds.ts`
- **Edit** `src/lib/types.ts` (append v3 types)
- **Edit** `src/lib/sectors.ts` (one-line param addition)
- **Create** `tests/feeds.test.ts`

## On-disk feed shapes (verified — bind to these)

```ts
// data/broker_registry.json  (88 rows)
{ schemaVersion, asOf, rows: [{ code, name, is_foreign, cohort: "retail"|"institutional", license_type }] }

// data/free_float.json  (961 rows)
{ schemaVersion, asOf, rows: [{ symbol, companyName, freeFloat, subSector }] }

// data/suspensions.json  (604 rows, full history)
{ schemaVersion, asOf, rows: [{ symbol, suspension_date, reason, pdf_url }] }

// data/corporate_actions.json  — NESTED per type
{ types: { dividend: { start, end, dividend: [rows] }, upcoming_dividend: {…},
           bonus: {…}, right_issue: {…}, stock_split: {…}, warrant: {…}, agm: {…} } }

// data/broker_top.json  — keyed per emiten, all-cohort, ~266 symbols
{ data: { "SYM.JK": { start, end,
    topBuyers:  [{ rank, broker_code, net_idr, buy_idr, sell_idr, foreign_net_idr }],
    topSellers: [{ rank, broker_code, net_idr, buy_idr, sell_idr, foreign_net_idr }] } } }

// data/brokers_top.json — accreting sessions
{ sessions: [{ date, metric, origin, cohort, foreign, results: [{ rank, broker_code, gross, net, foreign_gross, foreign_net }] }] }

// data/ownership.json — rolling layer; verify row shape before typing
// data/taxonomy.json — { issuers: { <sym>: { sector, subSector, industry, subIndustry } } }
// data/most_traded.json — inspect before use
```

## Steps

1. **Types** — append to `src/lib/types.ts`:
   ```ts
   export type BrokerCohort = "retail" | "institutional" | "unknown";
   export interface RegistryRow { code: string; name: string; is_foreign: boolean; cohort: BrokerCohort; license_type?: string }
   export interface FreeFloatRow { symbol: string; companyName?: string; freeFloat: number | null; subSector?: string }
   export interface SuspensionRow { symbol: string; suspension_date: string; reason?: string; pdf_url?: string }
   export interface CorpActionRow { symbol: string; type: string; date: string | null; raw: Record<string, unknown> }
   export interface BrokerTopEntry { rank: number; broker_code: string; net_idr?: number; buy_idr?: number; sell_idr?: number; foreign_net_idr?: number }
   export interface BrokerTopSymbol { start: string; end: string; topBuyers: BrokerTopEntry[]; topSellers: BrokerTopEntry[] }
   export interface BrokersTopSession { date: string; metric?: string; origin?: string; cohort?: string; foreign?: boolean; results: { rank: number; broker_code: string; gross?: number; net?: number; foreign_gross?: number; foreign_net?: number }[] }
   export interface FeedMeta { path: string; sha256: string; asOf: string | null; generatedAt: string | null; rows: number }
   export interface Feed<T> { meta: FeedMeta; data: T }
   ```
2. **`feeds.ts`** — core reader + loaders:
   ```ts
   const DATA_DIR = path.join(process.cwd(), "data");
   async function readFeed<T>(file: string, pick: (env: any) => T, countRows: (t: T) => number): Promise<Feed<T> | null>
   ```
   - `readFile` + `JSON.parse`; `sha256` the bytes; `asOf`/`generatedAt` from envelope.
   - Return `null` when the file is missing (feeds are optional — repo must boot on clone). Callers decide hard vs soft requirements.
   - Export: `loadRegistry()` → `Feed<RegistryRow[]>`, `loadFreeFloat()` → `Feed<Map<string, FreeFloatRow>>` (keyed by symbol), `loadSuspensions()` → `Feed<SuspensionRow[]>` (sorted desc by date), `loadCorpActions()` → `Feed<CorpActionRow[]>` (**flatten nested `types`**: iterate `env.types`, for each type block take the array whose key === the type name, tag each row `{type, symbol, date}`, skip `start`/`end` scalars), `loadBrokerTop()` → `Feed<Map<string, BrokerTopSymbol>>`, `loadBrokersTop()` → `Feed<BrokersTopSession[]>`, `loadTaxonomy()` → `Feed<Map<string, {sector,subSector,industry,subIndustry}>>`, `loadOwnership()` → inspect `data/ownership.json` rows shape first, then type it.
   - No caching across calls (pages are `force-dynamic`); keep functions pure-async.
3. **`sectors.ts`** — extend helper:
   ```ts
   brokerSummaryTop: (symbol: string, p?: { cohort?: "retail" | "institutional" }) =>
     sectorsGet<BrokerSummaryTopResponse>(
       `/v2/broker-summary/${encodeURIComponent(symbol)}/top/`,
       p as Record<string, string> | undefined),
   ```
   `sectorsGet(path, params?)` already accepts a param record — verify the qs forwarding works (existing `brokersTop` passes `p` the same way).
4. **`tests/feeds.test.ts`** — fixtures in `tests/fixtures/feeds/` (tiny envelope files mirroring each shape): parse rows, sha256 length 64, `asOf` propagated, nested `corporate_actions` flatten yields `CorpActionRow[]` with `type` tags, missing file → `null` not throw.

## Test command

```bash
npx tsx tests/feeds.test.ts && npm test
```

## Done when

- [ ] All 9 loaders return typed `Feed<T>` from real `data/*.json` (quick `tsx -e` sanity print counts).
- [ ] `brokerSummaryTop` accepts and forwards `cohort`.
- [ ] New tests pass; existing 37 still green.

## Pitfalls

- Do NOT add these files to `snapshot.ts` `DATA_FILES` — that loader requires bare arrays and feeds are envelopes.
- `corporate_actions.json` dates may live under different keys per type (`date`, `ex_date`, `recording_date`, `cum_date`) — inspect actual rows, map to `date` where present, else `null`.
- Keep `readFile(path.join(/*turbopackIgnore: true*/ DATA_DIR, file))` comment pattern so Turbopack doesn't try to bundle the fs path.
