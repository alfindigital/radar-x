# RADAR-X UI/UX audit — 2026-10-08

Target: https://radarx.web.id (production, verified HTTP 200; www 308→apex; alias radar-x-beta.vercel.app).
Method: live browser sweep (desktop 1280px + mobile 390px), DOM/contrast measurement, source cross-check against DESIGN.md + antislop rules. Console clean, zero page errors. Screenshots in this folder.

## Verdict

The design system is genuinely strong — real identity (terminal pasar gelap), honest empty/suppressed states, AA contrast in both themes, working keyboard focus, clean mobile adaptation. One real functional bug found (`/asing` renders empty while data exists), the rest are polish-level findings.

## Verified strengths

- [PASS] Contrast dark: faint 6.05:1, dim 10.5:1, links 10.3:1 on #090c10 — all above AA (R-25).
- [PASS] Contrast light: faint 5.36:1, dim 7.01:1, links 5.70:1 on #f5f7f9 — all above AA.
- [PASS] Light theme fully functional, tokens adjust correctly (R-34).
- [PASS] Keyboard: Tab order sane, focus ring 2px accent solid, visible (R-32).
- [PASS] Mobile 390px: no document overflow, nav scrolls horizontally with 44px targets, tables degrade to essential columns (R-03).
- [PASS] States: unknown issuer (`/saham/ZZZZ`) renders honest UNKNOWN dossier; suppressed scope shows "—" + LOW COVERAGE; 404 page is branded with escape links; loading.tsx + error.tsx exist with retry (R-27).
- [PASS] Nav links all resolve; case rows are real links; search submits via Enter → /saham/<t> (R-24, R-26).
- [PASS] Fonts load via next/font (Archivo + JetBrains Mono); no console errors.

## Findings (numbered; antislop Mode-2 format)

1. **HIGH — `/asing` renders an empty board while data exists.** `getFlowRadar` filters flow rows against `referenceDates` = `price_daily.^IHSG` sessions, but ^IHSG in `price_daily.json` ends **2026-09-22** while the 14d window is 2026-09-24→2026-10-07. Result: `referenceDates` empty → all 4,168 in-window flow rows (838 symbols, through 2026-10-01) dropped → "ISSUERS OBSERVED 0". The IHSG stat on `/` uses `index_daily.json` (through 2026-10-06), so the two feeds disagree silently. Fix either the ^IHSG backfill in price_daily or point the reference calendar at index_daily. (R-26/C-2 class: a whole nav destination silently dead.)
2. **MEDIUM — component evidence lives only in `title=` tooltips.** z-score raw values, observations, sources on the board (`ComponentCell`), PB rank on `/rotasi`, etc. are hover-only — unreachable on touch and keyboard. Raw values deserve a details/expand or a second line. (R-32/R-03 adjacent)
3. **MEDIUM — em dash in UI copy** (`R-02`/DESIGN.md own rule): `/rotasi/[sub]` labels "yearly valuation — PB / PE / PS / PCF" and "weighted yearly growth — earnings / revenue"; `<title>` "RADAR-X — IDX Market Intelligence" and per-page `RADAR-X — ${sub}`; ThemeToggle `title` attr "Light — next: Dark". The `—` data-missing glyph is sanctioned by DESIGN.md; these prose uses are not.
4. **MEDIUM — `/rotasi` grid stretch voids.** `grid md:grid-cols-2 xl:grid-cols-3` stretches panels to row height; "BASIC MATERIALS" (1 subsector) sits beside "CONSUMER CYCLICALS" (6) leaving a large dead block inside the panel on desktop. `items-start` or a balanced ordering fixes it. Mobile stacks fine.
5. **LOW — grammar/copy**: "1 distinct holders" (widgets.tsx, should be "holder"); "{n} marker(s) outside the displayed range" (TimelineChart, lazy plural); footer "TRACK MARKET INTELLIGENCE" likely missing "3"; "962 tracked issuers from a 962-issuer IDX directory" redundant phrasing.
6. **LOW — scope tabs lack `aria-current`.** ALL/FLAGGED/SUPPRESSED and kasus pattern tabs render state visually only; nav links already set aria-current, tabs should match.
7. **LOW — no sticky table header.** The 150-row Exit Watch page (244 scored across 2 pages) loses column context on scroll. `thead th { position: sticky }` inside the scroll container is cheap.
8. **LOW — mobile tap targets.** Ticker links in table rows measure ~37px (py-3 + 13px text); nav/search/theme are 44px+. Consider py-3.5 or stretched-link on the row.
9. **LOW — loading indicator contradicts MOTION 1.** `animate-ping` is a looped pulse; DESIGN.md MOTION 1 = "state changes only, no looped pulses". Swap for a static blip or re-scope the dial.
10. **LOW — search affordance.** "Search issuer" is a go-to-ticker box: no typeahead, company names silently no-op to an UNKNOWN dossier. Fine for terminal scope, but an inline hint ("ticker only") or datalist of tickers would cut dead ends. The sr-only submit button is also an invisible Tab stop (focus lands on nothing visible).

