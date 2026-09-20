---
agent: devin-local
session: exultant-galleon
created: 2026-09-18T14:18:14Z
---
# RADAR-X — Megaplan Sectors Hackathon 2026

Radar posisi smart money IDX untuk swing trader: deteksi akumulasi/distribusi orang dalam, institusi, dan asing dalam horizon mingguan — dari data disclosure resmi Sectors API — sebelum beritanya keluar. Track 3 Market Intelligence, solo, Next.js + Supabase di Vercel.

---

## 1. Konteks & Batasan Kompetisi

| Item | Nilai |
|---|---|
| Submit | **30 Sep 2026 23:59 WIB** — build tersisa **11 hari** (dari 19 Sep) |
| Status admin | Registrasi + onboarding **sudah** (per user) → pastikan 1.000 credits tim sudah di-claim |
| Track | **3 — Market Intelligence** (sinyal turunan, skor, ranking, riset tersintesis) |
| Judging | Usability 40% · Video/storytelling 30% · Technical depth 30% |
| Kepatuhan | repo BARU publik (commit pertama dalam build period); nol kode lama; Sectors = core source; **bukan nasihat investasi** → disclaimer non-advisory; tanpa tombol/order apapun; API key tidak boleh masuk repo; freeze total saat submit (kecuali fix credential leak) |
| Deliverable submit | repo publik + teaser 1 menit (publik) + judging video ≤3 menit + problem statement 1 kalimat + track + nama tim + social post (template Canva resmi, tag Sectors) |
| Budget kredit | ~1.600 (600 sisa + 1.000 grant) → alokasi plan ini ~900-1.100, sisa buffer demo |

## 2. Konsep Produk

**Problem statement (submit, 1 kalimat):** "RADAR-X memberi investor swing Indonesia peta posisi smart money — siapa (insider, institusi, asing) sedang diam-diam mengakumulasi atau meninggalkan sebuah saham IDX dalam hitungan minggu, sebelum pergerakannya terlihat."

**Kenapa ini menjawab 3 kriteria juri:**
- **Usability (40%)**: pertanyaan nyata swing trader — "saham ini lagi dikumpul atau ditinggal orang dalam?" — dijawab dengan skor + bukti, bukan tabel mentah. Update mingguan, cocok ritme swing.
- **Video (30%)**: hook naratif kuat — "sebelum saham X terbang, ada yang posisi duluan. Ini buktinya." Timeline insider vs harga itu visual yang langsung dimengerti.
- **Technical (30%)**: 8 family endpoint dipakai substantif + engine statistik sendiri (z-score positioning, case scoring, edge measurement historis). Endpoint `filings` (insider parsed) jarang disentuh peserta = diferensiasi.
- **Fresh total**: bukan remake FMID/Pluang/KSEI5 — foreign flow cuma 1 dari 5 komponen skor; jantung produk = transaksi insider + komposisi kepemilikan, domain yang belum pernah jadi produknya.

**Diferensiasi vs produk Sectors**: mereka jual data disclosure; kita jual *deteksi* — pola, skor, dan evidence terukur (misal: "setelah cluster insider sell, median return 30 hari = -X%" — dihitung dari data, bukan klaim).

## 3. Sumber Data (semua GET, terverifikasi live)

