# RADAR-X

**Live demo: https://radar-x-beta.vercel.app**

Peta posisi smart money IDX untuk swing trader: siapa (insider, institusi, asing) sedang
diam-diam mengakumulasi atau meninggalkan saham dalam hitungan minggu — dari disclosure resmi
via **Sectors Financial API v2**. Track 3 Market Intelligence, Sectors Hackathon 2026.

> Bukan nasihat investasi. Statistik deskriptif atas data publik. DYOR.

Contoh nyata: pada 16 Sep 2026, disclosure mencatat 6 insider TOWR menjual serentak @437
(total ~Rp98 miliar) — RADAR-X menandainya *Bergerak Rombongan*, skor -70, bucket distribusi;
enam hari kemudian harga 404 (-7,6%). 256 emiten terpantau, 240+ kasus terdeteksi, outcome
30 hari diukur dari harga riil begitu window-nya terealisasi.
Foreign Flow Radar memantau ~700 emiten dengan aktivitas asing dari feed full-universe harian.

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
| `/asing` | Foreign Flow Radar — net flow asing kumulatif untuk seluruh emiten IDX |
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
- `data/*.json` = snapshot beku hasil ingest (disclosure publik, regeneratable via
  `npm run backfill`); dikomit agar demo Vercel jalan tanpa Supabase. Di prod, lazy
  backfill tetap bisa fetch live (write best-effort, fs serverless read-only).
