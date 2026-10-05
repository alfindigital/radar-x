# TASK-09 — `/broker` board + `/broker/[code]` profile

**Status:** ✅ · **Depends on:** TASK-05 · **Gate:** G5
**Plan:** `../2026-10-01-exit-watch.md` · **Spec:** `specs/PRODUCT_SPEC_V3.md`

## Goal

Broker-level view of cohort behavior: latest leaderboard session, cohort tabs,
and per-broker profile pages — built on `brokers_top.json` sessions +
`broker_registry.json` + `broker_top.json` inversion.

## Files

- **Create** `src/app/broker/page.tsx`
- **Create** `src/app/broker/[code]/page.tsx`
- **Edit** `src/app/layout.tsx` (nav link — slot between `/rotasi` and `/kasus`)
- **Create** `tests/e2e/broker-v3.test.ts` (or extend existing e2e file — match convention)

## `/broker` page

```
┌─ BROKER BOARD — 2026-10-04 ────────────────────────────────┐
│ metric: net_value · cohort: [All][Retail][Institutional]   │
├────┬──────┬───────────────────┬──────────┬─────────────────┤
│  1 │ YP   │ Mirae Asset       │ inst·f   │  net -1.2T      │
│  2 │ CP   │ …                 │ retail   │  net +0.9T      │
└────────────────────────────────────────────────────────────┘
```

- `getBrokerBoard({date,cohort})` — tabs via `?cohort=` links.
- Retail/institutional tabs: `brokers_top.json` currently only has
  `cohort:"all"` sessions → render honest empty state: *"Cohort-specific
  board not yet captured — see registry-labeled per-symbol data in dossiers
  or run the precision ingest (`cohorttop`)."* Still list the session dates
  that DO exist for the tab (zero).
- Row: rank, code (link → `/broker/[code]`), name, cohort badge
  (`inst`/`retail`/`?`), `is_foreign` dot, net/gross IDR.
- Date picker = plain links over `sessions` dates (max ~10 shown).

## `/broker/[code]` page

- Registry card: code, name, cohort, license_type, foreign.
- Session history table (date, rank, net, gross).
- "Where it's active": `topSymbols` from TASK-05 inversion — symbol links to
  `/saham/[ticker]`, side badge buyer/seller, `net_idr`.
- 404-ish empty state when code not in registry: render anyway with
  "unregistered code" notice if it appears in top data (resilient — registry
  is 88 rows, may be incomplete).

## Nav

`layout.tsx` NAV array line ~28: insert `{ href: "/broker", label: "Brokers", icon: "<svg path — pick simple building/arrow icon matching existing 24x24 style>" }`.

## Tests

- `/broker` renders latest session rows; `?cohort=retail` → empty-state copy.
- `/broker/YP` profile renders registry + symbols; unknown code → resilient
  page.

## Done when

- [ ] Both routes build + e2e pass; nav link works.
- [ ] No invented cohort data — absent sessions are explicit.

## Pitfalls

- Check `brokers_top.json` actual session keys (`metric` values — probably
  `net_value`/`gross_value`; `origin` values) — bind UI labels to real values.
- `foreign` field on sessions may be boolean or string — inspect first.
- App Router page params: `params` is a Promise in current Next — copy the
  `await params` pattern from `/rotasi/[sub]/page.tsx` or `/saham/[ticker]`.
