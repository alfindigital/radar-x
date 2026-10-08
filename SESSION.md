# RADAR-X session checkpoint

Date: 2026-10-08
Status: live on production; portal draft remains unsubmitted.

## Verified state

- Release: `main` at `a0a2c2b`; Vercel production deployment `dpl_C2Dx7ohC6sn94uSvWiEs3sHgdTnL` READY.
- Live app: [radarx.web.id](https://radarx.web.id) (beta alias: [radar-x-beta.vercel.app](https://radar-x-beta.vercel.app/)).
- Snapshot as-of: **2026-10-08**; derived engines `radarx-v2` + `radarx-v3` (exit watch).
- Derived artifacts: 964 score rows (957 non-null), 233 candidate cases, outcomes 289 complete / 189 pending / 221 unavailable; Exit Watch 850 publishable (189 high / 126 elevated / 348 watch / 187 low). Market data refreshed through 2026-10-08: OHLCV 962/962, foreign flow 826 symbols, broker rows 588 symbols (remainder pending upstream publish / key quota); score engine falls back to taxonomy market cap for close-only symbols and to the latest reported holder month — see docs/AUDIT-DATA-2026-10-08.md.
- 2026-10-08 deep catch-up + probe-verified residuals: broker_rows → Oct 7 (308K rows, 863 syms), flows → 60d+ depth for 811 syms, OHLCV for all 962 syms, index_daily → 18 indices Jul→Oct, insider filings backfilled to Jul 2024 (3.865 rows, 496 emiten), holders +year-2025 (19.975 rows), news ingest added. ingest.ts: flows/prices/broker --universe + stalest/depth-first ordering; holders --year; index --all; news cmd. feeds.ts: loaders for idx_total/top_changes/news; getMarketContext exposes them. daily-ingest.ps1 schedules all daily stages + Saturday block.
- Runtime is provider-free and read-only; derived artifacts are hash-verified before serving.
- Exit Watch window convention: inclusive calendar dates — `14-day = asOf-13 .. asOf` (2026-09-25 → 2026-10-08).
- English UI, mobile navigation, status-aware outcomes, source links, methodology, claims, release checklist, CI, and Playwright checks are in `main`.

## Verification

Run `npm ci`, then `npm test`, `npm run audit:data`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:e2e`. The exact evidence and limitations are recorded in [docs/verification/release-evidence.md](docs/verification/release-evidence.md), [docs/AUDIT-2026-10-06.md](docs/AUDIT-2026-10-06.md), and [docs/living/CURRENT_STATE.md](docs/living/CURRENT_STATE.md).

## Remaining user-controlled work

Repository publication and deployment are complete. Judging video (≤3 min), 1-minute teaser, social post, and final portal submission remain user-controlled. Record video against the 2026-10-08 numbers — earlier footage shows stale figures. The user must review the current revision and click **Submit final** only after every external URL and rule is verified. Deadline: 8 October 2026, 23:59 WIB.
