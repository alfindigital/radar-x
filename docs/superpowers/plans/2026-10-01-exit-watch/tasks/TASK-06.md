# TASK-06 — PK1 design foundation (tokens, fonts, theme, top nav)

**Status:** ✅ · **Depends on:** TASK-05 (order flexible — no logic deps) · **Gate:** —
**Spec:** `specs/DESIGN_SPEC_V3.md` (PK1 adopted 2026-10-05) ·
`docs/design/RADARX_DESIGN_OPTIONS.md` §8–12, §20

## Goal

Land the PK1 "Evidence Desk" foundation so TASK-07+ build on real tokens:
Palette A light/dark, IBM Plex Sans+Mono, TH1 theme behavior, NAV-A top
navigation replacing the sidebar.

## Files

- **Edit** `src/app/globals.css` — token remap (see spec §1; keep old var
  names as aliases for one release so existing pages don't break mid-flight)
- **Edit** `src/app/layout.tsx` — fonts + top nav + theme bootstrap
- **Create** `src/components/ThemeToggle.tsx` (client)
- **Create** `src/components/TopNav.tsx` (or refactor existing header; check
  what `layout.tsx` already renders — it has a sidebar + mobile nav; NAV-A
  means top navigation on all viewports)
- Fonts: download IBM Plex Sans (400/500/600) + IBM Plex Mono (400/600) woff2
  → `public/fonts/` or `src/app/fonts/`; load via `next/font/local`; keep
  OFL license file. If offline, fall back to `next/font/google` import —
  check `node_modules` docs first.

## Steps

1. **Tokens** — in `globals.css`, define `:root[data-theme]` blocks per
   DESIGN_SPEC_V3 §1 (canvas/surface/subtle/text/muted/border/
   control-border/accent/accent-soft/on-accent + status colors + cohort
   colors). Alias block:
   ```css
   --bg: var(--canvas); --panel: var(--surface); --panel-2: var(--subtle);
   --line: var(--border); --ink: var(--text); --ink-dim: var(--muted);
   --ink-faint: var(--unknown);
   --acc: var(--positive); --dist: var(--negative); --neutral: var(--caution);
   --blue: var(--accent);
   ```
   Define `--positive/--negative/--caution/--unknown` and
   `--cohort-inst/--cohort-retail/--cohort-uncl` per theme.
   Verify: existing pages still render sensibly (quick `npm run build` +
   one page screenshot if playwright available — at minimum no build break).
2. **Fonts** — `next/font/local` in `layout.tsx`:
   ```ts
   const sans = localFont({ src: [{path:"./fonts/IBMPlexSans-Regular.woff2", weight:"400"}, …], variable:"--font-sans" });
   const mono = localFont({ …, variable:"--font-mono" });
   ```
   `body { font-family: var(--font-sans) }`, `.mono/numbers { font-family:
   var(--font-mono); font-variant-numeric: tabular-nums }`.
3. **TH1 theme** — inline bootstrap script in `<head>` (before paint, no
   flash): read `localStorage.theme` else `prefers-color-scheme` → set
   `document.documentElement.dataset.theme`. `ThemeToggle` client component:
   three-state Light/Dark/System, `aria-pressed`, icon+label.
4. **NAV-A top nav** — replace sidebar: brand wordmark "RadarX" (text, LOG1
   bracket motif optional — plain text is fine) + links Board / Brokers /
   Foreign flow / Sectors / Cases / Methodology + ThemeToggle right.
   `aria-current="page"` on active (use `usePathname` — client component).
   Mobile: labeled menu button + drawer (extend `MobileNav` if it exists —
   check `src/components/`).
   Keep the sidebar file around? No — remove cleanly; git preserves history.
5. Copy register: English labels per spec §5; no em dashes.

## Checks

```bash
npm run build && npm test
```

Manual: dark+light both complete (hover/focus/chart/source-link states),
no flash on reload, nav works mobile width.

## Done when

- [ ] Both themes render all existing pages without breakage.
- [ ] IBM Plex loads (font-family applied, tabular-nums on tables).
- [ ] Top nav + theme toggle live; sidebar removed.
- [ ] Contrast sanity: text/accent/control-border pairs per doc's ratio table.

## Pitfalls

- `layout.tsx` is a server component — `usePathname` needs a client child
  (`TopNav` = `"use client"`).
- Theme bootstrap must run before hydration → `<script
  dangerouslySetInnerHTML>` in `<head>`, synchronous, tiny.
- Don't restyle every page — token remap carries most of it; per-page
  polish belongs to their own tasks (07/08/09).
- `next/font` needs font files present at build; confirm paths relative to
  `layout.tsx`. Check `node_modules/next/dist/docs` for local-font API in
  this Next version (AGENTS.md warning).
