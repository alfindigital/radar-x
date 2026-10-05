import { test, expect } from "@playwright/test";

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
  await expect(rows.first().locator("a[href^='/saham/']").first()).toBeVisible();
});

test("flagged scope renders flag chips", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chrome", "Board scope verified on desktop only.");
  await page.goto("/?scope=flagged");
  const rows = page.locator("tbody tr.row-hover");
  await expect(rows.first()).toBeVisible();
  await expect(page.locator("tbody tr.row-hover").locator("text=/SUSP|CORP|FLOAT|SPARSE/").first()).toBeVisible();
});

test("suppressed scope shows null-score rows and a cap notice", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chrome", "Board scope verified on desktop only.");
  await page.goto("/?scope=suppressed");
  const rows = page.locator("tbody tr.row-hover");
  await expect(rows.first()).toBeVisible();
  await expect(rows.first().locator("td").nth(2)).toContainText("—");
  await expect(page.getByText(/Showing first \d+ of \d+/)).toBeVisible();
});

test("preserved v2 board still renders at ?v=radar", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chrome", "Desktop check only.");
  await page.goto("/?v=radar");
  await expect(page.getByRole("heading", { name: "Radar Board" })).toBeVisible();
});

test("issuer dossier shows exit watch panel, cohort chart, coverage, and recent-suspension context", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chrome", "Dossier layout verified on desktop only.");
  // SONA.JK: scored 41 with suspension_recent flag and a 2026-10-01 suspension —
  // the suspension date proves slice(0,3) renders the newest records, not the oldest.
  await page.goto("/saham/SONA");
  await expect(page.getByRole("heading", { name: "Exit Watch" })).toBeVisible();
  await expect(page.getByText(/14-day window 2026-09-17 → 2026-10-01/)).toBeVisible();
  await expect(page.getByText(/coverage 1\.00/)).toBeVisible();
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
