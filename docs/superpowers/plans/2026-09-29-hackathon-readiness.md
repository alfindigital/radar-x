# RADAR-X Hackathon Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task by task. If the user explicitly selects delegated execution, use `subagent-driven-development` instead. Steps use checkbox syntax for tracking. The user requested this plan for a subsequent agent; this document does not authorize this audit agent to implement it.

**Goal:** Deliver a defensible English Track 3 research workflow, corrected analytical results, and convincing real-product submission videos before 8 October 2026 at 23:59 WIB.

**Architecture:** Retain Next.js, server-rendered pages/SVG, and JSON snapshots. Separate immutable Sectors source data, validated/versioned derived analytics, and optional supplementary provider context. Eliminate public-request upstream fetches and separate historical outcomes from pattern detection.

**Tech Stack:** Next.js 16.3.5, React 19.2.8, TypeScript, Tailwind v4, Node test runner through existing `tsx`, existing Zod for validation, optional Playwright dev dependency for E2E.

**Spec:** `docs/superpowers/specs/2026-09-29-hackathon-readiness-design.md`.

**Audit:** `docs/AUDIT-2026-09-29.md`.

**Baseline:** commit `3ea9334`, 29 September 2026. Tests/build passed, semantic defects did not. Recheck Git before editing. Numbers in regression fixtures refer to this baseline and must not be imposed on corrected output.

## Global constraints

- All user-facing UI, documents, narration, captions, alt text, errors, and accessible labels are English. Original entity names and source documents retain original language.
- The portal remains a draft, confirmed by the user. Onboarding before coding is also confirmed by the user. Do not click Submit final during implementation.
- Stop project changes immediately if the user reports final submission or if the deadline has passed. Do not treat this plan as permission to violate freeze.
- Use only existing saved Sectors data by default. No ingest/backfill, upstream key test, top-up, or new account for credits.
- Never print, commit, paste into tests, or put credentials in reports. No `NEXT_PUBLIC_*` provider keys.
- Preserve original `data/*.json`, Git history, and existing assets. No deletion without the user's explicit permission. Derived v2 is written separately.
- No copying code from the user's prior projects. A newly authored optional Arjum adapter must remain specific to this repository.
- No investment recommendations, buy/sell execution, target prices, inferred wrongdoing, predictive-success claims, or invented user testimonials.
- Keep existing route paths. Do not migrate to Supabase, change framework, upgrade the stack, or build an LLM feature during this sprint.
- Treat `.gitignore` as an allowlist. Every new test/config/data path must be verified with `git check-ignore` and `git status` before commit.
- Read relevant local Next guides under `node_modules/next/dist/docs/` before framework edits. The files end in `.md`; use `rg --files --no-ignore` because node_modules is ignored.
- One writer per path. Before editing, check running project processes and Git status. Preserve unrelated work; stage exact paths only. No push/deploy until the user authorizes that release action.

## Review focus

1. A genuinely absent observation must not become zero, a score, or a completed return. Tasks 2, 4, 5.
2. A transaction or monthly observation not known at an earlier date must not support a historical knowledge claim. Tasks 2, 3, 5.
3. Negative candidates beyond a previous limit must remain discoverable; counts must match the full cohort. Tasks 1, 7.
4. Partial, corrupt, or out-of-order source files must fail explicitly or show an honest unavailable state, with no external request. Tasks 2, 6, 7, 9.
5. Video, narrative, labels, and source dates must describe the same final derived version. Tasks 8, 10, 11.

## Execution order and time allocation

Engineering estimates are broad and assume one capable implementer. They are not promises. If work slips, cut optional scope before weakening correctness.

| Date, WIB | Work | Exit gate |
|---|---|---|
| 29–30 Sep | Tasks 0–2: preflight, board bug, immutable snapshot/provenance | Board regression fixed; network-free read path. |
| 1 Oct | Tasks 3–4: bounded patterns and complete horizons | Future returns cannot affect candidates; incomplete outcomes pending. |
| 2 Oct | Tasks 5–6: score availability, deterministic generation | Validated v2 data, reproducible outputs. |
| 3 Oct | Tasks 7–8: complete workflow, English, mobile, charts | Primary research journey works at desktop/mobile widths. |
| 4 Oct | Task 9: integrated verification and actual user observation | No P0 defects; evidence ledger ready. |
| 5 Oct | Optional Task A only if all preceding gates pass; otherwise fixes | No new unresolved source/semantics risks. |
| 6 Oct | Tasks 10–11: docs, final deployment approval, actual recordings | Final version recorded, complete links/assets. |
| 7 Oct | Buffer, external-link verification, user final review | Submission package ready; roster/admin complete. |
| 8 Oct | Aim for submission by 18:00 WIB, well before 23:59 | User submits; repository/app freeze. |

Target 35–55 focused engineering/verification hours plus 6–10 hours for real recordings, editing, upload, and submission preparation. If this exceeds availability, cut Task A, export features, and cosmetic refactoring. Retain all P0 repairs and the real recording.

## File ownership map

| File | Responsibility |
|---|---|
| `src/lib/types.ts` | Domain contract including v2 candidate/outcome/score availability |
| `src/lib/snapshot.ts` (new) | Validated immutable reads, indexes, metadata |
| `src/lib/provenance.ts` (new) | Source URL validation and timestamp availability interpretation |
| `src/lib/board.ts` (new) | Pure full-cohort filter/sort/pagination |
| `src/lib/outcomes.ts` (new) | Complete, same-session historical outcome measurement |
| `src/lib/cases.ts` | Neutral bounded candidates independent of future results |
| `src/lib/score.ts` | Missingness-aware descriptive index and fixed cohort statistics |
| `src/lib/services.ts` | Read-only view models, no upstream import or writes |
| `src/lib/db.ts` | Legacy store compatibility and controlled offline writers only |
| `scripts/compute.ts` | Explicit-anchor deterministic v2 generation |
| `scripts/audit-data.ts` (new) | Read-only counts, hashes, chronology/coverage diagnostics |
| `data/derived-v2/{manifest,scores,cases}.json` (new) | Validated reproducible derived artifacts |
| `src/components/{DataStatus,EvidenceSummary,MobileNav}.tsx` (new) | Small components for trust and navigation |
| Existing pages/components | English research workflow consuming v2 view models |
| `tests/*.test.ts`, `tests/e2e/research.spec.ts` (new) | Semantic regression and workflow tests |
| `docs/verification/2026-09-29-baseline.md` (new during execution) | Commands, results, and baseline hashes |
| `docs/RELEASE-CHECKLIST.md` (new during execution) | Final evidence, version, links, freeze record |

