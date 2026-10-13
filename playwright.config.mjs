import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://127.0.0.1:4321", browserName: "chromium", trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: { command: "node tests/browser/server.mjs", url: "http://127.0.0.1:4321", reuseExistingServer: false, timeout: 60000 },
});
