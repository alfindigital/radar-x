# MODULE_MAP — RADAR-X

> Indeks modul; detail baru ditambah saat modul v3 mendarat.

## Pipeline

`Sectors API` → `scripts/ingest.ts` → `data/*.json` → `scripts/compute.ts` → `src/lib/derive.ts` → `data/derived-v2/*.json` → `src/lib/services.ts` → `src/app/*` pages.

## Lib (`src/lib/`)

| File | Peran |
|---|---|
| `sectors.ts` | typed API client (retry 429, `SectorsError`) |
| `sectors-v3.ts` | *(v3)* pure mappers cohort-top + corp-actions |
| `exitwatch.ts` | *(v3)* exit-pressure engine + flags |
| `score.ts` | positioning score v2, `standardize` robust-z |
| `derive.ts` | `buildDerived` → scores/cases/exitwatch + manifest |
| `snapshot.ts` | hash-verified snapshot loader (8 wajib + 6 opsional) |
| `db.ts` | `JsonStore` keyed upserts |
| `cases.ts` `outcomes.ts` | pattern detection + measured outcomes |
| `services.ts` | satu-satunya pintu UI → data |
| `flow.ts` `board.ts` `price-merge.ts` `provenance.ts` `chart-geometry.ts` `types.ts` | support |

## Pages (`src/app/`)

`/` board · `/saham/[ticker]` dossier · `/asing` foreign flow · `/kasus` + `/kasus/[id]` cases · `/orang/[holder]` person · `/metodologi` · *(v3)* `/broker` + `/broker/[code]`.

## Data files

Wajib: `tickers` `insider_trades` `flow_daily` `price_daily` `broker_rows` `holders_monthly` `cases` `positioning_scores`. Opsional v3: `broker_registry` `suspensions` `corporate_actions` `free_float` `cohort_top` `broker_top`. Derived: `scores.json` `cases.json` `exitwatch.json` `manifest.json`.
