# RADAR-X hackathon readiness: proposed design

Date: 29 September 2026. Status: proposed for review and later execution by another agent. This design supersedes conflicting future-work instructions in `specs/PLAN.md`; it does not rewrite historical facts. Read `docs/AUDIT-2026-09-29.md` first.

## Intent and confirmed constraints

The user wants the strongest feasible Sectors Hackathon entry, an honest roast/audit, and a detailed English execution handoff. The portal is still a draft. The user confirms onboarding occurred before coding. Sectors credits/access are exhausted; do not probe or spend more. Arjum is the preferred optional supplemental provider. No current-request Arjum credential has been supplied.

Success means: a judge can find a disclosure pattern, inspect its evidence and timing, understand conflicting/missing data, and distinguish observed historical outcomes from claims about the future. Passing compilation alone is insufficient. Winning is an objective, not a guarantee.

## Options considered

| Option | Upside | Downside | Decision |
|---|---|---|---|
| Add more live feeds and keep the present product story | Fresher screens | Leaves selection bias, missingness, outcome bugs; increases provider work | Reject as the first step. |
| Repair and focus the Sectors snapshot research workflow | Zero-credit core, reproducible, fits all judging dimensions | Must reduce overstated claims and regenerate examples | **Recommended.** |
| Rebuild as an LLM agent or an automation product | Different category | New core, track ambiguity, testing and demo risk | Defer beyond this event. |

## Product promise and English copy

One-sentence problem statement:

> RADAR-X helps Indonesian equity researchers connect disclosed ownership activity with market context, verify the supporting evidence, and review historical outcomes in one place.

Hero: **Follow the evidence behind ownership moves.**

Subheading: **Explore reported transactions, foreign flows, and ownership changes with visible sources, dates, and data coverage.**

Snapshot notice: **Historical Sectors snapshot · market data through 22 Sep 2026 · coverage varies by issuer.** Generate the date from metadata; never hardcode it in the final implementation.

Disclaimer: **Public-data research, not investment advice. Reported transactions do not establish intent or wrongdoing. Historical outcomes do not predict future returns.**

Keep existing route paths for compatibility, but translate every user-facing label and accessible description to English. Route names do not need an SEO migration. Preserve original holder/company names and original source-document language.

## Primary workflow

1. Open the board. See snapshot date, cohort size, observed coverage, and a short explanation of the score.
2. Choose reported accumulation or distribution. Counts reflect the full cohort. Missing evidence is visible.
3. Open an issuer dossier. See the observation window, signed component contributions, and “Supports / Conflicts / Missing.”
4. Open a pattern. See distinct holders, event span, transaction dates, reported/feed timestamps, and original source links.
5. Review historical follow-up. It is pending if the full horizon is unavailable. Benchmark comparisons use the same actual start/end sessions.
6. Optionally copy a factual research brief with source URLs, as-of date, method version, and limitations.

TOWR is a candidate demonstration because the stored data has six named sellers at 437 on 16 September, reported by the feed on 18 September. It is not automatically the final story. Recompute and verify against original sources before recording. Never claim RADAR-X detected it on 16 September unless independently evidenced.

## Data and runtime architecture

- Retain Next.js App Router, TypeScript, Tailwind, server-rendered SVG, and local JSON snapshots.
- Public runtime is **snapshot-only**, immutable, and does not import/call the provider client through page services.
- Preserve original `data/*.json`. Produce corrected artifacts under `data/derived-v2/` and update Git allowlist and Next output tracing to include them.
- Source snapshot metadata records file SHA-256, row counts, event coverage, source provider, known limitations, and verification status. A newly computed hash proves local integrity, not original provider authenticity or original download time.
- Unknown retrieval timestamps stay null. Use `auditedAt` for this audit's timestamp, never relabel it `retrievedAt`.
- `scripts/compute.ts` becomes a deterministic batch builder with explicit `--as-of 2026-09-22 --output data/derived-v2`. It must not write old raw files.
- Required malformed data is an explicit failure; optional absent data is a typed unavailable state. Do not turn malformed JSON into a successful empty board.
- Load each immutable file once per server process and index by symbol. Avoid repeated full-file reads in per-issuer loops.
- Record input hashes, method version `radarx-v2`, cohort identity, as-of date, and generation timestamp. No hidden calls to today's date to decide analytical windows.

## Availability and chronology

Treat three dates separately: transaction date, reported/feed timestamp (`filedAt` today), and known retrieval/publication availability. The current feed timestamp is not independently proven to be the official publication instant or to use a particular timezone.

Current-snapshot descriptive screens may use stored rows with transaction dates up to the anchor, while showing the feed timestamp and limitations. Historical “known as of” modes must exclude rows without verified availability by that date. Do not add a purported point-in-time backtest in this sprint. Monthly holdings must at least have `month <= anchor`; if release timing is unknown, label them snapshot context rather than proof of historical availability.

## Outcome policy

Default case follow-up is **retrospective, transaction-relative close-to-close price change**, not a simulated trade and not evidence the disclosure was known then. This is the least speculative use of the existing data.

- Anchor = end of the bounded event window.
- Start = first common issuer/IHSG date on or after anchor, no more than seven calendar days later.
- Target = start date + 7, 30, or 60 calendar days.
- End = first common date on or after target, no more than seven calendar days later.
- If snapshot as-of precedes target: pending. If target has elapsed but no usable common pair exists: unavailable with reason. Never substitute an earlier last close.
- Values require finite, positive prices. Record actual start/end dates, prices, elapsed days, issuer return, benchmark return, and percentage-point difference.
- If benchmark is missing, an issuer-only result may be displayed separately with its own dates and a missing-benchmark notice. Never subtract a benchmark return measured on another interval.
- Adjustment basis is `unverified` for legacy rows unless source documentation establishes it. Label results unadjusted/adjustment-unverified as applicable; do not claim total returns. Flag known corporate-action interference rather than inventing adjusted prices.

