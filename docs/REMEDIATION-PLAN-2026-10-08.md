# RADAR-X — Remediation Plan dari Re-audit Codex (2026-10-08)

> Reviewer: Devin. Revisi yang ditinjau: `14cf7e8` (audit), HEAD saat review: `cd3dc1d`.
> Kode `scripts/` + `src/` identik antara dua revisi → semua temuan masih berlaku verbatim.

## 1. Verdict atas re-audit

**Audit akurat.** Seluruh 23 temuan (F01–F23) diverifikasi langsung ke kode oleh Devin —
setiap lokasi `file:line` yang dikutip cocok, setiap mekanisme failure terbukti ada.
Framing audit juga jujur: dua P1 adalah *failure path ingest*, bukan korupsi snapshot
aktif (replay artifact reproducible, hash cocok).

**Tiga koreksi konteks (bukan kesalahan audit):**

1. **Revisi sudah bergeser.** Audit memakai `14cf7e8`; HEAD sekarang `cd3dc1d`
   (+evidence pack, +refresh snapshot 10-08, +exclude harnesses dari tsc/eslint).
   Temuan kode tetap valid, tetapi angka snapshot yang dikutip audit
   (849 publishable / 115 suppressed, tier 182/133/354/180) sudah basi:
   artifact HEAD = **850 publishable / 114 suppressed, tier 190/125/349/186**.
2. **F21 sebagian sembuh — tapi bug-nya langsung reproduksi.** `94899da` memperbarui
   CLAIMS/CURRENT_STATE ke angka 10-08, namun (a) `SUBMISSION.md:53` masih
   "as of 7 October, 244 publishable / 718 suppressed"; (b) docs yang "updated"
   mengutip 189/126/348/187 sedangkan artifact ter-commit = **190/125/349/186**.
   Persis pola F21: angka docs ditranskrip dari run lokal, bukan dari artifact.
3. **F02 punya mekanisme kedua yang audit ringkas tapi layak disebut eksplisit:**
   `brokersTop` (1006), `mostTraded` (1021), `quarterlyFinancialDates` (1039)
   tidak punya try/catch — satu throw mematikan seluruh stage extras *di tengah
   jalan* setelah write sebelumnya sudah persist, tanpa baris log sama sekali.
   Jadi extras punya dua mode gagal: fail-open (corp-actions) dan crash-mid-write.

## 2. Status verifikasi per temuan (spot-check Devin)

