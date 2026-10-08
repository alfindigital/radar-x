// Checks that public-facing docs state the same numbers as the checked-in
// derived artifacts. Docs drift every refresh when figures are transcribed by
// hand — this gate fails on any stated number that contradicts the artifact,
// so a stale claim can never ship silently. Run: npm run audit:claims
//
// It does NOT rewrite docs — it prints the canonical block for a human to
// paste, and exits non-zero while any watched doc disagrees with it.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DERIVED = path.join(ROOT, "data", "derived-v2");

const WATCHED_DOCS = [
  "docs/SUBMISSION.md",
  "docs/CLAIMS.md",
  "docs/living/CURRENT_STATE.md",
  "docs/living/SESSION.md",
];

type Tier = "high" | "elevated" | "watch" | "low";
const TIERS: Tier[] = ["high", "elevated", "watch", "low"];

interface Canonical {
  asOf: string;
  scores: number;
  cases: number;
  publishable: number;
  suppressed: number;
  tiers: Record<Tier, number>;
}

function loadJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(DERIVED, file), "utf8"));
}

function canonical(): Canonical {
  const manifest = loadJson("manifest.json") as { asOf: string };
  const scores = loadJson("scores.json") as unknown[];
  const cases = loadJson("cases.json") as unknown[];
  const exitwatch = loadJson("exitwatch.json") as { tier: Tier | null }[];
  const tiers = { high: 0, elevated: 0, watch: 0, low: 0 };
  for (const row of exitwatch) if (row.tier) tiers[row.tier]++;
  const publishable = Object.values(tiers).reduce((a, b) => a + b, 0);
  return {
    asOf: manifest.asOf,
    scores: scores.length,
    cases: cases.length,
    publishable,
    suppressed: exitwatch.length - publishable,
    tiers,
  };
}

function num(s: string): number {
  return parseInt(s.replace(/,/g, ""), 10);
}

interface Drift {
  doc: string;
  line: number;
  stated: string;
  expected: string;
}

function checkDoc(doc: string, c: Canonical, drift: Drift[]): void {
  const file = path.join(ROOT, doc);
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split("\n");

  lines.forEach((line, i) => {
    const ln = i + 1;
    const low = line.toLowerCase();

    // Tier claims: "189 high", "high 189", "189 high / 126 elevated", …
    // \b on both sides — "flow 826" and "exitwatch.json 964" are not tiers.
    for (const tier of TIERS) {
      for (const m of line.matchAll(new RegExp(`(\\d[\\d,]*)\\s*\\b${tier}\\b|\\b${tier}\\b[^\\d]{0,6}(\\d[\\d,]*)`, "g"))) {
        const stated = num(m[1] ?? m[2]);
        if (stated !== c.tiers[tier]) {
          drift.push({ doc, line: ln, stated: `${stated} ${tier}`, expected: `${c.tiers[tier]} ${tier}` });
        }
      }
    }

    // Publishable / suppressed claims
    for (const m of line.matchAll(/(\d[\d,]*)\s*(?:publishable|exit readings)/g)) {
      const stated = num(m[1]);
      if (stated !== c.publishable) {
        drift.push({ doc, line: ln, stated: `${stated} publishable`, expected: `${c.publishable} publishable` });
      }
    }
    for (const m of line.matchAll(/(\d[\d,]*)\s*suppressed|suppressed\D{0,10}(\d[\d,]*)/g)) {
      const stated = num(m[1] ?? m[2]);
      if (stated !== c.suppressed) {
        drift.push({ doc, line: ln, stated: `${stated} suppressed`, expected: `${c.suppressed} suppressed` });
      }
    }

    // "as of <date>" snapshot claims — parse without Date (local-midnight
    // parsing shifts the ISO day under non-UTC timezones).
    const MONTHS: Record<string, string> = {
      january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
      july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
    };
    for (const m of low.matchAll(/as of\s+(\d{4}-\d{2}-\d{2}|\d{1,2}\s+\w+\s+\d{4})/g)) {
      const stated = m[1];
      const parts = stated.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
      const iso = /^\d{4}-\d{2}-\d{2}$/.test(stated)
        ? stated
        : parts && MONTHS[parts[2]]
          ? `${parts[3]}-${MONTHS[parts[2]]}-${parts[1].padStart(2, "0")}`
          : null;
      if (iso && iso !== c.asOf && /snapshot|artifact|exit watch|derived/.test(low)) {
        drift.push({ doc, line: ln, stated: `as of ${stated}`, expected: `as of ${c.asOf}` });
      }
    }
  });
}

function main(): void {
  const c = canonical();
  const drift: Drift[] = [];
  for (const doc of WATCHED_DOCS) checkDoc(doc, c, drift);

  console.log(`Canonical (data/derived-v2, as-of ${c.asOf}):`);
  console.log(
    `  ${c.publishable} publishable: ${c.tiers.high} high / ${c.tiers.elevated} elevated / ${c.tiers.watch} watch / ${c.tiers.low} low`,
  );
  console.log(`  ${c.suppressed} suppressed; scores ${c.scores}; cases ${c.cases}`);

  if (!drift.length) {
    console.log(`\nOK — ${WATCHED_DOCS.length} docs consistent with artifacts.`);
    return;
  }
  console.error(`\nDRIFT — ${drift.length} stated number(s) contradict the artifacts:`);
  for (const d of drift) console.error(`  ${d.doc}:${d.line} says "${d.stated}" — artifact has ${d.expected}`);
  process.exitCode = 1;
}

main();