Changing post-anchor prices must never change pattern membership or evidence score. It may only change the outcome object and retrospective text.

## Pattern policy

Use neutral candidate patterns: `CLUSTER_BUY`, `CLUSTER_SELL`, `REPORTED_BUY`, `REPORTED_SELL`, `BUY_DURING_PRICE_DECLINE`. The last pattern is an observation about prior price context, not advice.

- Evaluate buy and sell streams separately, sort deterministically by transaction date then holder name then source URL.
- For each event date, window includes transactions in the preceding 29 calendar days plus that date, at most 30 inclusive dates.
- A cluster requires at least three distinct normalized holder names. Three trades by one holder do not qualify.
- Normalize names by trim, collapsed spaces, and Unicode normalization; do not merge different legal persons based on fuzzy similarity.
- Emit at most one cluster per symbol/direction/event date. It is acceptable that overlapping windows exist, but label them overlapping observations and do not treat them as independent statistical samples.
- Do not call reported-holder aggregates “insiders” if institutional/corporate categories are included. Preserve holder type and allow the evidence to distinguish them.
- Do not retain EXIT_AHEAD or STEALTH_ACCUMULATION as forward-looking pattern labels. Legacy stored records remain preserved, but are not served as new version candidates.
- Remove case 0–100 severity from the primary UI in this sprint. Rank case feed by latest report/event date and distinct-holder count, not by future return. This is simpler and more defensible than inventing another score.

## Positioning-score policy

Keep a clearly labeled, descriptive **Positioning Index**, never “confidence,” “probability,” or “buy score.” Version it because values will change.

Five components retain existing weights, but use honest names and missingness:

| Key | Weight | Definition |
|---|---:|---|
| `insiderZ` | .30 | Net value of reported-holder buy/sell transactions within 90 inclusive calendar dates, without unbounded distinct-holder boost |
| `foreignTrend` | .25 | Available foreign net flow / valid same-issuer market cap; display observed sessions and cap date |
| `instNetZ` | .20 | Foreign net value in broker data within 14 inclusive calendar dates, explicitly a proxy, not proof of institutional identity |
| `retailExodusZ` | .15 | Negative reported total shareholder-count change, explicitly not retail-only |
| `fclassShift` | .10 | Change in selected foreign institutional-class shares minus foreign-individual shares between latest two eligible monthly records |

Raw field absence is null. It is not zero. Provider-confirmed no activity can be zero. For each component, compute median/MAD only across valid observations. Need at least five valid issuers. If MAD > 0 use 1.4826×MAD. Otherwise use IQR/1.349 if positive. If both are zero, mark the component `unrankable` for that cohort and contribute zero without implying neutrality. Clip z to ±3. Fixed weighted contributions sum then multiply by 100/3; do not reweight available components to 100%. Score is null unless at least two components are rankable for the issuer. Show available weight coverage and component reasons next to it. These thresholds are explicit engineering heuristics, not empirically calibrated financial claims.

Raw-cap normalization needs finite positive cap at or before as-of, with cap age visible. Do not hide stale denominators. Sparse foreign observations must show their actual window; the UI must not imply all 90 days were measured. Related foreign measures remain correlated; explain this on methodology rather than claiming independent confirmation.

## Chart and UX policy

- Dedicated symmetric foreign-flow subpanel, zero in its vertical middle. Both signs fit inside bounds and date labels remain outside bars.
- Price/event x positions use the same time mapping; dates outside price coverage are not clamped into misleading edge markers.
- Display original-source links in evidence tables; allow only `http:` and `https:` destinations.
- Visible mobile navigation at 390 px, accessible search label, keyboard focus, English empty/error states.
- Distinguish no matching candidates, known ticker with missing data, unknown ticker, and damaged snapshot.
- Normal small text contrast at least 4.5:1. Color is accompanied by text/sign, not the only indicator.
- No compulsory signup, chatbot, watchlist account system, live trading, or full redesign.

## Optional Arjum boundary

Freshly implement one adapter only after core acceptance passes and the user selects enrichment. Use current-request credentials only, in server environment or an authorized existing secret mechanism; do not fetch unrelated stored keys. Verify applicable public display/cache/redistribution terms. Seek organizer clarification if relying on supplementary data for eligibility. Do not assume a paid subscription authorizes a public raw-data dump.

Sectors disclosure data and its derivatives remain necessary for core reports. Arjum OHLCV adds separately labeled context. Broker summary aggregates must carry actual range start/end, field units, and any truncation; do not insert them into per-day rows. Prefer a separate supplementary context panel rather than changing the main score this close to deadline. Exclude Arjum insider replacement, recommendations, seasonality recommendations, and trade execution.

## Release scope and non-goals

Required: truthful full-cohort board; valid outcomes; bounded patterns; chronology/source/coverage; deterministic data; snapshot-only runtime; English mobile workflow; real videos; completed submission package.

Optional in order: copy brief, limited Arjum OHLCV context, comparison card. Defer broker integration if its semantics are unresolved. Defer LLM chat, sector maps, alerts, authentication, Supabase migration, monetization, backtests claiming predictive edge, and all reused code from prior projects.

Acceptance: an unfamiliar person can complete the research workflow; every public numeric claim can be traced to data and method; unknowns are visible; tests prevent the audit's specific failures; demo and repository describe the same final version.
