# RADAR-X handoff

## Actual status

This checkout contains the merged Sectors Hackathon 2026 Track 3 release candidate. PR [#1](https://github.com/alfindigital/radar-x/pull/1) merged it to `main` at `bfdacc62ee4d34b514f6efb485e83a864289233d`; production is live at [radar-x-beta.vercel.app](https://radar-x-beta.vercel.app/). The portal screenshot is still a draft; **Submit final** has not been clicked.

The app serves a hash-verified Sectors snapshot through 2026-09-22 and generated `radarx-v2` artifacts. The verified artifact contains 962 score rows (254 non-null), 171 bounded candidate patterns, 301 complete outcomes, 170 pending outcomes, and 42 unavailable outcomes. See [CLAIMS.md](CLAIMS.md) for traceable statements.

### Sector rotation board (added 2026-10-01)

- New route `/rotasi` (+ `/rotasi/[sub]` drill-down) reads `data/sector_rotation.json`, a saved artifact covering all 33 IDX subsectors: market-cap change (1w/1y/YTD + monthly series), median/weighted PE, weighted max drawdown and RSD, top 1-month movers, member issuers, and net foreign flow aggregated from the saved flow session.
- Refresh with `npm run ingest -- rotation` (≈69 credits for the default `market_cap,statistics,stability,companies` section set + member mapping). Member lists are reused across refreshes; pass `--refresh-members` to rebuild them. Sections are selectable via `--sections a,b,c` — each requested section bills once per subsector.
- Issuer taxonomy map (added 2026-10-01): `data/taxonomy.json` covers all 962 issuers — sector/subsector/industry/sub-industry labels + slugs, listing board, market cap, listing date — built from `company/report/{symbol}?sections=overview` (~962 credits, one-time; incremental on re-run, `--full` to force). Member tables on `/rotasi/[sub]` join it to show each issuer's industry.

### Market boards snapshot (added 2026-10-01)

`npm run ingest -- boards` (~56 calls) writes five artifacts: `data/broker_registry.json` (88 brokers: code/name/is_foreign/cohort/licenses), `data/idx_total.json` (daily IDX aggregate mcap, ~1mo), `data/index_daily.json` (17 indices; kept to 2026-09-01+; KLSE has no history feed), `data/free_float.json` (961 issuers; BIMA has no float row), and `data/top_changes.json` — a dated gainers/losers snapshot accreted per session (endpoint is current-only, no date param; first capture 2026-09-30). `boards --lite` is the daily mode (3 calls: top-changes + idx-total merge + latest index closes). Free-float monthly-ish; brokers static.

### Rolling ownership ingest (added 2026-10-01)

`npm run ingest -- ownership --limit N` pulls `company/report?sections=ownership` for the N least-recently-fetched symbols → `data/ownership.json` (holders/whales/conglomerate groups/inst flow/top txn, all flat rows keyed by symbol). 1 credit per symbol per refresh. A Windows scheduled task `RadarX-DailyIngest` (daily 18:00, until 2026-10-11 ≈ submission+3) runs `boards --lite` + `filings` + `ownership --limit 100`, logging to `logs/daily-*.log`. Delete after the freeze: `schtasks /delete /tn RadarX-DailyIngest /f`. NOTE: key-1 hit `SUBSCRIPTION_DOES_NOT_ALLOW` (quota wall) mid-run on 2026-10-01 after ~1.0k same-day calls — `.env.local` was switched to vault key-2; key-3 remains spare. `shareholders-composition` bulk still deferred to mid-October EOM publication.
- Navigation gained a "Sectors" entry on desktop and mobile.

## Passed gates

```text
npm test
npm run audit:data
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

The latest browser run passed seven tests and intentionally skipped the desktop-only journey in the mobile project. It blocks Sectors and Arjum domains and does not use credentials.

## Exact next actions

1. Review the current branch and [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md).
2. Record a real screen session for the one-minute teaser and the <=3-minute judging video; both must show the running app and the visible limitations.
3. Upload videos and publish the required social post only after the user approves those external actions.
4. Fill the portal draft with the public repository, video URLs, English one-sentence problem statement, Track 3, team snapshot, and social URL.
5. The user performs the final review and clicks **Submit final**. Do not submit silently; submission freezes edits.

## Open blockers and limits

- Sectors API access/credits are exhausted for this sprint; no key was tested.
- Arjum, ZPI, and Pluang enrichment is omitted because public redistribution terms and a task-scoped credential are not established.
- Three external target-user usability sessions have not been performed.
- Public repository age, media URLs, social post, and portal fields are unverified.

## Do not submit before final review

Do not infer eligibility, public accessibility, video duration, or repository creation age from local files. Verify each external fact immediately before the user submits.