## Recommended order

1. (#1) `/asing` reference-calendar fix — it's the only broken thing, and it's a whole nav item.
2. (#2) touch-accessible component detail — biggest real UX gap after that.
3. (#3)+(#5) copy sweep — one commit, zero risk.
4. (#4) rotasi `items-start` — one class.
5. (#6)–(#10) batch polish pass.

Evidence: `docs/verification/ui-audit-2026-10-08/*.png`, live DOM measurements, and the source citations above. Not investment advice; UI audit only.

## Remediation status (2026-10-08, post-audit)

All 10 findings fixed and re-verified on a local production build (`next build` + `next start`, desktop 1280 + mobile 390):

1. **FIXED** — `getFlowRadar` now reads the exchange-session calendar from `index_daily.json` IHSG rows (unioned with `^IHSG` price dates as fallback), inside the requested window. `/asing` (now canonical `/foreign`) renders **861 issuers observed / 428 accumulating / 398 distributing**. Regression test `flow radar ranks window rows against the exchange session calendar` in `tests/services.test.ts` — suite 4/4 pass.
2. **FIXED** — substantive `title=` tips converted to `data-tip`/`data-ftip` pseudo-element tooltips: keyboard-focusable, visible on focus, `opacity` transition (MOTION-compliant). Right-edge hosts use `.tip-r` so hidden tooltips cannot inflate document scroll width. Decorative chart bars keep native `title`.
3. **FIXED** — prose em dashes removed from `<title>`, ThemeToggle tooltip ("Auto · next: Light"), rotasi sub labels, and misc copy. `—` retained only for sanctioned data-missing glyphs.
4. **FIXED** — `/rotasi` grid now `items-start`; short panels no longer stretch beside tall ones.
5. **FIXED** — "1 distinct holder" singular; "marker(s)" reworded; footer track wording corrected; v2 subtitle redundancy removed.
6. **FIXED** — `aria-current="page"` on scope tabs (ALL/FLAGGED/SUPPRESSED) and kasus pattern tabs, matching nav semantics. Verified live.
7. **FIXED** — `.table-sticky thead th { position: sticky; top: 49px }` on all long tables; wrapper uses `overflow-x: clip` so sticky engages at page level. Verified live (`position: sticky` computed).
8. **FIXED** — `.taplink` adds `padding-block: 16px` under `@media (pointer: coarse)` → ~45px row hit area on touch without changing desktop density.
9. **FIXED** — `animate-ping` replaced with `.sweep`: a single conic-gradient radar sweep (rotational, on-brand), frozen under `prefers-reduced-motion`.
10. **FIXED** — `SearchBox` fetches `/api/tickers` lazily on first focus into a `<datalist>` (962 options verified live); typed issuer names resolve to tickers ("Bank Central Asia" → `/stock/BBCA`, legal prefixes PT/TBK normalized); sr-only submit is `tabIndex={-1}` so it's no longer an invisible Tab stop; Enter still submits.

### Discovered + fixed during verification

- Custom tooltips initially caused hidden horizontal overflow (`docSW` 976 > vw 921) — right-edge `::after` extended past viewport. Fixed via `.tip-r` right-anchored variant.
- Route migration coherence: `asing→foreign`, `metodologi→methodology` were renamed while `cases`/`person`/`rotation`/`stock` exist as English alias dirs of `kasus`/`orang`/`rotasi`/`saham`. Completed: nav + internal links point to canonical English paths; `next.config.ts` redirects `/asing`→`/foreign`, `/metodologi`→`/methodology` (307) so shared old URLs keep working. Indonesian paths still resolve.
- Search name resolution initially failed for names with legal prefixes ("PT Bank Central Asia Tbk") — added normalization + guarded `includes` fallback.

### Final verification

`npm run build` clean (TS + 21 routes incl. `/api/tickers`); live re-check: zero console errors, zero document overflow at 1280/921/390, datalist populates, name-search resolves, `aria-current` live on nav + tabs, sticky theads engaged, `/foreign` data populated.
