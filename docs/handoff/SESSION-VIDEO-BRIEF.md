# Brief untuk session video — RADAR-X (paste ke session baru)

## ATURAN EMAS: video direkam SETELAH freeze commit

Angka publik masih bergerak malam ini (ingest sweep + engine remediation berjalan
paralel). Semua angka di bawah **WAJIB dibaca ulang dari artifact** sebelum rekam —
jangan transkrip dari dokumen, chat, atau brief ini.

## Cara baca angka final (saat mulai rekam)

```bash
cd "C:/Users/GEEKOM A8/Documents/Apps/radar-x-hackaton"
node -e "const r=require('./data/derived-v2/exitwatch.json');const b={};r.filter(x=>x.score!==null).forEach(x=>b[x.tier]=(b[x.tier]||0)+1);console.log('publishable:',r.filter(x=>x.score!==null).length,'tiers:',b,'suppressed:',r.filter(x=>x.score===null).length)"
node -e "const c=require('./data/derived-v2/cases.json');console.log('cases:',c.length)"
node -e "const m=require('./data/derived-v2/manifest.json');console.log('asOf:',m.asOf)"
```

Angka terakhir terlihat (akan berubah): publishable ~850 (high ~190 / elevated ~125 /
watch ~350 / low ~185), suppressed ~114, cases 233, asOf 2026-10-08. **Re-read wajib.**

## Yang boleh direkam SEKARANG (tanpa angka)

- Screen capture UI: board, dossier, methodology, mobile view — footage tanpa
  voiceover angka. Overlay angka bisa ditambahkan pasca-freeze.
- Storyboard/script dengan placeholder `[PUB]`/`[HIGH]`/`[SUPP]`/`[ASOF]`.

## Yang TIDAK boleh sebelum freeze

- Voiceover/caption dengan angka spesifik.
- Klaim tier distribution.
- Portal copy submission (pakai `docs/SUBMISSION.md` SETELAH di-sync ulang oleh
  session integrator — tandanya commit `docs:` terakhir hari ini).

## Sinyal freeze

Tunggu commit dengan pesan mengandung `freeze`/`final` di `main`, atau konfirmasi
eksplisit dari user. Kalau deadline mendesak dan freeze tak kunjung terjadi:
rekam footage UI sekarang, tempel angka di menit-menit akhir.
