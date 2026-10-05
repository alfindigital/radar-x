# RADAR-X v3 — Judging video script (≤ 3:00)

> Record on **production** (radar-x-beta.vercel.app / radarx.web.id once live),
> desktop width, light theme. English voiceover — jury-facing. Every claim on
> screen is backed by `data/` + `docs/EVIDENCE_V3.md`.

## Shot list

| # | Time | Screen | Action | Voiceover |
|---|------|--------|--------|-----------|
| 1 | 0:00–0:18 | `/` Exit Watch board | Slow scroll past badges + flags | "IDX filings tell you who bought — not who is leaving. RADAR-X reads reported ownership, broker flow, and corporate context for all 962 listed issuers, and turns them into an exit-pressure reading." |
| 2 | 0:18–0:40 | `/` header + scope tabs | Point at "247 scored · 715 suppressed (low coverage)"; click **Suppressed** | "Two hundred forty-seven issuers have enough evidence to publish a reading. Seven hundred fifteen don't — and we show that honestly instead of scoring them zero." |
| 3 | 0:40–1:15 | Suppressed list | Scroll slowly; show "Showing first 150 of 715" | "Suppression is a first-class state. Missing evidence stays visible — that's the whole product." |
| 4 | 1:15–1:50 | `/saham/ADRO` (or a score-100 name like LUCY) | Scroll through Exit Watch panel: badge, **tug-of-war chart** (institutional blue vs retail ochre), component cards with z-scores, suspension/CA context | "Each dossier shows the daily tug-of-war between brokers classified institutional and retail — from an 88-firm labeled registry — plus the four components and what corporate context sits inside the window." |
| 5 | 1:50–2:15 | `/broker` + `/broker?cohort=` | Click Institutional tab, then Retail | "The same registry powers a broker leaderboard you can split by cohort — Stockbit's retail flow versus UBS's institutional flow are different sessions, not one blended list." |
| 6 | 2:15–2:45 | `/metodologi` | Scroll: component weights, "missing is not zero" note | "Every number is computed offline from a hash-verified snapshot — `npm run compute` reproduces it byte-for-byte. Nothing fetches or recomputes at request time." |
| 7 | 2:45–3:00 | Back to `/` | Freeze on board | "RADAR-X — evidence-first market intelligence for IDX. Descriptive, reproducible, and honest about what it doesn't know." |

## Hard rules for the recording

- **Show the URL bar** — judges should see the public domain, not localhost.
- Do **not** say "score = prediction". Approved words: *reading, pressure,
  evidence, observed*. The footer disclaimer must be on screen at least once.
- If a route is slow on first hit (cold start parsing the snapshot), let it
  finish — don't cut mid-load; it proves it's a real deployment.
- Keep cursor movements slow; this is a judging artifact, not a demo reel.

## Teaser (≤ 1:00) — compressed cut

1. 0:00–0:10 — board + hook line (shot 1).
2. 0:10–0:30 — dossier tug-of-war (shot 4, sped up).
3. 0:30–0:45 — suppressed scope (shot 3).
4. 0:45–1:00 — metodologi + closing line (shots 6–7).

## Before recording

- [ ] `radarx.web.id` resolves to production (record only after it does).
- [ ] `npm run build && npm start` sanity pass locally, or smoke the prod URL.
- [ ] Pick the dossier issuer in advance: prefer a high-score name WITH a
      suspension/corp-action context row (e.g. SMLE showed `SUSP ≤14D`) over
      ADRO if it reads better on camera.
- [ ] Dark theme optional for teaser; judging video in light theme (default).
