import { defineConfig } from "@playwright/test";
import base from "../../playwright.config";

export default defineConfig({
  ...base,
  testDir: ".",
  testMatch: "*.spec.ts",
  use: { ...base.use, baseURL: "https://radarx.web.id" },
  webServer: undefined,
});
