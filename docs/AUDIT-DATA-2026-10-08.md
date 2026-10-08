# AUDIT-DATA — Kelengkapan data hasil API key (Sectors)

**Tanggal audit:** 2026-10-08 · **Metode:** inspeksi lokal `data/` + probe live `api.sectors.app` (3 call, ~3 kredit)
**Key pool:** 12 key (`SECTORS_API_KEY` + 11 di `SECTORS_API_KEYS`), rotasi 401/403/429/network — **live probe 200 OK, pool sehat**.

## Verdict

Universe 962 emiten tercakup 100% untuk dimensi statis (tickers, taxonomy, holders, ownership), tapi **feed harian berhenti di 1–2 Okt** sementara provider sudah punya data s.d. 7 Okt, dan **satu komponen skor (retailExodus, bobot 15%) mati untuk seluruh universe** karena field `change_in_shareholders` bulan Sep-30 kosong di provider tanpa fallback ke bulan sebelumnya.

## Coverage per feed vs universe (962 ticker)

| Feed | Rows | Simbol | Coverage | Data terakhir | Status |
|---|---|---|---|---|---|
| `tickers.json` | 962 | 962 | 100% | — | ok (file polos, tanpa meta) |
| `insider_trades.json` | 1.678 | 273 | wajar (sparse) | txn 2026-10-06 | fresh |
| `price_daily.json` | 25.336 | 963 | 100% simbol, **tapi hanya ~254 punya OHLCV penuh 72 hari; ~708 cuma 10–11 baris close-only** | **2026-10-01** | stale 4 hari bursa (Okt 2,5,6,7 ada di provider) |
| `flow_daily.json` | 24.261 | 838 | 87% | **2026-10-01** | 124 simbol nol baris; 174 simbol last < 10-01; 4 hari terakhir hilang |
| `broker_rows.json` | 238.604 | 863 | 90% | **2026-10-02** | 99 simbol tak tercakup; Okt 5–7 hilang |
| `holders_monthly.json` | 8.619 | 962 | 100% (3–9 bln/simbol) | 2026-09-30 | **Sep-30: `nShareholders`+`changeInShareholders` NULL utk 962/962** (Agu: hanya 51 null) |
| `ownership.json` | — | 962 | 100%, 0 misses | rolling | ok |
| `taxonomy.json` | 962 | 962 | 100% | 2026-10-01 | ok |
| `index_daily`/`idx_total` | 447/27 | 18 indeks | — | 10-06 / 10-07 | fresh (boards-lite harian jalan) |
| extras (suspensions, corporate_actions, most_traded, brokers_top, quarterly_dates) | — | — | — | 10-01 s.d. 10-02 | stale ±6 hari, di luar audit gate |
| `sector_rotation.json` | 33 subsektor | — | — | asOf 2026-09-29 | ok (bulanan) |

Gap 17 & 25 Agu di price/flow **bukan kegagalan ingest** — `/v2/index-daily/ihsg/` juga kosong di dua tanggal itu (17 Agu = libur Kemerdekaan; 25 Agu juga tanpa bar di provider).

## Komponen skor — cerita sesungguhnya

Dari `derived-v2/scores.json` (asOf 2026-10-07, 962 simbol):

| Komponen | Bobot | Tersedia | Penyebab missing |
|---|---|---|---|
| insiderZ | 30% | 161/962 (17%) | sparse by nature — hanya emiten dengan filing 90 hari |
| foreignTrend | 25% | **247/962 (26%)** | butuh `marketCap`; hanya ~254 simbol OHLCV yang punya — baris universe-close punya `marketCap=null` meski flow-nya ada |
| instNetZ | 20% | 859/962 (89%) | 99 simbol tanpa broker_rows; window 14d efektif hanya s.d. 10-02 |
| retailExodusZ | 15% | **0/962 — mati total** | bulan Sep-30 `changeInShareholders=null` untuk semua emiten; engine ambil bulan terbaru tanpa fallback ke Agu-31 |
| fclassShift | 10% | 962/962 | ok (field kelas asing Sep terisi) |