Do not introduce every new component preemptively. Create it when the task that consumes it begins. The map defines responsibility, not a demand for a generalized framework.

## Task 0: establish a safe baseline and execute no provider calls

**Files:** read `AGENTS.md`, the master pointer, audit, spec, existing handoff; create `docs/verification/2026-09-29-baseline.md`.

**Consumes:** user approval to execute this plan, current checkout. **Produces:** factual baseline with no credentials.

- [ ] Read the spec and audit fully. Record disagreements as explicit questions, not silent redesigns.
- [ ] Run these commands separately from repository root in PowerShell:

```powershell
Get-Location
git status --short
git log -1 --format='%h %ad %s' --date=iso-strict
git log --reverse --format='%h %ad %s' --date=iso-strict
Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'node|git|python' -and $_.CommandLine -like '*radar-x-hackaton*' } | Select-Object ProcessId,Name
git ls-files '.env*'
npm run lint
npm run typecheck
npm run build
```

- [ ] Do not read `.env.local` contents. No `npm run ingest`, `npm run backfill`, or original `npm run compute` yet; the last mutates legacy derived files.
- [ ] Save input hashes and exact command results. Record onboarding as **user-confirmed**, not independently verified. Screenshot says draft and user confirms draft.
- [ ] Read `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` and `01-app/02-guides/testing/playwright.md` before related work.
- [ ] Confirm the new docs directory is not being edited by another agent. Commit only your changed paths after each task passes. Do not push as part of a local checkpoint.

**Acceptance:** baseline evidence exists; user work preserved; no provider traffic caused by preflight. If original rules have changed, update the interpretation before proceeding.

## Task 1: fix board population before adding features

**Files:** create `src/lib/board.ts`, `tests/board.test.ts`; modify `src/lib/db.ts`, `src/lib/services.ts`, `src/app/page.tsx`, `package.json`, `.gitignore`.

**Consumes:** complete latest `PositioningScore[]`. **Produces:** pure `selectBoard<T extends {symbol:string;score:number|null}>(rows:T[], mode:'all'|'accumulation'|'distribution', limit?:number): {rows:T[];total:number;accumulation:number;distribution:number}`. Counts include full cohort; null scores count in total but never accumulation/distribution.

- [ ] Add `test` script `tsx --test tests/*.test.ts`. Add `!tests`, `!tests/**` to `.gitignore`. Do not install another unit-test framework.
- [ ] Add this regression before implementation:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { selectBoard } from '../src/lib/board';