| F | Klaim audit | Verifikasi kode | Status |
|---|---|---|---|
| F01 | catch-all → init kosong → overwrite | `ingest.ts` 774/787 (`idx_total`, `index_daily`), 877-880 (ownership), 957-958 (`read()` helper), 1161 (cohorttop), 1233 (news); semua `writeFile` non-atomic | confirmed |
| F02 | corp-action gagal → types kosong menimpa; tally tak lengkap | 984-999 (write unconditional, no last-good), 1049/646/1250 (`store.log(...,"ok")` hardcoded), 1189 `tally.ok++` sebelum echo check 1191 | confirmed |
| F03 | gate menerima lineage invalid/duplikat/member kurang | `audit-data.ts` 92-107: hanya hash member yang *terdaftar*; tak ada required-set; `duplicateRows` dihitung (133) tapi tak pernah masuk `failures`; inputHash dicek ada, tak direcompute | confirmed |
| F04 | CLIP tak pernah fail; mobile tak cek status | `qa-redesign.mjs` ~54-65: `off` hanya di-log; `qa-mobile.mjs` visit tanpa `response.status()` | confirmed |
| F05 | generation tak atomic; taxonomy tak masuk hash | `compute.ts` 81-85 per-file atomic + manifest last; 106: feedHashes list tanpa `taxonomy.json`; caps 134-138 dari taxonomy | confirmed |
| F06 | budget per-stage, estimator salah | `daily-ingest.ps1`: `SECTORS_CALL_BUDGET=600` per stage, 9 stage harian +5 Sabtu; komentar "~570/day" vs limit simbol 200+30+150+100+100+extras | confirmed |
| F07 | rotasi stuck di simbol kosong | `ingest.ts` 308-316: sort by **last data date** (`""` first) — simbol tanpa row selalu di depan tiap run | confirmed |
| F08 | only-missing parse file penuh per simbol | `ingest.ts` 142-156 loop `store.listBrokerRows(s)`; `db.ts` 214-218 `readJson` seluruh file per call | confirmed |
| F09 | flag numerik invalid tak ditolak | `ingest.ts` 302 `Number(flag)` tanpa range check (`-1` → `slice(0,-1)`); 889 `\|\| 100` menelan `0` | confirmed |
| F10 | suspended pakai event tak bounded + missing≈zero | `exitwatch.ts` 265-267: `suspensions.length>0` (unbounded, tak cek `suspension_date<=asOf`), `(r.volume ?? 0)>0` menyamakan missing dgn 0 | confirmed |
| F11 | seller memutus cluster | `cases.ts` 171-184: sort by date+name lalu group consecutive same-dir → satu sell di antara buy memecah cluster | confirmed |
| F12 | fallback holder tua bobot penuh | `score.ts` 143: `reverse().find(Number.isFinite)` tanpa batas umur | confirmed |
| F13 | null shareholder → 0 + bar palsu | `types.ts` 73-74 non-null; `page.tsx` 78-90: `null!==0`→`Math.abs(null)=0`→`max(2,px)`=bar 2px; 315-316 `holders.length`≠field ada | confirmed |
| F14 | tooltip tersembunyi menambah overflow | `globals.css` 269-293: `::after` absolute `max-width:300px`, `opacity:0` tanpa clamp viewport; pemicu `data-tip` di `page.tsx:139` | confirmed |
| F15 | search race + cache gagal permanen | `SearchBox.tsx` 14-19: `tickerCache` tak pernah reset; 16-17: 503→`[]` tercache; 46-53: submit tanpa tunggu dir | confirmed |
| F16 | write-gagal → cycle stuck | `ThemeToggle.tsx` 20-37: `readMode` sukses mengalahkan `memoryMode` → klik tak pernah mengubah mode terbaca | confirmed |
| F17 | chips watch light <4.5:1 | `globals.css` 50 `--watch:#9a5b07` (light) pada tint 14% — ~4.17:1 plausible; dark `#ffbf52` aman | confirmed |
| F18 | dossier tunjukkan 30 tertua | `services.ts` 104 sort ascending; `page.tsx` 413 `limit={30}`; `TradesTable` 9 `slice(0,limit)` = tertua | confirmed |
| F19 | filedAt/source hilang di mobile | `TradesTable.tsx` 21-22/43-45 `hidden md:table-cell` = `display:none`, tak bisa di-scroll | confirmed |
| F20 | label timeline ~3px di 360px | `TimelineChart.tsx` 55 viewBox tetap `0 0 860 H` + fontSize 9 → ~3.08px @294px | confirmed |
| F21 | docs drift | `SUBMISSION.md:53` masih 10-07; SESSION/CURRENT_STATE/CLAIMS 189/126/348/187 vs artifact 190/125/349/186 | confirmed (masih open) |
| F22 | INS = institutional holder | `exitwatch.ts` 233-239 `insider_filings` memang mencakup ≥5% holders — masalah terminologi, P3 | confirmed |
| F23 | advisory braces dev belum ada patch | `npm-audit.json` di evidence pack; runtime audit bersih | confirmed |

## 3. Keputusan yang harus diambil user dulu (blocker domain)

