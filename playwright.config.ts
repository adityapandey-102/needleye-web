import { defineConfig, devices } from "@playwright/test";

/**
 * E2E coverage for the critical workflows only (see CLAUDE.md's testing
 * pyramid) -- login, create order, update order, upload images, record
 * payment, search orders. Not a full click-every-page suite.
 *
 * Needs needleye-api + the local Supabase stack already running (same
 * prerequisite as needleye-api's tests/rbac-matrix.mjs) -- this config only
 * starts the Next.js dev server itself.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
