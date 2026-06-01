import { defineConfig, devices } from 'playwright/test'

// Playwright config for visualization-correctness tests. Assumes the
// dev server is already running on PORT (default 3456). We don't spawn
// `next dev` from here — too slow — but if PLAYWRIGHT_AUTOSTART is set,
// playwright will boot the server itself.

const PORT = Number(process.env.PORT ?? 3456)
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/viz',
  timeout: 30_000,
  fullyParallel: false,
  reporter: process.env.CI ? 'github' : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  ...(process.env.PLAYWRIGHT_AUTOSTART
    ? {
        webServer: {
          command: `next dev -p ${PORT}`,
          url: BASE_URL,
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }
    : {}),
})
