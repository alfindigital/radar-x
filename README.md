# RADAR-X

Peta posisi smart money IDX untuk swing trader: siapa (insider, institusi, asing) sedang
diam-diam mengakumulasi atau meninggalkan saham dalam hitungan minggu — dari disclosure resmi
via **Sectors Financial API v2**. Track 3 Market Intelligence, Sectors Hackathon 2026.

> Bukan nasihat investasi. Statistik deskriptif atas data publik. DYOR.

## Quick start

```bash
cp .env.example .env.local   # isi SECTORS_API_KEY
npm install
npm run ingest               # backfill: filings 6 bln + watchlist (flow/price/holders/broker) + ihsg
npm run compute              # positioning scores + case detection → data/*.json
npm run dev                  # http://localhost:3000
```

Ingest boros kredit sekali saja (one-time backfill ~800); refresh mingguan ~150.
Resume aman: semua job idempotent, `--only-missing` melompati yang sudah ada.

## Halaman

| Route | Isi |
|---|---|
| `/` | RADAR Board — ranking Positioning Score -100..+100 + feed insider + kasus teratas |
| `/saham/[ticker]` | Dossier emiten — timeline harga+insider+flow, breakdown skor, komposisi pemilik |
| `/kasus`, `/kasus/[id]` | Case feed pola terdeteksi + hasil 30 hari terukur |
| `/orang/[holder]` | Dossier orang — histori disclosure + frekuensi historis |
| `/metodologi` | Formula, definisi pola, sumber, disclaimer |

## Struktur

```
src/lib/sectors.ts    API client (server-only, 429 backoff, no ?q= — 3 kredit)
src/lib/db.ts         DataStore interface + JsonStore (data/*.json)
src/lib/score.ts      positioning score: 5 robust z-components berbobot
src/lib/cases.ts      deteksi pola + case score + outcome terukur + narasi
src/lib/services.ts   service layer + lazy backfill (ticker baru → fetch live)
scripts/ingest.ts     backfill/refresh (tsx)
scripts/compute.ts    hitung skor + kasus
specs/                PRODUCT_SPEC / TECH_SPEC / DESIGN_SPEC
schema.sql            DDL Supabase (saat DATA_SOURCE=supabase disambung)
```

## Engine

`score = 0.30·insider_z + 0.25·foreign_trend + 0.20·instnet_z + 0.15·retail_exodus_z + 0.10·fclass_shift`
→ ×33.3 → -100..+100. Z robust (median/MAD, clip ±3σ) lintas emiten per minggu.
Pola: Keluar Duluan · Akumulasi Diam-diam · Beli Saat Turun · Bergerak Rombongan.

## Catatan

- Kode baru untuk hackathon; tidak ada migrasi dari project lain.
- Key tidak pernah masuk repo: `.env.local` ke-ignore oleh allowlist `.gitignore`.
- Data `data/*.json` juga lokal-only (derived, regeneratable).
