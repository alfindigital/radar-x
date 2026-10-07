# KNOWN_ISSUES — RADAR-X (open only)

| # | Issue | Sejak | Owner task |
|---|---|---|---|
| 1 | ~~`instNetZ` salah-sinyal foreign-proxy~~ → **RESOLVED 2026-10-05**: registry cohorts wired; v3 engine uses labeled broker netVal | v2 | TASK-02 done |
| 2 | ~~Feed envelope tidak terbaca~~ → **RESOLVED**: `feeds.ts` readers + `ExitFeeds` in derive | merge | TASK-01 done |
| 3 | ~~Cohort split absent~~ → **RESOLVED**: registry labeling baseline + `cohort_top.json` (31 sym × 2 cohorts, 62 calls) | merge | TASK-11 done |
| 4 | Judging video v2 menampilkan framing positioning — akan basi setelah v3 | 2026-10-01 | user-side re-record (approved) |
| 5 | `DATA_SOURCE=supabase` stub → fallback JsonStore dengan warning | v2 | non-goal v3 |
| 6 | Dead keys: `sectors-api-key-1/-2` 401 (pool .env.local bersih — 11 live, primary repointed ke key-4 2026-10-02) | — | — |
| 7 | `scripts/store-secret.ps1` adalah helper vault lokal — sengaja di-ignore dari repo publik (`.gitignore`) | 2026-10-02 | — |
| 8 | ~~`brokers_top.json` hanya cohort "all"~~ → **RESOLVED 2026-10-05**: leaderboard di-ingest per kohort (`cohort` param); `/broker?cohort=` institutional=39 / retail=5 | v3 | done |
| 9 | ~~259/962 daily series~~ → **RESOLVED 2026-10-05**: universe-wide broker backfill (`broker_rows` 92.7k→145.9k, 647 calls) → **863/962** simbol punya series | v3 | done |
| 10 | ~~Deployment: belum ada live URL~~ → **RESOLVED 2026-10-05**: `outputFileTracingIncludes` di `next.config.ts` membawa `data/*.json` (~85MB) ke tiap function bundle; v3 live di https://radar-x-beta.vercel.app/ — smoke `/`, `/broker?cohort=institutional`, `/saham/ADRO`, `/?v=radar`, `/?scope=suppressed`, `/metodologi` semua 200 | v3 | done |
| 11 | COAL.JK cross-feed anomaly: daily institutional net ~650% cap, CP Sep18 avg-sell 77.3549 vs close 31 / volume 0 — belum diverifikasi semantics sumber; quarantine dari klaim | 2026-10-06 | pending source check |
| 12 | `braces` 3.0.3 advisory (5 high, dev-only chain via eslint-plugin-next) — belum ada versi patch; fix resmi butuh downgrade eslint-config-next 14 → ditunda | 2026-10-06 | monitor |
| 13 | CSP header belum dipasang (bootstrap inline scripts butuh nonce); X-Frame-Options/nosniff/Referrer-Policy sudah di next.config | 2026-10-06 | follow-up |
| 14 | ~~`sharp` 0.35.4 (CVE-2026-96889, runtime via next image-opt) + `source-map-js` 1.2.1~~ → **RESOLVED 2026-10-07**: `npm audit fix` → sharp 0.35.5, source-map-js 1.2.2; audit kini 5 high (braces dev-only saja) | v3 | done |
| 15 | ~~`data/cases.json`+`positioning_scores.json` (v2 lineage) dimuat tiap request tapi tak pernah dirender~~ → **RESOLVED 2026-10-07**: files dihapus; `Snapshot`/`DataStore` dibersihkan; schema.sql + stub supabase dibuang | v3 | done |
