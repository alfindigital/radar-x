# DESIGN_SPEC V3 — RADAR-X "Exit Watch" — PK1 "Research balanced" (adopted)

Owner decision 2026-10-05: **adopt direction A** dari
`docs/design/RADARX_DESIGN_OPTIONS.md` = paket **PK1**: Evidence Desk +
DE1 "IDX Market Intelligence" + T1 "Read the flow. Check the evidence." +
V1 Analyst plain + F1 IBM Plex + U2 + NAV-A + SEARCH-B + DASH-A + DOS-B +
CHART-A/B + EC2 + OWN-A + PROV-A + MOB-A + ST1 + M2 + TH1 + LOC1 + LOG1 +
LAND1.

## 1. Brand tokens — Palette A (Evidence Desk, cobalt/blue-grey)

```css
:root[data-theme="light"] {
  --canvas:#F4F7FB; --surface:#FFFFFF; --subtle:#E8EEF6;
  --text:#142132;   --muted:#536174;   --border:#CDD7E4;
  --control-border:#74869C; --accent:#2458A6; --accent-soft:#E2ECFB;
  --on-accent:#FFFFFF;
}
:root[data-theme="dark"] {
  --canvas:#101720; --surface:#18222F; --subtle:#202E3E;
  --text:#EDF3FA;   --muted:#AAB8C9;   --border:#34475E;
  --control-border:#657D99; --accent:#9BC2FF; --accent-soft:#223B5C;
  --on-accent:#10223A;
}
```

**Status colors (signed values — shared set):**

| Role | Light | Dark | Meaning |
|---|---|---|---|
| positive | `#126C4A` | `#70D0A7` | observed direction, not a recommendation |
| negative | `#AD3930` | `#FF9A8E` | observed direction, not proof of intent |
| caution | `#805800` | `#E7BE69` | context/method needs checking |
| system-error | `#922652` | `#F29ABD` | load/process failure |
| unknown | `#586471` | `#A8B4C2` | evidence unavailable |

**Cohort colors (EC2) — identity, NOT direction:**

| Cohort | Light | Dark |
|---|---|---|
| institutional-classified | `#1D4ED8` | `#93C5FD` |
| retail-classified | `#92400E` | `#FDBA74` |
| unclassified | `#586471` | `#A8B4C2` |

Blue/ochre are ~1.06:1 against each other → never rely on color alone:
always pair with `INST`/`RET`/`UNCL` labels. Signed direction uses the
status positive/negative colors or sign glyphs (`+`/`−`) with labels.

**Migration:** existing `globals.css` vars (`--bg`, `--panel`, `--acc`,
`--dist`, `--neutral`, `--blue`) are remapped onto the new token names in
TASK-06 — old pages inherit automatically. Keep aliases for one release;
new code uses new names only.

## 2. Typography — F1 IBM Plex

- **IBM Plex Sans** (UI/prose) + **IBM Plex Mono** (ticker, dates, deltas,
  IDs). Self-host via `next/font` local files; record OFL license.
- Hierarchy: body 16px/1.55; UI+table 14px/1.45; caption 13px/1.4; page
  title 28px; dossier title 36px. `tabular-nums` + right-align on numeric
  columns. No mono for H1/body. Never shrink holder names/source metadata
  below 13px.

## 3. Layout patterns

- **NAV-A top navigation** — replaces sidebar: `Board` `/`, `Brokers`
  `/broker`, `Foreign flow` `/asing`, `Sectors` `/rotasi`, `Cases`
  `/kasus`, `Methodology` `/metodologi`. `aria-current` on active; mobile =
  labeled menu (reuse/extend `MobileNav`).
- **DASH-A Ranked Research Board** — `[snapshot date / coverage / search]
  → [board mode / filters] → [issuer ranking table | source rail]`.
  Rail ~300–340px desktop, follows content on tablet/mobile.
- **DOS-B Summary-to-evidence** dossier order: identity+dates →
  factual summary + coverage → component explanations/sources → timeline →
  holders/ledger. Exit Door panel slots into "components" position.
