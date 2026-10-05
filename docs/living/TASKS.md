# TASKS — RADAR-X v3 "Exit Watch"

Tracker: `docs/superpowers/plans/2026-10-01-exit-watch/TODO.md` (authoritative).
Executed natively by Devin 2026-10-05 — all 11 tasks complete.

| # | Task | Status | Notes |
|---|---|---|---|
| 01 | types + `feeds.ts` + `cohort` param | ✅ | feeds.ts: registry/susp/corpAct/brokerTop/brokersTop/cohortTop; ownership/taxonomy stay upstream |
| 02 | wire `instBrokers`/`retailBrokers` | ✅ | `cohortsFromRegistry`; instNetZ now real broker netVal, foreign-proxy fallback removed for v3 |
| 03 | `exitwatch.ts` engine | ✅ | 4 components, robust z ±3, flags, coverage ≥0.5, per-day series |
| 04 | `exitwatch.json` artifact | ✅ | `engineVersion:"radarx-v3"`, sha256, `feedHashes` in manifest |
| 05 | services v3 | ✅ | `getExitBoard`, `getBrokerBoard`, `getBrokerProfile`, dossier `exit`+suspensions+corpActions |
| 06 | PK1 design foundation | ✅ | Evidence Desk palette, IBM Plex, TH1 theme toggle (no-flash), NAV-A top nav |
| 07 | `/` Exit Watch board | ✅ | DASH-A; `?v=radar` preserved via `RadarBoardView`; scopes all/flagged/suppressed |
| 08 | dossier Exit Door | ✅ | `CohortNetChart` (inst blue / retail ochre, shared zero), component cards, context strip |
| 09 | `/broker` + `/broker/[code]` | ✅ | leaderboard cohort-labeled; profile: appearances + top buyer/seller symbols |
| 10 | metodologi + claims + copy | ✅ | `/metodologi` v3 section; metadata → "IDX Market Intelligence"; `docs/EVIDENCE_V3.md` |
| 11 | `cohorttop` + verify | ✅ | 31 symbols × 2 calls = 62 calls, echo verified; overlay live in engine |

## Remaining (owner-side / polish)

- Judging video re-record — new money-shot: Exit Watch board → dossier
  tug-of-war → suppressed honest state (≤3 min).
- Portal submission copy + social post update for v3 framing.
- Visual QA sweep at 360px mobile width.
- `brokers_top` cohort-split sessions (`?cohort=retail|institutional`) not yet
  ingested — board labels use registry; split leaderboard optional later.