| Endpoint | Param | Dipakai untuk |
|---|---|---|
| `GET /v2/filings/` | `start,end,limit,offset,transaction_type(buy/sell/others),holder_type(insider/institution/corporate-investor),tags,symbol` | **Inti**: transaksi insider bernama (nama, tanggal asli, lembar, harga, % holding, flag cluster) |
| `GET /v2/company/shareholders-composition/{symbol}/` | symbol | Komposisi pemilik per kelas investor × lokal/asing, **bulanan EOM** + `numbers_of_shareholders` + `change_in_shareholders` (eksodus/masuk ritel) |
| `GET /v2/foreign-flow/{symbol}/` | symbol | Net flow asing harian 90 hari (1 call = 1 window penuh) |
| `GET /v2/foreign-flow/` | feed paginated | Top net buy/sell asing harian (context board) |
| `GET /v2/broker-summary/{symbol}/` | symbol | Aktivitas per broker 14 hari: buy/sell/net lot+value+avg, **split foreign/domestik** |
| `GET /v2/brokers/top/` | `origin,cohort` | Ranking broker per kohort (retail/mixed/institutional) |
| `GET /v2/daily/{symbol}/` | symbol | OHLCV + mcap harian (baseline + forward return) |
| `GET /v2/index-daily/{index_code}/` | index_code | IHSG untuk abnormal return |
| `GET /v2/companies/` | `where,order_by,limit,offset` | Universe + validasi ticker (structured only, `?q=` dilarang: 3 kredit) |
| `GET /v2/company/corporate-actions/{symbol}/` | symbol | Kalender event (dividen, AGM) untuk konteks kasus |
| `GET /v2/news/` | `symbol,limit` | Konteks berita sekitar event |
| `GET /v2/companies/top-changes/` | — | Movers harian (kandidat kasus + board) |

**Aturan billing**: 2xx bayar; 404 = 1 kredit (validasi ticker ke tabel lokal dulu); 400/4xx lain/5xx gratis; hasil kosong tetap bayar.

## 4. Produk — Halaman & Fitur

### MVP (wajib)

1. **`/` RADAR Board** — ranking **Positioning Score** (-100..+100) seluruh watchlist (~80-120 emiten), kolom: skor, insider net 90h, flow asing 90h, kohort institusi 14h, Δ shareholders. Plus feed insider terbaru + "kasus minggu ini".
2. **`/saham/[ticker]` Dossier Emiten** — hero visual: **timeline harga + marker transaksi insider + area foreign flow + flag event**; breakdown komponen skor; shareholders-composition MoM (chart kelas investor lokal vs asing); ringkasan kohort broker; mini news.
3. **`/kasus` + `/kasus/[id]` Case Feed** — pola terdeteksi: `EXIT_AHEAD`, `STEALTH_ACCUMULATION`, `INSIDER_CONTRA_BUY`, `CLUSTER_PATTERN`. Tiap kartu: siapa, kapan, bukti → hasil 30 hari → skor 0-100.
4. **`/orang/[holder]` Dossier Orang** — seluruh histori `holder_name`, nilai transaksi, dan *batting average*: "jualannya mendahului penurunan 4/5 kali".
5. **`/metodologi` + disclaimer** — formula skor, definisi pola, non-advisory notice (UU P2SK-style DYOR, gaya FMID).

### Stretch (kalau sisa waktu)

6. **Edge stats page** — "apakah sinyal insider beneran ada edge": distribusi forward return 30/60/90h pasca cluster-buy vs cluster-sell vs baseline, N kejadian. Ini bagian paling 'quant' — bukti technical depth.
7. **Narasi LLM** — ringkasan kasus 2-3 kalimat via gateway 9Router (fallback template deterministik yang tetap dipakai kalau LLM off).
8. Watchlist personal + export kartu kasus sebagai gambar (shareable → sosmed post).

## 5. Engine Skor (diferensiasi inti)

**Positioning Score** per emiten, refresh mingguan:
```
score = clip( 0.30·insider_z + 0.25·foreign_trend + 0.20·instnet_z + 0.15·retail_exodus_z + 0.10·fclass_shift , -100, 100 )
```
- `insider_z`: net insider buy 90h (Rp) vs median absolut historis ticker, ditimbang % free float & jumlah insider berbeda (cluster > single).
- `foreign_trend`: slope + kumulatif net inflow 90h dinormalisasi turnover.
- `instnet_z`: net buy kohort institusi (dari broker-summary × broker-registry cohort) 14h, z-score.
- `retail_exodus_z`: `-change_in_shareholders` MoM (ritel keluar saat harga flat → akumulasi diam-diam).
- `fclass_shift`: Δ kelas investor asing institusional (mutual_fund_f, financial_institutions_f) vs ritel asing (individual_f) MoM.
Semua komponen disimpan di `components_json` → UI menampilkan "kenapa skornya segini" (explainability = trust).