test('distribution is filtered before limit and sorted most negative first', () => {
  const rows = Array.from({length:120}, (_, i) => ({symbol:`P${i}`, score:60}));
  rows.push({symbol:'NEG1',score:-30}, {symbol:'NEG2',score:-86});
  const result = selectBoard(rows, 'distribution', 1);
  assert.equal(result.total, 122);
  assert.equal(result.distribution, 2);
  assert.deepEqual(result.rows.map(x=>x.symbol), ['NEG2']);
});
```

- [ ] Run `npm test`; verify failure references the missing function or expected behavior, not an unrelated setup error.
- [ ] Implement: compute counts over all rows; filter `>=25` or `<=-25`; distribution ascending, accumulation descending, all descending with null last; ticker ascending breaks ties; apply limit last.
- [ ] Change `latestScores` so omitted limit means all latest rows. Explicit callers needing limits must pass them. Do not replace 120 with another arbitrary cap.
- [ ] Have `getRadarBoard` return the full cohort and counts; have the page use `selectBoard`. Preserve legacy query values `semua/akumulasi/distribusi` as aliases during English migration.
- [ ] Add a fixture check loading the untouched legacy score file: latest cohort 256 and distribution count 46. Keep that fixture check about the baseline; corrected v2 scores will change.
- [ ] Replace no-results copy with `No candidates match this filter in the saved snapshot.` Reserve `Snapshot unavailable` for actual data failure.
- [ ] Run unit tests, typecheck, and inspect both positive/negative tabs. Commit these exact files when passing.

**Acceptance:** baseline negative cohort is discoverable; no false “not computed” message; counts and sort order are correct. No raw-data mutation.

## Task 2: validated immutable snapshot and provenance

**Files:** create `src/lib/snapshot.ts`, `src/lib/provenance.ts`, `src/lib/price-merge.ts`, `scripts/audit-data.ts`, `tests/snapshot.test.ts`, `tests/provenance.test.ts`, `tests/price-merge.test.ts`; modify `src/lib/types.ts`, `src/lib/services.ts`, `src/lib/db.ts`, `scripts/ingest.ts`, `next.config.ts`, `.gitignore`, `package.json`.

**Consumes:** existing raw JSON files. **Produces:** `loadSnapshot(dataDir?:string):Promise<Snapshot>`, cached only when no custom directory is passed; `safeSourceUrl(value:string|null):string|null`; `availableBy(timestamp:string|null, verified:boolean, asOf:string):boolean`.

`Snapshot` contains typed arrays for all eight legacy files, symbol indexes, and `manifest`. Define the metadata contract in `types.ts`:

```ts
export interface SourceFileMeta {
  path: string;
  provider: 'sectors';
  sha256: string;
  rows: number;
  minDate: string | null;
  maxDate: string | null;
  retrievedAt: string | null;
  auditedAt: string;
  provenanceStatus: 'legacy-normalized';
  limitations: string[];
}
export interface SnapshotManifest {
  schemaVersion: 2;
  engineVersion: 'radarx-v2';
  asOf: string;
  files: SourceFileMeta[];
  inputHash: string;
  generatedAt: string;
  derivedFiles: Array<{
    path: 'scores.json' | 'cases.json';
    sha256: string;
    rows: number;
  }>;
}
```

- [ ] Build Zod schemas for actual raw contracts. Validate finite numbers, valid ISO dates, `.JK` ticker strings or `^IHSG`, enum transaction types, and unique natural keys. Reject malformed required arrays with a file-specific error; never include secrets or entire response bodies in errors.
- [ ] Allow documented null market caps/source values. Quarantine/report anomalous dates and unknown fields rather than silently changing their values. A transaction date earlier than the current snapshot is not itself an error.
- [ ] Change price fields `open/high/low/volume` to `number | null` while keeping a finite positive close required for returns. Add optional `observationKind:'ohlcv'|'close-only'|'legacy-unknown'` and optional `fieldSources:Partial<Record<'open'|'high'|'low'|'close'|'volume'|'marketCap','sectors-daily'|'sectors-close'|'legacy-unknown'|'arjum'>>`. Legacy rows remain unchanged on disk; the read adapter marks ambiguous flat-OHLC/zero-volume/no-cap rows `legacy-unknown` and excludes their volume from analytical use without declaring them proven invalid.
- [ ] Add `mergePriceObservation(existing:PriceDaily|undefined, incoming:PriceDaily):PriceDaily`. For an explicitly `close-only` incoming row, preserve existing open/high/low/volume/cap, update close, and retain field-origin metadata; with no existing rich row, missing fields remain null. Reject mismatched symbol/date. Edit future CLI close mapping to emit nulls and `close-only`; do not run ingestion. Test a rich row with volume 12345 plus a close-only update retains volume 12345, and an entirely new close-only row has volume null. This fixes the destructive merge before any optional new provider is added.
- [ ] `safeSourceUrl`: parse via `new URL`; return only http/https URLs; return null on invalid scheme. Render null as `Source link unavailable`, never a fabricated IDX URL.
- [ ] `availableBy` returns false unless timestamp semantics are verified and its date is at or before as-of. Do not use this helper to invent availability for legacy `filedAt`; show legacy timestamps under their honest feed label.
- [ ] Add tests:

```ts
test('unverified dates cannot support as-of claims', () => {
  assert.equal(availableBy('2026-09-18T18:00:00', false, '2026-09-22'), false);
  assert.equal(availableBy('2026-09-18T18:00:00Z', true, '2026-09-16'), false);
});
test('source links reject executable schemes', () => {
  assert.equal(safeSourceUrl('javascript:alert(1)'), null);
  assert.equal(safeSourceUrl('https://www.idx.co.id/report.pdf'), 'https://www.idx.co.id/report.pdf');
});
```

- [ ] Test corrupt JSON using a temporary test directory, not the real `data` folder. `loadSnapshot(tempDir)` must reject with the failing filename. Test an empty required dataset explicitly and distinguish it from corruption.
- [ ] Audit script reads files, prints counts, per-symbol/date coverage, hash, duplicate counts, missing source count, transaction/feed-date lag counts, and suspicious zero-volume counts. It must not import `sectors.ts` or write source files. Add `audit:data` script `tsx scripts/audit-data.ts`.
- [ ] Remove provider imports/lazy backfill from page services. Normalize input ticker, verify it against local tickers, and return known-uncovered versus unknown states. No request causes a write or compute.
- [ ] Test by replacing `globalThis.fetch` with a function that throws, calling board and known/unknown issuer services, and restoring fetch in `finally`. Keep this test serial to avoid global cross-test contamination.
- [ ] Add `!data/derived-v2`, `!data/derived-v2/*.json` and Next tracing `./data/derived-v2/*.json`. Do not activate readers until Task 6 creates validated output.

**Acceptance:** saved core workflow has zero upstream dependency; file errors are explicit; hashes and provider labels are honest; unknown symbols do not create fake issuers or scores.

## Task 3: bounded disclosure patterns independent of outcomes

**Files:** modify `src/lib/cases.ts`, `src/lib/types.ts`; create `tests/cases.test.ts`. Leave old serialized raw files untouched.

**Consumes:** normalized `InsiderTrade[]`, price history for prior context only, explicit as-of. **Produces:** `detectCandidates(symbol:string, trades:InsiderTrade[], prices:PriceDaily[], asOf:string):Candidate[]`.

```ts
export type CandidatePattern = 'CLUSTER_BUY' | 'CLUSTER_SELL' |
  'REPORTED_BUY' | 'REPORTED_SELL' | 'BUY_DURING_PRICE_DECLINE';
export interface Candidate {
  id: string;
  symbol: string;
  pattern: CandidatePattern;
  direction: 'accumulate' | 'distribute';
  eventStart: string;
  eventEnd: string;
  distinctHolders: number;
  trades: InsiderTrade[];
  totalValue: number;
  availabilityVerified: boolean;
  reportedAt: string | null;
  interpretation: 'retrospective-disclosure-pattern';
}
```

- [ ] Add a local fixture builder returning every required `InsiderTrade` field; use one symbol, valid source URL, fixed timestamp, amount 100, price 10, value 1000, null percentages and cluster hint.
- [ ] Write these tests before changing the engine: one holder with three trades does not create a cluster; three holders within 30 inclusive dates do; events on day 0/29/58 cannot form one three-holder window; interleaved sell does not erase a valid buy cluster; reversing input order produces identical sorted output; future price changes do not alter any candidate.
- [ ] Implementation loop: sort each direction independently, for each unique event date collect `[date-29 days,date]`, count canonical distinct names, create one cluster if count>=3. Otherwise retain individual reported activity with deterministic ID from symbol/direction/date plus a hash of sorted natural transaction keys. Do not use array index or current time in IDs.
- [ ] Remove future-return references and old `caseScore` from candidate generation. Do not substitute a manually assigned “confidence.” Keep presentation unscored beyond count/value and the separate positioning index.
- [ ] For `BUY_DURING_PRICE_DECLINE`, require two valid prices at/before event end and around 30 calendar days earlier within seven-day tolerance; skip when insufficient. It may be a secondary descriptive tag rather than duplicate primary row; document the chosen representation and keep counts clear.
- [ ] Store feed reported timestamps but leave `availabilityVerified=false` for legacy records absent independent verification. Exclude transaction dates after as-of.
- [ ] Test no accusations or predictive language appear in generated templates. Templates are implemented in Task 8.

**Acceptance:** no future price can create a candidate or improve its ranking; distinct-holder rule and bounded window match methodology; old records are preserved but not mistaken for v2.

## Task 4: full-horizon outcomes using matched sessions

**Files:** create `src/lib/outcomes.ts`, `tests/outcomes.test.ts`; modify `src/lib/types.ts`, later connect in Task 6.

**Consumes:** sorted or unsorted issuer/benchmark close rows, event anchor, explicit as-of. **Produces:** `measureOutcome(prices:PriceDaily[], benchmark:PriceDaily[], anchor:string, horizon:7|30|60, asOf:string):MeasuredOutcome`.

```ts
export interface MeasuredOutcome {
  status: 'complete' | 'pending' | 'unavailable';
  reason: string | null;
  basis: 'transaction-relative-retrospective';
  horizonDays: 7 | 30 | 60;
  startDate: string | null;
  targetDate: string | null;
  endDate: string | null;
  elapsedDays: number | null;
  startClose: number | null;
  endClose: number | null;
  issuerPct: number | null;
  benchmarkPct: number | null;
  excessPp: number | null;
  adjustmentBasis: 'unverified';
}
```

- [ ] Build a price fixture helper with valid OHLC=close, volume=100, marketCap=null. Then implement this regression:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import type { PriceDaily } from '../src/lib/types';
import { measureOutcome } from '../src/lib/outcomes';

function p(symbol:string, date:string, close:number):PriceDaily {
  return {symbol,date,open:close,high:close,low:close,close,volume:100,marketCap:null};
}

test('nineteen elapsed days is not a thirty-day outcome', () => {
  const prices = [p('X.JK','2026-09-01',100), p('X.JK','2026-09-20',80)];
  const bench = [p('^IHSG','2026-09-01',1000), p('^IHSG','2026-09-20',990)];
  const result = measureOutcome(prices, bench, '2026-09-01', 30, '2026-09-20');
  assert.equal(result.status, 'pending');
  assert.equal(result.issuerPct, null);
});
test('matched complete window has exact returns', () => {
  const prices = [p('X.JK','2026-09-01',100), p('X.JK','2026-10-01',110)];
  const bench = [p('^IHSG','2026-09-01',1000), p('^IHSG','2026-10-01',1020)];
  const result = measureOutcome(prices, bench, '2026-09-01', 30, '2026-10-01');
  assert.equal(result.status, 'complete');
  assert.equal(result.startDate, '2026-09-01');
  assert.equal(result.endDate, '2026-10-01');
  assert.ok(Math.abs(result.issuerPct! - 10) < 1e-9);
  assert.ok(Math.abs(result.benchmarkPct! - 2) < 1e-9);
  assert.ok(Math.abs(result.excessPp! - 8) < 1e-9);
});
```

- [ ] Add weekend/holiday target test: choose the first **common** date after target within seven days, record elapsed days > horizon. Add missing benchmark, zero base close, no start within tolerance, duplicate date, and out-of-order input tests.
- [ ] Filter input dates to `<=asOf`; intersect valid date sets; apply start/end rules from the spec; never fall back to a price before target. Duplicate date with conflicting close is an error upstream, not last-row-wins here.
- [ ] For unavailable benchmark, return unavailable from this paired function. An optional separate issuer-only metric must have a distinct label; do not overload this contract.
- [ ] Use the same helper for holder dossier historical summaries. Show measured and pending denominators and explicitly say overlapping observations are not independent. If time is short, replace “batting average” with counts and remove the percentage rather than preserve a misleading metric.

**Acceptance:** all complete returns have real prices reaching the full horizon; differences are percentage points across the exact same sessions; pending is never formatted as 0%.

## Task 5: honest score coverage and robust cohorts

**Files:** modify `src/lib/score.ts`, `src/lib/types.ts`; create `tests/score.test.ts`.

**Consumes:** `SymbolData[]` and explicit anchor. **Produces:** `computeScoresV2(data:SymbolData[], asOf:string):ScoreV2[]`; `standardize(values:(number|null)[]):(number|null)[]` for isolated regression tests.

```ts
export type ComponentKey = 'insiderZ' | 'foreignTrend' | 'instNetZ' |
  'retailExodusZ' | 'fclassShift';
export interface ComponentV2 {
  raw: number | null;
  z: number | null;
  weight: number;
  contribution: number;
  status: 'available' | 'missing' | 'unrankable';
  reason: string | null;
  observedFrom: string | null;
  observedTo: string | null;
  observations: number;
}
export interface ScoreV2 {
  symbol: string;
  asOf: string;
  score: number | null;
  coverageWeight: number;
  components: Record<ComponentKey, ComponentV2>;
  methodVersion: 'radarx-v2';
}
```

- [ ] Write tests proving all-missing components remain null; fewer than five cohort observations are unrankable; five identical observations do not create infinite/extreme z; missing rows do not change statistics of valid rows; no singleton score is published; no future holder month enters earlier raw components.
- [ ] Example invariance test:

```ts
test('missing observations do not move the valid cohort', () => {
  const base = standardize([1,2,3,4,5]);
  const extended = standardize([1,2,3,4,5,null,null]);
  assert.deepEqual(extended.slice(0,5), base);
  assert.equal(extended[5], null);
});
```

- [ ] Implement percentile by sorted linear interpolation at `(n-1)*q`, using q=.25/.75 for IQR. All values must be finite. Compute median and scale once per component, not separately for every row.
- [ ] Implement raw windows inclusively: 90 dates means `anchor-89` through anchor; 14 means `anchor-13` through anchor. Do not mix an inclusive 91-day sum with a “90d” label.
- [ ] Remove the unbounded holder-count multiplier from raw reported-holder net. Retain source holder types; UI label covers all included types.
- [ ] Missing cap invalidates normalized foreign component. No broker rows means missing, not observed zero. Monthly pair must be before/equal anchor; if count-change is invalid, only that component is missing.
- [ ] Use the spec's fixed weights and min-two-rankable rule. `contribution = (z ?? 0) * weight * 100/3`; sum and round/clamp. `coverageWeight` sums weights for rankable components, never a probability.
- [ ] Test positive and negative signs, clipping, null versus real zero, future timestamp exclusions where verified, and a component lost after missing input. Document the changed method; do not tune weights to make TOWR or any chosen ticker look good.

**Acceptance:** zero means measured central position; unavailable means unavailable. Sparse evidence cannot masquerade as fully covered. Methodology and code use identical formulas.

## Task 6: reproducible generation and no stale case accumulation

**Files:** modify `scripts/compute.ts`, `src/lib/snapshot.ts`, `.gitignore`, `next.config.ts`; create `tests/compute.test.ts`, `data/derived-v2/manifest.json`, `scores.json`, `cases.json`.

**Consumes:** raw snapshot, Tasks 3–5 pure functions. **Produces:** `buildDerived(snapshot:Snapshot, asOf:string):DerivedSnapshot` exported from new `src/lib/derive.ts`; `DerivedSnapshot = {scores:ScoreV2[];cases:Array<Candidate & {outcomes:MeasuredOutcome[]}>}`. CLI writes that result and manifest.

- [ ] Add `src/lib/derive.ts` and ensure CLI `main` is not executed on import into tests. Keep core derivation free of fs/network/current date.
- [ ] Write tests: two builds of the same inputs/as-of are deeply equal; changing source rows removes obsolete case IDs in the new generated array; existing raw hashes remain unchanged; future rows do not alter earlier-anchor results where the contract excludes them.
- [ ] CLI requires a valid explicit `--as-of YYYY-MM-DD`; unknown flags or missing anchor fail. Output defaults to `data/derived-v2` only after checking the resolved path stays within repo data. Refuse writing to original raw filenames.
- [ ] Build whole arrays in memory, validate output, write temporary sibling files, then atomically rename to their final **derived-v2** files. Preserve raw files. A failed validation must not activate a partial set; write manifest last and verify member hashes at load time.
- [ ] Include stable sorted arrays and SHA-256 of raw bytes. `generatedAt` is the only expected volatile metadata; analytical output is reproducible. Add `schemaVersion`, engine version, as-of, source limitations.
- [ ] Run `npx tsx scripts/compute.ts --as-of 2026-09-22 --output data/derived-v2` only after the new non-destructive behavior is tested.
- [ ] Implement a v2 reader with matching manifest-hash checks, but keep application activation for Task 7 when consumers are migrated together. Do not silently fall back to v1 upon v2 corruption once activated.
- [ ] Run `npm run audit:data`, tests, typecheck, build. Save fresh case/score/complete/pending counts into verification evidence. Do not insist on legacy count 244 or 190 outcomes.
- [ ] `git diff -- data/*.json` must be empty. `git check-ignore data/derived-v2/manifest.json` should return no ignored-path match. Confirm Next traces include all three derived files.

**Acceptance:** generated artifacts match the current engine; no extinct merged-in cases; raw evidence preserved; repeat generation produces identical analytical JSON. Task 7 activates the verified artifacts in the app.

## Task 7: research services and honest flow coverage

**Files:** modify `src/lib/services.ts`, `src/lib/board.ts`; create `tests/services.test.ts`, `tests/flow.test.ts`; adapt all consuming pages to v2 types.

**Consumes:** validated snapshot and v2 derivations. **Produces:** read-only board, issuer, case, holder, and flow view models. Existing exported service names remain to minimize route churn.

- [ ] `getRadarBoard` uses all v2 scores, returns full-cohort counts and manifest as-of. Compute sparklines for visible rows only, from cached symbol indexes; missing series is an explicit empty-series state.
- [ ] Activate the verified v2 reader and migrate all page consumers in this task, preserving a compiling app. Use a null-score label and basic candidate/outcome fields immediately; Task 8 improves their English presentation and layout. Never expose v2 data under old EXIT_AHEAD labels or old case-score widgets.
- [ ] `getIssuerDossier`: validate normalized ticker against directory; return `status:'available'|'known-uncovered'|'unknown'`. Never create fake metadata for unknown input. Known price-only ticker is valid but lacks disclosure-derived score.
- [ ] Resolve case IDs exactly once; avoid double `decodeURIComponent` on already-decoded route params. Malformed user input must become not-found, not uncaught URI errors. Test a holder name containing `%`, apostrophe, and Unicode.
- [ ] Filter issuer cards by explicit 90-date window; label actual observed ranges and counts. Reuse the same calculated arrays for cards and explanation text.
- [ ] Flow ranking: use one shared date interval from as-of, preserve signed values, and expose `observations`, `expectedSessions`, `missingSessions`, `streakStatus`, `streak`.
- [ ] Use IHSG observed dates as an explicitly labeled **benchmark-observed session reference**, not a certified exchange calendar. If IHSG coverage itself is incomplete, display coverage uncertainty. A missing ticker row is unknown unless provider documentation establishes absence means zero.
- [ ] Streak walks the reference dates backwards; missing row ends an unverified streak and sets status `incomplete`, zero/negative ends the positive streak. Never skip a missing reference date to join two positive rows.
- [ ] Regression: reference dates Sep 14,15,16; issuer positives Sep 14/16 only => not `3 consecutive sessions`; status incomplete. Adjacent complete positives => correct count.
- [ ] Add tests that snapshot services work with fetch forbidden and never call store upsert. Add all-negative, all-null, empty, and corrupt snapshot behaviors.

**Acceptance:** full workflow has consistent dates/counts; gaps remain visible; unknown-input handling uses no quota.

## Task 8: English, evidence, mobile, and chart corrections

**Files:** modify all `src/app/**/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `src/components/{fmt,widgets,TimelineChart,TradesTable,SearchBox,Sparkline}.tsx` as applicable; create `DataStatus.tsx`, `EvidenceSummary.tsx`, `MobileNav.tsx`, `tests/format.test.ts`.

