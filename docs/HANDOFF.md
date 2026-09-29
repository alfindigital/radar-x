# RADAR-X handoff

## Actual status

This checkout contains the merged Sectors Hackathon 2026 Track 3 release candidate. PR [#1](https://github.com/alfindigital/radar-x/pull/1) merged it to `main` at `bfdacc62ee4d34b514f6efb485e83a864289233d`; production is live at [radar-x-beta.vercel.app](https://radar-x-beta.vercel.app/). The portal screenshot is still a draft; **Submit final** has not been clicked.

The app serves a hash-verified Sectors snapshot through 2026-09-22 and generated `radarx-v2` artifacts. The verified artifact contains 962 score rows (254 non-null), 171 bounded candidate patterns, 301 complete outcomes, 170 pending outcomes, and 42 unavailable outcomes. See [CLAIMS.md](CLAIMS.md) for traceable statements.

## Passed gates

```text
npm test
npm run audit:data
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

The latest browser run passed seven tests and intentionally skipped the desktop-only journey in the mobile project. It blocks Sectors and Arjum domains and does not use credentials.

## Exact next actions

1. Review the current branch and [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md).
2. Record a real screen session for the one-minute teaser and the <=3-minute judging video; both must show the running app and the visible limitations.
3. Upload videos and publish the required social post only after the user approves those external actions.
4. Fill the portal draft with the public repository, video URLs, English one-sentence problem statement, Track 3, team snapshot, and social URL.
5. The user performs the final review and clicks **Submit final**. Do not submit silently; submission freezes edits.

## Open blockers and limits

- Sectors API access/credits are exhausted for this sprint; no key was tested.
- Arjum, ZPI, and Pluang enrichment is omitted because public redistribution terms and a task-scoped credential are not established.
- Three external target-user usability sessions have not been performed.
- Public repository age, media URLs, social post, and portal fields are unverified.

## Do not submit before final review

Do not infer eligibility, public accessibility, video duration, or repository creation age from local files. Verify each external fact immediately before the user submits.
