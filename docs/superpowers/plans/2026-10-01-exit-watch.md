---
goal: RADAR-X v3 — "Exit Watch". Daily monitor: who's leaving a stock
  (institutional / foreign / insider exits) vs who's absorbing (retail),
  plus suspension & corporate-action context. Built on radar-x's existing
  snapshot → derive → App Router pipeline.
references:
  - specs/PRODUCT_SPEC_V3.md
  - specs/TECH_SPEC_V3.md
  - specs/BROWNFIELD_SPEC.md
  - specs/DESIGN_SPEC_V3.md
  - specs/TECH_SPEC.md (v2 baseline)
context: >-
  Post-merge plan (reconciled 2026-10-02, re-planned 2026-10-05). A parallel
  session landed the feed layer + sector-rotation pages; this plan is rewritten
  against what is actually on disk. Feed files are envelope-style
  ({schemaVersion,asOf,rows|types|sessions|data}) written directly by
  scripts/ingest.ts — NOT loaded by snapshot.ts. A rolling lite-board loop
  keeps refreshing ownership/boards through 2026-10-11.
tdd: true
---

# RADAR-X v3 "Exit Watch" — Implementation Plan (re-planned 2026-10-05)

## Delta from the original 12-task plan

| Was | Now | Why |
|---|---|---|
| Task 01 types + 7 API helpers | Rescoped: helpers exist upstream; add `cohort` param to `brokerSummaryTop` + `feeds.ts` readers | Parallel session landed `sectors.ts` helpers |
| Task 02 JsonStore + snapshot loader | Rescoped: envelope-aware `src/lib/feeds.ts` readers | New feeds bypass JsonStore/snapshot contract |
| Task 03 six ingest commands | Superseded: all landed upstream. `cohorttop` kept as optional precision pass in Task 10 | `3ab4737` ingested 9 feeds |
| Task 04 wire `instBrokers` | Kept — `derive.ts:54` + services still pass `new Set()` | Now reads `broker_registry.json` via feeds |
| Tasks 05–10 engine/UI | Kept, adapted to real field names (snake_case rows, nested `types`, keyed `data`) | Shapes verified on disk |
| Task 11 docs / Task 12 verify | Renumbered 09 / 10 | — |

## Architecture (unchanged)

```
SECTORS API ──(landed upstream)──> data/*.json feeds
                                        │
   src/lib/feeds.ts  (envelope readers, typed, provenance-aware)
                                        │
   derive.ts  ──> SymbolData {instBrokers, retailBrokers}  (TASK-02)
   exitwatch.ts ──> data/derived-v2/exitwatch.json          (TASK-03/04)
                                        │
   services.ts ──> board / dossier / broker queries         (TASK-05)
                                        │
   App Router: / (Exit Watch board) · /saham/[t] · /broker  (TASK-06..08)
```

## Global constraints (unchanged)

1. **No unverifiable claims.** "Likely exit," "appears to be absorbed."
   Banned: "smart money," "bandar," unqualified "accumulation/distribution."
   Allowed: "exit liquidity" (microstructure term).
2. **Coverage honesty.** Score emitted only if coverage ≥ 0.5; missing
   components must be visually explicit, never silently zero.
3. **Bug reuse.** `extractNetForeign` ≤90d-before-latest bug must NOT be
   copied into the new engine.
4. **JSON writes = `\n`** (`.gitattributes` locks LF).
5. **API pool:** `.env.local` `SECTORS_API_KEYS` = 11 live keys
   (`sectorsGet` rotates on 401/403). `cohorttop` precision pass only if
   budget allows (~60 calls).
6. **tests/ excluded from tsconfig** — tests run via `tsx`, not `tsc`.
7. **No scope creep:** no auth, no new deps, no DB migration.

## Key decisions (locked)

- **Cohort split = derive-time registry labeling.** `broker_top.json`
  (266 issuers) + `broker_rows.json` (40 symbols × ≤14d) broker_code →
  `broker_registry.cohort`. Zero extra calls. Honest limitation documented:
  it labels captured top-N rows, it is not a true per-cohort top-N.
- **Optional precision pass:** `brokerSummaryTop(symbol, cohort)` for top ~30
  flagged symbols → `cohort_top.json` (Task 10, budget-gated).
- **Existing names kept:** `broker_top.json` (per-emiten) /
  `brokers_top.json` (leaderboard) stay; no rename churn.
- **V2 preserved** at `?v=radar`; default board becomes Exit Watch.

