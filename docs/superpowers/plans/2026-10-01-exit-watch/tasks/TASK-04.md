# TASK-04 — Derive artifact `exitwatch.json` (`engineVersion:"radarx-v3"`)

**Status:** ✅ · **Depends on:** TASK-03 · **Gate:** G3
**Plan:** `../2026-10-01-exit-watch.md`

## Goal

`exitwatch.json` joins `data/derived-v2/` alongside `scores.json`/`cases.json`,
sha256-verified, loaded by `loadDerived()`, with v3 provenance — while v2
artifacts keep working.

## Files

- **Edit** `src/lib/derive.ts`
- **Edit** derive entry point — find it: `scripts/` (check `package.json`
  scripts for `derive`; likely `scripts/derive.ts` or a flag on ingest)
- **Create** `tests/derived-v3.test.ts`

## Steps

1. `derive.ts` additions:
   ```ts
   export interface ExitWatchArtifact {
     schemaVersion: 1;
     engineVersion: "radarx-v3";
     asOf: string;
     generatedAt: string;
     inputHash: string;       // snapshot inputHash + feed sha256 list
     methodology: { weights: Record<string, number>; coverageFloor: 0.5; windowDays: 14; insiderDays: 90 };
     rows: ExitWatchRow[];
   }
   ```
   - `buildDerived` gains: load feeds (registry/freeFloat/suspensions/
     corpActions/brokerTop via `loadRegistry()` etc. — see TASK-02 note on
     sync/async), compute `computeExitWatch`, attach artifact.
   - `DerivedSnapshot` gains `exitWatch: ExitWatchRow[]`; manifest gains
     `files: […, {path:"exitwatch.json", rows}]` and `engineVersion` stays
     `"radarx-v2"` for the **v2 manifest** — instead emit a separate
     `manifest` field `derivedFiles` OR bump manifest to include the v3 file
     with its own `engineVersion` per-file meta. Simplest: keep one manifest,
     add `{path:"exitwatch.json", rows, engineVersion:"radarx-v3"}` — extend
     `DerivedFileMeta` with optional `engineVersion`.
   - `feedHashes: Record<string,string>` in manifest = each feed file's
     sha256 (from `Feed.meta`) so provenance covers feeds too.
2. `writeDerived` path — check how `scores.json`/`cases.json` get written
   today (grep `derived-v2` in scripts): replicate for `exitwatch.json`
   (write `JSON.stringify(rows, null, 2) + "\n"`; manifest file lists sha256).
   If the writer is inline in the derive script, add the third file there.
3. `loadDerived()`: extend the file loop to include `exitwatch.json`
   **optionally** — if the file is absent (fresh clone), return
   `exitWatch: []` rather than throwing; v2 hashes still enforced.
4. Tests: round-trip — write tiny artifact to temp dir, `loadDerived` returns
   it; tamper byte → hash mismatch throws; absent file → `exitWatch: []`.

## Test command

```bash
npx tsx tests/derived-v3.test.ts && npm run derive && npm test
```

## Done when

- [ ] `data/derived-v2/exitwatch.json` written by `npm run derive`.
- [ ] `loadDerived()` returns `exitWatch` rows with sha256 verification.
- [ ] Manifest lists all 3 files + feed hashes + v3 methodology block.
- [ ] Fresh-clone path: missing `exitwatch.json` → empty array, no throw.

## Pitfalls

- Do NOT bump `manifest.schemaVersion`/`engineVersion` top-level — that
  breaks `loadDerived`'s version guard for v2. Use per-file `engineVersion`.
- Windows LF: `JSON.stringify` output is already `\n`-only; do not append
  `\r\n` (`.gitattributes` pins LF anyway, but keep writes clean).
- Input hash: combine `snapshot.manifest.inputHash` + sorted
  `path:sha256` lines of every feed actually consumed — so a feed change
  changes the derived hash.