| # | Pertanyaan | Implikasi |
|---|---|---|
| D-1 | Status submit portal hackathon (deadline 8 Okt 23:59 WIB)? | Menentukan fase eksekusi — lihat §5 |
| D-2 | F12: kebijakan umur fallback holder? (mis. maks 3 bulan, tampilkan `observedTo`, atau tetap full-weight + label) | Mengubah skor bila diberi batas umur — perlu recompute |
| D-3 | F02: feed mana yang *mandatory*? Kalau extras/corp-actions gagal total, apakah compute tetap jalan (publish dengan evidence basi) atau run gagal? | Menentukan gate policy di daily runner |
| D-4 | F22/F10: kontrak "insider" — tetap definisi IDX (≥5% holder = insider) dengan wording baru, atau pisahkan kelas institusi dari INS? | Menyentuh label engine + methodology |

## 4. Plan aksi — 5 batch, dependency-aware

### Batch A — Integritas ingest & failure path [P1+P2, prioritas tertinggi]

| Task | Temuan | Aksi teknis | File | Gate verifikasi |
|---|---|---|---|---|
| A1 | F01 | Helper `readJsonSafe(file, schema)`: fallback **hanya** ENOENT; parse-gagal/skema-invalid → throw + exit≠0 sebelum provider call. Ganti semua `try/catch{/*first run*/}` di writers ancillary. Terapkan `writeAtomic` (tmp+rename) untuk SEMUA artifact, bukan cuma core. | `scripts/ingest.ts` 774/787/877-880/957-958/1161/1233 + `src/lib/db.ts` | fixture korup → file lama byte-identik + exit≠0 |
| A2 | F02 | `preserve-last-good`: corp-actions merge ke artifact lama per-type (type gagal → pertahankan lama + flag `stale:true`). Hapus `store.log(...,"ok")` hardcoded → tally universal termasuk extras/rotation/news. `tally.ok++` pindah sesudah validasi echo. Bungkus call tak terjaga (1006/1021/1039) — gagal → log + status, bukan crash diam-diam. Definisikan mandatory-feed policy (D-3): mandatory gagal → `process.exitCode=1` + daily runner skip compute. | `ingest.ts` 51-58/646/984-999/1004-1047/1049/1189-1192/1250 | mock all-503: evidence lama utuh, exit≠0; mixed echo → partial/failed, bukan ok |
| A3 | F09 | Validasi flag numerik: integer ≥0 (atau ≥1) sebelum client/fetch; invalid → exit≠0 dengan 0 provider call. Seragamkan semantik `limit=0` (reject atau no-op eksplisit). | `ingest.ts` 160/302/889/1176 + parse helper | `--limit -1`/`--limit 0` → 0 call, exit≠0 |
| A4 | F07 | Rotasi broker: urutkan by **last attempt** (field `attempted[sym]` di artifact), pisahkan `lastDataDate` (freshness) dari `lastAttempt` (rotasi); empty legit dapat cooldown (mis. 7 hari) vs provider failure (retry cepat). | `ingest.ts` 301-316 + `broker_rows` meta | fixture 2-run: simbol empty run-1 tak di-fetch run-2 |
| A5 | F08 | `only-missing`: satu pass bangun `Set(symbol)` dari broker file (atau `store.listBrokerSymbols()`), selection/limit dari set — nol parse per ticker. | `ingest.ts` 142-156/304, `db.ts` 214-218 | 962-symbol run: broker file dibaca 1× (instrumentasi) |
| A6 | F06 | Shared run ledger: satu file `logs/run-ledger.json` per run, tiap stage debit credit actual; run ceiling (mis. 700) + deadline wall-clock; perbaiki komentar "~570". Opsional: turunkan OS execution limit 72h → bounded. | `daily-ingest.ps1`, client budget guard | dry-run ledger: total ≤ ceiling, stage ke-N berhenti saat habis |

### Batch B — Gate & generation integrity [P2]