Distribusi `coverageWeight`: 0.85 → 141 simbol · 0.55–0.65 → 120 · 0.30 → 599 · 0.10 → **97 simbol = score null** (<2 komponen rankable). Artinya ~62% universe dinilai hanya dari 2 komponen (instNetZ + fclassShift).

## Temuan proses

1. **Daily ingest tidak me-refresh price/flow/broker.** `daily-ingest.ps1` hanya `boards --lite` + `filings` + `ownership`. Job `universe`, `prices`, `broker` tidak terjadwal → derived artifacts berlabel asOf 2026-10-07 dihitung dari data pasar yang berhenti 10-01/10-02. Klaim "snapshot as-of 2026-10-07" di SESSION.md men overstated freshness pasar.
2. **Audit gate buta terhadap ~14 feed envelope** (`ownership`, `sector_rotation`, `suspensions`, `corporate_actions`, `brokers_top`, `most_traded`, `quarterly_dates`, `free_float`, `top_changes`, `idx_total`, `index_daily`, dll) — tidak ada cek hash/coverage/staleness untuk file-file yang tetap dikonsumsi exitwatch & halaman UI.
3. **Tidak ada gate untuk "komponen skor mati total"** — retailExodus 0/962 lolos audit tanpa bunyi apa pun.
4. `quarterly_dates` punya 966 baris vs 962 ticker (4 simbol ekstra — kemungkinan listing baru/delisted; tickers.json sendiri tertua, mtime 23 Sep).
5. Redundansi feed lama vs baru: `broker_top.json` (266 simbol) vs `brokers_top.json` (4 sesi); `company_actions.json` vs `corporate_actions.json`. Konsisten, tapi membingungkan lineage.
6. `insider_trades`: 81 baris `value=0`; feed lag 1448/1678 (filed>txn) — normal.
7. `free_float` 961/962 — kurang 1 simbol.

## Rekomendasi (impact × effort)

| # | Aksi | Effort | Impact |
|---|---|---|---|
| 1 | `ingest universe --from 2026-10-02 --to 2026-10-07` (±250 kredit, masih dalam budget pool) lalu `compute --as-of today` | S | Menjadikan label as-of jujur — 4 hari bursa terakhir masuk sebelum submit malam ini |
| 2 | Fallback `retailExodusZ`: pakai bulan terbaru dengan `changeInShareholders` finite (Agu-31) alih-alih bulan terbaru mutlak | S | Mengembalikan 15% bobot untuk seluruh 962 simbol |
| 3 | Fallback `marketCap` foreignTrend dari `taxonomy.json`/`ownership` saat price row `marketCap=null` | S–M | Potensi mengaktifkan komponen 25% untuk ±700 simbol yang punya flow tapi tak ternormalisasi |
| 4 | Tambahkan feed envelope ke `audit-data.ts` + freshness gate (max umur per feed) + alarm komponen-mati | M | Mencegah regresi senyap seperti temuan 1–3 |
| 5 | Isi broker 99 simbol & flow 124 simbol yang belum tercakup (atau tandai legit-empty: suspensi/IPO baru) | M | instNetZ 90%→~100% |
| 6 | Dedupe feed legacy (`broker_top` vs `brokers_top`, `company_actions` vs `corporate_actions`) | S | Lineage bersih untuk penjelasan ke juri |

*Catatan: rekomendasi 1–3 mengubah angka yang tampil di production; sesuaikan dengan keputusan freeze snapshot untuk submission.*

---

## Hasil perbaikan (dijalankan 2026-10-08)

**Ingest:** `universe --from 2026-10-02 --to 2026-10-08` → +3.848 baris close, +2.659 baris flow (227 call). Okt 8 ditolak provider sebagai future date (call gratis). `price_daily`/`flow_daily` kini berakhir di **2026-10-07**.

