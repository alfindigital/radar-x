# TASK-07 — Homepage = Exit Watch board

**Status:** ✅ · **Depends on:** TASK-05 · **Gate:** G5 (partial)
**Plan:** `../2026-10-01-exit-watch.md` · **Spec:** `specs/DESIGN_SPEC_V3.md`

## Goal

`/` renders the Exit Watch board as default. V2 radar board preserved at
`?v=radar`. Same dark evidence-desk skin (`DESIGN_SPEC_V3` tokens), mono
numbers, no decoration.

## Files

- **Edit** `src/app/page.tsx`
- **Create** `src/components/ExitPressureBadge.tsx`
- **Create** `src/components/FlagChips.tsx`
- **Create** `tests/e2e/board-v3.test.ts`

## Layout (DESIGN_SPEC_V3 §board)

```
┌──────────────────────────────────────────────────────────────┐
│ EXIT WATCH — who appears to be leaving            asOf 10-04 │
│ 233 scored · 41 suppressed (low coverage) · 12 flagged        │
├──────────────────────────────────────────────────────────────┤
│ [All] [Flagged] [Suppressed]        view: Exit Watch | Radar │
├────┬─────────┬───────┬──────────────────────────┬───────────┤
│  # │ SYMBOL  │ EXIT  │ inst·for·ins·ret (z-bar) │ flags     │
│  1 │ BREN.JK │  87 H │ ▓▓▓ ·▓▓ ·▓▓ ·▓          │ ⚠SUSP ⚠CA │
│    │ PT Bara…│ █████ │ coverage 1.00           │           │
├────┴─────────┴───────┴──────────────────────────┴───────────┤
│ Methodology · coverage ≥0.5 gate · bounded language notice    │
└──────────────────────────────────────────────────────────────┘
```

## Components (PK1 — DESIGN_SPEC_V3 §4)

**ExitPressureBadge** — mono bold 0–100 labeled "Exit pressure". Color:
≥75 `--negative`; 55–74 `--caution`; 35–54 `--muted`; below → `--unknown` +
"Lower observed exit pressure" (never "Safe"); `null` → `—` + "low
coverage" chip. Coverage shown when <1 (`cov .85`).

**FlagChips** — factual badges: `SUSP ≤14D`, `CA ±7D`, `FF<20%`, `SPARSE`;
caution outline, `title` = definition; absent flags render nothing.

**Component strip** — four cells `INST FOR INS RET` showing clamped-z bars.
Per EC2: bars colored by cohort identity where applicable (inst blue /
retail ochre); direction sign `+`/`−` + label — not color-only. Foreign +
insider cells use `--negative` when exit-side, `--positive` when inflow-side.

## Behavior

- `?v=radar` → existing board JSX extracted into `RadarBoardView` (move,
  don't rewrite; importable component so both views share `page.tsx`).
- Default → `getExitWatchBoard({scope})`; `?scope=` syncs tabs.
- Suppressed section collapsible; rows show components present + reason.
- Footer: `asOf`, `generatedAt`, coverage floor, provenance hash short.
- Empty universe (no feeds on clone) → notice block: "Feeds not yet
  ingested — run `npm run ingest` …" (honest empty state, not crash).

## Tests (e2e — match existing tests/e2e harness; check `tests/e2e/`)

- `/` renders ≥1 row, badge numeric, flags render when fixture has them.
- `?v=radar` renders v2 board (scores table present).
- `?scope=suppressed` shows null-score rows only.

## Done when

- [ ] Default home is Exit Watch; v2 intact behind `?v=radar`.
- [ ] Coverage/suppressed counts accurate vs artifact.
- [ ] `npm run build` clean; e2e passes.

## Pitfalls

- `page.tsx` is a server component — keep it that way; tabs are links
  (`?scope=`), not client state, unless existing tabs already use client
  components (check current page.tsx pattern and copy it).
- Symbols link to `/saham/[ticker]` — reuse existing row-link pattern.
