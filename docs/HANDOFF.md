# HANDOFF — RADAR-X

> Checkpoint lokal. Kalau folder ini dipindah/dibuka di mesin atau agent lain,
> baca file ini dulu — semua konteks untuk melanjutkan ada di sini.

## Status per 2026-09-20

**MVP selesai dan live.** Tinggal artefak non-kode (video + sosmed + submit portal).

| Item | Nilai |
|---|---|
| Repo publik | https://github.com/alfindigital/radar-x |
| Live demo | https://radar-x-beta.vercel.app |
| Vercel project | `muhammad-alfin-as-projects/radar-x` (auto-deploy dari `main`) |
| Env di Vercel | `SECTORS_API_KEY` (secret, production) — sudah terpasang |
| Track | **03 — Market Intelligence** |
| Deadline submit | 30 Sep 2026, 23:59 WIB |
| Data ter-backfill | 253 emiten · 1.476 insider trades · ~11rb flow · ~16rb harga · 2rb holders · 14rb broker rows · 221 kasus |
| Kredit terpakai | ~850 (estimasi) |

## Yang masih harus dilakukan (manual, user-only)

1. Rekam teaser 1 menit → upload **public** → simpan URL.
2. Rekam video judging ≤3 menit → YouTube unlisted → simpan URL.
   Naskah ada di `docs/SUBMISSION.md`.
3. Post sosmed (IG/LinkedIn/Threads/TikTok) pakai caption di `docs/SUBMISSION.md`
   + thumbnail dari https://canva.link/mexgt4g89m17xln + tag `@sectorsapp`.
4. Isi form di https://hackathon.sectors.app/portal/submit → **SUBMIT TERAKHIR**.
   Setelah submit: repo & app beku total. Satu-satunya commit yang boleh
   = hapus credential yang bocor (notify #support Slack dulu).

## Resume cepat (mesin/folder baru)

```bash
git clone https://github.com/alfindigital/radar-x
cd radar-x
cp .env.example .env.local   # isi SECTORS_API_KEY (key ada di .env.local lama / manager Sectors)
npm install
npm run dev                  # http://localhost:3000 — data/*.json sudah ikut repo
```

Data `data/*.json` adalah snapshot beku per 19 Sep 2026 — langsung jalan tanpa ingest.
Regenerasi penuh: `npm run backfill` (butuh ~850 kredit).

## Aturan main yang sering kelewat

- `SECTORS_API_KEY` hanya di `.env.local` / Vercel env — JANGAN pernah masuk git.
- `.gitignore` adalah reverse allowlist (`*` default ignore). File baru di root
  tidak ikut ter-commit kecuali di-`!unignore`. Folder `src/ scripts/ specs/ data/ docs/ public/` sudah diizinkan.
- `dev.log`, `nul`, `tsconfig.tsbuildinfo`, `.next/`, `.vercel/` = artefak lokal, jangan commit.
- Skor solo (lazy backfill) harus ditag ke `week` batch terakhir — kalau pakai tanggal
  hari ini, board cuma nampilin emiten itu (sudah pernah kejadian, lihat commit 0853afe).
- Di Vercel fs read-only → upsert dibungkus `Promise.allSettled`, data fetch dipakai in-memory.

## Peta file

```
src/lib/sectors.ts     client API (server-only, retry 429)
src/lib/db.ts          DataStore iface + JsonStore (data/*.json)
src/lib/score.ts       positioning score 5 komponen z-robust
src/lib/cases.ts       deteksi pola + outcome terukur + narasi
src/lib/services.ts    service layer + lazy backfill
scripts/ingest.ts      backfill (--only-missing untuk resume)
scripts/compute.ts     hitung skor + kasus
specs/                 PRODUCT_SPEC · TECH_SPEC · DESIGN_SPEC · PLAN (megaplan asli)
docs/                  HANDOFF (file ini) · SUBMISSION (isi form portal)
schema.sql             DDL Supabase (cadangan kalau mau DB real)
```

## Keputusan penting (jangan diubah tanpa alasan)

- Horizon produk = swing (mingguan-bulanan), BUKAN intraday.
- Bahasa faktual netral — dilarang kata "insider trading"/tuduhan.
- Tidak ada CTA beli/jual, target harga, atau eksekusi order (rules hackathon).
- Harga dipakai untuk MENGUKUR outcome, bukan indikator teknikal.
- UI: dark minimal ala Fey/Kraken; panel bertumpuk dihindari; angka mono tabular.
