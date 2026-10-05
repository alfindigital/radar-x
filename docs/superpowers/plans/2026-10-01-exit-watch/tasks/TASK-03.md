# TASK-03 — `src/lib/exitwatch.ts` pure engine

**Status:** ✅ · **Depends on:** TASK-01, TASK-02 · **Gate:** G3 (via TASK-04)
**Plan:** `../2026-10-01-exit-watch.md` · **Spec:** `specs/TECH_SPEC_V3.md` §formula

## Goal

Pure function: `SymbolData` + feeds → `ExitWatchRow`. No I/O, no fs — feeds
arrive as arguments so tests run on fixtures.

## File

- **Create** `src/lib/exitwatch.ts`
- **Create** `tests/exitwatch.test.ts`

## Contract

```ts
export interface ExitComponent {
  key: "instExit" | "foreignExit" | "insiderExit" | "retailAbsorb";
  weight: number;            // 0.30 / 0.25 / 0.25 / 0.20
  raw: number | null;        // signed; + = exit pressure / absorption pressure
  z: number | null;          // robust cross-sectional z (standardize())
  contribution: number;      // clamped z × weight × 50
  status: "available" | "missing";
  reason: string | null;
  observations: number;
  observedFrom: string | null;
  observedTo: string | null;
}
export interface ExitFlags {
  suspension_recent: boolean;   // suspension_date within 14d of asOf
  corp_action_near: boolean;    // any corp-action date within ±7d of asOf
  float_constraint: boolean;    // freeFloat < 20
  sparse_broker: boolean;       // labeled broker observations < 5 in window
}
export interface ExitWatchRow {
  symbol: string;
  score: number | null;        // 0–100, null when coverage < 0.5
  tier: "high" | "elevated" | "watch" | null; // ≥75 / ≥55 / ≥35 else null
  coverage: number;            // Σ weights of available components / Σ all
  components: ExitComponent[];
  flags: ExitFlags;
  window: { days: number; from: string | null; to: string };
  asOf: string;
}
export function computeExitWatch(
  rows: { d: SymbolData; brokerTop?: BrokerTopSymbol | null;
          freeFloat?: number | null; suspensions: SuspensionRow[];
          corpActions: CorpActionRow[] }[],
  asOf: string,
): ExitWatchRow[]
```

## Component math (raw values — exit pressure is positive)

| Component | Weight | Raw |
|---|---|---|
| `instExit` | 0.30 | `-(Σ netVal on institutional-cohort rows)` over broker rows 14d **plus** `-(Σ net_idr on institutional brokers in broker_top topSellers minus topBuyers)` — see labeling note |
| `foreignExit` | 0.25 | `-(Σ netForeignInflow 14d)`; normalized ÷ latest `marketCap` ×100 (same pattern as score.ts `foreignTrend`) |
| `insiderExit` | 0.25 | `Σ insider sell value − buy value` 90d (`InsiderTrade.txnType`, `value`), ÷ marketCap ×100 |
| `retailAbsorb` | 0.20 | `Σ netVal on retail-cohort rows` 14d (positive buy = absorption pressure → positive raw) |

**Cohort labeling (locked decision):** broker rows are labeled by joining
`brokerCode` → `d.instBrokers`/`d.retailBrokers` (built in TASK-02 from
`broker_registry.cohort`). This labels *captured* rows; if neither set covers
the symbol's rows, the component is `missing` (not zero).

**`broker_top` contribution:** for the 266 symbols with a `broker_top` entry,
label each `topBuyers`/`topSellers` entry by registry cohort and sum
`net_idr` per cohort. Merge into the same raw: institutional sell-side
`net_idr` adds to `instExit`, retail buy-side adds to `retailAbsorb`. When
`cohort_top.json` (TASK-10) exists for the symbol, prefer it — it is true
per-cohort top-N.

## Scoring

1. Robust z across the universe per component: reuse `standardize()` from
   `score.ts` (median/IQR; returns null when <5 valid values — in that case
   the component contributes its raw direction sign only? **NO** — mark the
   component `missing` if unrankable; coverage handles it).
2. `contribution = clamp(z, -3, 3) / 3 * weight * 100` → each component
   contributes −weight·100 … +weight·100.
3. `score = round(50 + Σ contributions of available components)`, then clamp
   0–100. Emit `score` only when `coverage ≥ 0.5`; else `score: null`,
   `tier: null`, coverage still reported.
4. `flags` from feeds (see contract). `sparse_broker` counts labeled rows.

## Tests (`tests/exitwatch.test.ts`)

- Fixture universe ≥8 symbols; one with inst sell + retail buy → top tier.
- Missing broker rows → `instExit`/`retailAbsorb` missing → coverage 0.45 →
  `score: null` (below 0.5 gate) but `foreignExit`/`insiderExit` present.
- All-missing → coverage 0 → excluded-or-null per contract (decide: emit row
  with `score:null` — board filters).
- MAD=0 edge: all raws equal → z all 0 → score = 50.
- Flags: suspension row dated asOf−3 → `suspension_recent=true`; corp-action
  row at asOf+5 → `corp_action_near=true`; `freeFloat=12` → constraint flag.
- Determinism: same input → byte-equal rows.

## Test command

```bash
npx tsx tests/exitwatch.test.ts
```

## Pitfalls

- **Do not copy the `extractNetForeign` bug** (score.ts window leak: uses
  rows >90d before latest instead of asOf-anchored). Anchor every window to
  `asOf` exactly: `date >= asOf−14d && date <= asOf`.
- `asOf−14d` = calendar days (matches existing `inclusiveStart` helper in
  score.ts — reuse if exported, else replicate).
- Units: `net_idr`/`netVal`/`netForeignInflow` are all IDR — summable.
  `marketCap` may be null → component missing, not zero.
- Insider `txnType` vocabulary: inspect values (`buy`/`sell`/`transfer`?) —
  only `sell` counts toward exit; `buy` offsets.
