# RADAR-X v3 — Evidence & Verification Register

**Generated:** 2026-10-05 · **Derived as-of:** 2026-10-01 · **Engine:** `radarx-v3`

## Verified state

| Gate | Result |
|---|---|
| `npm test` | 53/53 pass |
| `npm run test:e2e` | 14 pass, 8 mobile skips by design |
| `npm run typecheck` (`next typegen` + `tsc --noEmit`) | clean |
| `npm run build` | clean, all routes render |
| `npm run compute -- --as-of 2026-10-01` | 962 rows → 247 publishable exit readings |

## Feed inventory (sha256 prefix · rows · as-of)

| File | Rows/symbols | As-of | sha256[:12] |
|---|---|---|---|
| broker_registry.json | 88 | 2026-10-01 | 2c97b793cb53 |
| free_float.json | 961 | 2026-10-01 | d546936f3ffe |
| suspensions.json | 604 | 2026-10-02 | 0d7d273697fd |
| corporate_actions.json | 199 events (7 types) | 2026-10-02 | 73f4a9c2e082 |
| broker_top.json | 266 | 2026-10-02 | 4ac52f9717e6 |
| brokers_top.json | 3 sessions (all/inst/ret) | 2026-10-01/02 | see manifest |
| cohort_top.json | 31 | 2026-10-05 | 6a1c8f1759bf |
| ownership.json | 13,562 rows | 2026-10-04 | 4adb76ffcb4f |
| taxonomy.json | 962 | 2026-10-01 | f858cf4b36a2 |
| broker_rows.json | 145,879 (703 symbols probed) | — | see manifest |
| insider_trades.json | 1,655 | — | 848910c05c13 |
| flow_daily.json | 24,261 | — | b70289f8c87c |
| price_daily.json | 25,336 | — | 04a7115b0e9e |
| holders_monthly.json | 8,619 | — | 5ac067aff4e8 |

## Cohort truth (honest coverage)

Registry cohort split: **institutional 39 · mixed 42 · unknown 2 · retail 5**.
Mixed/unknown brokers are excluded from both sides — the cohort view is a
labeled subset, not a census. Daily tug-of-war series exist for **863/962**
symbols after the universe-wide broker backfill (647 calls, 404s = honest
"no broker data"); the rest rely on `broker_top` top-N labeling or the
`cohort_top` precision overlay. `brokers_top` is now ingested per cohort
(`all`/`institutional`/`retail` sessions) powering `/broker?cohort=` tabs.

## API spend (this pass)

- `cohorttop` precision pass: 31 symbols × 2 calls = **62 calls** (1 verify + 30 bulk, `--only-missing`). Zero misses.
- `broker/top` cohort split: 3 calls (all + institutional + retail sessions).
- Universe-wide `broker_rows` backfill: **647 calls / 703 symbols** (`--universe --only-missing`; 404s logged as honest no-data).
- Live cohort echo verified on the first call (`retail`/`institutional` returned matching `cohort` fields) before the bulk run.

## Exit Watch distribution (as-of 2026-10-01)

247 publishable of 962 tracked: **61 high · 48 elevated · 79 watch · 59 low**,
715 suppressed for insufficient component coverage (never scored zero).
Post-audit fixes verified: `window.from` equals the 14-day bound on all 962
rows; empty `cohort_top` sides are missing evidence (not zero); `sparse_broker`
counts `cohort_top` observations; snapshot/derived loads are mtime-cached;
suppressed listing is capped at 150 rows with a truthful count.

## Known limitations

- `insiderExit` coverage is limited to reported insider filings (sparse for
  most issuers) — it lowers coverage rather than faking zero.
- Cohort overlay (`cohort_top.json`) covers the top ~30 flagged symbols;
  other symbols fall back to registry-labeled `broker_top` / `broker_rows`.
- Suspensions/corporate-action feeds reflect provider as-of dates above;
  local snapshot is authoritative, not the live API.

## Smoke-verified routes (dev server, this pass)

- `/` → Exit Watch board (badges, component strips, flags, suppressed section)
- `/?v=radar` → preserved v2 board
- `/?scope=suppressed` → low-coverage rows
- `/saham/ADRO` → Exit Watch panel (tug-of-war, components, context)
- `/broker` → leaderboard with cohort labels (89 broker links)
- `/broker/XL` → profile (Stockbit Sekuritas Digital, cohort retail)
- `/metodologi` → v3 method section
