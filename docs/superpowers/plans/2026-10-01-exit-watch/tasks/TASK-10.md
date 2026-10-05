# TASK-10 — Methodology + claims + copy + metadata

**Status:** ✅ · **Depends on:** TASK-03..09 (documents what exists)
**Plan:** `../2026-10-01-exit-watch.md` · **Specs:** all V3

## Goal

Every claim a judge can check is written down with file:line evidence, and
the product copy stays inside bounded language.

## Files

- **Edit** `src/app/metodologi/page.tsx` — add Exit Watch section
- **Edit** `src/app/layout.tsx` — metadata `title`/`description` → v3 framing
- **Edit** `docs/CLAIMS.md` (create if absent — check) — v3 claims register
- Sweep new UI copy (TASK-06..08 strings) against banned terms

## `/metodologi` additions

New section "Exit Watch (v3)":

1. **Question**: "Which investor cohorts appear to be exiting this stock, and
   who is absorbing the pressure?"
2. **Formula** (exact weights): `instExit 0.30 · foreignExit 0.25 ·
   insiderExit 0.25 · retailAbsorb 0.20`; robust cross-sectional z
   (median/IQR); score = 50 + Σ clamp(z)·w·100, emitted only when coverage ≥0.5.
3. **Cohort labeling caveat** — MUST state plainly: brokers are labeled by
   `broker_registry` cohort; we label *captured* top-N rows, this is not a
   true per-cohort audit; `sparse_broker` flag marks thin evidence;
   `cohort_top.json` (when present) is true per-cohort top-N.
4. **Coverage & missing data** — components absent ≠ zero; suppressed rows
   are visible.
5. **Interpretation limits** — heuristic pressure, not proof of intent;
   suspensions/corp-actions shown as context flags, not causes.
6. Provenance: feed file names + derived hash + `asOf`.

## Metadata (PK1 copy register)

`layout.tsx`: title → `RadarX — IDX Market Intelligence` (DE1 descriptor);
tagline T1 "Read the flow. Check the evidence." in header/hero copy;
description mentions broker-cohort flow + reported holdings with bounded
wording. V1 Analyst plain labels per DESIGN_SPEC_V3 §5.

## CLAIMS.md (v3 section)

| Claim | Where verified |
|---|---|
| "monitors institutional/foreign/insider exits vs retail absorption" | `src/lib/exitwatch.ts` component raws |
| "score only when ≥50% component coverage" | `exitwatch.ts` coverage gate |
| "suspension & corporate-action context flags" | `flags` derivation + `data/suspensions.json` |
| "cohorts labeled from official broker registry" | `data/broker_registry.json` + `feeds.ts` |
| "Sectors API only, local snapshot, hash-verified" | `snapshot.ts`, `derive.ts` manifest |

## Copy sweep

Grep entire `src/` + specs for `smart money|bandar|akumulasi|distribusi`
(colloquial) — zero hits in user-facing strings. "Accumulation/distribution"
allowed only as `Positive/Negative Disparity` v2 labels already cleaned in
`827d086`. "Exit liquidity" is allowed (microstructure term).

## Done when

- [ ] Metodologi page explains formula + caveats in plain language.
- [ ] CLAIMS.md lists every public-facing claim with evidence path.
- [ ] No banned terms in new copy; metadata updated.
- [ ] **User follow-up noted:** judging video (v2 narrative) needs re-record —
      flag in `docs/living/HANDOVER.md`.

## Pitfalls

- Don't claim "real-time" or "predictive" anywhere.
- Keep the v2 methodology section intact — v3 is additive.
