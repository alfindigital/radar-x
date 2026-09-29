# RADAR-X verification evidence

This file records the latest local release-candidate checks. It does not certify a deployment, public repository state, video URL, or portal submission.

## Revision and workspace

- Worktree: `C:\Users\GEEKOM A8\.codex\worktrees\radarx-readiness\radar-x-hackaton`
- Branch: `codex/radarx-readiness`
- Base: `3ea9334`
- Snapshot as-of: `2026-09-22`
- Derived input hash: `abd41f5889f62c60deb695af54b1003a82b368e456a0e373193f5c4fa83636c3`
- Derived rows: 962 scores (254 non-null), 171 candidates, 301 complete outcomes, 170 pending outcomes, 42 unavailable outcomes.

## Commands

| Command | Result | Notes |
|---|---|---|
| `npm test` | PASS | 37 tests passed. |
| `npm run audit:data` | PASS | Eight required raw files present; no duplicate rows; lag/zero-volume limitations reported. |
| `npm run lint` | PASS | ESLint exit 0. |
| `npm run typecheck` | PASS | TypeScript exit 0. |
| `npm run build` | PASS | Next.js production build completed with eight routes. |
| `npm run test:e2e` | PASS | Seven tests passed; one desktop-only journey skipped in the mobile project. Provider domains were blocked. |
| `gitleaks git --redact --no-banner --log-level warn .` | PASS | Gitleaks returned exit 0 with no findings. |

## Browser coverage

The Playwright suite checks the real local UI: accumulation/distribution board navigation, a negative distribution row, issuer dossier source links, browser Back preserving the filter, case outcome state and bounded window, known and unknown issuer search, and mobile links to Foreign flow and Methodology. A hydration mismatch found during the first run was fixed by deferring the mobile active-state calculation until mount; the subsequent run passed.

## Human observation

Three external target-user sessions have not been performed. A local browser walkthrough is covered by the E2E suite; do not describe it as user validation.

## Open gates

Deployment, public video uploads, social posting, portal edits beyond the draft, and final submission remain user-controlled actions. No API key was tested or persisted during this sprint.
