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
| 10 | Deployment: belum ada live URL — app membaca `data/*.json` via `fs` (45MB), butuh host Node penuh (VPS/Railway/Render) atau `outputFileTracingIncludes` untuk Vercel serverless | 2026-10-05 | optional — demo lokal `npm run build && npm start` |
