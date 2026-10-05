# BROWNFIELD_SPEC — RADAR-X v2 → v3 "Exit Watch"

> Revamp in-place (bukan rewrite): engine v2 dipertahankan, v3 menambah 6 feed
> Sectors baru + satu artifact turunan + 3 permukaan UI. Spec ini mengaudit
> sistem lama dan memetakan gap → task di `docs/superpowers/plans/2026-10-01-exit-watch.md`.

## 1. Audit Sistem Lama

### 1.1 Identitas

| Item | Detail |
|---|---|
| Nama sistem | RADAR-X (`radarx-v2`) |
| Stack | Next.js 16.3.5 (App Router) / React 19.2.8 / TS strict / Tailwind v4 / recharts 3 / zod 4 / tsx / Playwright |
| Repository | `Documents/Apps/radar-x-hackaton` (public repo, hackathon rule) |
| Data layer | JSON snapshot: `data/*.json` (8 file) + derived `data/derived-v2/{scores,cases,manifest}.json` sha256-verified |
| Store | `JsonStore` via `src/lib/db.ts` (`DATA_SOURCE=supabase` stub → fallback JsonStore) |

### 1.2 Inventaris Modul

| # | Modul | Status | Catatan |
|---|---|---|---|
| 1 | `sectors.ts` typed client (11 helpers, retry 429) | Active | Dipakai semua ingest; ~26 endpoint IDX belum di-wrap |
| 2 | `ingest.ts` (7 commands) | Active | Pola: universe paginated + month-chunk filings |
| 3 | `compute.ts` → `derive.ts` → `score.ts` | Active | `instBrokers` di-oper `new Set()` kosong → `instNetZ`/`retailExodusZ` selalu `missing` (komponen bobot 0.40 mati) |
| 4 | `cases.ts` + `outcomes.ts` | Active | EXIT_AHEAD/STEALTH_ACCUMULATION dll + measured outcomes vs IHSG |
| 5 | Board `/` + dossier `/saham/[t]` + `/asing` + `/kasus` + `/orang/[h]` + `/metodologi` | Active | Snapshot-rendered, `force-dynamic`, zero-fetch saat request |
| 6 | Provenance + sha256 manifest + audit:data | Active | Keunggulan teknis utama — harus survive |

### 1.3 Kenapa Extend (bukan rewrite)

- Infrastruktur provenance/deterministik sudah lolos audit — menulis ulang = buang 30% tech-score yang sudah terbukti.
- Semua modul baru berbentuk *feed tambahan* → additive JSON + derived artifact baru cocok dengan pola existing.

### 1.4 Integrasi yang Harus Survive

| Integrasi | Kritis? | Kontrak |
|---|---|---|
| `loadSnapshot()` → `Snapshot` | ✅ | 8 file wajib tetap wajib; feed baru opsional |
| `loadDerived()` manifest sha256 | ✅ | `schemaVersion:2`, `engineVersion` bump → `radarx-v3` |
| `PageProps` signature Next 16 | ✅ | Ikuti pola `await searchParams` |
| Zero API call saat request | ✅ | Judges open app tanpa key |

## 2. Gap Analysis

### 2.1 Feature Gap

| Modul | v2 | v3 | Aksi |
|---|---|---|---|
| Positioning score + cases | ✅ | ✅ dipertahankan (tab `?v=radar`) | Migrate |
| Foreign-flow radar `/asing` | ✅ | ✅ | Migrate |
| `instNetZ` component | ⚠️ dead (registry kosong) | ✅ hidup via `/v2/brokers/` | Improve |
| Exit-pressure monitor | — | ✅ `exitwatch.json` + board | Build |
| Cohort tug-of-war per emiten | — | ✅ `broker-summary/top/?cohort=` | Build |
| Suspension history | — | ✅ `/v2/suspensions/` flags | Build |
| Corporate-action calendar | — | ✅ `/v2/corporate-actions/` | Build |
| Free-float risk | — | ✅ `/v2/free-float/` | Build |
| Broker board `/broker` | — | ✅ `/v2/brokers/top/` | Build |

### 2.2 Data Gap

| File lama | File baru | Strategi |
|---|---|---|
| 8 file existing | tetap | Direct — tidak ada transform |
| — | `broker_registry.json` | New feed, key `code` |
| — | `suspensions.json` | New feed, key `symbol\|date` |
| — | `corporate_actions.json` | New feed, key `symbol\|type\|keyDate` |
| — | `free_float.json` | New feed, key `symbol` |
| — | `cohort_top.json` | New feed, key `symbol\|cohort\|side\|brokerCode\|asOf` |
| — | `broker_top.json` | New feed, key `date\|cohort\|brokerCode` |

### 2.3 Contract Gap

Kontrak lama tidak berubah (additive only). Konsumen internal (`services.ts`)
mendapat field baru — backward-compatible object extension.

## 3. Strategi Migrasi

- **Pendekatan:** in-place additive (strangler tidak relevan — satu app, satu pipeline).
- **Cutover:** satu `npm run compute -- --as-of <date>` menghasilkan `exitwatch.json`; homepage beralih ke board baru via default param — rollback = `?v=radar` (board lama tetap ada) atau git-revert + recompute.
- **Data rollback:** file baru boleh dihapus — loader mentolerir feed opsional absen.

## 4. Migrasi Data

Tidak ada transformasi data lama. Verifikasi cukup: `npm run audit:data` +
`npm test` hijau pasca penambahan feed; manifest `inputHash` berubah oleh feed
baru — expected dan tercatat di release evidence.

## 5. Risk Register

| Risiko | Likelihood | Impact | Mitigasi |
|---|---|---|---|
| `cohort_top` cost meledak (2 call/simbol) | Med | Med | `--limit` watchlist cap 80; log credits per run |
| `free-float` butuh filter taxonomy (400 tanpa filter) | Med | Low | iterasi `/v2/subsectors/`; tolerate 400 |
| Payload broker-summary raksasa (>1MB) | Med | Low | hanya ambil `/top/` variant (ranked, kecil) |
| Skor ExitLiquidity overclaim | Med | High | label "descriptive pressure statistic"; flags ≠ tuduhan; coverageWeight visible |
| Video submission v2 basi | High | Med | re-record judging video ≤3 menit (Task 11 note) |

> **Handoff:** gap §2.1 men-feed task list plan; formula & kontrak detail di
> `TECH_SPEC_V3.md`; narasi produk di `PRODUCT_SPEC_V3.md`.
