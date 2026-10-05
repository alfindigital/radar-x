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

  await page.goto("/?v=radar");
  await expect(page.getByRole("heading", { name: "Radar Board" })).toBeVisible();
  await expect(page.getByText("Historical Sectors snapshot")).toBeVisible();

  await page.getByRole("link", { name: "Distribution" }).click();
  await expect(page).toHaveURL(/f=negative/);
  const rows = page.locator("tbody tr.row-hover");
  await expect(rows.first()).toBeVisible();
  await expect(rows.first()).toContainText("-");

  await rows.first().locator("a[href^='/saham/']").click();
  await expect(page).toHaveURL(/\/saham\//);
  await expect(page.getByText("Reported ownership transactions")).toBeVisible();
  await expect(page.getByText("Historical Sectors snapshot")).toBeVisible();
  const sourceLinks = page.locator("a[href^='http://'], a[href^='https://']");
  await expect(sourceLinks.first()).toBeVisible();
  expect(await sourceLinks.evaluateAll((links) => links.every((link) => /^https?:\/\//.test((link as HTMLAnchorElement).href)))).toBe(true);

  await page.goBack();
  await expect(page).toHaveURL(/f=negative/);
  expect(consoleErrors).toEqual([]);
});

test("case detail exposes separate outcome status and bounded evidence", async ({ page }) => {
  await page.goto("/kasus");
  await expect(page.getByRole("heading", { name: "Candidate Feed" })).toBeVisible();
  const firstCase = page.locator("a[href^='/kasus/']").first();
  await expect(firstCase).toBeVisible();
  await firstCase.click();
  await expect(page.getByText("Candidate pattern from reported transactions")).toBeVisible();
  await expect(page.getByText(/Historical Sectors snapshot/)).toBeVisible();
  expect(await page.getByText(/Pending|Unavailable/).count()).toBeGreaterThan(0);
  await expect(page.getByText("bounded window")).toBeVisible();
});

test("search resolves a known issuer and an unknown issuer remains explicit", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("textbox", { name: "Search issuer" });
  await page.waitForTimeout(750);
  await search.fill("BBCA");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/saham\/BBCA$/);
  await expect(page.getByText("BBCA").first()).toBeVisible();

  await page.goto("/saham/ZZZZ");
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
    await expect(page).toHaveURL(/\/asing$/);
    await expect(page.getByRole("heading", { name: "Foreign Flow Radar" })).toBeVisible();
    await nav.getByRole("link", { name: "Methodology" }).click();
    await expect(page).toHaveURL(/\/metodologi$/);
    await expect(page.getByRole("heading", { name: "Methodology" })).toBeVisible();
  });
});
