import { defineConfig, devices } from "@playwright/test";

// E2E against a production build on 3001 (3000 belongs to another project on
// this machine, and `next dev` corrupted its cache mid-run during the stress
// test). The checkout flag is on so the F-series cases can reach /checkout.
const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  // The ordering specs assert one flow, so they run once, on desktop Chrome.
  // responsive.spec.ts is the cross-device sweep and runs on every project.
  // WebKit carries the most weight of the added engines: it is what every
  // browser on iOS renders with, so it is where layout breaks that Chrome
  // never shows up first.
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1400, height: 900 } },
    },
    // Retina desktop Chrome in a short window: what a minimised MacBook window
    // looks like, and the device pixel ratio that changes which lazy images
    // Chrome bothers to load (the Signature Menu ledger reveal regression).
    {
      name: "desktop-chrome-hidpi",
      testMatch: /responsive\.spec\.ts/,
      use: { ...devices["Desktop Chrome HiDPI"], viewport: { width: 1651, height: 690 } },
    },
    {
      name: "desktop-safari",
      testMatch: /responsive\.spec\.ts/,
      use: { ...devices["Desktop Safari"], viewport: { width: 1400, height: 900 } },
    },
    {
      name: "tablet-safari",
      testMatch: /responsive\.spec\.ts/,
      use: { ...devices["iPad (gen 7)"] },
    },
    {
      name: "mobile-safari",
      testMatch: /responsive\.spec\.ts/,
      use: { ...devices["iPhone 14"] },
    },
    {
      name: "mobile-chrome",
      testMatch: /responsive\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 300_000,
    env: { NEXT_PUBLIC_CHECKOUT_ENABLED: "true" },
  },
});