**Consumes:** Task 7 view models. **Produces:** the spec's complete research workflow, no new analytics hidden in JSX.

- [ ] Set `html lang="en"`, English metadata, navigation Board / Foreign flow / Cases / Methodology. Retain URLs. Provide mobile nav below topbar at widths below md, with visible active state and accessible name.
- [ ] Add explicit search label `Search issuer`; validate local input and display known/uncovered/unknown messages. Keep enter-to-submit and visible focus.
- [ ] Replace all `h` day abbreviations with `d`; format 1e9 as `1.0B`, 1e6 as `1.0M`, 1e12 as `1.0T`; use `en-US` grouping. Negative currency should read `−Rp236.2B`, not `Rp-236.2M`.
- [ ] Formatter tests: 1e9 => 1.0B; 1e6 => 1.0M; null return => `Pending` only when status pending, otherwise `Unavailable`; measured zero => `0.0%`. Do not infer status from number null alone.
- [ ] Add a persistent snapshot/coverage banner using manifest. On each issuer show source through-date and last market-cap date if used.
- [ ] `EvidenceSummary` deterministically lists strongest positive and negative available contributions plus missing components. Use phrases `Reported net sales`, `Observed foreign inflow`, `Broker context unavailable`; never `smart money knows`, `will rally`, or `safe entry`.
- [ ] Trade table adds transaction date, feed report date, holder type, and safe original-source link. Explain unavailable verified-publication timing. Keep source links usable on mobile and keyboard.
- [ ] Case detail shows bounded event span, distinct holders, source list, retrospective basis, complete/pending outcomes and actual measurement dates. Remove green unsigned case score and directional ScoreMarker reuse.
- [ ] Correct chart geometry. Use a flow panel top=218, bottom=276, zero=247; maximum absolute bar height=25; positive y=zero-height, negative y=zero; all bars fit. Place date text below panel. Extract a pure geometry helper and test extrema remain inside bounds.
- [ ] Use a single date-to-x mapping for price, flow, and markers; do not mix index spacing with calendar interpolation. Exclude out-of-range markers with an explicit count notice. Add chart title, description, sign legend, and a collapsible data table.
- [ ] Raise important small text to at least 12px; adjust faint color to meet 4.5:1 against used surfaces. Check contrast numerically and visually, not only with a scanner.
- [ ] Dossier mobile tables scroll inside their own containers; page body must not horizontally overflow. Fixed sidebar must not consume mobile width.
- [ ] Update methodology with exact v2 weights, missingness, cohort thresholds, correlated inputs, retrospective pattern/outcome separation, adjustment uncertainty, and snapshot limitations.
- [ ] Optional copy brief: one button copies ticker, as-of, observed facts, missing evidence, case URL, source URLs, and disclaimer. Show success/failure feedback; omit if deadline tight.