## On-disk shapes (verified 2026-10-02 — bind to these, do not guess)

```ts
// data/broker_registry.json
{ rows: [{ code, name, is_foreign, cohort: "retail"|"institutional", license_type }] } // 88

// data/free_float.json
{ rows: [{ symbol, companyName, freeFloat, subSector }] } // 961

// data/suspensions.json
{ rows: [{ symbol, suspension_date, reason, pdf_url }] } // 604, full history

// data/corporate_actions.json — NESTED by type
{ types: { dividend: {start,end,dividend:[{symbol,date?,...}]}, upcoming_dividend:{…},
           bonus:{…}, right_issue:{…}, stock_split:{…}, warrant:{…}, agm:{…} } }

// data/broker_top.json — keyed per emiten, all-cohort
{ data: { "BBCA.JK": { start, end,
    topBuyers:  [{ rank, broker_code, net_idr, buy_idr, sell_idr, foreign_net_idr }],
    topSellers: [{ rank, broker_code, net_idr, buy_idr, sell_idr, foreign_net_idr }] } } }

// data/brokers_top.json — accreting sessions (currently cohort:"all")
{ sessions: [{ date, metric, origin, cohort, foreign, results:[{rank,broker_code,gross,net,foreign_gross,foreign_net}] }] }

// data/ownership.json — rolling layer
{ asOf, refreshed: {<sym>: <iso>}, rows/holders… }  // see feeds task

// data/taxonomy.json — {issuers:{<sym>:{sector,subSector,industry,subIndustry}}}
```

## Tasks

### TASK-01 — Contract types + `feeds.ts` readers + `cohort` param

- Add `cohort?: "retail"|"institutional"` to `api.brokerSummaryTop`
  (accept + forward `qs`; `brokersTop` already takes `cohort`).
- New `src/lib/feeds.ts`: `readFeed<T>(file, shape)` envelope-aware reader
  with `sha256` + `asOf` extraction; exports `loadRegistry()`,
  `loadFreeFloat()`, `loadSuspensions()`, `loadCorpActions()` (flattens
  nested `types` → rows), `loadBrokerTop()` (per-symbol map),
  `loadBrokersTop()` (sessions), `loadOwnership()`, `loadTaxonomy()`.
- Types in `types.ts`: `RegistryRow`, `FreeFloatRow`, `SuspensionRow`,
  `CorpActionRow`, `BrokerTopEntry`, `BrokersTopSession`, `CohortTop`,
  `ExitWatchRow`, `ExitComponent`, `ExitFlags`.
- Verify: `npx tsx tests/feeds.test.ts` (new — fixture envelopes).

### TASK-02 — Wire broker cohorts into `SymbolData` (fix dead `instNetZ`)

- `derive.ts:54` + `services.ts` `new Set()` → sets built from
  `loadRegistry()` (`cohort==="institutional"` → instBrokers,
  `cohort==="retail"` → retailBrokers).
- Add `retailBrokers: Set<string>` to `SymbolData`; `flow.ts`
  `computeBrokerFlow` uses it.
- Re-derive: `instNetZ`/`retailExodusZ` must become live values.
- Verify: `tests/broker-cohort.test.ts` + existing suite green.

### TASK-03 — `src/lib/exitwatch.ts` pure engine

- Input: `SymbolData` + feeds (registry, broker_top, suspensions,
  corp-actions, free_float). Window 14d (broker/foreign), 90d (insider).
- Components (all robust-z cross-section via `standardize`):
  - `instExit` 0.30 — institutional broker_net < 0 from `broker_top`
    + `broker_rows` (registry-labeled).
  - `foreignExit` 0.25 — foreign `net_idr` < 0 (`flowDaily` + broker
    `foreign_net_idr`).
  - `insiderExit` 0.25 — net insider sell value 90d (`insiderTrades`
    enriched by `ownership.json` holder context).
  - `retailAbsorb` 0.20 — retail `broker_net` > 0 (registry-labeled).
- `flags`: `suspension_recent` (≤14d from suspensions.json),
  `corp_action_near` (±7d from flattened corp-actions),
  `float_constraint` (freeFloat < 20%), `sparse_broker` (top-N < 5).
- `coverage = weightedMean(component presence)`; emit `score` only ≥ 0.5.
- Output row: `{ symbol, score?, tier?, components[], flags[], coverage,
  window:{days,from,to}, asOf }`.
- Verify: `tests/exitwatch.test.ts` — bounds, coverage gate, absent≠zero,
  registry labeling correctness.

