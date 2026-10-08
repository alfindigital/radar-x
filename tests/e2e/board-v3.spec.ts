import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

// Expected observation window derives from the committed manifest — never
// hardcode dates: every daily refresh shifts asOf and the window with it.
const manifest = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../data/derived-v2/manifest.json"), "utf8"),
) as { asOf: string };
const asOf = manifest.asOf;
const winFrom = new Date(Date.parse(`${asOf}T00:00:00Z`) - 13 * 86400000)
  .toISOString()
  .slice(0, 10);

test.beforeEach(async ({ page }) => {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "api.sectors.app" || url.hostname.endsWith(".arjum.com") || url.hostname === "stock.arjum.com") {
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
});

test("exit watch board renders scored rows with numeric badge and flags", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chrome", "Board columns verified on desktop only.");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Exit Watch" })).toBeVisible();
  const rows = page.locator("tbody tr.row-hover");
  await expect(rows.first()).toBeVisible();
  // numeric exit-pressure badge (td order: rank, issuer, pressure, components, flags)
  await expect(rows.first().locator("td").nth(2)).toContainText(/\d+/);
  // component strip labels exist somewhere in the table header/rows
  await expect(page.getByText("INST").first()).toBeVisible();
  // issuer links resolve to dossiers
  await expect(rows.first().locator("a[href^='/stock/']").first()).toBeVisible();
});

test("flagged scope renders flag chips", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chrome", "Board scope verified on desktop only.");
  await page.goto("/?scope=flagged");
  const rows = page.locator("tbody tr.row-hover");
  await expect(rows.first()).toBeVisible();
  await expect(page.locator("tbody tr.row-hover").locator("text=/SUSP|CORP|FLOAT|SPARSE/").first()).toBeVisible();
});

test("suppressed scope shows null-score rows and pagination", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chrome", "Board scope verified on desktop only.");
  await page.goto("/?scope=suppressed");
  const rows = page.locator("tbody tr.row-hover");
  await expect(rows.first()).toBeVisible();
  await expect(rows.first().locator("td").nth(2)).toContainText("low coverage");
  await expect(page.getByText(/Page 1 of \d+ · 1–\d+ of \d+/)).toBeVisible();
  await page.getByRole("link", { name: "Next →" }).click();
  await expect(page).toHaveURL(/scope=suppressed/);
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText(/Page 2 of \d+/)).toBeVisible();
});

test("preserved v2 board still renders at ?v=radar", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chrome", "Desktop check only.");
  await page.goto("/?v=radar");
  await expect(page.getByRole("heading", { name: "Radar Board" })).toBeVisible();
});

test("issuer dossier shows exit watch panel, cohort chart, coverage, and recent-suspension context", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chrome", "Dossier layout verified on desktop only.");
  // SONA.JK: suspension_recent flag set and a 2026-10-01 suspension record —
  // that date is a historical fact and survives snapshot refreshes.
  await page.goto("/stock/SONA");
  await expect(page.getByRole("heading", { name: "Exit Watch" })).toBeVisible();
  await expect(page.getByText(`14-day window ${winFrom} → ${asOf}`)).toBeVisible();
  await expect(page.getByText(/coverage \d+\.\d+/)).toBeVisible();
  await expect(page.getByText(/Cohort net flow \(\d+ sessions\)/)).toBeVisible();
  await expect(page.locator("svg").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Context", exact: true })).toBeVisible();
  await expect(page.locator("li", { hasText: "SUSP" }).first()).toContainText("2026-10-01");
});

test("broker board renders cohort labels and profile resolves", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chrome", "Broker tables verified on desktop only.");
  await page.goto("/broker");
  await expect(page.getByRole("heading", { name: "Broker board" })).toBeVisible();
  await expect(page.locator("text=/institutional|retail|mixed|unknown/").first()).toBeVisible();
  const firstLink = page.locator("a[href^='/broker/']").first();
  await expect(firstLink).toBeVisible();
  const href = await firstLink.getAttribute("href");
  await page.goto(href!);
  await expect(page).toHaveURL(/\/broker\/.+/);
  await expect(page.getByRole("heading", { name: "Leaderboard appearances" })).toBeVisible();
  await expect(page.locator("text=/institutional|retail|mixed|unknown/").first()).toBeVisible();
});

test("broker board cohort tabs switch the leaderboard session", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chrome", "Broker tabs verified on desktop only.");
  await page.goto("/broker?cohort=retail");
  await expect(page.getByText(/session cohort: retail/)).toBeVisible();
  await page.getByRole("link", { name: "Institutional" }).click();
  await expect(page).toHaveURL(/cohort=institutional/);
  await expect(page.getByText(/session cohort: institutional/)).toBeVisible();
});

test("mobile suppressed scope renders rows and dossier link", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome", "Mobile-only coverage.");
  await page.goto("/?scope=suppressed");
  await expect(page.getByRole("heading", { name: "Exit Watch" })).toBeVisible();
  const first = page.locator("tbody tr.row-hover").first();
  await expect(first).toBeVisible();
  await expect(first.locator("td").nth(2)).toContainText("low coverage");
  await first.locator("a[href^='/stock/']").click();
  await expect(page).toHaveURL(/\/stock\/.+/);
  await expect(page.getByText(/market data through/)).toBeVisible();
});
