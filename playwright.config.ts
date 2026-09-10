import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3210",
    headless: true,
    launchOptions: { executablePath: process.env.ACEAPT_BROWSER_PATH },
  },
  webServer: {
    command: "node node_modules/next/dist/bin/next start --port 3210",
    url: "http://127.0.0.1:3210",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
