# TASK-11 — `cohorttop` precision pass + gates + verification

**Status:** ✅ · **Depends on:** TASK-05..10 · **Gate:** G6
**Plan:** `../2026-10-01-exit-watch.md`

## Goal

Approved credit spend (~60 calls, top-30 flagged) upgrading cohort precision,
plus full verification + evidence doc.

## Timing (owner decision 2026-10-05)

Approved **now, not deferred**. Implement the command in this task, but the
ingest itself runs **as soon as TASK-05 lands** (`exitwatch.json` exists →
top-30 flagged list is derivable), then re-derive so UI tasks 07–09 already
see precision data. Budget check before the run; abort to labeling-only if
the pool is low.

## Files

- **Edit** `scripts/ingest.ts` — add `cohorttop` command
- **Edit** `src/lib/feeds.ts` — `loadCohortTop()` (optional overlay)
- **Edit** `src/lib/exitwatch.ts` — prefer `cohort_top` when present
- **Create** `docs/EVIDENCE_V3.md`

## `cohorttop` command

```bash
npm run ingest -- cohorttop --limit 30 --symbols BBCA.JK,TLKM.JK
```

- For each symbol (default: top-N flagged rows from `exitwatch.json`, or
  explicit `--symbols`): `api.brokerSummaryTop(symbol, {cohort:"retail"})` +
  `{cohort:"institutional"}`.
- Write `data/cohort_top.json` envelope:
  ```json
  { "schemaVersion":1, "asOf":"…", "generatedAt":"…",
    "data": { "SYM.JK": { "retail": {start,end,top_buyers[],top_sellers[]},
                          "institutional": {…} } } }
  ```
- Accrete on repeat runs (merge per symbol, like `brokers_top` sessions).
- Respect 401-rotation via existing `sectorsGet` pool logic; log credits via
  `limit-consumption` header if visible.

## Engine upgrade

`exitwatch.ts`: when `cohort_top.data[symbol]` exists, use its per-cohort
`net_idr` sums for `instExit`/`retailAbsorb` instead of registry-labeled
`broker_top` rows (better precision); flag component `observations`
accordingly; note source in `reason`/component meta.

## Verification pass (all gates)

```bash
npm test          # all unit tests incl. new
npm run build     # clean production build
npm run derive    # regenerate artifacts
```

Manual checklist:
- [ ] `/` board — counts, badges, flags, tabs, `?v=radar` regression
- [ ] `/saham/{flagged}` — Exit Door section, tug-of-war, insider list
- [ ] `/saham/{sparse}` — coverage panel honest
- [ ] `/broker` — board + cohort tabs + empty states
- [ ] `/broker/{code}` — profile + symbol links
- [ ] `/metodologi` — v3 section present
- [ ] No-console errors; mobile width sanity

## EVIDENCE_V3.md

- File inventory: every `data/*.json` feed with rows + asOf + sha256 prefix.
- Artifact: `exitwatch.json` rows count, scored vs suppressed split.
- API spend: calls made by `cohorttop`, credits observed.
- Decisions: cohort-labeling vs precision pass rationale.

## Done when

- [ ] Gates G1–G6 all green.
- [ ] Evidence doc written; living docs (`CURRENT_STATE`, `VERSION`,
      `COMMIT_LOG`) updated.
- [ ] Handover note: video re-record decision + submission deltas.

## Pitfalls

- `brokerSummaryTop` param must actually reach the query string — verify one
  live call returns cohort-filtered data before bulk run (single test call,
  inspect `cohort` echo field in response).
- Merge, don't overwrite `cohort_top.json` on re-runs.
- If `cohort_top` skipped: mark decision in TODO + evidence doc; board
  already works.