| Task | Temuan | Aksi | File | Gate |
|---|---|---|---|---|
| B1 | F03 | Required member set `{scores,cases,exitwatch}` wajib ada di manifest; `duplicateRows>0` & `missingSource>0` (per kebijakan) → failure; recompute `inputHash` dari input file hashes dan bandingkan. | `scripts/audit-data.ts` 82-145 | 3 fixture negatif → exit≠0 + reason spesifik |
| B2 | F05 | Generation atomik: tulis `derived-v2/gen-<hash>/` immutable + pointer `current` (rename/atomic swap). Bind `taxonomy.json` + semua raw feed ke `inputHash`/`feedHashes`. Reader pin ke satu generation dir. | `scripts/compute.ts` 70-140, `src/lib/derive.ts` | fixture interrupted-write → reader tetap baca generation lama; taxonomy change → inputHash berubah |
| B3 | F04 | QA: assert response status + heading konten + error-shell detection per route; `CLIP` jadi failure kecuali dalam scroll-container nyata (`scrollWidth>clientWidth` pada ancestor `.overflow-x-auto`). E2E tambah skenario mobile-360 dossier/source/contrast. | `scripts/qa-redesign.mjs` 54-65, `qa-mobile.mjs`, `tests/e2e` | mock off-nonempty & error-shell → exit≠0 |

### Batch C — Analytics correctness [P2, wajib recompute]

| Task | Temuan | Aksi | File | Gate |
|---|---|---|---|---|
| C1 | F10 | `suspended` quarantine: hanya `suspension_date <= asOf`, harus ada ≥1 observed zero-volume session di window (bukan missing), dan tolak bila ada record reopen/status aktif setelahnya. Tambah label `inferred` bila quarantine dari inferensi volume. | `exitwatch.ts` 265-267 | fixture historic/future event → tak quarantine; 99 flagged sekarang re-audit |
| C2 | F11 | Cluster: split stream buy/sell **sebelum** grouping (group per-direction, window 30h deterministik). Nama lawan tak mengubah membership. | `cases.ts` 168-184 | fixture seller-berbeda → cluster identik |
| C3 | F12+D-2 | Tampilkan `observedTo`/bulan sumber di breakdown; kebijakan umur sesuai keputusan domain (label `stale` vs eligibility cut). | `score.ts` 143-145, `widgets.ts` 47-49 | komponen menampilkan umur; kebijakan terdokumentasi |
| C4 | F13 | Skema nullable: `HoldersMonthly.changeInShareholders/nShareholders: number \| null`; ingest jangan cast paksa; UI render "unavailable"/no-bar untuk null, bukan 0. | `types.ts` 69-77, `page.tsx` 76-96/315-316, engine reads | fixture null → "—"/no bar; semua 962 issuer Sep-30 null konsisten |
| C5 | F18 | Dossier transactions: sort **newest-first** + pagination/"showing N of M" — evidence window harus capai transaksi terbaru. | `services.ts` 104 (dossier path) atau call-site `page.tsx` 413 + `TradesTable` | CYBR: transaksi 2026-10-06 tampil, count jujur |

> **Catatan urutan:** C1+C2+C4 menyentuh engine → `npm run compute --as-of today` wajib jalan
> ulang dan angka publishable/suppressed/cases **akan bergeser**. Docs (Batch E) sinkron
> TERAKHIR, sesudah angka final. Regression check: replay hash lama vs baru divergen
> hanya pada komponen yang diubah — dokumentasikan delta di commit message.

### Batch D — Mobile & UX [P2, antislop applies]