**Patch kode:**
- `src/lib/score.ts` — `SymbolData.marketCapFallback`; `foreignTrend` (v2) + normalisasi v1 memakai fallback cap saat price row `marketCap=null`; `retailExodusZ` membaca bulan terbaru dengan `changeInShareholders` finite (observedTo jujur → 2026-08-31).
- `src/lib/derive.ts` — `buildDerived` menerima `caps?: Map<string,number>` opsional → `marketCapFallback` per simbol.
- `src/lib/exitwatch.ts` — `latestCap` fallback ke `marketCapFallback` (menyelamatkan normalisasi instExit/foreignExit/insiderExit/retailAbsorb untuk simbol close-only).
- `scripts/compute.ts` — load `taxonomy.json` → caps map (962 simbol) ke `buildDerived`.

**Verifikasi:** `tsc --noEmit` bersih · `npm test` 54/54 pass · `audit:data` OK · recompute `--as-of 2026-10-07`.

### Sebelum → sesudah

| Metrik | Sebelum | Sesudah |
|---|---|---|
| price/flow maxDate | 2026-10-01 | **2026-10-07** |
| foreignTrend tersedia | 247/962 (26%) | **839/962 (87%)** |
| retailExodusZ tersedia | **0/962** | **925/962 (96%)** |
| instNetZ / insiderZ / fclassShift | 859 / 161 / 962 | 859 / 161 / 962 (tak berubah) |
| Score non-null | 865/962 | **931/962** (null 97→31) |
| coverageWeight dominan | 599 simbol di 0.30 | 678 di 0.70, 152 di **1.00** |
| Exit Watch publishable | 244/962 | **849/962** (high 178 · elevated 141 · watch 352 · low 178) |

**Residual gap yang legit:** 31 null score = simbol dengan hanya fclassShift (kebanyakan IPO baru tanpa insider/flow/broker/holder history cukup); 123 foreignTrend missing = tanpa flow 90d; 37 retailExodus missing = seluruh bulan holders-nya null change; 103 instNetZ missing = tanpa broker rows.

**Catatan:** `suspiciousZeroVolumeRows` naik ke 14.247 — itu baris universe close-only dengan `volume=null` (`Number(null)===0` kehitung audit). False positive bawaan `audit-data.ts`, bukan regresi.

---

## Hasil perbaikan gelombang 2 — backfill penuh (2026-10-08)

Ingest mendalam setelah patch pipeline (~2.300 call): `tickers` → `universe --days 2` → `boards` full → `extras` → `broker --universe` → `flows --universe` → `prices --universe` → `brokertop`/`cohorttop`/`rotation` → `filings` → `index --all` → recompute → audit OK.

### Coverage & freshness akhir

| Feed | Sebelum | Sesudah |
|---|---|---|
| broker_rows | 7 Sep → 2 Okt (863 syms) | **7 Sep → 7 Okt** (308K rows, 863 syms; 56 simbol tanpa broker data di provider) |
| flow_daily depth | 811 syms ≤19 hari | **811 syms ≥60 hari**, 28 di 30-59 |
| price_daily OHLCV | 254 syms | **900 syms** (62 sisanya close-only — lanjut via rotasi harian) |
| index_daily | 1 Sep → 6 Okt (447 rows) | **1 Jul → 7 Okt** (1.053 rows, 18 indeks) |
| most_traded | → 1 Okt | → 7 Okt (26 sesi) |
| suspensions | 604 rows | 609 rows |
| brokers_top / broker_top / cohort_top | 2–5 Okt | → 7 Okt (7 sesi) / 465 syms / 60 syms |
| quarterly_dates | 2 Okt | **966 rows** fresh |
| tickers | 962 | 962 (diverifikasi ulang — universe memang 962) |

### Skor & derived (asOf 2026-10-08)