**Acceptance:** no visible Indonesian template prose remains; sources and limitations are reachable; charts do not clip negative flow; mobile navigation reaches every primary page; copy agrees with the engine.

## Task 9: integrated verification and observed usability

**Files:** create `playwright.config.ts`, `tests/e2e/research.spec.ts`, `.github/workflows/checks.yml`, `docs/verification/release-evidence.md`; modify package scripts, lockfile, Git allowlist.

**Consumes:** final local v2 runtime. **Produces:** automated evidence plus honest human-observation notes.

- [ ] Add `@playwright/test` as dev dependency only if not present. Install Chromium only for these tests. Add `test:e2e` script `playwright test`; allowlist `playwright.config.ts` and `.github/**`. Keep traces/screenshots/reports ignored by default.
- [ ] Configure local webServer `npm run dev -- --port 3107`, URL `http://localhost:3107`, `reuseExistingServer:false`; use a free dedicated port and close owned process after tests. Do not stop another agent's server.
- [ ] Configure projects for Desktop Chrome and viewport 390×844. Route externally initiated browser requests to block `api.sectors.app` and Arjum. Server-side no-fetch behavior is separately tested in Task 2/7.
- [ ] E2E tests: board distribution returns actual negative rows when dataset has them; click issuer; source link is http/https; case details include outcome status; mobile navigation reaches Foreign flow and Methodology; unknown ticker returns clear not-found; search names/codes; browser Back retains filter; no console error on normal journey.
- [ ] The test must assert meaningful data and state, not merely HTTP 200. Derive expected case/ticker IDs from the validated fixture rather than hardcoding legacy scores.
- [ ] Execute `npm test`, `npm run audit:data`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:e2e`, and `gitleaks git --redact --no-banner --log-level warn .`. Record exit codes and unresolved issues. Do not use `npm audit fix --force` as a cleanup step.
- [ ] CI runs `npm ci`, unit tests, lint, typecheck, build; no provider secrets. Browser tests can run in the same workflow with Chromium install if stable. Add secret scan if available; don't claim CI passed before seeing a run.
- [ ] Measure board/dossier payload and navigation timing on the deployment after approved release; report actual sample conditions. Aim for under 2 seconds warm navigation, but do not write that as achieved without measurement.
- [ ] Ask three real target users to: find a distribution example, identify when transactions were reported, open a source, and tell whether the 30-day outcome is complete. Record completion, mistakes, and elapsed time with consent. No automatic outreach without user authorization.
- [ ] If users are unavailable, label it `Usability validation not yet performed` and run an internal walkthrough without claiming user validation.

**Acceptance:** no known P0 findings remain; failures and limits are recorded; final numeric claims have a data/method pointer.

## Optional Task A: Arjum enrichment, after the core passes

**Files:** new `src/lib/providers/arjum.ts`, `scripts/enrich-arjum.ts`, `tests/arjum.test.ts`, `docs/DATA-SOURCES.md`; optional new private cache outside public-tracked paths. Do not modify main score weights.

**Gate:** user selects enrichment; credentials are explicitly supplied/authorized for this task; applicable data usage terms are checked; any necessary organizer clarification is recorded. No provider integration is needed to complete the primary plan.

- [ ] Read current public docs at `https://stock.arjum.com/api-docs`. Capture exact response fields and units from authorized samples before writing mapping. Do not guess a daily history schema from an endpoint name.
- [ ] Limit first pass to OHLCV for the final demo issuers, not the whole universe. Set request budget explicitly, default zero until configured. No key rotation/farming or automatic broad backfill.
- [ ] API client: base URL fixed, `X-API-Key` from server env, URL-encoded code, 10-second timeout, no more than two retries for transient 5xx; do not retry exhausted quota/auth failure. Log endpoint/status/count, never key/body with sensitive fields.
- [ ] Adapter contract: `fetchHistory(code:string, start:string, end:string):Promise<SupplementaryPrice[]>`, with each row carrying `provider:'arjum'`, date, nullable OHLCV, retrievedAt, adjustment basis. Establish whether volume is shares or lots from documented evidence; do not multiply by 100 speculatively.
- [ ] Keep original Sectors rows and provenance. Where same date closes disagree, show discrepancy and chosen source; never silently overwrite. Do not splice adjusted and unadjusted series into a single return.
- [ ] Broker endpoint uses `start_date/end_date` and may truncate buyers/sellers by default. If attempted, preserve response range and completeness; `all_data` availability must be verified. Keep aggregate ranges out of `BrokerSummaryRow[]` daily data.
- [ ] Tests use sanitized synthetic response fixtures; no external tests run in CI. Cases: null values, day duplicates, unit mismatch, date-range mismatch, quota error, timeout, incomplete broker response.
- [ ] Prove the Sectors dependency: with Sectors raw data and all Sectors derivatives absent, core disclosure reports are unavailable even if supplemental prices remain. Sectors-only mode must also still work with Arjum disabled.
- [ ] Do not commit raw supplemental data without established permission. If terms remain unknown, skip integration for this submission and record why. That skips optional scope, not the main release.

