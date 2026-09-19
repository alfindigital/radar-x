# TECH_SPEC — RADAR-X

## Arsitektur

```
scripts/ingest.ts  ──►  lib/sectors.ts (API v2, server-only, 429 backoff)
      │                      │
      ▼                      ▼
lib/db.ts  ◄── JsonStore (data/*.json, dev+demo) ── DataStore interface (Supabase siap)
      │
      ▼
lib/score.ts (positioning score)  +  lib/cases.ts (case detection)
      │
      ▼
lib/services.ts (service layer — satu-satunya pintu UI)
      │
      ▼
app/ pages (RSC, force-dynamic) ── components/ (SVG charts, server-rendered)
```

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript strict.
- Tailwind v4 (CSS-first, `@import "tailwindcss"`).
- Charts: SVG custom server-rendered (hero timeline); zero chart-lib runtime di client.
- Store: `DataStore` interface; `JsonStore` aktif (`DATA_SOURCE=json`), Supabase impl nanti.
- Deploy: Vercel; ingest via GitHub Actions/cron (harus jalan server-side, bukan di request path).

## Konvensi Next 16 yang dipakai

- `params`/`searchParams` adalah Promise → selalu `await`.
- Route pages: `PageProps<"/route">`, layouts `LayoutProps<"/">`.
- `export const dynamic = "force-dynamic"` pada halaman data (store berubah via ingest).

## Data contract (internal types — `src/lib/types.ts`)

- `InsiderTrade` — filing parsed: holderName, txnType, txnDate (tanggal RIIL, bukan tanggal lapor), value, pctBefore/After, clusterHint.
- `FlowDaily` — net_foreign_inflow per symbol/date.
- `PriceDaily` — OHLCV+mcap; juga dipakai untuk `^IHSG` (benchmark, OHLC=price).
- `BrokerSummaryRow` — per symbol/date/broker: buy/sell/net val+lot, foreign split.
- `HoldersMonthly` — EOM: nShareholders, changeInShareholders, local{} + foreign{} per kelas investor.
- `CaseRecord` — pattern, anchor, window, score 0-100, evidence{trades,flow,price,z-scores,preDrift}, outcome{fwd7/30/60, benchmark30}, narrative.
- `PositioningScore` — symbol, week, score -100..100, components{5 z-scores}.

## Engine

```
score = clip(0.30·insider_z + 0.25·foreign_trend + 0.20·instnet_z
             + 0.15·retail_exodus_z + 0.10·fclass_shift, -100, 100)
```

Z-score robust: median + MAD·1.4826, clip ±3σ, cross-sectional atas semua emiten
insider-aktif pada minggu jangkar yang sama.

Case detection: grup transaksi insider searah dalam 30 hari → pola
(EXIT_AHEAD / STEALTH_ACCUMULATION / INSIDER_CONTRA_BUY / CLUSTER_PATTERN) →
score dari abnormal flow/volume z, pre-drift vs IHSG, holding shift, direction
match, besaran post-move. Outcome = return riil 7/30/60 hari (≥2/3 window harus
lewat baru dihitung "realized").

## Kredit API (billing: 2xx bayar, 404=1, 400/429/5xx gratis)

| Job | Frekuensi | Est. |
|---|---|---|
| filings (backfill 6 bln → harian) | sekali + harian | ~53 + ~2/hari |
| index ihsg | mingguan | 1 |
| flows/prices/holders watchlist ~253 | backfill + mingguan | ~750 one-time, ~150/minggu |
| broker top-40 flagged | mingguan | 40 |
| lazy backfill dossier | on-demand | ≤3/ticker, cache implicit |
| **Total** | | **~1.000-1.200 / ~1.600** |

## Lazy backfill

`/saham/[ticker]` di luar watchlist → fetch live (flow+daily+holders, ≤3 kredit)
→ simpan → render. Data ada = cache hit (tidak refetch).

## Secrets & hygiene

- `SECTORS_API_KEY` hanya di `.env.local` / env platform; `lib/sectors.ts` server-only.
- `.gitignore` reverse allowlist: `*` default ignore; `.env.local`, `data/` tidak ke-track.
- Keputusan: SOPS tidak dipakai (env saja) — speed hackathon, dicatat.

## Verifikasi

`npx tsc --noEmit` · `npx eslint .` · `npx next build` · dev server smoke test ·
`git grep` secret scan · data-count check pada `data/*.json`.
