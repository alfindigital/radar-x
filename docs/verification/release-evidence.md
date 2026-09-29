# RADAR-X verification evidence

This file records the latest release checks and the verified public deployment. It does not certify a video URL, social post, or portal submission.

## Revision and workspace

- Worktree: `C:\Users\GEEKOM A8\.codex\worktrees\radarx-readiness\radar-x-hackaton`
- Branch: `codex/radarx-readiness`
- Merged release commit: `bfdacc62ee4d34b514f6efb485e83a864289233d` via [PR #1](https://github.com/alfindigital/radar-x/pull/1)
- Snapshot as-of: `2026-09-22`
- Derived input hash: `abd41f5889f62c60deb695af54b1003a82b368e456a0e373193f5c4fa83636c3`
- Derived rows: 962 scores (254 non-null), 171 candidates, 301 complete outcomes, 170 pending outcomes, 42 unavailable outcomes.

## Commands

| Command | Result | Notes |
|---|---|---|
| `npm ci` | PASS | 403 packages installed; zero vulnerabilities. |
| `npm test` | PASS | 37 tests passed. |
| `npm run audit:data` | PASS | Eight required raw files present; no duplicate rows; lag/zero-volume limitations reported. |
| `npm run lint` | PASS | ESLint exit 0. |
| `npm run typecheck` | PASS | `next typegen` runs before TypeScript so clean CI checkouts include Next 16 route helpers. |
| `npm run build` | PASS | Next.js production build completed with eight routes. |
| `npm run test:e2e` | PASS | Seven tests passed; one desktop-only journey skipped in the mobile project. Provider domains were blocked. |
| `gitleaks git --redact --no-banner --log-level warn .` | PASS | Gitleaks returned exit 0 with no findings. |

## Browser coverage

The Playwright suite checks the real local UI: accumulation/distribution board navigation, a negative distribution row, issuer dossier source links, browser Back preserving the filter, case outcome state and bounded window, known and unknown issuer search, and mobile links to Foreign flow and Methodology. A hydration mismatch found during the first run was fixed by deferring the mobile active-state calculation until mount; the subsequent run passed.

## Human observation

Three external target-user sessions have not been performed. A local browser walkthrough is covered by the E2E suite; do not describe it as user validation.

## Public release evidence

- Production URL: [radar-x-beta.vercel.app](https://radar-x-beta.vercel.app/)
- Vercel production deployment: `radar-cdzka97wk-muhammad-alfin-as-projects.vercel.app`, Ready, created 2026-09-29 22:08 WIB.
- Smoke checks on `/`, `/asing`, `/kasus`, and `/metodologi`: HTTP 200; cache-busted `/` confirmed the RADAR-X title and Historical Sectors snapshot marker.
- Vercel environment inventory confirms `SECTORS_API_KEY` exists as a hidden Production secret. Its value was not read, tested, or persisted.
- GitHub Actions `verify` for merge commit `bfdacc62` passed; Vercel production deployment passed.

## Open gates

Public video uploads, social posting, portal edits beyond the draft, and final submission remain user-controlled actions. The deployed app serves the committed snapshot without requiring a runtime provider request; no API key value was read, tested, or persisted during this sprint.
