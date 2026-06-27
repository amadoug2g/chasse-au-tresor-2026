'use strict';

const { defineConfig, devices } = require('@playwright/test');

const E2E_PORT   = 3456;
const ADMIN_PASS = 'e2e-admin-pass';
const BASE_URL   = `http://127.0.0.1:${E2E_PORT}`;

module.exports = defineConfig({
  testDir:  './test/e2e',
  timeout:  30000,
  workers:  1,
  globalSetup: './test/e2e/global-setup.js',
  use: {
    baseURL: BASE_URL,
    headless: true,
    launchOptions: {
      executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    },
  },
  webServer: {
    command: `CHASSE_ADMIN_PASS=${ADMIN_PASS} CHASSE_STATE_FILE=/tmp/chasse-e2e-state.json E2E_PORT=${E2E_PORT} node test/e2e/serve.js`,
    port:    E2E_PORT,
    timeout: 20000,
    reuseExistingServer: false,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
