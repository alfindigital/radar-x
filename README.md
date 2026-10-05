# RADAR-X

RADAR-X is an evidence-first market-intelligence workflow for Indonesian equities. It turns a frozen Sectors snapshot into bounded reported-ownership patterns, a coverage-aware positioning index, foreign-flow context, and retrospective issuer-versus-IHSG outcomes.

**Track:** Sectors Hackathon 2026, Track 3 — Market Intelligence
**Live:** [radarx.web.id](https://radarx.web.id) (www → apex 308; beta alias: radar-x-beta.vercel.app)
**Current verified snapshot:** through 2026-10-01
**v3:** `/` is the Exit Watch board (cohort-labeled exit pressure); the v2 radar board is preserved at `/?v=radar`.
**Submission deadline in the current rules:** 8 October 2026, 23:59 WIB

The repository is designed to run without credentials or network access. The checked-in raw snapshot is read-only at runtime; generated v2 artifacts are hash-verified before the app serves them. Provider ingestion is optional and is not required for the demo.

## Research workflow

1. **Scan the Board.** Filter the full 962-issuer cohort by accumulation or distribution and inspect component coverage rather than a hidden truncated page.
2. **Open evidence.** Follow an issuer or candidate pattern to see the bounded event window, holder names, transaction date, feed report date, safe source links, foreign flow, and missing observations.
3. **Measure the past.** Read the 7-, 30-, and 60-day matched-session outcomes. Incomplete horizons stay Pending or Unavailable and are never shown as zero.

## Quick start

```bash
npm ci
npm run dev
# open http://localhost:3000
```

No API key is required for the saved-snapshot workflow. To regenerate derived artifacts offline, use an explicit date and keep the output under `data/`:

```bash
npm run compute -- --as-of 2026-09-22 --output data/derived-v2
```

Provider ingestion and any supplemental provider are intentionally outside the release path. Do not run them without explicit access, terms, and budget approval.

## Architecture and lineage

```text
data/*.json (frozen Sectors snapshot)
        │
        ├── snapshot/provenance validation + SHA-256 manifest
        ├── score.ts       → radarx-v2 positioning components
        ├── cases.ts       → bounded candidate patterns
        ├── outcomes.ts    → matched issuer/IHSG retrospective windows
        ├── exitwatch.ts   → cohort exit-pressure components (v3)
        └── derive.ts      → data/derived-v2/{scores,cases,exitwatch,manifest}.json
                              │
                              └── services.ts → Next.js research pages
```

The current manifest records 962 score rows (254 non-null scores), 171 candidate patterns, 301 complete outcomes, 170 pending outcomes, and 42 unavailable paired outcomes. These counts are snapshot-specific; verify `data/derived-v2/manifest.json` after regeneration.

## Method limits

- Scores are cross-sectional descriptive comparisons, not forecasts or recommendations.
- Components use robust interpolated-IQR standardization and publish only with at least two rankable components.
- Candidate membership stops at the anchor event; post-anchor prices can affect only the separate retrospective outcome.
- Outcomes use the first common issuer and IHSG observed sessions within the documented seven-day tolerance. Missing evidence remains visible.
- Legacy flat-OHLC or zero-volume observations may be marked `legacy-unknown`; publication timing is not independently verified for every legacy row.
- Sectors data is the core evidence source. Optional Arjum, ZPI, or Pluang enrichment is omitted from this release because public redistribution terms and current credentials are not established here.

RADAR-X is public-data research, not investment advice, a buy/sell recommendation, or an allegation about any person. Historical outcomes do not predict future returns.

## Verification

```bash
npm test
npm run audit:data
npm run lint
npm run typecheck
npm run build
npx playwright install chromium   # once — required before e2e
npm run test:e2e
```

The browser suite runs against the local snapshot, blocks Sectors and Arjum domains, and covers desktop and mobile navigation, distribution rows, issuer search, source URLs, case outcome states, and unknown issuers. See [release evidence](docs/verification/release-evidence.md) and [claims](docs/CLAIMS.md) for the latest recorded run.

## Competition handoff

The portal remains a draft. The final submission requires a public repository URL, a one-minute public teaser, a public or unlisted judging video of at most three minutes, an English one-sentence problem statement, Track 3, a team snapshot, and a required social post URL. Do not click **Submit final** until the release checklist is reviewed by the user.
