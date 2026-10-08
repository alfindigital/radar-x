# RADAR-X v3 — Judging video script (≤ 3:00)

> Recorded on **production** `radarx.web.id`, desktop 1920×1080, light theme.
> Composited in Remotion (`video/`, not shipped in the repo): browser chrome with
> visible URL, mono captions, ElevenLabs English VO (voice `cgSgspJ2msm6clMCkdW9`).
> Final cut: **96 s** judging / **40 s** teaser. Every number below matches
> `data/derived-v2/exitwatch.json` as-of 2026-10-08.

## Final judging timeline (~1:36)

| # | Shot | Footage | VO (as generated) |
|---|------|---------|-------------------|
| 0 | Intro card | Official Sectors cover + "Judging walkthrough" | — |
| 1 | `01 / EXIT WATCH BOARD` | `/` scroll (16.5 s) | "IDX filings tell you who bought, not who is leaving. RADAR-X reads reported ownership, broker flow, and corporate context across nine hundred sixty-four listed issuers, and turns them into an exit-pressure reading." |
| 2 | `02 / COVERAGE, HONESTLY STATED` | `/` stats row → click **Suppressed** tab (11.2 s) | "Eight hundred forty-four issuers have enough evidence to publish a reading. One hundred twenty do not, and we show that honestly instead of scoring them zero." |
| 3 | `03 / SUPPRESSED IS A STATE` | suppressed list scroll (8.4 s) | "Suppression is a first-class state. Missing evidence stays visible. That is the whole product." |
| 4 | `04 / ISSUER DOSSIER — SMLE` | `/stock/SMLE`: EW 100 badge, SUSP ≤14D, cohort net-flow bars, components, context (14.6 s) | "Each dossier shows the daily tug-of-war between brokers classified institutional and retail, drawn from an eighty-eight-firm labeled registry, plus the four components behind the reading and the corporate context inside the window." |
| 5 | `05 / BROKER COHORT LEADERBOARD` | `/broker` → Institutional tab → Retail tab (12.4 s) | "The same registry powers a broker leaderboard you can split by cohort. Stockbit's retail flow and UBS's institutional flow are different sessions, not one blended list." |
| 6 | `06 / METHODOLOGY & LINEAGE` | `/methodology` scroll (13.8 s) | "Every number is computed offline from a hash-verified snapshot. N-p-m run compute reproduces it byte for byte. Nothing fetches or recomputes at request time." |
| 7 | `07 / EVIDENCE-FIRST` | `/` board freeze (10.0 s) | "RADAR-X. Evidence-first market intelligence for IDX. Descriptive, reproducible, and honest about what it does not know." |
| 8 | Outro card | RADAR-X wordmark + radarx.web.id + repo + disclaimer (5 s) | — |

## Teaser timeline (~40 s)

Intro (cover, "60-second teaser") → board hook (12.3 s) → dossier EW panel
(8.4 s) → suppressed list (6.2 s) → board + close (6.5 s) → outro (3.8 s).

VO lines: "IDX filings show who bought. Not who is leaving. RADAR-X turns public
disclosures into an exit-pressure reading for all nine hundred sixty-four
issuers." / "Every dossier shows the daily tug-of-war between institutional and
retail brokers, plus the evidence behind the reading." / "Issuers without
enough evidence are shown as suppressed, not scored zero." / "RADAR-X.
Evidence-first market intelligence. Descriptive, not advice."

## Numbers on screen (verified vs artifact, 2026-10-08)

- Scored **844** of **964** issuers · Suppressed **120** · Flagged 392
- Tiers: high 189 / elevated 122 / watch 351 / low 182
- Broker registry **88** firms (39 institutional / 42 mixed / 5 retail / 2 unknown)
- Dossier money-shot: **SMLE** — EW 100, SUSP ≤14D, insider sells Rp7.1B/90D,
  institutional net −Rp3.3B vs retail −Rp414.7M over 9 sessions

## Hard rules kept

- URL bar visible (`radarx.web.id` in chrome) on every footage shot.
- Words used: *reading, pressure, evidence* — never "prediction".
- Persistent footer strip: "Descriptive statistics from public IDX
  disclosures — not investment advice." + full disclaimer on outro card.
- No `localhost`, no mid-load cuts (dossier loading state trimmed).
