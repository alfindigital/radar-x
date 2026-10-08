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

test("desktop research journey keeps negative distribution and source evidence", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chrome", "Desktop evidence journey is covered by the dedicated mobile navigation test.");
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText(/market data through/)).toBeVisible();

  await page.locator(".tabbar").getByRole("link", { name: "Distribution" }).click();
  await expect(page).toHaveURL(/scope=distribution/);
  const rows = page.locator("tbody tr.row-hover");
  await expect(rows.first()).toBeVisible();
  await expect(rows.first()).toContainText("-");

  await rows.first().locator("a[href^='/stock/']").click();
  await expect(page).toHaveURL(/\/stock\//);
  await expect(page.getByText("Reported ownership transactions")).toBeVisible();
  await expect(page.getByText(/market data through/)).toBeVisible();
  const sourceLinks = page.locator("a[href^='http://'], a[href^='https://']");
  await expect(sourceLinks.first()).toBeVisible();
  expect(await sourceLinks.evaluateAll((links) => links.every((link) => /^https?:\/\//.test((link as HTMLAnchorElement).href)))).toBe(true);

  await page.goBack();
  await expect(page).toHaveURL(/scope=distribution/);
  expect(consoleErrors).toEqual([]);
});

test("case detail exposes separate outcome status and bounded evidence", async ({ page }) => {
  await page.goto("/cases");
  await expect(page.getByRole("heading", { name: "Candidate Feed" })).toBeVisible();
  const firstCase = page.locator("a[href^='/cases/']").first();
  await expect(firstCase).toBeVisible();
  await firstCase.click();
  await expect(page.getByText("Candidate pattern from reported transactions")).toBeVisible();
  await expect(page.getByText(/market data through/)).toBeVisible();
  expect(await page.getByText(/Pending|Unavailable/).count()).toBeGreaterThan(0);
  await expect(page.getByText("bounded window")).toBeVisible();
});

test("search resolves a known issuer and an unknown issuer remains explicit", async ({ page }) => {
  await page.goto("/");
  // Desktop top bar collapses search to an icon button; the mobile nav keeps
  // the always-open field. Open it only when the button is the visible control.
  const searchButton = page.getByRole("button", { name: "Search issuer" });
  if (await searchButton.isVisible()) await searchButton.click();
  const search = page.getByRole("combobox", { name: "Search issuer" });
  await page.waitForTimeout(750);
  await search.fill("BBCA");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/stock\/BBCA$/);
  await expect(page.getByText("BBCA").first()).toBeVisible();

  await page.goto("/stock/ZZZZ");
  await expect(page.getByText("unknown", { exact: true })).toBeVisible();
  await expect(page.getByText("No price observations in the saved snapshot.")).toBeVisible();
});

test.describe("mobile navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("reaches foreign flow and methodology", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Primary navigation" });
    await expect(nav).toBeVisible();
    await nav.getByRole("link", { name: "Foreign flow" }).click();
    await expect(page).toHaveURL(/\/foreign$/);
    await expect(page.getByRole("heading", { name: "Foreign Flow Radar" })).toBeVisible();
    await nav.getByRole("link", { name: "Methodology" }).click();
    await expect(page).toHaveURL(/\/methodology$/);
    await expect(page.getByRole("heading", { name: "Methodology" })).toBeVisible();
  });
});
