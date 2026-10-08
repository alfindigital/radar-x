# Brief untuk session UI/UX — RADAR-X remediation (paste ke session baru)

Repo: `C:\Users\GEEKOM A8\Documents\Apps\radar-x-hackaton` · Next.js 16.3.8 (App Router) + Tailwind-ish custom CSS di `globals.css` · Semua copy English.

## BATAS KEPEMILIKAN FILE (wajib — session lain sedang edit paralel)

- **Kamu punya:** `src/app/**`, `src/components/**`, `src/app/globals.css`
- **JANGAN sentuh:** `src/lib/**` (session lain sedang edit types/engine), `scripts/**`, `data/**`, `docs/**`, `tests/**`, `package.json`, config apapun
- Baca `antislop.md` + `skills/antislop-ui/SKILL.md` + `skills/antislop-layoutmobile/SKILL.md` di repo SEBELUM edit (aturan AGENTS.md: antislop selama pengerjaan).
- Next.js versi ini punya breaking changes — cek `node_modules/next/dist/docs/` bila ragu soal API.

## Field nullable (koordinasi dengan session engine)

`HoldersMonthly.nShareholders` dan `changeInShareholders` AKAN menjadi `number | null` di `src/lib/types.ts` (session lain). Tulis semua render path seolah field itu `number | null | undefined` SEKARANG — jangan tunggu type change. `null` = data tidak diobservasi → render "—"/"unavailable", **bukan** 0, bukan bar.

## Daftar fix (dari re-audit, sudah diverifikasi)

1. **F13 — null shareholder → 0 + bar palsu** [P2]
   - `src/app/stock/[ticker]/page.tsx` ~76-96: `const v = h.changeInShareholders` → `null !== 0` lolos → `Math.abs(null)=0` → `Math.max(2,px)` menggambar bar merah 2px untuk data yang tidak ada. Fix: `v == null` → render slot kosong/no-bar (atau marker "n/a"), `title` tulis "not reported". ~315-316: `d.holders.length` tidak membuktikan field ada — cek `nShareholders == null` → Stat value "—", sub "not reported this month".
   - Perhatikan: `sorted` array mungkin berisi bulan-bulan historis null — semuanya harus no-bar.

2. **F18 — dossier menampilkan 30 transaksi TERTUA** [P2]
   - `page.tsx` ~413: `<TradesTable trades={d.insider} limit={30}>` — `d.insider` ascending (dibutuhkan chart), jadi slice(0,30) = tertua. Fix DI CALL SITE (jangan ubah services.ts): pass `[...d.insider].sort(desc by txnDate)` atau reverse, dan tambahkan count jujur "showing 30 of N reported transactions" + pagination/link kalau N>30. `TradesTable.tsx` 9 `slice(0,limit)` boleh dipertahankan kalau input sudah desc; tambahkan prop/notice bila terpotong.

3. **F14 — tooltip tersembunyi menyebabkan overflow 360px** [P2]
   - `globals.css` 265-299: `[data-tip]::after` absolute, `left:0`, `max-width:300px`, `opacity:0` — tetap menyumbang scroll width. ADRO 451px / PNLF 412px di produksi. Fix: clamp viewport (`max-width: min(300px, calc(100vw - 24px))`), flip ke kanan-0 bila dekat tepi kanan (bisa pakai `left:auto;right:0` pada modifier class atau container-aware), dan pastikan tip tersembunyi nol kontribusi layout. Tip harus tetap readable + keyboard-operable (`:focus` sudah ada).
   - Hit area: search input ~30.5px dan pagination Next ~16.5px < 44px — naikkan ke ≥44px (lihat SearchBox.tsx + komponen pagination; `h-11`/`min-h-11` pattern sudah dipakai ThemeToggle).

4. **F19 — filedAt/source hilang total di mobile** [P2]
   - `TradesTable.tsx` 21-22/43-45: `hidden md:table-cell` = `display:none` → tak bisa dijangkau scroll. Fix: expandable row (`<details>`/button per row menampilkan filedAt + source link) atau kolom stacked di bawah md. Transaction date + report date + PDF link harus bisa dibuka touch/keyboard di 360px.

5. **F20 — label timeline ~3px di 360px** [P2]
   - `TimelineChart.tsx` 55: `viewBox="0 0 860 H"` fixed, fontSize 9 units → ~3px di mobile. Fix: skala font ke render width (container query/`useResizeObserver` + adapt viewBox/font), atau sediakan tabel harga+marker readable sebagai alternatif di layar kecil. Flow observations `<details>` sudah ada (125+) — boleh tambah tabel ringkas marker transaksi.

6. **F15 — search race + cache gagal permanen** [P2]
   - `SearchBox.tsx` 14-19: `tickerCache` promise tak pernah di-reset; HTTP non-ok/throw → resolve `[]` dan tercache selamanya → refocus tak pernah retry. 28-31: `ensureTickers` cuma di onFocus; user submit nama sebelum dir termuat → false-UNKNOWN (`/stock/BANK%20CENTRAL`). Fix: submit dengan input non-ticker harus `await` directory (tampilkan loading/disabled); kegagalan fetch → `tickerCache = null` + error state + retry. Direct ticker path tetap cepat (jangan blok ticker 4 huruf yang valid).

7. **F16 — theme cycle stuck saat storage write gagal** [P2]
   - `ThemeToggle.tsx` 20-37: `readMode` sukses (getItem ok) mengalahkan `memoryMode`, jadi setItem-throw → pilihan tak pernah terbaca → klik muter tapi label/DOM stuck. Fix: saat write gagal, `memoryMode` harus authoritative — mis. flag `writeFailed` membuat `readMode` memprioritaskan memory; atau memory-first-consistency. Uji kombinasi: read-ok/write-fail/remove-fail.

8. **F17 — kontras light chip watch 4,17:1** [P2]
   - `globals.css` ~50 `--watch:#9a5b07` pada tint `color-mix(14%)` → <4.5:1 untuk teks 10px. Fix: gelapkan `--watch` light-theme sampai ≥4.5:1 di atas tint, atau chip pakai border + `--ink`. Dark theme (`#ffbf52`) sudah aman — jangan ubah.
   - Inline links `page.tsx` ~286/295 ("View suppressed", methodology) color-only (1,22:1 vs teks sekitar) → tambah underline atau cue non-warna. WCAG use-of-color.

9. **F22 — wording "insider" untuk institutional holders** [P3]
   - Engine `exitwatch.ts` menandai ≥5% institutional reported holders sebagai insider (definisi IDX legal). Yang perlu kamu: label UI/legend/methodology konsisten — "reported holder"/"eligible filing" dijelaskan sebagai definisi IDX (directors/commissioners + ≥5% holders). Jangan rename kunci data `insiderExit`/`insider_filings` (engine session punya); cukup display copy.

## Verifikasi sebelum commit

`npm test` · `npm run typecheck` · `npm run lint` · `npm run build` — semua harus hijau.
Kalau bisa jalankan browser: cek `/stock/ADRO` dan `/stock/PNLF` di 360px dark+light → `document.documentElement.scrollWidth === 360`. Jangan jalankan `scripts/qa-*` (sweep produksi, lambat).

## Aturan commit

- Commit kerjamu sendiri, pesan `fix(ui): ...`. **Jangan push** — session integrator yang push setelah full gate.
- Jangan `git add -A`; stage hanya file yang kamu edit.
- Bila typecheck gagal karena `src/lib/types.ts` berubah di tengah jalan (nullable holders) — itu koordinasi yang disengaja; null-check yang kamu tulis memang untuk itu.
