import { defineConfig, devices } from '@playwright/test';

const BASE = '/trezvenoumlje/';
const PORT = 4399;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['dot'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://localhost:${PORT}${BASE}` },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    // --ignore-lock keeps `astro preview` in the foreground: Astro 7 otherwise detaches it
    // into a background process when run by a coding agent, and Playwright sees the command exit.
    command: `npm run build && npx astro preview --port ${PORT} --ignore-lock`,
    url: `http://localhost:${PORT}${BASE}`,
    env: { SITE_ENV: 'preview', SITE_URL: `http://localhost:${PORT}`, BASE_PATH: BASE },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
