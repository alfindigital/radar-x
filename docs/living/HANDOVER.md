# HANDOVER — RADAR-X

> Start here kalau sesi/agent baru. Terakhir update: 2026-10-06.

## Kondisi

- v3 "Exit Watch" **shipped, redesigned, audited, dan diremediasi** — lihat `docs/AUDIT-2026-10-06.md` (32 temuan) + bagian "Status remediasi" di akhirnya.
- HEAD `f659a5e` + satu layer remediasi lanjutan (konvensi window inclusive, coverage flow rotasi, budget calls, self-expiry scheduler).
- Snapshot refreshed daily (manual publish): latest generation as-of **2026-10-07**: 962 rows → 244 publishable (57 high / 46 elevated / 90 watch / 51 low), 718 suppressed-not-zero; 169 candidate cases.
- **Konvensi window (final):** N-day = N tanggal kalender inklusif berakhir di as-of. 14d → `asOf−13` (2026-09-18→10-01); 90d insider → `asOf−89` (2026-07-04→10-01). Terdokumentasi di `/metodologi`.
- Gates hijau: `npm test` 53/53 · typecheck · lint (1 warning pre-existing) · `audit:data` ok · build Next 16.3.8 · qa-redesign 36/36 · qa-mobile fail-asli · E2E 15 pass / 9 skip by-design.
- Produksi `radarx.web.id` masih artifact **pra-remediasi** — angka live akan berubah saat deploy berikutnya.

## Konteks penting untuk executor

1. Terminologi register institusional — dilarang "smart money"/"bandar".
2. `*.json` LF-locked via `.gitattributes` — jangan tulis CRLF di data files.
3. `tests/` excluded dari tsconfig — tes jalan via `tsx --test`, bukan typecheck.
4. Sectors API key: `SECTORS_API_KEYS` pool di `.env.local`; `SECTORS_CALL_BUDGET` membatasi billed calls per proses.
5. `RadarX-DailyIngest` (task OS): script self-expire setelah 2026-10-11 dan menjalankan ingest→compute→audit lokal saja; publish tetap manual.
6. Deadline 2026-10-08 23:59 WIB; **video submission WAJIB re-record** — angka berubah pasca-remediasi (MTLA 80→54, high tier 61→66).

## Kalau plan berubah

Update `TODO.md` + file task terkait, lalu catat di `99-CHANGELOG`-style entry di `COMMIT_LOG.md` / commit message.
