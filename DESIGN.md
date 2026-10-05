# DESIGN.md — RADAR-X

Direction chosen by owner (2026-10-05): **terminal pasar gelap** — an exchange-desk
terminal, not a landing page. Bloomberg/TradingView-class density and discipline;
phosphor accent on near-black. Dark is the identity (R-21: a market terminal has a
legitimate reason for dark chrome — the product reads like a radar scope, and the
name is literal).

## Identity

RADAR-X reads a frozen disclosure snapshot like a scope reads a sky. The interface
should feel like an instrument panel: calibrated, dense, quiet until a number
matters. Nothing sells anything — this is a research instrument, not a product page.

Personality: precise, forensic, unsentimental. Evidence over decoration, always.

## Dials

`Dial: ENERGY 2 / RHYTHM 2 / MOTION 1`

- ENERGY 2: present and confident (display-weight headings, real focal point per
  screen), but never loud — no gradients, no glow, no celebration.
- RHYTHM 2: predictable data rhythm with deliberate breaks (hero reading on the
  dossier, heatmap on rotation); tables stay uniform because tables are instruments.
- MOTION 1: state changes only (hover/active/focus, 150ms). The data is the motion.
  No scroll reveals, no parallax, no looped pulses.

## Palette

Core: near-black blue-grey neutrals + **one** phosphor accent (R-29).

Dark (primary identity) — r2 contrast pass, ~10% lighter ink tiers:
- `bg #090c10` — scope glass, near-black with a cold tint, never pure #000
- `panel #10151b` / `panel-2 #1b2530` — instrument plates, one step up each
- `line #253545` / `line-2 #4d6076` — hairlines, then readable secondary
- `ink #f0f5fa` / `ink-dim #aec0d1` / `ink-faint #7e91a6` — AA-checked
- `acc #3ee2a0` — phosphor green. The ONE accent: positive-side readings, links,
  active states, the radar blip. Reason: radar scope phosphor + market-positive
  semantics converge; it is never used decoratively.
- `dist #ff7d66` — warm signal red: exit-side/negative readings, warnings
- `watch #ffbf52` — amber: flags and "attention" context (SUSP, CA, float)
- `sky #8fbfff` — secondary data color: price line, informational links
- `cohort-inst #96c0ff` / `cohort-retail #ffb26b` — cohort identity (channel
  labels, not buy/sell semantics)

Light (must fully work, R-34): paper `#f5f7f9`, panel `#ffffff`, ink `#111a24`,
acc `#0a7a52` (AA on white), dist `#c93a26`, watch `#9a5b07`, sky `#2563a8`,
cohort-inst `#1d4ed8`, cohort-retail `#9a5a12`.

## Typography

Archivo (interface + headings) + JetBrains Mono (all data). r2 swap from IBM
Plex: Plex read as the generic "AI default"; Archivo is a tighter grotesk and
JetBrains Mono carries real terminal character (distinctive numerals, honest
bitmap heritage). Mono is native material for numbers, tickers, dates, codes —
not a costume (R-06 with a written reason).

- Display: Archivo 700, tight tracking, real scale jumps (h1 26px).
- Data: JetBrains Mono `tabular-nums` always. Scores/prices get size, never
  color alone.
- Micro-labels: mono 9–11px uppercase, letterspacing 0.08–0.16em, `ink-dim`
  (never `ink-faint` for anything the user must read — faint is metadata only).

## Read-at-a-glance layer

Every board leads with a **stats band**: a `gap-px` hairline grid of label-over-
value cells (mono 9px label / mono 15px value). On `/` it carries IHSG + tier
counts + flagged; `/broker` carries registry cohort counts; `/asing` carries
accumulate/distribute coverage. Pattern adapted from dense market consoles
(Origin "markets at a glance", OKX header stats, Binance trading data).
One row, zero prose — the numbers are the summary.

## Shape language

Sharp. Radius scale: 2px tags · 3px controls · 5px panels. No pills, no capsule
badges (R-11). Terminals are rectangles; curves are reserved for the radar motif.

## Motif (identity)

- Radar scope: concentric-ring mark in a bordered console badge beside the
  wordmark; a single blip. Same mark doubles as favicon (`icon.svg`/`icon.png`/
  `favicon.ico`). Used once in the header — nowhere else.
- Theme control is one icon button cycling system → light → dark (monitor /
  sun / moon glyphs). Text labels on a segmented control read as generic UI;
  the icon communicates the state itself.
- Hairline discipline: 1px `--line` borders do all separation; panels get no
  shadow in dark (elevation by border+surface step only), minimal shadow in light
  (R-12).
- State stripes allowed ONLY as signal: a 2px left edge on high-pressure rows
  (score ≥75) is information, not decoration (R-31 written reason).
- Gauge bars: thin 3–4px tracks with threshold ticks — readings you can scan.
- A top accent hairline under the header marks the console edge.

## Copy rules

- Em dash banned in all UI text (R-02). Use `·`, `:`, or parentheses.
- No buzzwords, no claims without a source. Missing data renders as `—` or a
  labelled state, never zero (product doctrine, not just style).
- Sentence case headings. Uppercase reserved for mono micro-labels.

## States (required everywhere data renders)

Available / suppressed-low-coverage / not-ingested empty / pending. Every state
gets designed treatment — an honest empty state beats a fabricated table.
