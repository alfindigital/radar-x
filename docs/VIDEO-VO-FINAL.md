# RADAR-X — Final VO script (eleven_v4, review before render)

Voice: **Matilda (female)** selected. Brian (male) kept as A/B fallback.
Audio: `video-assets/vo/v4/{female,male}-{id}.mp3` + mirrored `video/public/vo/`.
Numbers below are locked to the **merged dashboard** (positioning index + distribution pressure).

## Judging (female 132.7s / male 126.9s · limit 180s)

| Shot | Screen | VO |
|---|---|---|
| j1 | Dashboard `/` | "Radar-X reads public IDX disclosures and scores reported positioning and distribution pressure for nine hundred and sixty two listed issuers." |
| j2 | `?scope=suppressed` | "Nine hundred and fifty seven carry a positioning reading. Eight hundred and forty four carry a pressure reading. Seven have neither — Radar-X suppresses rather than guessing." |
| j3 | SMLE dossier top | "SMLE tops the board — distribution pressure reads one hundred, suspension flagged within the last two weeks, and the chart marks exactly where insiders reported selling." |
| j4 | SMLE dossier scroll | "Scroll further and you get the paper trail — the actual reported transactions: who sold, how much, when, filed straight to the exchange. Evidence first, number second." |
| j5 | `/broker` cohorts | "Under the hood, an eighty-eight-firm broker registry splits channels into institutional and retail — so flow means what it says. Stockbit reads retail. UBS reads institutional." |
| j6 | `/foreign` | "The foreign radar ranks fourteen sessions of signed foreign flow — accumulating names on one side, distributing on the other." |
| j7 | `/cases` | "And when disclosures cluster — insiders selling into strength, names that rhyme with past events — the cases feed surfaces them as candidate patterns, each linked to its filings." |
| j8 | `/methodology` | "Everything is computed offline from Sectors data, hashed, and reproducible. The methodology page lists every input, every window, every caveat." |
| j9 | Dashboard end | "Radar-X does not tell you what to buy. It shows reported exit pressure — and it shows you when there is not enough evidence to say. radarx dot web dot id." |

## Teaser (female 50.6s / male 48.4s · limit 60s)

| Shot | Screen | VO |
|---|---|---|
| t1 | Dashboard `/` | "IDX filings show who bought. Radar-X shows who is positioning — and who is leaving." |
| t2 | SMLE dossier | "SMLE reads one hundred on distribution pressure — institutions distributing billions while retail absorbs. Every score opens the evidence behind it." |
| t3 | `?scope=suppressed` | "And when the evidence is too thin, the score is suppressed — not faked." |
| t4 | Dashboard end | "Descriptive, reproducible — not investment advice. radarx dot web dot id." |

## Number truth table (screen ↔ VO)

| Claim | Screen shows | VO says |
|---|---|---|
| Universe | header `962 issuers` (live tickers) | "962 listed issuers" ✓ |
| Positioning scored | 957 non-null v2 scores | "957 carry a positioning reading" ✓ |
| Pressure scored | 844 publishable | "844 carry a pressure reading" ✓ |
| Fully suppressed | SUPPRESSED tab = 7 | "seven have neither" ✓ |
| Broker registry | `FIRMS CLASSIFIED 88` | "eighty-eight-firm registry" ✓ |
| Foreign window | `14d ending` | "fourteen sessions" ✓ |
| SMLE | `DISTRIBUTION PRESSURE 100` + `SUSP ≤14D` | "distribution pressure reads 100 … suspension flagged" ✓ |

> Docs note: README/artifact say **964 rows** (includes 2 quarantined issuers); UI header and VO use **962 listed issuers** — defensible split, keep both stories straight in the portal text.