| Metrik | Sebelum backfill | Sesudah |
|---|---|---|
| foreignTrend tersedia | 839 | **866** |
| instNetZ | 859 | 860 |
| retailExodusZ | 925 | 925 |
| insiderZ | 161 | 160 (window geser) |
| Score non-null | 931 | 931 |
| Candidates | 169 | **174** |
| Outcomes complete | 198 | **288** (pending 187) |
| Exit Watch publishable | 849 | **861** |
| suspiciousZeroVolume | 14.247 | **8.601** (volume asli masuk lewat OHLCV) |

### Patch pipeline (permanen)

- `ingest.ts`: `flows`/`prices`/`broker` kini mendukung `--universe` + urutan **stalest/depth-first** — `--limit N` harian merotasi seluruh universe, bukan mengulang head-of-list. `index --all` merge semua index codes (dedupe code|date) ke `index_daily.json`.
- `daily-ingest.ps1`: sekarang menjadwalkan `boards --lite`, `universe --days 2`, `filings`, `broker --universe --limit 200`, `extras`, `cohorttop`, `ownership --limit 150`, `flows`/`prices --universe --limit 100`, lalu `compute` + `audit`. Blok Sabtu: `tickers`, `rotation`, `brokertop`, `index --all`, `holders --universe --limit 300`. Budget per-stage 600.
- **Akar masalah temuan #1 (feed mandek) teratasi di level schedule** — staleness tidak akan berulang.

### Residual — diverifikasi lewat probe langsung (2026-10-08)

Setiap "residual" diuji dengan panggilan API nyata, bukan asumsi:

**TERBUKTI provider-side (takdir, sudah diprobe):**
- 12 simbol hantu (CNTX/FREN/RMBA/dll) — daily {sym} balas **0 rows** (delisted); XLSM.JK → **404 does not exist** di provider. Universe 962 memang seluruh emiten hidup.
- BIMA.JK tanpa free-float — companyReport overview balas free_float=null.
- 56 simbol tanpa broker-summary — brokerSummary DEAL → **404 NOT_FOUND**.
- KLSE ada di daftar index tapi ditolak range endpoint — quirk provider.
- 93 simbol tanpa foreign-flow sama sekali (nol aktivitas asing upstream).

**TERBUKTI bisa difix (bukan takdir) — sudah dikerjakan:**
- insider_trades: cap 6 bulan itu window --months 6 kita, bukan provider. --from 2020 → filedAt tertua kini **Jul 2024**, 3.865 rows / **496 emiten** (dulu 273). Efek: cases 169→**233**, complete outcomes 289.
- holders_monthly: endpoint menerima ?year= — ditambah flag --year + param client, backfill **2025 penuh 962/962** → 19.975 rows (~21 bulan). Efek: retailExodusZ 925→**951**.
- GET /v2/news/ — command ingest news baru + data/news.json akresi (30 item, latest 8 Okt). Loader loadNews ditambah di feeds.ts.
- idx_total/top_changes — loader + field baru di getMarketContext (plumbing siap; render UI = keputusan produk).
- Tail backfill: **OHLCV kini 962/962** simbol.

### Angka final (asOf 2026-10-08)

| Metrik | Awal audit | Final |
|---|---|---|
| Score non-null | 865/962 | **957/964** |
| Komponen: insiderZ / foreignTrend / instNetZ / retailExodusZ / fclassShift | 161 / 247 / 859 / **0** / 962 | 160 / 866 / 860 / **951** / 962 |
| Candidates / outcomes complete | 169 / 198 | **233 / 289** |
| Exit Watch publishable | 244 | **861** (189 high · 136 elevated · 356 watch · 180 low) |
| Insider emiten tercakup | 273 | **496** |
| Total rows audited | ~210K | **451.332** |

Catatan: universe skor 964 karena backfill menyeret CNTX+MASA (emiten mati dengan filing historis) — masuk sebagai score=null, coverage=0, ter-suppress otomatis, tidak mengotori board.
