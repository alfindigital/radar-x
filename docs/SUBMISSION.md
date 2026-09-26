# SUBMISSION — nilai siap paste ke portal

Portal: https://hackathon.sectors.app/portal/submit
(draft bisa disimpan berkali-kali; hanya Submit yang final → freeze)

## Public repository URL

```
https://github.com/alfindigital/radar-x
```

## Problem statement (satu kalimat)

```
RADAR-X membantu swing trader Indonesia melihat siapa (insider, institusi, asing) yang diam-diam mengakumulasi atau meninggalkan sebuah saham IDX dalam hitungan minggu — dari disclosure resmi, sebelum pergerakannya terlihat di harga.
```

## Track

**Market Intelligence** (Track 03)

## Team participant names

Isi nama lengkapmu sendiri (solo).

## Social media post URL

Posting caption di bawah di IG / LinkedIn / Threads / TikTok,
thumbnail dari https://canva.link/mexgt4g89m17xln, tag `@sectorsapp`,
lalu paste URL post-nya.

### Caption (paste-ready)

```
16 September 2026: 6 insider TOWR tercatat jual serentak di harga 437 — total ~Rp98 miliar, dari disclosure resmi IDX. Enam hari kemudian harganya 404.

RADAR-X menangkap sinyal seperti ini di 256 emiten: siapa (insider, institusi, asing) yang diam-diam mengakumulasi atau meninggalkan saham, diukur dalam hitungan minggu dan diverifikasi hasilnya 30 hari kemudian.

Bukan indikator teknikal. Bukan rekomendasi beli/jual. Murni data publik yang selama ini tersebar, dirangkai jadi satu peta posisi.

Dibangun di atas @sectorsapp Financial API untuk Sectors Hackathon 2026.

Coba: radar-x-beta.vercel.app
Repo: github.com/alfindigital/radar-x

#SectorsHackathon #IDX #SahamIndonesia
```

## Teaser video (1 menit, public)

Rekam layar dari https://radar-x-beta.vercel.app. Narasi:

```
0:00  [Board]        "16 September. Enam insider TOWR jual serentak di 437."
0:10  [Board scroll] "256 emiten IDX, dinilai dari siapa yang posisi —
                      insider, institusi, asing. Bukan indikator teknikal."
0:25  [/saham/TOWR]  Timeline: marker ▼ di 437, harga lalu 404. "Skor -70. Distribusi."
0:40  [/kasus/FILM.JK:2026-09-01:EXIT_AHEAD]
                     "Keluar Duluan — FILM -14,3% dalam 30 hari, IHSG cuma -4,9%."
0:50  [Board]        "RADAR-X. Disclosure resmi jadi satu peta." → tampilkan URL
```

## Judging video (≤3 menit, public/unlisted YouTube/Vimeo/Drive/Loom)

```
0:00  Problem: swing trader buta posisi smart money; harga adalah sinyal telat
0:30  Board: skor -100..+100, 5 komponen z-score, sparkline flow asing inline
      (contoh ujung: GULA +84 akumulasi, SQMI -86 / TOWR -70 distribusi)
1:00  Dossier emiten /saham/TOWR: timeline insider × harga × flow —
      6 insider jual @437 → 404 (-7,6%), skor -70, pola Bergerak Rombongan
1:30  Detail kasus /kasus/FILM.JK:2026-09-01:EXIT_AHEAD: score 100,
      outcome terukur -14,3% vs IHSG -4,9% — diukur, bukan diprediksi
      (alternatif sisi akumulasi: LUCY.JK stealth +17,5% vs IHSG -0,9%)
1:55  /asing: Foreign Flow Radar ~700 emiten, net flow kumulatif 8 hari bursa
2:15  Dossier orang /orang/Indra Gunawan: histori disclosure + frekuensi
2:35  Metodologi: formula terbuka, sumber data EOD resmi, disclaimer
2:50  Penutup: "informasi publik yang tersebar, jadi satu peta posisi"
```

## Checklist sebelum klik Submit

- [ ] Kedua video URL terisi dan bisa diakses publik/unlisted
- [ ] Sosmed post live + URL-nya
- [ ] Problem statement + track + nama peserta terisi
- [ ] Tidak ada commit lagi yang direncanakan (freeze permanen setelah submit)
