# PRODUCT_SPEC V3 — RADAR-X "Exit Watch"

> Supersedes `PRODUCT_SPEC.md` (radarx-v2). The v2 engine (positioning score,
> cases, outcomes, provenance) is retained as foundation; this spec defines the
> v3 extension built on six previously-unused Sectors endpoint families.
> Language: English (submission language).

## Problem (one sentence)

Every pump-and-dump and suspension on IDX ends the same way — institutions,
foreign funds, and insiders exit first while retail crowds in — yet retail has
no public instrument that shows **who is leaving a stock right now**.

## The deepest pain (factual grounding)

- IDX suspensions cluster after rapid cumulative gains (ASLI 2026-09-25; six
  names suspended 2026-10-06 incl. KOKA/PTRO/TINS; CDIA/COIN UMA→suspend Jul
  2025). Retail is trapped post-suspension — 18 issuers face delisting Nov 2026.
- National-level attention: Finance Minister publicly pressed the exchange over
  "gorengan" stocks; MSCI flagged small-cap volatility.
- Broker-level activity is public but raw and cohort-blind; retail cannot see
  that the buyer side is all retail while institutional brokers sell.

## Value proposition

RADAR-X Exit Watch turns Sectors' broker-cohort registry, per-symbol top
buyer/seller splits, foreign flow, insider filings, suspensions, and corporate
actions into a daily **exit-pressure monitor**: for every covered issuer, a
0–100 Exit Liquidity reading with named, source-linked evidence — who sold,
who absorbed, and which risk flags are lit.

## Users

IDX retail holders and swing traders asking the daily question: *"Is the smart
money leaving my stock — and is retail absorbing it?"* Secondary: market
watchers/journalists needing a public read on distribution pressure.

## Scope v3

| Page | Content |
|---|---|
| `/` Exit Watch board | Issuers ranked by Exit Liquidity score: cohort net-sell pressure (institutional vs retail absorption), foreign-exit streak, insider exit value, risk flags (suspended-before / thin-float / upcoming corporate action / price streak). Tab retains legacy positioning board. |
| `/saham/[ticker]` | Dossier gains "Exit Door" section: cohort tug-of-war bars (institutional vs retail net per day), insider exit wire (recent sell filings), risk-flag chips, suspension history line. |
| `/broker` | Daily broker board split by cohort — top institutional vs retail net buyers/sellers; per-broker drilldown. |
| `/broker/[code]` | Broker profile: cohort, top accumulations/distributions, presence across flagged issuers. |
| `/metodologi` | v3 formulas, windows, source tables, honesty rules. |
| Retained | `/kasus`, `/kasus/[id]`, `/orang/[holder]`, `/asing` — v2 modules stay. |

## Signature visual

Cohort **tug-of-war** per issuer: institutional net bars (blue) vs retail net
bars (ochre) sharing a zero baseline across the 14-day window (~10 trading
sessions) — the exit door made visible. Cohort colors never encode sign.

## Non-goals

- No buy/sell advice, targets, or calls. Descriptive statistics only.
- No "manipulation" accusations — components describe observed flow/ownership
  data with sources; never intent.
- No intraday; all EOD. No trading execution (hackathon-prohibited).
- No new universe claims beyond what stored snapshot covers; missing evidence
  stays visible (v2 honest-null pattern reused).

## Compliance

- Public repo, no secrets; Sectors API key server-side only.
- Sectors is the core data source — removing it removes the product.
- Financial disclaimer on every page + methodology page.

## Success criteria (judging-mapped)

- Usability: any holder answers "are institutions and insiders leaving?" in <10 s.
- Technical: 6 new endpoint families wired; cohort tagging fixes the dead
  `instNetZ` component; deterministic derived artifact with sha256 manifest.
- Story: exit-door framing + a worked replay of a real suspension case file.
