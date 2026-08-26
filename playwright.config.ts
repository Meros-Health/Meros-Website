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
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1400, height: 900 } },
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
