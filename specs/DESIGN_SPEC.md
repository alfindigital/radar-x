# DESIGN_SPEC — RADAR-X

## Prinsip

Intelligence dossier, bukan dashboard SaaS generik. Datar, gelap, angka mono,
warna hanya untuk makna (arah posisi). Tidak ada gradien ungu, tidak ada glow,
tidak ada dekorasi AI-slop.

## Token (globals.css)

| Token | Hex | Pakai |
|---|---|---|
| `--bg` | #0b0e11 | background app |
| `--panel` | #12161b | kartu utama |
| `--panel-2` | #171d24 | sub-panel, stat |
| `--line` | #232b34 | border hairline |
| `--ink` | #e6edf3 | teks utama |
| `--ink-dim` | #8b98a5 | teks sekunder |
| `--ink-faint` | #59636e | label kecil, meta |
| `--acc` | #3fb68b | akumulasi / beli / positif |
| `--dist` | #e5534b | distribusi / jual / negatif |
| `--neutral` | #d29922 | watch / netral / anchor line |
| `--blue` | #58a6ff | harga, link accent, institusi chart |

## Tipografi

- Sans: Geist (judul, teks).
- Mono: Geist Mono + `tabular-nums` untuk semua angka, ticker, skor, tabel data.
- Skala: h1 18-24px bold; section label 10-11px uppercase tracking-wider dim;
  body 12-14px; meta 9-11px faint.

## Komponen

- `.panel` / `.panel-2`: radius 10, border `--line` 1px, tanpa shadow.
- `.tag`: chip 11px bordered; varian `.tag-acc` / `.tag-dist` / `.tag-neutral`.
- `ScoreBadge`: mono bold, warna = `scoreColor` (≥25 acc, ≤-25 dist, else neutral).
- `TimelineChart` (hero): SVG 860×300 — garis harga (blue), bar net flow asing
  (acc/dist, 55% opacity, baseline bawah), marker insider ▲ beli / ▼ jual,
  garis anchor putus-putus (neutral) untuk kasus. Tooltip via `<title>`.
- `ScoreBreakdown`: 5 bar komponen dengan bobot + nilai σ berwarna arah.
- `TradesTable`: tabel mono, border-b hairline, nama → `/orang/[holder]`.
- `CaseCard`: tag pola + ticker + narasi + score badge + hasil 30h.

## Aturan warna

Warna semantik saja: hijau = akumulasi/beli/positif, merah = distribusi/jual/
negatif, amber = netral/anchor, biru = harga/institusi/link. Tidak ada warna
dekoratif lain.

## Layout

- Max width 1152px (`max-w-6xl`), padding 16px.
- Board: tabel kiri (fluid) + rail kanan 340px (feed + kasus).
- Dossier: hero chart full → 4 stat → 2 kolom (breakdown | holders) → tabel → kasus.
- Mobile: kolom tumpuk, tabel scroll-x, kolom sekunder hidden di <md.

## States

- Loading: route default (server components render cepat; data lokal).
- Empty: panel dengan teks dim + instruksi konkret (misal jalankan compute).
- Data kurang: "belum cukup" jujur, bukan angka palsu.
- Error API: dossier tetap render dengan bagian kosong + tag "live fetch".

## Aksesibilitas

- Kontras ink/bg ≈ 12:1; ink-dim/bg ≈ 5:1; label minimal faint hanya untuk meta.
- Chart pakai `<title>` + aria-label; warna selalu dipasangkan dengan bentuk/label
  (▲/▼, teks BUY/SELL) — bukan warna saja.
