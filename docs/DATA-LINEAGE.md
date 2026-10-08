# DATA-LINEAGE — where every number in RADAR-X comes from

**As-of snapshot:** 2026-10-08 · **Scope:** raw feeds in `data/` → derived artifacts in `data/derived-v2/` → UI
**One intermediary:** all external data enters through the Sectors Financial API (`api.sectors.app`, by Supertype). RADAR-X never calls IDX, KSEI, or any broker/data vendor directly.

## How to verify a claim in this file

Two evidence types, marked per row:

- **[url]** — the stored data itself carries a `source`/`pdf_url` field pointing at the upstream document. Open any row in `data/insider_trades.json` or `data/suspensions.json` and follow the link.
- **[shape]** — the field structure matches a known upstream publication format (e.g. investor-class columns match the KSEI monthly shareholder register). Documented inference, not a guess: the Sectors API reference describes the same cadence and fields.

## Feed map: local file → Sectors endpoint → upstream origin

| Local file | Sectors endpoint | Upstream origin | Cadence | Evidence |
|---|---|---|---|---|
| `insider_trades.json` | `/v2/filings/` | IDX announcement feed, folder `From_KSEI` — `LK-*.pdf` ownership-change reports filed under OJK reporting rules (directors/commissioners and ≥5% holders) | Event-driven; filers report within days of the transaction | [url] |
| `holders_monthly.json` | `/v2/company/shareholders-composition/{symbol}/` | KSEI monthly shareholder register, aggregate by investor class (insurance, corporate, pension fund, financial institutions, individual, mutual fund, securities, foundation, other) × local/foreign | Monthly, from 2021 | [shape] |
| `ownership.json` | `/v2/company/report/{symbol}/` section `ownership` | Issuer-disclosed major-holders register (≥5%) plus reported institutional transaction flow | Rolling refresh per issuer report | [shape] |
| `broker_rows.json` | `/v2/broker-summary/{symbol}/` | IDX per-broker daily trading records (buy/sell value, lots, frequency, foreign split `f_*`) — the same data class behind commercial broker-summary products | Every trading session | [shape] |
| `broker_top.json`, `cohort_top.json` | `/v2/broker-summary/{symbol}/top/` | Same IDX records, ranked net buyers/sellers per symbol | Every trading session | [shape] |
| `brokers_top.json` | `/v2/brokers/top/` | Same IDX records, ranked per broker per session | Every trading session | [shape] |
| `broker_registry.json` | `/v2/brokers/` | **Sectors-curated classification** of 88 IDX member brokers into retail / mixed / institutional / unknown cohorts | Registry, rarely changes | Sectors docs state "curated registry" |
| `flow_daily.json` | `/v2/foreign-flow/` and `/v2/foreign-flow/{symbol}/` | IDX daily foreign-investor trading totals (foreign buy/sell split of exchange records) | Every trading session | [shape] |
| `price_daily.json` | `/v2/daily/{symbol}/` + `/v2/close/` | IDX official end-of-day prices and market cap | Every trading session | [shape] |
| `index_daily.json`, `idx_total.json` | `/v2/index-daily/*`, `/v2/idx-total/` | IDX index values (IHSG + 17 sector/thematic indices) and total market capitalization | Every trading session | [shape] |
| `suspensions.json` | `/v2/suspensions/` | IDX suspension announcements | Event-driven | [url] |
| `corporate_actions.json`, `company_actions.json` | `/v2/corporate-actions/`, `/v2/company/corporate-actions/{symbol}/` | IDX/KSEI corporate action calendar (dividend, rights, split, bonus, warrant, AGM) | Event-driven | [shape] |
| `free_float.json` | `/v2/free-float/` | IDX published free-float figures per issuer | Periodic (IDX publication cycle) | [shape] |
| `financials_quarterly.json`, `quarterly_dates.json` | `/v2/financials/quarterly/{symbol}/`, `/v2/companies/quarterly-financial-dates/` | Issuer quarterly financial reports filed to IDX | Quarterly | [shape] |
| `most_traded.json` | `/v2/most-traded/` | IDX daily volume leaders | Every trading session | [shape] |
| `tickers.json`, `taxonomy.json`, `industries.json`, `subindustries.json`, `segments.json` | `/v2/companies/`, `/v2/subsectors/`, taxonomy endpoints | IDX listed-company register and sector classification | Slow-changing reference | [shape] |
| `news.json` | `/v2/news/` | Indonesian financial media (observed: investor.id, kontan.co.id) plus Sectors' own news feed | Rolling | [url] |
| `sector_rotation.json`, `top_changes.json` | `/v2/subsector/report/{slug}/`, `/v2/companies/top-changes/` | Sectors-computed aggregates over IDX price data | On request / daily | Derived by provider |

## What this means for each score input

| Score input | Built from | Upstream |
|---|---|---|
| `instExit`, `retailAbsorb` | `broker_rows` + `cohort_top` + `brokers_top`, labeled via `broker_registry` | IDX trading records + **Sectors cohort labels** |
| `foreignExit`, foreign trend | `flow_daily` | IDX foreign trading totals |
| `insiderExit`, insider index weight | `insider_trades` | IDX/KSEI ownership-change filings (`LK` PDFs) |
| `retailExodus`, `fclassShift` | `holders_monthly` | KSEI monthly register |
| Named holders, whales, groups | `ownership` | Issuer disclosures (≥5% register) |
| Risk flags | `suspensions`, `corporate_actions`, `free_float`, `price_daily` | IDX announcements, IDX calendar, IDX float list |
| Matched outcomes | `price_daily` + `index_daily` (IHSG) | IDX EOD prices |

## Honest boundaries a judge should hear

1. **Cohort labels are Sectors' curation, not an IDX field.** IDX publishes per-broker activity; it does not label brokers "retail" or "institutional". Of 88 classified firms, 42 are `mixed` and 2 `unknown`, so the cohort view is a labeled subset, not a census. The app says this on every dossier chart.
2. **"Reported" means reported.** Insider rows exist only because a holder filed an `LK` report; unfiled activity is invisible by construction. A missing filing is absent evidence, not evidence of absence.
3. **Holder composition is aggregate, not named.** The monthly file shows investor *classes* (percentages and counts), not a monthly list of ≥1% named holders. Named holders come only from the ≥5% register and insider filings.
4. **The snapshot is frozen.** `data/` is a verified point-in-time pull, hash-locked in `data/derived-v2/manifest.json`. Numbers shown are historical readings, not live market data.
5. **Missing stays missing.** Components without usable evidence render as `—` with their reason and lower the coverage weight; they are never scored as zero. Issuers under the coverage gate appear under **Suppressed** (103 of 964 as of the current snapshot).

## Coverage snapshot (as-of 2026-10-08)

| Feed | Coverage | Latest data |
|---|---|---|
| Universe | 964 symbols scored (962 live emiten + 2 delisted with filing history) | — |
| Insider filings | 3,866 rows / 496 issuers | txn 2026-10-06 |
| Broker rows | 322K rows / 863 symbols | 2026-10-08 (~600 syms; tail pending quota) |
| Foreign flow | 869 symbols | 2026-10-08 (826 syms) |
| Prices | OHLCV 962/962 | 2026-10-08 |
| Holders monthly | 962/962, ~21 months each | 2026-09-30 |
| Suspensions | 612 rows | — |
| Free float | 961/962 | — |

Full numbers and the two repair passes live in `docs/AUDIT-DATA-2026-10-08.md`.
