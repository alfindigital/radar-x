# HANDOVER — RADAR-X

> Start here kalau sesi/agent baru. Terakhir update: 2026-10-01.

## Kondisi

- v2 **shipped & verified** di `827d086` (37/37 tests, build clean, snapshot 2026-09-22).
- v3 "Exit Watch" = **planning complete, zero code**. Semua artefak:
  - Specs: `specs/PRODUCT_SPEC_V3.md` `TECH_SPEC_V3.md` `DESIGN_SPEC_V3.md` `BROWNFIELD_SPEC.md`
  - Plan: `docs/superpowers/plans/2026-10-01-exit-watch.md`
  - Tasks: `docs/superpowers/plans/2026-10-01-exit-watch/tasks/TASK-01..12.md` + `TODO.md`
- Tunggu: user approve plan + pilih execution mode (subagent-driven vs native).

## Konteks penting untuk executor

1. Terminologi register institusional (commit `827d086`) — dilarang "smart money"/"bandar".
2. `*.json` LF-locked via `.gitattributes` — jangan tulis CRLF di data files.
3. `tests/` excluded dari tsconfig — tes jalan via `tsx --test`, bukan typecheck.
4. Sectors API key: `SECTORS_API_KEY` di `.env.local` / DPAPI vault; ~3.000 credits total 3 key; v3 backfill budget ~500.
5. 26 dari 37 endpoint IDX belum dipakai v2 — v3 memakai 6 di antaranya.
6. Deadline 2026-10-08 23:59 WIB; video submission perlu re-record setelah v3.

## Kalau plan berubah

Update `TODO.md` + file task terkait, lalu catat di `99-CHANGELOG`-style entry di `COMMIT_LOG.md` / commit message.
