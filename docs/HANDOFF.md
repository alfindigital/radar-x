# RADAR-X handoff

## Actual status

This checkout contains the merged Sectors Hackathon 2026 Track 3 release candidate, now running the **v3 "Exit Watch" engine** (`radarx-v3`; v2 board preserved at `/?v=radar`). Production is live at **[radarx.web.id](https://radarx.web.id)** (custom domain via Cloudflare DNS → Vercel, www 308→apex, verified 200 on 2026-10-05); beta alias [radar-x-beta.vercel.app](https://radar-x-beta.vercel.app/). `outputFileTracingIncludes` ships `data/*.json` (~85MB) into each function bundle; all v3 routes smoke-verified 200 on 2026-10-05. The portal screenshot is still a draft; **Submit final** has not been clicked.

The app serves a hash-verified Sectors snapshot through **2026-10-01**: `exitwatch.json` = 962 rows → 247 publishable readings (66 high / 44 elevated / 79 watch / 58 low), 715 suppressed-not-zero. Date windows are inclusive-count: a 14-day window ends at as-of and starts at as-of − 13 (2026-09-18 → 2026-10-01); the 90-day insider window starts at as-of − 89 (2026-07-04). Snapshot coverage: prices + foreign flow 2026-06-22 → 10-01, filings through 10-02, broker rows through 10-01, monthly holders through 2026-09-30 EOM. See [CLAIMS.md](CLAIMS.md) for traceable statements.

### Key pool (added 2026-10-02)

`SECTORS_API_KEYS` (comma-separated) merges with `SECTORS_API_KEY` into a rotating pool in `sectorsGet` — 401/403 marks a key dead for the process, 429 marks it spent until backoff. Thirteen keys are stored in the local DPAPI vault (`sectors-api-key-1..13`); keys 1–2 exhausted on 2026-10-01 (~1.0k + ~400 calls, `SUBSCRIPTION_DOES_NOT_ALLOW` — a cumulative quota wall, not a daily reset). `.env.local` carries the 11 live keys. Sequential per-request use only — never parallel across keys.

### Sector rotation board (added 2026-10-01)

- New route `/rotasi` (+ `/rotasi/[sub]` drill-down) reads `data/sector_rotation.json`, a saved artifact covering all 33 IDX subsectors: market-cap change (1w/1y/YTD + monthly series), median/weighted PE, weighted max drawdown and RSD, top 1-month movers, member issuers, and net foreign flow aggregated from the saved flow session.
- Refresh with `npm run ingest -- rotation` (≈69 credits for the default `market_cap,statistics,stability,companies` section set + member mapping). Member lists are reused across refreshes; pass `--refresh-members` to rebuild them. Sections are selectable via `--sections a,b,c` — each requested section bills once per subsector.
- Issuer taxonomy map (added 2026-10-01): `data/taxonomy.json` covers all 962 issuers — sector/subsector/industry/sub-industry labels + slugs, listing board, market cap, listing date — built from `company/report/{symbol}?sections=overview` (~962 credits, one-time; incremental on re-run, `--full` to force). Member tables on `/rotasi/[sub]` join it to show each issuer's industry.

### Market boards snapshot (added 2026-10-01)

`npm run ingest -- boards` (~56 calls) writes five artifacts: `data/broker_registry.json` (88 brokers: code/name/is_foreign/cohort/licenses), `data/idx_total.json` (daily IDX aggregate mcap, ~1mo), `data/index_daily.json` (17 indices; kept to 2026-09-01+; KLSE has no history feed), `data/free_float.json` (961 issuers; BIMA has no float row), and `data/top_changes.json` — a dated gainers/losers snapshot accreted per session (endpoint is current-only, no date param; first capture 2026-09-30). `boards --lite` is the daily mode (3 calls: top-changes + idx-total merge + latest index closes). Free-float monthly-ish; brokers static.

### Rolling ownership ingest (added 2026-10-01)

`npm run ingest -- ownership [--full]` pulls `company/report?sections=ownership` for the N least-recently-fetched symbols → `data/ownership.json` (holders/whales/conglomerate groups/inst flow/top txn, all flat rows keyed by symbol; checkpoint-written every 50 symbols so a killed run keeps landed data). 1 credit per symbol per refresh. **Full-universe coverage completed 2026-10-02: 962/962 issuers** — 4.6k named holders, 6.5k institutional-flow months, 828 whale tags, 306 conglomerate links. A Windows scheduled task `RadarX-DailyIngest` (daily 18:00, EndBoundary 2026-10-11 ≈ submission+3) runs `boards --lite` + `filings --months 1` + `ownership --limit 100` + `compute --as-of today` + `audit:data`, logging to `logs/daily-*.log`. It refreshes **local** data only — publishing stays a manual commit+push. `SECTORS_CALL_BUDGET=170` caps billed calls per run, and the script self-expires after 2026-10-11 even if the task boundary drifts. Delete after the freeze: `schtasks /delete /tn RadarX-DailyIngest /f`.

`holders`/`broker` ingest accept `--universe` to widen from the insider-active watchlist (~266 symbols) to the full taxonomy; both batch-write every N symbols (per-call rewrites race Windows file locks). `shareholders-composition` full-universe completed 2026-10-02 — `holders_monthly.json` covers all 962 issuers through the **2026-09-30 EOM** row (KSEI September data published early Oct). Broker rows cover the 266-symbol watchlist through 2026-10-01 (one `broker-summary` call returns ~10 recent days, which closed the 19–30 Sep gap in a single pass).
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
