# TODO — RADAR-X v3 "Exit Watch" execution tracker

> Re-planned 2026-10-05 post-merge + owner decisions locked.
> Feeds already on disk; remaining work = readers → cohorts → engine →
> artifact → services → design foundation → UI → docs → verify. 11 tasks.
> Master plan: `../2026-10-01-exit-watch.md` · Specs: `specs/*_V3.md`.

## Task board

| # | Task | File | Deliverable | Status |
|---|---|---|---|---|
| 01 | Contract types + `feeds.ts` + `cohort` param | [tasks/TASK-01.md](tasks/TASK-01.md) | envelope readers, types, `brokerSummaryTop(symbol,{cohort})` | ✅ |
| 02 | Wire `instBrokers`/`retailBrokers` | [tasks/TASK-02.md](tasks/TASK-02.md) | registry → `SymbolData`; real `instNetZ` (drops foreign-proxy fallback) | ✅ |
| 03 | `src/lib/exitwatch.ts` engine | [tasks/TASK-03.md](tasks/TASK-03.md) | pure engine: 4 components, flags, coverage | ✅ |
| 04 | Derive artifact `exitwatch.json` | [tasks/TASK-04.md](tasks/TASK-04.md) | `engineVersion:"radarx-v3"` + `loadDerived` | ✅ |
| 05 | Services layer v3 | [tasks/TASK-05.md](tasks/TASK-05.md) | `getExitWatchBoard`, dossier ext, broker board/profile | ✅ |
| 06 | PK1 design foundation | [tasks/TASK-06.md](tasks/TASK-06.md) | Palette A tokens, IBM Plex, TH1 theme, NAV-A top nav | ✅ |
| 07 | Homepage Exit Watch board | [tasks/TASK-07.md](tasks/TASK-07.md) | `/` + `?v=radar`, `ExitPressureBadge`, `FlagChips`, DASH-A | ✅ |
| 08 | Dossier "Exit Door" section | [tasks/TASK-08.md](tasks/TASK-08.md) | `CohortNetChart` (CHART-B+EC2), insider exits, flags, DOS-B | ✅ |
| 09 | `/broker` + `/broker/[code]` | [tasks/TASK-09.md](tasks/TASK-09.md) | board tabs + profile + nav link | ✅ |
| 10 | Methodology + claims + copy | [tasks/TASK-10.md](tasks/TASK-10.md) | `/metodologi`, `CLAIMS.md`, DE1/T1 metadata | ✅ |
| 11 | `cohorttop` pass + gates + verify | [tasks/TASK-11.md](tasks/TASK-11.md) | `cohort_top.json` (runs right after TASK-05), recompute, `EVIDENCE_V3.md` | ✅ |

Legend: ⬜ todo · 🟡 in-progress · ✅ done · ⏭️ superseded · ❌ blocked

## Owner decisions (2026-10-05 — locked)

- **Execution: native** — one session executes all tasks sequentially.
- **Design: PK1 adopted** — `docs/design/RADARX_DESIGN_OPTIONS.md` package
  PK1 becomes binding in `specs/DESIGN_SPEC_V3.md` (Evidence Desk palette A,
  IBM Plex, NAV-A, DASH-A, DOS-B, CHART-B+EC2 signature, TH1 theme, LOC1).
- **Cohort precision pass: approved now** — `cohorttop` implements in
  TASK-11 but **runs right after TASK-05** (~60 calls, top-30 flagged from
  `exitwatch.json`), then re-derive so UI already sees precision data.
- **Video: re-record** after TASK-10 — new demo path (board → cohort chart
  → dossier); user-side action, tracked in HANDOVER.

## Gates

| Gate | Check | When |
|---|---|---|
| G1 | `npx tsx tests/feeds.test.ts` green; readers parse all landed feeds | ✅ 01 |
| G2 | derive emits real `instNetZ` (institutional rows, not foreign proxy) | ✅ 02 |
| G3 | `exitwatch.json` exists, hash-valid, coverage-gated | after 04 |
| G4 | `npm run build` + `npm test` green | after 09 |
| G5 | Manual: board/dossier/broker render + empty states + both themes | after 09 |
| G6 | `cohorttop` run + recompute + evidence doc | after 11 |

## Locked boundaries

- **Cohort split = derive-time registry labeling** (0 calls baseline,
  266-issuer coverage via `broker_top.json`); `cohort_top.json` = approved
  precision overlay.
- **Names:** `broker_top.json`/`brokers_top.json` kept; new feed =
  `cohort_top.json`.
- **API pool:** 11 live keys via `SECTORS_API_KEYS` (`.env.local` repointed,
  verified 200). ~2 credits/call; cohorttop ≈60 calls.
- **Boundaries:** Sectors-only; bounded language; coverage ≥0.5 gate; v2 at
  `?v=radar`; null ≠ zero; "cohort classified" ≠ trader identity.
- **Secrets:** `scripts/store-secret.ps1` git-ignored; no keys in repo/docs.

## Risks

| Risk | Mitigation |
|---|---|
| `broker_top.json` all-cohort → top-N labeling misses non-top-N cohorts | `SPARSE` flag + coverage + `cohort_top` overlay (approved) |
| `corporate_actions.json` nested `types` ≠ flat rows | `feeds.ts` flattens to `CorpActionRow[]` |
| Rolling ownership loop (to 10-11) rewrites feeds mid-run | Readers read-only; `asOf` surfaced; re-derive idempotent |
| Working tree has modified data files (in-flight refresh) | Leave uncommitted; re-run ingest if stale before derive |
| PK1 reskin wider than planned (theme+nav+fonts) | TASK-06 isolates it; old var aliases keep v2 pages working |
