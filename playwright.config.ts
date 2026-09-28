import { defineConfig } from "@playwright/test";

const chromium = {
  browserName: "chromium" as const,
  launchOptions: { executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" },
};

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "phone-390", use: { ...chromium, viewport: { width: 390, height: 844 }, hasTouch: true } },
    { name: "tablet-1024", use: { ...chromium, viewport: { width: 1024, height: 768 } } },
    { name: "desktop-1440", use: { ...chromium, viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    // Real-API runs need the worker too; AI providers are mocked so tests are free and fast.
    command: process.env.E2E_REAL_API === "1" ? "npm run dev:all" : "npm run dev",
    env: { PROVIDERS: "mock", DATABASE_URL: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/ads" },
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
