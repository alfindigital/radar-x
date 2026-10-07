# RADAR-X session checkpoint

Date: 2026-10-07
Status: live on production; portal draft remains unsubmitted.

## Verified state

- Release: `main` at `a0a2c2b`; Vercel production deployment `dpl_C2Dx7ohC6sn94uSvWiEs3sHgdTnL` READY.
- Live app: [radarx.web.id](https://radarx.web.id) (beta alias: [radar-x-beta.vercel.app](https://radar-x-beta.vercel.app/)).
- Snapshot as-of: **2026-10-07**; derived engines `radarx-v2` + `radarx-v3` (exit watch).
- Derived artifacts: 962 score rows (865 non-null), 169 candidate cases, outcomes 198 complete / 106 pending / 203 unavailable; Exit Watch 244 publishable (57 high / 46 elevated / 90 watch / 51 low), 718 suppressed.
- Runtime is provider-free and read-only; derived artifacts are hash-verified before serving.
- Exit Watch window convention: inclusive calendar dates — `14-day = asOf-13 .. asOf` (2026-09-24 → 2026-10-07).
- English UI, mobile navigation, status-aware outcomes, source links, methodology, claims, release checklist, CI, and Playwright checks are in `main`.

## Verification

Run `npm ci`, then `npm test`, `npm run audit:data`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:e2e`. The exact evidence and limitations are recorded in [docs/verification/release-evidence.md](docs/verification/release-evidence.md), [docs/AUDIT-2026-10-06.md](docs/AUDIT-2026-10-06.md), and [docs/living/CURRENT_STATE.md](docs/living/CURRENT_STATE.md).

## Remaining user-controlled work

Repository publication and deployment are complete. Judging video (≤3 min), 1-minute teaser, social post, and final portal submission remain user-controlled. Record video against the 2026-10-07 numbers — earlier footage shows stale figures. The user must review the current revision and click **Submit final** only after every external URL and rule is verified. Deadline: 8 October 2026, 23:59 WIB.
