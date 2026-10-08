# CURRENT_STATE — RADAR-X

> Update tiap akhir task. Terakhir: 2026-10-08 malam (snapshot 10-08; OHLCV penuh 962/962, flow 826 syms, broker 826 syms — sisa ~136 emiten upstream-bound: 56 permanent-404 + feed mentok Sep-25/kosong. index_daily/top_changes/sector_rotation masih 10-07/10-06 upstream).

- **Version:** `radarx-v3` **Exit Watch — built, audited, remediated.** v2 board
  preserved at `/?v=radar`.
- **Gates:** `npm test` 56/56 · `typecheck` clean · `lint` 0 errors ·
  `audit:data` exit 0 · `build` clean (Next 16.3.8) ·
  `compute --as-of 2026-10-08` → exitwatch.json 964 rows
  (844 publishable: 189 high / 122 elevated / 351 watch / 182 low, 120
  suppressed-not-zero; cases 224; outcomes 224/169/279).
- **Audit 2026-10-06 (`docs/AUDIT-2026-10-06.md`, 32 findings):** semua P1 +
  P2 kritis diremediasi di `f659a5e`; sisanya (window convention, rotation
  coverage, scheduler contract, docs) ditutup di sesi ini.
- **Window convention (inclusive-count):** "N-day window" = N tanggal kalender
  berakhir di as-of. 14d → `asOf−13`; 90d insider → `asOf−89`. Konsisten di
  `exitwatch.ts`, `services.ts` (windowStats + flow radar), `score.ts`.
- **Rotation coverage:** `flowObserved`/`flowExpected` di `RotationSubsector`;
  UI rotasi menampilkan cakupan "N/M issuers" — bukan lagi implisit nol.
- **Daily ingest contract (lokal-only):** task `RadarX-DailyIngest` (18:00,
  EndBoundary 2026-10-11) → `boards --lite` → `universe --days 2` →
  `filings --months 1` → `broker --universe --limit 200` → `extras` →
  `cohorttop --limit 15` → `ownership --limit 150` →
  `flows --universe --limit 100` → `prices --universe --limit 100` →
  `compute --as-of today` → `audit:data`. Saturday adds tickers/rotation/
  brokertop/index --all/holders --universe --limit 300.
  `SECTORS_CALL_BUDGET=600` per stage; script self-expires lewat 10-11.
  Publish = manual commit + push; task ini tidak pernah deploy.
- **Coverage expansion (2026-10-05):** universe-wide broker backfill
  (`ingest --universe --only-missing`, 647 calls / 703 symbols, 404s = honest
  no-data) → `broker_rows` 238,604 rows; daily tug-of-war series **863/962**.
  `brokers_top` now split per cohort (all/institutional/retail sessions) →
  `/broker?cohort=` tabs. Board header shows IHSG context (`index_daily`).
- **Post-audit fixes (all verified):** dossier suspensions show newest
  (`slice(0,3)` on DESC-sorted feed); `window.from` is the 14-day bound on
  every row; empty `cohort_top` sides are missing evidence not zero;
  `sparse_broker` counts cohort-top observations; `loadSnapshot`/`loadDerived`
  are mtime-cached (`filecache.ts`); suppressed listing capped at 150 rows
  ("Showing first N of M"); `?f=` accepts `positive`/`negative` keys
  (`akumulasi`/`distribusi` still work).
- **Design (2026-10-05):** "Dark market terminal" redesign — see `DESIGN.md`.
  Phosphor-on-near-black dark default + paper light, IBM Plex Sans/Mono,
  sharp corners, terminal tabs, signal gauges, row tint stripes ≥75,
  `PrimaryNav` active states. Dials: ENERGY 2 / RHYTHM 2 / MOTION 1.
  Antislop pointer lives in `AGENTS.md`. QA: `scripts/qa-redesign.mjs` →
  `docs/verification/redesign-terminal/`.
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
- **API keys:** vault `sectors-api-key-1..16`; key 1–13 spent kumulatif
  (`SUBSCRIPTION_DOES_NOT_ALLOW`), key 14/15/16 live (~±700 kredit sisa
  setelah top-up sweep malam ini). Pool `.env.local` = 14 entries.
- **Docs:** `docs/EVIDENCE_V3.md` = feed inventory + spend + limitations.
- **Mobile QA (2026-10-05):** 360px sweep via `scripts/qa-mobile.mjs` across 14
  routes → fixed clipped theme toggle + wrapped logo (search moved to a
  full-width row under MobileNav on <md), duplicate React key on broker
  profiles (cohort now shown per appearance), 2 stale lint errors. Evidence:
  `docs/verification/mobile-qa-360/`. Prod v3 smoke-verified 200 on all routes.
- **Remaining:** video re-record (judging ≤3min, new money-shot: Exit Watch
  board → dossier tug-of-war → suppressed honest state), custom domain
  `radarx.web.id` wiring (Vercel DNS), final portal submit.