| Task | Temuan | Aksi | File | Gate |
|---|---|---|---|---|
| D1 | F14 | Tooltip: clamp ke viewport (`max-width: min(300px, calc(100vw - 24px))`, flip ke sisi dalam saat dekat tepi, atau portal); hidden tip nol kontribusi layout (`visibility:hidden`+`contain` atau render on-demand). Hit area ≥44px: search input, pagination Prev/Next. | `globals.css` 265-299, `page.tsx` 139, `SearchBox`, pagination | QA 360px dark+light: 0 overflow pada ADRO/PNLF; tip tetap kebaca & keyboard-operable |
| D2 | F19 | Mobile akses filedAt/source: row expandable (`<details>` per row) atau kolom stacked di bawah md — jangan `display:none`. | `TradesTable.tsx` 21-22/43-45 | touch/keyboard 360px buka PDF source + baca filedAt |
| D3 | F20 | TimelineChart responsif: font units di-scale ke render width (atau `viewBox` adaptif / container query), plus tabel harga+marker readable sebagai fallback. | `TimelineChart.tsx` 55/108-123 | label terbaca ≥9px efektif di 360px |
| D4 | F15 | Search: submit menunggu directory bila input non-ticker; cache gagal di-invalidate (`catch`→`tickerCache=null`); state loading/error/retry eksplisit. | `SearchBox.tsx` 12-53 | 503-then-success & slow-2500ms → resolve BBCA, tak ada UNKNOWN palsu |
| D5 | F16 | Theme: `memoryMode` authoritative bila write gagal (flag writeFailed → readMode prioritaskan memory). Uji kombinasi read-ok/write-fail/remove-fail. | `ThemeToggle.tsx` 20-37 | 5 klik dengan setItem throw → label ikut berputar |
| D6 | F17 | Kontras light: `--watch` light digelapkan ke ≥4.5:1 di atas tint 14% (mis. `#7a4604`-class) atau chip pakai border+ink. Inline links tambah underline/non-color cue. | `globals.css` 50/176-179/245, `page.tsx` 286/295 | settled light chips ≥4.5:1; links lolos use-of-color |

### Batch E — Docs, terminologi, dependency [P2-P3, terakhir]

| Task | Temuan | Aksi | File | Gate |
|---|---|---|---|---|
| E1 | F21 | Satu evidence register **generated** dari artifact (script `npm run docs:sync` yang membaca manifest+exitwatch lalu render angka ke CLAIMS/CURRENT_STATE/SUBMISSION/SESSION) — hilangkan transkripsi tangan. Fix `SUBMISSION.md:53` sekarang untuk copy portal. | `docs/*`, script baru | angka docs == angka artifact (diff check di CI) |
| E2 | F22+D-4 | Wording "reported holder"/"eligible filing" konsisten di label UI + legend + methodology; scoring membership tak diubah tanpa keputusan domain. | `exitwatch.ts` 233 + components + methodology | methodology menyebut definisi IDX eksplisit |
| E3 | F23 | Dokumentasikan accepted-risk braces advisory di KNOWN_ISSUES + pantau upstream; jangan downgrade ESLint atau audit-fix paksa. | `docs/living/KNOWN_ISSUES.md` | entry + link GHSA tercatat |

## 5. Sequencing — keputusan user: revisi SEMUA sebelum submit (repo beku pasca-submit)

Sisa waktu: **~3,4 jam** (review dibuat 20:35 WIB, deadline 23:59 WIB). Semua 23
temuan tidak bisa dikerjakan dengan verifikasi layak dalam 3,4 jam — memaksakannya
adalah pola happy-path yang dikritik audit sendiri. Yang bisa: **triage 3 tier**,
tree selalu hijau di tiap commit, sehingga state submittable terjaga di mana pun
kita berhenti.

### Tier 1 — WAJIB landing malam ini (~2-2,5 jam incl. verifikasi)

Semua item yang membuat **Delivery Gate FAIL** + honesty bug yang terlihat juri.
Risiko regresi rendah (UI/copy), tidak mengubah angka publik → tidak butuh recompute.

| Order | Task | Temuan | Effort |
|---|---|---|---|
| 1 | C4 | Null shareholder → "unavailable"/no-bar (bukan 0 + bar palsu) | F13 | S |
| 2 | C5 | Dossier transactions newest-first + "N of M" count | F18 | S |
| 3 | D6 | Light watch-chip ≥4.5:1 + underline inline links | F17 | S |
| 4 | D1 | Tooltip clamp viewport + hit area 44px (search, pagination) | F14 | S–M |
| 5 | D5 | Theme: memoryMode authoritative saat write gagal | F16 | S |
| 6 | D4 | Search: tunggu directory saat submit nama + invalidate cache gagal | F15 | S–M |
| 7 | D2 | Mobile akses filedAt/source (expandable row, bukan display:none) | F19 | M |
| 8 | D3 | TimelineChart font/coords responsif + tabel fallback readable | F20 | M |
| 9 | E2 | Wording "reported holder" konsisten (UI + methodology) | F22 | S |
| 10 | E1-manual | SUBMISSION/CLAIMS/CURRENT_STATE/SESSION → angka artifact ter-commit (850: 190/125/349/186 · 114 · 233 · 289/189/221 · asOf 10-08) | F21 | S |