**Case Score** 0-100: `f(abnormal flow z, abnormal volume z, pre-drift vs IHSG, ukuran transaksi vs holding, direction match, besaran post-move)`. Label arah: AHEAD_SELL / AHEAD_ACCUMULATE.

## 6. Arsitektur (ngikutin pondasi `Desktop\Code`)

```
[Vercel Cron/GitHub Actions]          [Supabase Postgres]
   ingest.mjs (light harian      ──►   insider_trades, flow_daily,
             + heavy mingguan)         price_daily, holders_monthly,
                                       cases, positioning_scores, tickers
                    │                          ▲
                    ▼                          │ lazy backfill (cache 24h)
        [Next.js App Router — Vercel] ─────────┘
        UI layer (app/, components/) → service layer (lib/services/) → infra (lib/db.ts, lib/sectors.ts)
```

- **Stack**: Next.js 15 + TypeScript + Tailwind; chart: Recharts + SVG custom (timeline insider); deploy Vercel; Route Handlers = proxy DB (API key server-only, env).
- **Secrets**: `.env.local` dev / Vercel env prod; `secret.yaml` SOPS+age opsional (default: env saja — keputusan speed hackathon, dicatat di spec).
- **Git**: reverse `.gitignore` allowlist (sesuai GIT_HYGIENE), repo publik BARU.
- **Spec docs di repo**: `specs/PRODUCT_SPEC.md`, `specs/TECH_SPEC.md`, `specs/DESIGN_SPEC.md` (copy template `Desktop\Code\specs\`, diisi konteks RADAR-X) + `PLAN.md`.
- **DB fallback**: `lib/db.ts` adapter → kalau Supabase rewel, ingest tulis `data/*.json` dan app baca file (flag env `DATA_SOURCE=supabase|json`).

## 7. Schema DB (DDL ringkas)

```sql
tickers(symbol PK, name, sub_sector, active bool)
insider_trades(id PK, symbol FK, holder_name, holder_type, txn_type,
               txn_date, filed_at, amount, price, txn_value,
               pct_before, pct_after, cluster_hint, source_url)
flow_daily(symbol, date, net_foreign_inflow, foreign_buy_idr, foreign_sell_idr, PK(symbol,date))
price_daily(symbol, date, open, high, low, close, volume, market_cap, PK(symbol,date))
holders_monthly(symbol, month, payload jsonb, n_shareholders, change_in_shareholders, PK(symbol,month))
cases(id PK, symbol FK, pattern, anchor_date, window_start, window_end,
      score int, direction text, evidence jsonb, outcome jsonb, created_at)
positioning_scores(symbol, week, score int, components jsonb, computed_at, PK(symbol,week))
ingest_log(job, ran_at, credits_est int, rows int, status)
```

## 8. Ingest & Anggaran Kredit

| Job | Jadwal | Endpoint | Est. kredit |
|---|---|---|---|
| `ingest_filings` | harian | filings?start=T-1 | 1-3/hari (~30 total) |
| `ingest_movers_news` | harian | top-changes + news | 2/hari (~22) |
| `ingest_flow` | mingguan ×2 | foreign-flow/{sym} watchlist ~80 | ~160 ×2 = 320 |
| `ingest_prices` | mingguan ×2 | daily/{sym} watchlist | ~160 |
| `ingest_broker` | mingguan | broker-summary top ~30 flagged | ~60 |
| `ingest_holders` | bulanan ×1-2 | shareholders-composition ~80 | ~160 |
| `backfill` satu kali | D1-D2 | filings 6 bln (per bulan) + watchlist flow/price/holders | ~250 |
| lazy backfill | on-demand | ticker di luar watchlist, cache 24h | ~150 buffer |
| **Total** | | | **~1.050-1.200** |

## 9. Fase (11 hari, full-day)

- **D0 (19 Sep)**: repo baru + `.gitignore` reverse + scaffold Next.js + `specs/*` terisi + `lib/sectors.ts` + schema.sql + seed tickers.
- **D1**: `ingest_filings` + `insider_trades` + backfill 6 bulan + sanity check data.
- **D2**: backfill watchlist (flow, price, holders) + `compute_scores` v1 → ranking valid di konsol.
- **D3**: RADAR Board `/` (tabel skor + feed + kasus minggu ini).
- **D4**: Dossier `/saham/[ticker]` — **timeline insider chart (hero)** + komponen skor + holders MoM.
- **D5**: `/kasus` feed + `/kasus/[id]` + case scoring v2 (pre/post evidence otomatis).
- **D6**: `/orang/[holder]` + edge stats engine (forward-return distribution per pola) + `/metodologi` + disclaimer.
- **D7**: DESIGN_SPEC polish (dossier/intelligence aesthetic — bukan dashboard AI generik), mobile, perf <2s cache hit, lazy backfill live.
- **D8**: deploy prod Vercel + E2E + stretch narasi LLM (9Router) atau template narrative final.
- **D9**: rekam teaser 1 menit + judging video ≤3 menit (narasi: problem → kasus nyata → live radar → metodologi).
- **D10**: social post (template Canva + tag Sectors), README (cara jalan, arsitektur, kredit), freeze-check: `git grep` tanpa key, history bersih.
- **D11 (30 Sep)**: submit via portal → freeze.

## 10. Acceptance Criteria

- `/` menampilkan ranking skor real dari data minggu berjalan (bukan mock).
- `/saham/BBCA` render <2s: timeline insider + komponen skor + holders MoM dari DB.
- Minimal 20 kasus terdeteksi dari data 6 bulan terakhir, tiap kasus punya evidence + outcome terukur.
- Ticker di luar watchlist → lazy fetch → tersimpan → kunjungan kedua cache hit.
- Edge stats menampilkan distribusi return pasca-pola dengan N kejadian nyata.
- `git grep` tak menemukan key; disclaimer non-advisory tampil di semua halaman data; tak ada CTA beli/jual/target harga.
- Video ≤3 menit memperlihatkan end-to-end: masalah → temukan kasus → cek radar → baca bukti.

## 11. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Universe insider terbatas (filings cuma ada di emiten dengan insider aktif) | Watchlist = gabungan filings-aktif + top-liquidity; kasus bisa lahir dari ticker apapun di feed filings |
| `shareholders-composition` bulanan → komponen `retail_exodus`/`fclass_shift` lambat | Bobot kecil (15%+10%); komponen lain tetap mingguan |
| Ground-truth "tahu duluan" tak ada → risiko framing tuduhan | Bahasa faktual-netral ("pola menyerupai posisi awal"), tampilkan N & distribusi, disclaimer tegas; tanpa kata "insider trading ilegal" |
| Kredit jebol saat juri eksplorasi ticker acak | Lazy backfill dibatasi (cap harian), watchlist sudah mencakup nama populer |
| Supabase pause/limit | adapter `DATA_SOURCE=json` → app tetap jalan dari file repo |
| Waktu | Cut order jelas: LLM narasi, edge page, share-card = stretch; core = Board + Dossier + Kasus |

## 12. Sudut Uang (pasca-hackathon)

- Burn pasca-event ~50-70 kredit/minggu (filings+flow+prices watchlist) → hidup di kuota Insider personal tanpa biaya tambah.
- Kalau menang: 20rb kredit = runway setahun+, plus Insider 6 bulan.
- Monetisasi natural (nanti, bukan scope): tier mingguan via channel lotmetrik; produk melengkapi FMID (midday) bukan menyainginya — FMID = intraday flow, RADAR-X = positioning mingguan.
