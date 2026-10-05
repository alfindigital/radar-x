# TASK-08 — Dossier "Exit Door" section

**Status:** ✅ · **Depends on:** TASK-05 · **Gate:** G5
**Plan:** `../2026-10-01-exit-watch.md` · **Spec:** `specs/DESIGN_SPEC_V3.md` §dossier

## Goal

`/saham/[ticker]` gains an "Exit Watch" panel above/alongside existing
sections: tug-of-war bar, insider exit list, suspension + corp-action strip,
free-float, coverage.

## Files

- **Edit** `src/app/saham/[ticker]/page.tsx`
- **Create** `src/components/CohortNetChart.tsx` (CHART-B + EC2 signature —
  two aligned panels sharing one zero baseline: institutional-classified net
  top, retail-classified net bottom; cohort colors NOT red/green; sign via
  baseline + `+`/`−` labels; `View observations` table underneath)
- (Optional) `src/components/ExitComponents.tsx` — 4-cell breakdown reused
  from TASK-07 strip

## Layout

```
┌─ EXIT WATCH — BBCA.JK ────────────────────────────────┐
│  Exit pressure 87 · coverage 1.00 · window 17 Sep→1 Oct│
│  flags: SUSP ≤14D · CA ±7D (dividend 6 Oct)            │
├─ COHORT NET FLOW (14-day window, shared zero baseline) ──┤
│  INST ▁▃▅█▅▂▁ (blue)   net -4.2T IDR                   │
│  RET  ▁▂▄█▄▃▁ (ochre)  net +3.9T IDR                   │
│  INS reported sells -0.4T · FOR net -1.1T              │
├─ INSIDER EXITS (90d) ─────────────────────────────────┤
│  09-21  GREEN ERA LTD   sell 350,000,000 @ 8,750 …    │
├─ CONTEXT ─────────────────────────────────────────────┤
│  suspensions: 09-28 "…" · actions: DIV 10-06 · FF 18% │
└───────────────────────────────────────────────────────┘
```

## Components (PK1 — DESIGN_SPEC_V3 §4)

**CohortNetChart** — props `{days: {date, instNet, retailNet, foreignNet}[]}`:
two aligned panels, shared zero baseline, sessions observed within the 14-day window. Institutional panel =
`--cohort-inst`, retail = `--cohort-retail`, unclassified = `--cohort-uncl`,
foreign overlay dashed. `<title>` per bar; "View observations" table below —
chart is never the only path to the data. Copy: "Broker cohort classified
as institutional/retail" (cohort ≠ proof of ultimate trader identity).

- Insider exits table: date, holderName, txnType, amount, value, sourceUrl
  link icon (existing dossier already renders filings — *check current page
  and dedupe*: this section may replace or complement the existing insider
  panel; prefer adding exit-filtered view, keep full list below).
- Suspensions: date + reason + pdf link, last 3.
- Corp actions: `±90d` rows, type chip + date.
- Free-float: stat chip; <20% flagged.
- Coverage panel: which components missing + why (`reason` strings).

## Tests

- Extend e2e dossier test: 3 fixture issuers — (a) suspended + insider exits
  → all sections render; (b) sparse → coverage panel shows reasons; (c) no
  feeds → honest empty state, page still renders.

## Done when

- [ ] Section renders above fold on issuer page; links back to board.
- [ ] All numbers traceable to `exitwatch.json` row + feeds.
- [ ] Missing data → visible reasons, never silent.

## Pitfalls

- Check what the parallel session already added to the dossier
  (ownership panel, free-float stat, filings) — **dedupe**: reuse their
  components if they exist, don't render two free-float stats.
- `cohortWindow` needs `SymbolData.instBrokers`/`retailBrokers` — TASK-02
  must land first; series is per-day aggregation of `broker_rows`.
- Ticker page is `force-dynamic` — fine; keep fetch pattern from the file.
