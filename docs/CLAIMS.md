# RADAR-X claims register

Every public number must be traceable to a file, query, method version, and as-of date. Replace a row's `pending` result only after a fresh verification run.

| Public statement | Source file / query | Method / as-of | Verification result | Limitations |
|---|---|---|---|---|
| The saved snapshot contains 962 score rows, with 254 non-null v2 scores. | `data/derived-v2/manifest.json`, `data/derived-v2/scores.json` | `radarx-v2`, 2026-09-22 | Verified by `npm run compute` and `npm test` | Snapshot-specific; score availability varies by issuer. |
| The derived feed contains 171 bounded candidate patterns. | `data/derived-v2/manifest.json`, `data/derived-v2/cases.json` | `detectCandidates`, 2026-09-22 | Verified; IDs are deterministic and duplicate-safe | Patterns describe reported activity and do not establish intent. |
| Outcomes are separate from candidate membership. | `src/lib/cases.ts`, `src/lib/outcomes.ts`, `tests/cases.test.ts`, `tests/outcomes.test.ts` | matched-session retrospective basis | Verified by future-price and horizon tests | Complete/pending/unavailable status depends on saved rows and as-of. |
| Current outcome counts are 301 complete, 170 pending, and 42 unavailable. | `data/derived-v2/cases.json` | `measureOutcome`, 2026-09-22 | Verified from the checked-in artifact | Counts include three horizons per candidate and are not unique cases. |
| Source links are sanitized to HTTP(S). | `src/lib/provenance.ts`, `src/components/TradesTable.tsx` | `safeSourceUrl` | Verified by unit and browser tests | A missing source URL is shown as Unavailable. |
| The app can run without an API key. | `README.md`, `data/*.json`, `src/lib/services.ts` | saved snapshot / hash-verified derived artifacts | Verified by unit, build, and E2E tests with provider domains blocked | Regeneration and optional ingestion require separately authorized access. |
| Sectors is the core data source for the submission. | `src/lib/snapshot.ts`, `docs/AUDIT-2026-09-29.md` | snapshot lineage | Verified from local files | Arjum, ZPI, and Pluang enrichment is intentionally omitted. |
| The current competition deadline is 8 October 2026, 23:59 WIB. | Current rules pasted by the user | portal rules | Accepted as the current authority | Older local notes mention 30 September and are historical only. |
| Teaser, judging, and social URLs are ready. | `docs/SUBMISSION.md` | external media / post | **Pending user action** | No upload, post, or portal submission has been performed. |
