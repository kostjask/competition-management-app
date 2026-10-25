import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser", fullyParallel: true, workers: 2,
  forbidOnly: !!process.env.CI, retries: 0,
  reporter: "list", outputDir: "test-results",
  use: { baseURL: "http://127.0.0.1:4177", browserName: "chromium", trace: "retain-on-failure" },
  globalSetup: "./apps/web/tests/browser-setup.ts",
});