**Checkpoint Tier 1:** `npm test` + `lint` + `typecheck` + `build` + QA sweep 360px
(ADRO/PNLF wajib 0 overflow) + E2E. Commit "fix: delivery-gate remediation" → push.
Ini membalik gate antislop dari FAIL → PASS untuk item yang terlihat juri.

### Tier 2 — HANYA bila Tier 1 beres ≤22:30 (~1 jam + recompute + re-verify)

Engine correctness yang menggeser angka publik. **Keputusan D-2 (umur fallback
holder) wajib dijawab user sebelum mulai.**

| Order | Task | Temuan | Dampak |
|---|---|---|---|
| 11 | C1 | Quarantine suspension bounded (`suspension_date<=asOf`, observed-zero≠missing) | F10 | publishable/suppressed bergeser |
| 12 | C2 | Cluster grouping per-direction | F11 | cases list bergeser |
| 13 | C3 | Holder fallback: tampilkan observedTo/umur (+ kebijakan per D-2) | F12 | display only bila tak ada cut |

Sesudahnya: `compute --as-of today` → `audit:data` → `npm test` → sync docs
ke angka BARU (E1 ulang) → commit terpisah "fix: engine quarantine/cluster logic".
Bila angka bergeser, video/copy harus pakai angka baru — jangan campur.

### Tier 3 — TIDAK malam ini (pipeline lokal, tak terlihat juri)

A1/A2 (P1), A3–A6, B1–B3, E1-generator, E3. Alasan: melindungi run ingest LOKAL
yang berakhir 10-11; artifact tersubmit = snapshot frozen yang sudah reproducible —
P1 belum pernah trigger di produksi (kata audit: "final files saat audit valid").
Jika repo benar-benar beku, terapkan sebagai patch lokal untuk sisa run ingest,
dan commit pasca-deadline hanya bila aturan mengizinkan — keputusan user.
**Kompromi opsional:** A1 alone (~30 mnt) bisa diselipkan paling akhir bila Tier 1+2
selesai cepat — satu file helper + swap writer, terisolasi dari jalur submit.

### Hard rule malam ini

- Satu commit per batch yang selesai-diverifikasi; jangan menumpuk setengah-jadi.
- Tidak ada recompute sebelum Tier 1 committed — angka publik hanya boleh bergerak sekali.
- 23:30 WIB = freeze apapun kondisinya: commit state hijau terakhir + push + sync docs.
- Antislop: dibaca SEBELUM edit UI (sesuai jawaban user — selama pengerjaan).

## 6. Risiko & catatan eksekusi

- **Daily ingest 18:00 sedang berjalan** (`data/idx_total.json` + `index_daily.json`
  modified di working tree saat review). Jangan edit `scripts/ingest.ts` saat run
  aktif — tunggu selesai atau koordinasikan (aturan satu-writer-per-path).
- Batch C mengubah angka publik → semua dokumentasi + materi submit yang sudah
  direkam jadi stale. Pertimbangkan freeze engine sampai pasca-hackathon bila
  video/portal sudah memakai angka 10-08.
- F10 quarantine re-audit: 99 flagged saat ini punya measured-zero windows
  (kata audit sendiri), jadi hasil akhir mungkin tak banyak berubah — tapi gate
  logika tetap wajib diperbaiki.
- Bukti spot-check ini tidak mengubah kode/data — review read-only.
