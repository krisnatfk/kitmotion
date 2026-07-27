import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config. Runs against the dev server. Skipped in CI unless a Supabase
 * project + env are configured (the workout E2E needs auth).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "line" : "html",
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    // Camera is mocked at the MediaPipe layer in tests; grant the permission anyway
    // so browser prompts don't block the flow.
    permissions: ["camera"],
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
