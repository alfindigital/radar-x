# TASK-02 — Wire broker cohorts into `SymbolData` (fix mislabeled `instNetZ`)

**Status:** ✅ · **Depends on:** TASK-01 (needs `loadRegistry()`) · **Gate:** G2
**Plan:** `../2026-10-01-exit-watch.md` · **Spec:** `specs/TECH_SPEC_V3.md`

## Goal

`broker_registry.json` is on disk but unused. `SymbolData.instBrokers` is
`new Set()` in two places, which silently degrades `instNetZ` to a
**foreign-flow proxy** (score.ts:118-122 sums `foreignBuyVal - foreignSellVal`
on all broker rows instead of institutional net). Wire the real registry so
the existing v2 component measures actual institutional broker net, and add
`retailBrokers` for the v3 engine.

## Current behavior (verified)

`score.ts` `instNetZ` fallback: `d.instBrokers.size ? netVal on inst rows
: (foreignBuyVal - foreignSellVal) on all rows`. So the component returns a
value but it is *not* institutional positioning — it is foreign flow under an
institutional label. `retailExodusZ` uses `holders.changeInShareholders` and
is unaffected by broker sets.

## Files

- **Edit** `src/lib/score.ts` — `SymbolData` gains `retailBrokers: Set<string>`
- **Edit** `src/lib/derive.ts` `buildSymbolData` (line ~54)
- **Edit** `src/lib/services.ts` `loadSymbol` (line ~77)
- **Edit** `src/lib/types.ts` — no change needed (Set<string> stays in score.ts)
- **Create** `tests/broker-cohort.test.ts`

## Steps

1. `score.ts`:
   ```ts
   export interface SymbolData {
     symbol: string;
     insider: InsiderTrade[];
     flow: FlowDaily[];
     price: PriceDaily[];
     broker: BrokerSummaryRow[];
     holders: HoldersMonthly[];
     instBrokers: Set<string>;
     retailBrokers: Set<string>; // NEW — cohort "retail"
   }
   ```
   `instNetZ` logic itself is already correct once `instBrokers` is populated
   (it prefers `netVal` on institutional rows when the set is non-empty).
   Do not change the component math in this task.
2. Cohort sets are **snapshot-level** (same for every symbol). Build once:
   - `derive.ts`: `buildDerived` currently maps `buildSymbolData(snapshot, sym, asOf)` per symbol. Load registry first:
     ```ts
     const reg = await loadRegistry(); // Feed<RegistryRow[]> | null
     const inst = new Set(reg?.data.filter(r => r.cohort === "institutional").map(r => r.code) ?? []);
     const retail = new Set(reg?.data.filter(r => r.cohort === "retail").map(r => r.code) ?? []);
     ```
     then pass both into `buildSymbolData` (extend signature).
     **Note:** `buildDerived` is currently sync — it becomes `async`, OR do the
     registry read in the caller (`npm run derive` script / wherever
     `buildDerived` is invoked) and pass sets in. Check `scripts/` for the
     derive entry point (`derive.ts` CLI? `ingest.ts`?) and pick the least
     invasive option: prefer making `buildDerived` accept an optional
     `{ instBrokers, retailBrokers }` second arg so tests stay sync.
   - `services.ts` `loadSymbol`: same — read registry via `loadRegistry()`,
     pass sets into `SymbolData`.
   - Registry missing → both sets empty → **existing fallback preserved**
     (foreign proxy) and note it in coverage; do not throw.
3. `tests/broker-cohort.test.ts`: fixture registry {`YP`→institutional,
   `CP`→retail}; broker rows where `YP.netVal` and foreign proxy differ;
   assert `instNetZ` raw equals institutional sum when set populated, and
   equals foreign proxy when empty.
4. Re-derive: `npm run derive` (check the actual script name in
   `package.json`) → inspect `scores.json`: `instNetZ.status` should be
   `"available"` with `observations > 0` for symbols that have broker rows,
   and `raw` should differ from the old foreign-proxy values.

## Test command

```bash
npx tsx tests/broker-cohort.test.ts && npm test && npm run derive
```

## Done when

- [ ] `instNetZ` reflects `netVal` over registry-institutional brokers.
- [ ] `retailBrokers` set populated and available to downstream (TASK-03).
- [ ] Registry absent → graceful fallback preserved (no crash).
- [ ] Full suite green; `scores.json` re-derived and hash-valid.

## Pitfalls

- `cohort` values in registry may include more than retail/institutional
  (inspect actual values; treat anything else as neither set).
- Broker codes: registry `code` field must match `broker_rows.brokerCode` and
  `broker_top.json` `broker_code` — verify casing/format (e.g. `YP` vs `YP.JK`
  — normalize if needed, one place, in `loadRegistry()`).
- Keep sets out of `Snapshot` — `Snapshot` mirrors files; cohorts are a
  derived reference.
