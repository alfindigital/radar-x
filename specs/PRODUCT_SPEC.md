# PRODUCT_SPEC — RADAR-X

## Problem (1 kalimat, submit-ready)

RADAR-X memberi investor swing Indonesia peta posisi smart money — siapa (insider, institusi, asing)
sedang diam-diam mengakumulasi atau meninggalkan sebuah saham IDX dalam hitungan minggu, sebelum
pergerakannya terlihat.

## Pengguna

Swing trader ritel IDX (horizon mingguan–bulanan) yang selama ini menebak "saham ini lagi dikumpul
atau ditinggal orang dalam?" dari rumor, group chat, dan chart teknikal.

## Value proposition

Bukan data mentah — deteksi. Disclosure resmi IDX (insider filings, komposisi pemegang saham,
foreign flow, aktivitas broker) dirangkai menjadi skor positioning yang explainable dan kasus
terukur hasilnya. Data Sectors API = sumber tunggal kebenaran.

## Scope MVP

| Halaman | Isi |
|---|---|
| `/` RADAR Board | Ranking Positioning Score -100..+100 semua emiten insider-aktif; feed insider terbaru; kasus teratas |
| `/saham/[ticker]` | Dossier emiten: timeline harga + marker insider + flow asing; breakdown 5 komponen skor; komposisi pemilik bulanan; tabel transaksi insider; kasus terkait |
| `/kasus` + `/kasus/[id]` | Feed pola terdeteksi (Keluar Duluan, Akumulasi Diam-diam, Beli Saat Turun, Bergerak Rombongan) dengan hasil 30 hari terukur |
| `/orang/[holder]` | Dossier orang: histori disclosure lengkap + frekuensi historis (jual→turun, beli→naik) |
| `/metodologi` | Formula, definisi pola, sumber data, disclaimer non-advisory |

## Non-goals (eksplisit)

- Bukan nasihat investasi; tidak ada CTA beli/jual/target harga.
- Bukan teknikal/indikator; harga hanya alat ukur hasil.
- Bukan intraday; semua EOD.
- Tidak ada eksekusi trading (dilarang aturan hackathon).
- Tidak ada framing "insider trading" — semua statistik deskriptif atas disclosure publik.

## Track & judging fit

Track 3 Market Intelligence. Usability: jawaban langsung ke pertanyaan nyata swing trader.
Technical: 8 family endpoint dipakai substantif + engine statistik sendiri (robust z-score
cross-sectional, case detection, outcome measurement). Video: timeline insider-vs-harga adalah
visual hook yang langsung dimengerti.

## Sumber data (Sectors API v2, core dependency)

filings (inti) · shareholders-composition · foreign-flow · broker-summary · daily · index-daily ·
companies · top-changes/news (konteks). Tanpa API ini produk tidak ada — bukan dekorasi.

## Compliance

- Repo baru, publik, eksklusif hackathon; nol kode project lama.
- API key di env server, tidak pernah ke client/repo.
- Disclaimer non-advisory di footer semua halaman + halaman metodologi.
- Bahasa faktual-netral; statistik deskriptif dengan N kejadian, bukan klaim.