### TASK-04 — Derive artifact `exitwatch.json`

- `derive.ts`: `deriveExitWatch(snap)` →
  `{schemaVersion:1, engineVersion:"radarx-v3", asOf, rows}` +
  `writeDerived("exitwatch", art)` + load in `loadDerived()` (optional read
  so v2 artifacts still boot).
- Verify: hash-validated round-trip test + `npm run derive` produces file.

### TASK-05 — Services layer

- `getExitWatchBoard({scope,limit})` — sorted rows + provenance.
- `getIssuerDossier(t)` extension: `exitWatch` row, `exitWindow` (14d cohort
  net series from broker_rows), `insiderExits` list, `suspensions`,
  `corpActions`, `freeFloat` (all via feeds).
- `getBrokerBoard({date?,cohort?,origin?})` + `getBrokerProfile(code)` from
  `brokers_top.json` sessions + registry.
- Verify: `tests/services-v3.test.ts`.

### TASK-06 — PK1 design foundation

- `globals.css`: Palette A light/dark tokens + status + cohort colors
  (EC2) + old-var aliases; `layout.tsx`: IBM Plex Sans/Mono via
  `next/font/local`, NAV-A top nav (replaces sidebar), TH1 theme bootstrap
  + `ThemeToggle`.
- Verify: build green, both themes complete, no flash.

### TASK-07 — Homepage Exit Watch board (DASH-A)

- `/` default = Exit Watch ranked research board: `ExitPressureBadge`
  (new 0–100 scale, never reuse v2 ScoreMarker), component strip
  (EC2 cohort colors), `FlagChips`, coverage indicator, source rail,
  asOf footer.
- `?v=radar` renders the existing v2 board untouched.
- Verify: `tests/e2e/board-v3.test.ts` + visual check.

### TASK-08 — Dossier "Exit Door" section (DOS-B order)

- `CohortNetChart` signature visual — CHART-B + EC2: two aligned panels,
  shared zero baseline, cohort colors (inst blue / retail ochre), `View
  observations` table, "classified" copy.
- Insider exit list (90d), suspension history, corp-actions strip,
  free-float, coverage panel.
- Verify: e2e on 3 issuers (suspended / insider exits / sparse).

### TASK-09 — `/broker` board + `/broker/[code]`

- Board: latest `brokers_top` session, `All|Retail|Institutional` tabs
  (honest empty states where cohort sessions don't exist yet).
- Profile: registry card + session history + topSymbols (broker_top
  inversion). Nav link lands in TASK-06 top nav.
- Verify: e2e both routes.

### TASK-10 — Methodology + claims + copy

- `/metodologi` v3 section (formula, cohort-labeling caveat, coverage
  rule, interpretation limits); `docs/CLAIMS.md` v3 register;
  `layout.tsx` metadata → DE1 "IDX Market Intelligence" / T1 tagline;
  banned-term sweep.

### TASK-11 — `cohorttop` precision pass + gates + verify

- **Approved spend (~60 calls)**: implement command; **run it right after
  TASK-05 lands** (exitwatch.json → top-30 flagged), then re-derive so UI
  tasks already see precision data. `exitwatch.ts` prefers `cohort_top`
  overlay where present.
- `npm test` + `npm run build` + e2e; `docs/EVIDENCE_V3.md`.

## Task tracker

`docs/superpowers/plans/2026-10-01-exit-watch/` → `TODO.md` + `tasks/TASK-01.md`
… `tasks/TASK-11.md` (self-contained for fresh worker sessions).

## Review focus

- Engine: absent-data vs zero, coverage math, robust-z degenerate cases
  (MAD=0 → z=0 for all).
- Provenance: every board row traceable to `data/*.json` + derived hash.
- Regression: v2 board at `?v=radar` must render identically.
- Compliance: Sectors-only data; no external sources; no intent claims.

## Repo-state addenda

- Post-`827d086`: terminology register locked; `.gitattributes` LF;
  `tests/` outside tsc.
- Post-`3ab4737` (merge 2026-10-02): feed shapes table above is binding;
  `feeds.ts` reader layer; API pool verified (11 live, key-4 primary);
  `scripts/store-secret.ps1` git-ignored.
- Re-plan 2026-10-05: parallel session added `ownership.ts`,
  `rotation.ts`, `taxonomy.ts` libs + `/rotasi` pages + rolling ownership
  loop (to 2026-10-11) + `docs/design/RADARX_DESIGN_OPTIONS.md` (pending
  owner decision — see open questions in TODO.md).