- **LAND1 app-first** — board is the entry; no marketing page.
- **U2 density** — desktop rows 44–48px, control radius 6px, panel 10px,
  overlay-only shadows. Spacing: related fields 12–16px, data groups 24px,
  dossier sections 32–40px.

## 4. New components (v3)

### `ExitPressureBadge` (replaces old `ExitBadge` name)
- Mono bold 0–100, labeled **"Exit pressure"** — a NEW scale; never rendered
  with the v2 −100..+100 `ScoreMarker` styling.
- Color: high ≥75 → `--negative`; 55–74 → `--caution`; 35–54 → `--muted`;
  below → `--unknown` with label "Lower observed exit pressure" (NOT
  "Safe"). `score:null` → `—` + "low coverage" chip.
- Always shows `coverage` when <1 (e.g. `cov .85`).

### `FlagChips`
- Factual badges only, each with a definition in `title` + methodology:
  `SUSP ≤14D`, `CA ±7D`, `FF<20%`, `SPARSE`. Caution outline; absence =
  rendered as nothing (silence is not an error — but "no flags" ≠ "clean").

### `CohortNetChart` (signature visual — CHART-B + EC2)
- Two aligned panels sharing one zero baseline, up to ~10 trading sessions in the 14-day window: top panel
  institutional-classified net, bottom retail-classified net. Bars use
  cohort colors (blue/ochre) — NOT red/green. Sign conveyed by baseline
  direction + `+`/`−` labels; foreign overlay gets dashed outline.
- `<title>` tooltip per bar (date + IDR value). `View observations` table
  below the chart (chart is never the only path to the data).
- Copy: "Broker cohort classified as institutional/retail" — cohort does
  not prove the ultimate trader's identity.

### Broker board (`/broker`)
- DASH-A table; cohort tabs `All | Retail | Institutional`; missing cohort
  sessions → ST1 honest state copy (not zeroed).
- `/broker/[code]`: registry card + session history + topSymbols
  (broker_top inversion).

## 5. Copy register (V1 Analyst plain · LOC1)

- UI language: **English**; dates `en-GB` ("4 Oct 2026"); IDR units
  explicit; WIB only for real timestamps; null ≠ 0.
- Labels: Board, Brokers, Foreign flow, Sectors, Cases, Methodology,
  "Reported holdings", "Exit pressure".
- CTA: "Open board", "Review stock", "Read source", "Clear filters".
- States (ST1 inline cells): `Unavailable in this snapshot.` ·
  `Partial component coverage.` · `No issuers match these filters.` ·
  `Outcome window not complete.` · `Showing saved data from <date>.`
- Exit Watch state: `Some components are unavailable. Review coverage
  before comparing this reading.`
- Banned: smart money, bandar, "safe", unqualified accumulation/
  distribution, em dash in UI copy, marketing promises.

## 6. Behavior contracts

- **TH1** system + saved theme (Light/Dark/System toggle in top nav; no
  theme flash — inline `data-theme` bootstrap script before paint).
- **M2** state transitions only: tabs/popovers 140–180ms, drawers
  180–220ms, `cubic-bezier(.2,.7,.2,1)`; `prefers-reduced-motion` → instant.
- **MOB-A** compact records + expand on mobile; checkpoints 360/768/1440 +
  320px reflow.
- **Keyboard/focus**: skip link, logical DOM order, visible focus,
  `aria-sort` on sortable table headers, sources accessible without hover.
- No autoplay, count-up, blinking dots, radar sweeps, or decorative motion
  on frozen snapshots.

## 7. Exit Watch board composition (DASH-A instance)

```
[Snapshot 4 Oct 2026 · coverage: 233 scored / 41 suppressed · Search___]
[Board: Exit pressure | Radar (v2)]   [Filters: Flagged ▾ Sector ▾]
[ # | Issuer | Exit pressure | Components | Flags   | Source rail:
     1 | BBCA.JK | 87 HIGH | I▓ F▓ I▓ R░  | SUSP CA |  recent filings,
       PT Bank… | cov 1.00 |                          flagged list  ]
[Methodology link · inputHash short · generatedAt]
```

- Suppressed rows visible in their own scope — coverage honesty is
  load-bearing, not decoration.
