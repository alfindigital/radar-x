# CURRENT_STATE — RADAR-X

> Update tiap akhir task. Terakhir: 2026-10-05 (v3 Exit Watch built + audited + hardened).

- **Version:** `radarx-v3` **Exit Watch — built, audited, verified.** v2 board
  preserved at `/?v=radar`.
- **Gates:** `npm test` 53/53 · `npm run test:e2e` 13 pass (7 mobile skips
  by design) · `typecheck` clean · `build` clean ·
  `compute --as-of 2026-10-01` → exitwatch.json 962 rows (247 publishable:
  61 high / 48 elevated / 79 watch / 59 low, 715 suppressed-not-zero).
- **Post-audit fixes (all verified):** dossier suspensions show newest
  (`slice(0,3)` on DESC-sorted feed); `window.from` is the 14-day bound on
  every row; empty `cohort_top` sides are missing evidence not zero;
  `sparse_broker` counts cohort-top observations; `loadSnapshot`/`loadDerived`
  are mtime-cached (`filecache.ts`); suppressed listing capped at 150 rows
  ("Showing first N of M"); `?f=` accepts `positive`/`negative` keys
  (`akumulasi`/`distribusi` still work).
- **Design:** PK1 "Research balanced" applied — Evidence Desk palette
  (light/dark + System toggle, no flash), IBM Plex Sans/Mono, NAV-A top nav.
- **Routes:** `/` = Exit Watch board · `/?v=radar` = v2 board · `/broker`,
  `/broker/[code]` new · dossier gains Exit Watch panel (tug-of-war chart,
  component coverage, suspension/CA context).
- **Engine:** `src/lib/exitwatch.ts` — instExit .30 / foreignExit .25 /
  insiderExit .25 / retailAbsorb .20, robust-z clipped ±3, coverage gate ≥0.5.
- **Cohort truth:** registry 88 brokers = inst 39 / mixed 42 / unknown 2 /
  retail 5. Mixed+unknown excluded from both sides — labeled subset, not census.
- **Precision overlay:** `cohort_top.json` — 31 symbols × retail+institutional
  top-N, 62 API calls spent, echo-verified before bulk. Engine prefers it over
  registry-labeled `broker_top`.
- **New plumbing:** `src/lib/feeds.ts` (registry/suspensions/corpActions/
  brokerTop/brokersTop/cohortTop), `derive.ts` ExitFeeds + `indexBySymbol`,
  `compute.ts` loads all feeds + hashes them into manifest `feedHashes`.
- **API keys:** pool `SECTORS_API_KEYS` = 11 live. `.env.local` live (key-4).
- **Docs:** `docs/EVIDENCE_V3.md` = feed inventory + spend + limitations.
- **Remaining:** video re-record (judging ≤3min, new money-shot: Exit Watch
  board → dossier tug-of-war → suppressed honest state), submission copy
  update, visual QA pass on mobile width.
