# RADAR-X release checklist

Status: merged release on `main`; production is live at [radar-x-beta.vercel.app](https://radar-x-beta.vercel.app/) serving **v3 Exit Watch** (`data/*.json` bundled via `outputFileTracingIncludes`). The portal is still a draft.

## Evidence and engine

- [x] Full score cohort is filtered before pagination; negative distribution rows are visible.
- [x] No incomplete 7-, 30-, or 60-day window is formatted as a complete return or 0%.
- [x] Future prices cannot change candidate membership or evidence.
- [x] Distinct-holder cluster rule and bounded event span are covered by tests.
- [x] Transaction date, feed report date, source URL, and unavailable timing are visible where available.
- [x] Missing score components remain missing; they are not treated as measured zero.
- [x] Derived artifacts are deterministic and hash-verified; raw snapshot files remain unchanged.
- [x] Runtime services do not fetch, write, or recompute on a request.
- [x] Source URLs accept only HTTP(S), and missing URLs are explicit.

## Product and accessibility

- [x] English navigation, metadata, methodology, and disclaimers.
- [x] Mobile navigation reaches Board, Foreign flow, Cases, and Methodology.
- [x] Keyboard focus outlines and a labelled issuer search are present.
- [x] Tables scroll inside their own containers on narrow screens.
- [x] Signed flow bars share a zero line, stay inside the chart geometry, and have a data table alternative.
- [x] Snapshot/as-of coverage is visible on board, issuer, and case views.

## Verification commands

```text
npm ci                        passed (403 packages, 0 vulnerabilities)
npm test                       37 passed
npm run audit:data             passed (8 files, 0 missing, 0 duplicate rows)
npm run lint                   passed
npm run typecheck              passed
npm run build                  passed (8 routes)
npm run test:e2e               7 passed, 1 intentional skip (desktop-only journey on mobile)
gitleaks git --redact --no-banner --log-level warn .   passed (no findings)
```

## Optional enrichment

- [x] Arjum/ZPI/Pluang are omitted from the release. Public redistribution terms, field semantics, and a current task-scoped key are not established.
- [x] Sectors remains the core source and the saved snapshot remains usable when upstream access is exhausted.

## Release gates completed by Codex

- [x] Push release branch and open [PR #1](https://github.com/alfindigital/radar-x/pull/1).
- [x] GitHub Actions verification passed on the merged `main` commit.
- [x] Merge the verified release to `main`.
- [x] Deploy production through the existing Vercel project.
- [x] Smoke-test the live root, Foreign flow, Cases, and Methodology routes with HTTP 200.
- [x] v3 smoke (2026-10-05): `/`, `/?v=radar`, `/?scope=suppressed`, `/broker`, `/broker?cohort=institutional`, `/saham/ADRO`, `/metodologi` all 200 on production.
- [x] Confirm the production `SECTORS_API_KEY` secret exists without reading its value.

## User-only gates before submission

- [ ] Reconfirm the public repository URL and verify its creation date.
- [ ] Upload the one-minute teaser publicly.
- [ ] Upload the judging video publicly or unlisted, with a duration no longer than three minutes.
- [ ] Publish the required social post with the official tag and template.
- [ ] Fill the portal draft with the exact URLs and English problem statement.
- [ ] User performs final review and clicks **Submit final**. The submission freezes immediately.