**Acceptance:** enrichment is transparently optional, lawful under verified terms, semantically correct, and does not replace the project's Sectors core. Cut it if not complete by 5 October.

## Task 10: reconcile English docs and claims

**Files:** modify `README.md`, `docs/HANDOFF.md`, `docs/SUBMISSION.md`, `SESSION.md`, `specs/PRODUCT_SPEC.md`, `specs/TECH_SPEC.md`; annotate `specs/PLAN.md` as superseded; create `docs/RELEASE-CHECKLIST.md` and `docs/CLAIMS.md`.

**Consumes:** verified v2 counts and workflow. **Produces:** judge-readable self-contained repo and handoff.

- [ ] README order: problem sentence; live link; snapshot notice; screenshot; three-step research workflow; no-key quick start; architecture/data lineage; methodology limits; verification commands; competition details.
- [ ] Quick start must be exactly viable: `npm ci`, `npm run dev`; no key or ingest required. Regeneration is a separate offline command with explicit as-of. Explain provider ingestion is disabled/optional.
- [ ] Replace 30 September with current 8 October deadline in active instructions. Preserve original plan as clearly historical, not another competing authority.
- [ ] Replace old “190 measured,” exact score, and headline return claims with values from the final manifest or remove them. Do not put draft-video claims into current README.
- [ ] `docs/CLAIMS.md` columns: public statement, source file/query, method version/as-of, verification result, limitations. Each video/social number must have a row.
- [ ] Explain Sectors REST endpoints actually consumed; do not advertise unused news/top-changes APIs or nonimplemented Supabase/cron.
- [ ] Check public screenshots and files for secrets. Preserve MIT license; license selection is not a hackathon requirement.
- [ ] Handoff starts with actual status, current revision, exact next actions, passed commands, open blockers, and “Do not submit before final review.”

