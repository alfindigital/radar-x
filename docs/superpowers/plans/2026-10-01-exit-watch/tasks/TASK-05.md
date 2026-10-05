# TASK-05 — Services layer v3

**Status:** ✅ · **Depends on:** TASK-04 · **Gate:** —
**Plan:** `../2026-10-01-exit-watch.md` · **Spec:** `specs/PRODUCT_SPEC_V3.md` §pages

## Goal

All page-facing queries for Exit Watch live in `services.ts`. Pages must not
read feeds or derived files directly.

## File

- **Edit** `src/lib/services.ts`
- **Create** `tests/services-v3.test.ts`

## New exports

```ts
export interface ExitWatchBoard {
  asOf: string;
  generatedAt: string;
  coverageFloor: number;
  rows: ExitWatchRow[];          // score!=null first, sorted desc; then coverage<floor rows
  suppressed: number;            // count of coverage<0.5 rows
  universe: number;
  feedMeta: Record<string, FeedMeta>;
}
export async function getExitWatchBoard(opts?: { scope?: "all" | "flagged" | "suppressed"; limit?: number }): Promise<ExitWatchBoard>
```

- `scope:"flagged"` = score!=null AND any flag true; `"suppressed"` = score
  null only; `"all"` = everything.
- Rows include ticker name via `snapshot.tickers` join (add `name?` to a
  light view type — do not mutate `ExitWatchRow`).

```ts
// getIssuerDossier extension — new fields on IssuerDossier:
exitWatch: ExitWatchRow | null;
cohortWindow: { from: string; to: string; days: { date: string; instNet: number | null; retailNet: number | null; foreignNet: number | null }[] };
insiderExits: InsiderTrade[];             // sell-side 90d, desc by date
suspensions: SuspensionRow[];             // symbol rows, desc
corpActions: CorpActionRow[];             // symbol rows, ±90d around asOf
freeFloat: number | null;
brokerTop: BrokerTopSymbol | null;
```

- `cohortWindow`: per-day `broker_rows` split by registry cohort
  (`d.instBrokers`/`d.retailBrokers`) + `flow.netForeignInflow`. 14d.
- IssuerDossier already has `ownership`+`freeFloat` from the parallel
  session — check for existing fields before adding duplicates.

```ts
export interface BrokerBoard {
  session: BrokersTopSession | null;     // latest, or requested date/cohort
  sessions: string[];                    // available dates desc
  registry: Map<string, RegistryRow>;
}
export async function getBrokerBoard(opts?: { date?: string; cohort?: "all"|"retail"|"institutional" }): Promise<BrokerBoard>
export interface BrokerProfile {
  broker: RegistryRow | null;
  sessions: { date: string; rank: number; net?: number; gross?: number }[];
  topSymbols: { symbol: string; side: "buyer"|"seller"; net_idr?: number }[]; // from broker_top.json inversion
}
export async function getBrokerProfile(code: string): Promise<BrokerProfile | null>
```

- Cohort sessions that don't exist yet → `session: null` + sessions list;
  page renders honest empty state (TASK-08 copy).
- `topSymbols`: invert `broker_top.json` — for each symbol, if broker_code
  appears in topBuyers/topSellers, emit `{symbol, side, net_idr}`.

## Tests

- `getExitWatchBoard` sorts correctly, counts suppressed, joins names.
- Dossier extension fields populate for a fixture symbol; absent feeds →
  nulls not throws.
- `getBrokerBoard` picks latest session; `cohort:"retail"` with no such
  session → `session:null`.
- `getBrokerProfile("YP")` inverts broker_top correctly.

## Test command

```bash
npx tsx tests/services-v3.test.ts && npm test
```

## Done when

- [ ] All exports typed, no `any`.
- [ ] Feeds load once per request (parallel `Promise.all` like existing code).
- [ ] Registry missing → every consumer degrades gracefully.

## Pitfalls

- `services.ts` already imports `loadSnapshot`/`loadDerived` — add feed
  loaders the same way; keep file structure (interfaces top, functions after).
- `IssuerDossier` may already carry `ownership`/`freeFloat`/`holders` —
  read the current interface (services.ts:35-77) before editing; extend, don't
  duplicate.
- Keep return types serializable (no `Map`/`Set` in page props — convert to
  plain objects/arrays; `BrokerBoard.registry` is the exception: convert to
  `Record<string,RegistryRow>` for RSC serialization).
