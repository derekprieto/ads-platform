import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/ads_test", PROVIDERS: "mock" },
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