**Acceptance:** a fresh agent or judge can run and verify the product without credentials; docs do not contradict output; no frozen old spec silently overrides v2.

## Task 11: record real product and complete submission

**Files:** update `docs/SUBMISSION.md`, `docs/CLAIMS.md`, `docs/RELEASE-CHECKLIST.md`; media stored in a user-approved project media folder, not Desktop. Do not replace existing videos without permission.

**Consumes:** final tested deployment/local build and reconciled claims. **Produces:** public 60-second screen-recorded teaser, accessible <=180-second judging walkthrough, English captions/script, thumbnail/social post, ready portal fields.

- [ ] Request deployment approval with concrete diff/test evidence if deployment has not already been authorized. Deploy the approved revision, verify the same snapshot/method version, then capture. Do not assume pushing `main` is harmless; this repo auto-deploys.
- [ ] Inspect existing MP4s if available, but do not certify them from old docs. Motion graphics may introduce/annotate; actual workflow footage must show the running app. Do not animate a nonexistent interface or bake a score into a fake screen.
- [ ] Record one clean end-to-end session after clearing incidental browser clutter. Show clicks, evidence, source, and pending/missing information. Use readable zoom, captions, and steady pointer motion.

**Teaser, 60 seconds:**

| Time | Real screen/action | English narration |
|---|---|---|
| 0–8s | Open saved research example with snapshot banner visible | “Public ownership disclosures are scattered. RADAR-X puts the evidence and its limitations in one research view.” |
| 8–20s | Board filter, then select a verified candidate | “Start with a pattern of reported activity, and see how much data supports the ranking.” |
| 20–36s | Issuer evidence and separate transaction/report dates | “See who reported a transaction, when it occurred, and when the feed reported it.” |
| 36–47s | Open original source and return | “Check the source yourself. The analysis stays connected to the disclosure.” |
| 47–55s | Outcome status, coverage gap or conflicting component | “Historical outcomes are separate. Incomplete windows stay pending.” |
| 55–60s | Product URL and Sectors attribution | “RADAR-X. Evidence-first IDX research, powered by Sectors data.” |

**Judging walkthrough, target 165–175 seconds:**

| Time | Required content |
|---|---|
| 0–20s | Audience and concrete research problem. No unsupported saved-time statistic. |
| 20–45s | Working board, complete distribution view, coverage and source-as-of. |
| 45–85s | One verified issuer/case, distinct holders, transaction versus report dates, original source. |
| 85–110s | Conflict/missing evidence and complete versus pending outcome. Explain retrospective basis. |
| 110–140s | Methodology and source lineage: Sectors raw records → bounded patterns / index → evidence view. Show why removal disables the core. |
| 140–160s | Reproducible snapshot, no-key repo setup, key regression tests, honest limitations. |
| 160–175s | User benefit, URL/repo, non-advisory positioning. |

- [ ] Speak only verified numbers from `docs/CLAIMS.md`. If TOWR remains example: distinguish 16 September transactions from 18 September feed reports. Do not repeat FILM “30-day -14.3%” from old scripts.
- [ ] Check duration with `ffprobe` if installed, otherwise an available media inspector; record actual duration, resolution, and file path. Preview the complete exports with audio/captions, not only first frame.
- [ ] Teaser public on YouTube/social media; judging video public/unlisted via allowed host. Check access in a logged-out browser. Upload/post only when user explicitly authorizes those external actions.
- [ ] Use the official provided thumbnail template and correct official Sectors tag. Prepare factual English caption; include snapshot context and avoid investment-performance marketing.
- [ ] Portal checklist: repo URL, public teaser URL, accessible judging URL, one-sentence English problem, Track 3, actual participant names, social URL, onboarding/roster verification.
- [ ] Confirm repo public status and creation date via GitHub read-only evidence; local commit date alone is insufficient. Ask user about code originality/exclusivity if not already established; do not claim it was independently proven by a scan.
- [ ] Final user review: show exact release revision, URLs, durations, completed checklist, unresolved limitations. The user clicks Submit final. Do not fill or submit the portal silently.
- [ ] Before freeze, ensure no scheduled data refresh, dependency automation, or unapproved auto-deployment changes the application afterward. Do not disable unrelated infrastructure.
- [ ] Record submission confirmation/time/revision in an external local note if already frozen; no subsequent repository edit to record the freeze. Keep repo public for required period.

**Acceptance:** real footage matches the final app and method, required links work, user submits only after all changes are finished, no post-freeze edits occur.

## Release checklist, copied into the final handoff

- [ ] Full cohort filtered before pagination; negative candidates are visible.
- [ ] No incomplete return labeled 7/30/60-day complete.
- [ ] No future price in pattern selection, case rank, or index.
- [ ] Distinct-holder cluster rule and event span verified.
- [ ] Transaction/report/availability dates and limitations explicit.
- [ ] Missing score components are not measured zero.
- [ ] Data version reproduces from raw input hashes with no stale cases.
- [ ] No runtime upstream calls, writes, or request-triggered recompute.
- [ ] Source URLs visible and sanitized; snapshot/coverage shown.
- [ ] English units/copy and mobile navigation verified.
- [ ] Signed SVG flow fits bounds and alternative data view exists.
- [ ] Lint, typecheck, unit/E2E tests, build, and secret scan pass with evidence.
- [ ] No-key clean setup works; README and method match final code.
- [ ] Optional external data rights/semantics/source labels established or feature omitted.
- [ ] Actual screen-recorded teaser public; judging walkthrough <=180 seconds and accessible.
- [ ] Social/template/tag, team names, track, problem statement, public repository complete.
- [ ] No unresolved eligibility issue; user reviewed final package before submission.
- [ ] Freeze respected and no updates scheduled after submission/deadline.

## Stop and escalation rules for the executing agent

- If you cannot verify a date, field unit, permission, or historical availability, mark it unknown and follow the conservative spec. Do not invent data.
- If a test contradicts the narrative, fix the narrative or method; do not tune fixtures to preserve a desired demo result.
- If a provider is down, keep the snapshot workflow working. Do not search vaults for unrelated keys or use another account.
- If time is short, omit Arjum, copy/export, visual flourishes, and dependency cleanup. Never omit the complete-horizon rule or future-data separation.
- If final submission occurred, stop changes and report remaining issues. Credential-leak exception follows organizer procedure only.
- Report each task as complete only with changed paths, test commands/results, and remaining limits. A plan checkbox alone is not evidence.

## Ready-to-paste prompt for the next agent

> Work in `C:\Users\GEEKOM A8\Documents\Apps\radar-x-hackaton`. Read AGENTS.md and its master pointer, then docs/AUDIT-2026-09-29.md, docs/superpowers/specs/2026-09-29-hackathon-readiness-design.md, and this plan completely. Implement the approved required tasks in order using executing-plans. The portal is still a draft and onboarding-before-code is user-confirmed. Do not ingest, test provider credentials, spend credits, delete files, copy prior-project code, push, deploy, post, upload, or submit without the relevant existing/user authorization. Preserve original raw snapshots and create derived-v2. Start by reproducing the board truncation regression. Run each task's semantic tests before moving on. Keep all product copy English. The goal is a source-verifiable research workflow and real screen-recorded submission, not new features for their own sake. Arjum is optional and gated; do not block the Sectors-only repair on it. Report exact evidence for completed work and clearly mark unknowns. Stop all project edits if final submission or deadline freeze applies.

## Plan self-review

Coverage checked against the proposed design: core board, immutable/provenance boundary, patterns, outcomes, score availability, deterministic data, services/flow gaps, English UX/charts, tests/usability, optional enrichment, docs, videos, and freeze each have an owning task. All five review-focus conditions have explicit tests or release gates. Type names and signatures above are proposed interfaces to implement, not claims about current exported APIs. No application code has been implemented by writing this plan.
